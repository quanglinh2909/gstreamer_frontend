import {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import { Maximize2, Minimize2, Pause, Play } from "lucide-react";
import {
    DetectionOverlay,
    type MotionOverlayCells,
} from "@/components/common/detection-overlay";
import { SpeedPicker } from "@/components/common/speed-picker";
import { usePlaybackDetections } from "@/hooks/use-playback-detections";
import type { FeedTab } from "@/lib/event-feed-shared";
import { ICE_SERVERS } from "@/lib/webrtc-ice";

// Player XEM LẠI chạy bằng WebRTC thay cho HLS.
//
// Vì sao đổi: với HLS mỗi cú bấm timeline phải tải lại playlist của CẢ NGÀY
// (đo được 1,17 MB / 9.122 dòng) rồi dựng lại hls.js từ đầu — mất 0,6–1,0s và
// còn tăng theo độ dài ngày. Ở đây phiên mở MỘT LẦN; mỗi cú bấm chỉ là một
// POST /control vài trăm byte, engine seek thẳng trong file .ts nằm sẵn trong
// máy. Đo trên board: hình mới sau 27–98ms.
//
// Ba việc engine làm thay trình duyệt:
//   - seek: nhảy tới keyframe gần nhất trước mốc, ngay trong file;
//   - tốc độ: engine bơm nhanh hơn (x4 = mỗi giây thực gửi 4 giây nội dung),
//     nên KHÔNG dùng playbackRate của <video> nữa;
//   - từ x4 trở lên engine CHỈ gửi keyframe — băng thông và công giải mã giảm
//     hàng chục lần, thứ mà tua bằng HLS không làm được (vẫn phải tải đủ mọi
//     frame rồi bỏ đi).
//
// Vị trí đang phát do ENGINE báo về (epoch ms) chứ không suy ra từ currentTime
// của thẻ video: bản ghi có khoảng trống (lúc không ghi) nên thời gian media
// và giờ tường không tỉ lệ với nhau.

const PROXY = "/api/backend-process";

// Vị trí đang phát về qua KÊNH DỮ LIỆU của chính kết nối WebRTC (engine đẩy
// mỗi 500ms), nên bình thường KHÔNG có request HTTP nào lặp lại.
//
// Vòng hỏi HTTP dưới đây chỉ là lưới an toàn cho trường hợp kênh dữ liệu không
// mở được (proxy chặn SCTP, trình duyệt lạ): quá SUPPORT_PROBE_MS mà chưa nhận
// được tin nhắn nào thì mới bật, 1 giây/lần.
const STATUS_POLL_MS = 1000;
const DATACHANNEL_PROBE_MS = 4000;
const RETRY_DELAY_MS = 2000;


export type PlaybackVideoHandle = {
    // Nhảy tới một mốc giờ tường (epoch ms).
    seek: (wallMs: number) => void;
};

type State = "connecting" | "playing" | "reconnecting" | "error";

export const PlaybackVideo = forwardRef<
    PlaybackVideoHandle,
    {
        cameraId: string;
        // Mốc bắt đầu. CHỈ đọc lúc mở phiên; đổi chỗ sau đó thì gọi seek().
        startMs: number;
        rate: number;
        onRateChange: (rate: number) => void;
        // Engine báo vị trí đang phát — dùng để vẽ con trỏ timeline.
        onPosition: (wallMs: number) => void;
        className?: string;
        timeLabel?: string;
        // ─── Chế độ TƯỜNG ĐỒNG BỘ (nhiều camera một timeline) ───
        // Tạm dừng điều khiển TỪ NGOÀI: khi có giá trị (khác undefined) thì tường
        // làm chủ trạng thái phát/dừng, nút nội bộ ẩn đi. undefined = tự quản như
        // trang Xem lại một camera.
        paused?: boolean;
        // Ẩn thanh điều khiển nội bộ (nút phát, thanh tốc độ, toàn màn hình) khi
        // tường đã có một bộ điều khiển CHUNG cho mọi ô.
        showChrome?: boolean;
        // Phát một lệnh seek tới ô này. Đổi `gen` là seek tới `ms` — dùng để
        // broadcast một cú bấm timeline tới TẤT CẢ ô cùng lúc mà không phải giữ
        // ref cho từng ô.
        seekSignal?: { ms: number; gen: number };
        // ─── Khung phát hiện đã LƯU (vẽ đè khi xem lại) ───
        // Chỉ có dữ liệu nếu cấu hình AI của camera bật "Lưu khung phát hiện".
        showDetections?: boolean;
        detectionTypes?: Set<FeedTab>;
        detectionLabels?: boolean;
        // Ô đã động của sự kiện chuyển động CHỨA mốc đang phát. Trang tự tra từ
        // danh sách sự kiện của ngày (đã tải sẵn cho timeline) rồi truyền xuống
        // — component này không biết gì về mốc giờ tường.
        motionCells?: MotionOverlayCells | null;
    }
>(function PlaybackVideo(
    {
        cameraId,
        startMs,
        rate,
        onRateChange,
        onPosition,
        className,
        timeLabel,
        paused: pausedProp,
        showChrome = true,
        seekSignal,
        showDetections = false,
        detectionTypes,
        detectionLabels = true,
        motionCells = null,
    },
    ref,
) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    // Vị trí phát hiện tại (positionRef cập nhật liên tục nhưng là ref, không
    // gây render) — giữ một bản state để lớp phủ bám theo con trỏ.
    const [overlayMs, setOverlayMs] = useState(startMs);
    const playbackBoxes = usePlaybackDetections(
        cameraId, overlayMs, showDetections, rate,
    );
    const [state, setState] = useState<State>("connecting");
    const [errorMessage, setErrorMessage] = useState("");
    const [paused, setPaused] = useState(false);
    const [ended, setEnded] = useState(false);
    // Đợi đoạn ghi kế tiếp (bám sát mép live) — KHÁC "hết bản ghi": camera ghi
    // đoạn 60 giây thì đoạn đang ghi cả phút nữa mới đóng và mới phát được.
    const [waiting, setWaiting] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Vị trí phát gần nhất: dùng làm mốc mở lại khi phải nối lại phiên.
    const positionRef = useRef(startMs);
    // Mốc muốn tới nhưng phiên chưa sẵn sàng (bấm timeline trong lúc đang kết nối).
    const pendingSeekRef = useRef<number | null>(null);
    const sessionRef = useRef<string>("");
    const rateRef = useRef(rate);
    rateRef.current = rate;

    // Đã nhận được tin nhắn nào từ kênh dữ liệu chưa (quyết định có cần bật
    // lưới an toàn hỏi HTTP không).
    const gotChannelRef = useRef(false);
    // Số thứ tự lệnh seek đang CHỜ engine áp. Mọi bản tin trạng thái có seq
    // nhỏ hơn đều là vị trí CŨ: engine đẩy trạng thái mỗi 500ms nên sau khi
    // bấm timeline vẫn còn một, hai bản tin mang vị trí trước lúc nhảy. Không
    // chặn thì con trỏ đỏ nhảy tới chỗ vừa bấm, bị kéo NGƯỢC về chỗ cũ, rồi
    // mới nhảy lại — đúng cái giật ba nhịp người dùng thấy.
    const waitSeqRef = useRef(0);
    const onPositionRef = useRef(onPosition);
    onPositionRef.current = onPosition;

    // Gửi một lệnh điều khiển. Trả về false khi phiên không còn (engine đã dọn).
    const control = useCallback(
        async (body: { atMs?: number; rate?: number; paused?: boolean }) => {
            const url = sessionRef.current;
            if (!url) return false;
            try {
                const res = await fetch(`${PROXY}${url}/control`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body),
                });
                if (res.status === 404) {
                    waitSeqRef.current = 0;
                    return false;
                }
                if (!res.ok) {
                    waitSeqRef.current = 0;
                    return true;
                }
                const status = (await res.json()) as {
                    positionMs?: number;
                    seq?: number;
                    seekSeq?: number;
                };
                // Trả lời của một lệnh seek mang vị trí CŨ (feeder chưa kịp
                // nhảy), nên chỉ lấy về số thứ tự cần chờ, không lấy vị trí.
                if (status.seekSeq) {
                    waitSeqRef.current = status.seekSeq;
                    return true;
                }
                if (body.atMs != null) waitSeqRef.current = 0;  // seek hỏng: bỏ chặn
                if (
                    typeof status.positionMs === "number" &&
                    (waitSeqRef.current === 0 || (status.seq ?? 0) >= waitSeqRef.current)
                ) {
                    positionRef.current = status.positionMs;
                    onPositionRef.current(status.positionMs);
                    setOverlayMs(status.positionMs);
                }
                return true;
            } catch {
                waitSeqRef.current = 0;
                return true;
            }
        },
        [],
    );

    const doSeek = useCallback(
        (wallMsRaw: number) => {
            setWaiting(false);
            // LÀM TRÒN: mốc từ timeline tính theo pixel nên là số thực.
            // JSON gửi đi "1784820188000.4" làm bộ đọc Int64 của oatpp
            // ném lỗi -> engine trả 500 và cú bấm rơi vào hư không.
            const wallMs = Math.round(wallMsRaw);
            // CHẶN NGAY từ lúc bấm, chưa cần biết số thứ tự thật: giữa lúc
            // bấm và lúc engine trả lời (~50ms) vẫn có thể rơi vào một nhịp
            // đẩy trạng thái mang vị trí CŨ. MAX_SAFE_INTEGER chặn mọi bản
            // tin; trả lời của /control thay bằng số thật, còn nếu lệnh
            // hỏng thì các nhánh lỗi trong control() gỡ chặn.
            waitSeqRef.current = Number.MAX_SAFE_INTEGER;
            positionRef.current = wallMs;
            setEnded(false);
            if (!sessionRef.current) {
                pendingSeekRef.current = wallMs;
                return;
            }
            // Bấm timeline khi đang tạm dừng = muốn xem chỗ đó -> phát tiếp.
            setPaused(false);
            void control({ atMs: wallMs, paused: false });
        },
        [control],
    );

    useImperativeHandle(ref, () => ({ seek: doSeek }), [doSeek]);

    // Tường đồng bộ broadcast một cú bấm timeline qua seekSignal: đổi gen là
    // seek. Bỏ qua lần đầu (gen khởi tạo) để không seek thừa lúc mở.
    const seekGenRef = useRef<number | null>(null);
    useEffect(() => {
        if (!seekSignal) return;
        if (seekGenRef.current === seekSignal.gen) return;
        const first = seekGenRef.current === null;
        seekGenRef.current = seekSignal.gen;
        if (first) return;
        doSeek(seekSignal.ms);
    }, [seekSignal, doSeek]);

    // Tạm dừng điều khiển từ ngoài (tường sync). undefined = tự quản.
    useEffect(() => {
        if (pausedProp === undefined) return;
        setPaused(pausedProp);
        void control({ paused: pausedProp });
    }, [pausedProp, control]);

    // Đổi tốc độ: engine bơm nhanh/chậm lại, không đụng playbackRate.
    useEffect(() => {
        if (!sessionRef.current) return;
        void control({ rate });
    }, [rate, control]);

    useEffect(() => {
        if (!cameraId) return;

        const videoElement = videoRef.current;
        let cancelled = false;
        let pc: RTCPeerConnection | null = null;
        let statusTimer = 0;
        let retryTimer = 0;

        const teardown = () => {
            window.clearTimeout(statusTimer);
            statusTimer = 0;
            if (sessionRef.current) {
                void fetch(`${PROXY}${sessionRef.current}`, {
                    method: "DELETE",
                    keepalive: true,
                }).catch(() => {});
                sessionRef.current = "";
            }
            if (pc) {
                pc.ontrack = null;
                pc.onconnectionstatechange = null;
                pc.close();
                pc = null;
            }
        };

        const reconnect = (reason: string) => {
            if (cancelled) return;
            teardown();
            setState("reconnecting");
            setErrorMessage(reason);
            retryTimer = window.setTimeout(() => void connect(), RETRY_DELAY_MS);
        };

        // Đợi gom ICE nhưng KHÔNG đợi tới "complete" — cùng lý do như player
        // live: Chrome giữ phiên gom mở vì TURN/TCP không dứt điểm, đợi đủ thì
        // luôn mất trọn 3 giây. Xem webrtc-player.tsx.
        const waitForIceGathering = (peer: RTCPeerConnection) =>
            new Promise<void>((resolve) => {
                if (peer.iceGatheringState === "complete") {
                    resolve();
                    return;
                }
                let hasPublic = false;
                let quietTimer = 0;
                const startedAt = Date.now();
                const finish = () => {
                    window.clearTimeout(quietTimer);
                    window.clearTimeout(hardTimer);
                    peer.removeEventListener("icecandidate", onCandidate);
                    resolve();
                };
                const hardTimer = window.setTimeout(finish, 3000);
                const armQuiet = () => {
                    window.clearTimeout(quietTimer);
                    quietTimer = window.setTimeout(() => {
                        if (hasPublic || Date.now() - startedAt >= 1200) finish();
                        else armQuiet();
                    }, 250);
                };
                function onCandidate(event: RTCPeerConnectionIceEvent) {
                    if (!event.candidate) {
                        finish();
                        return;
                    }
                    const line = event.candidate.candidate;
                    if (line.includes("typ srflx") || line.includes("typ relay")) {
                        hasPublic = true;
                    }
                    armQuiet();
                }
                peer.addEventListener("icecandidate", onCandidate);
                armQuiet();
            });

        const applyStatus = (status: {
            positionMs?: number;
            ended?: boolean;
            paused?: boolean;
            waiting?: boolean;
            seq?: number;
        }) => {
            // Bỏ qua mọi bản tin sinh ra TRƯỚC khi engine áp lệnh seek mới nhất.
            if (waitSeqRef.current > 0) {
                if ((status.seq ?? 0) < waitSeqRef.current) return;
                waitSeqRef.current = 0;
            }
            if (typeof status.positionMs === "number") {
                positionRef.current = status.positionMs;
                onPositionRef.current(status.positionMs);
                setOverlayMs(status.positionMs);
            }
            setEnded(Boolean(status.ended));
            setWaiting(Boolean(status.waiting));
        };

        // LƯỚI AN TOÀN: chỉ chạy khi kênh dữ liệu im lặng. Xem DATACHANNEL_PROBE_MS.
        const startPolling = () => {
            window.clearTimeout(statusTimer);
            const tick = async () => {
                if (cancelled || !sessionRef.current) return;
                try {
                    const res = await fetch(`${PROXY}${sessionRef.current}`);
                    if (res.status === 404) {
                        reconnect("Phiên xem lại đã hết hạn, đang mở lại...");
                        return;
                    }
                    if (!res.ok) return;
                    applyStatus(await res.json());
                } catch {
                    /* mất mạng tạm thời: lần hỏi sau lo tiếp */
                }
                if (cancelled) return;
                statusTimer = window.setTimeout(tick, STATUS_POLL_MS);
            };
            statusTimer = window.setTimeout(tick, STATUS_POLL_MS);
        };

        const connect = async () => {
            if (cancelled) return;
            setState((prev) => (prev === "playing" ? "reconnecting" : prev));

            try {
                const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
                pc = peer;
                peer.addTransceiver("video", { direction: "recvonly" });

                // PHẢI tạo trước createOffer: có kênh thì offer mới mang m-line
                // "application", engine mới có chỗ để mở kênh ngược lại. Tạo
                // sau offer là phải thương lượng lại từ đầu.
                const channel = peer.createDataChannel("playback");
                channel.onmessage = (event) => {
                    if (cancelled || pc !== peer) return;
                    gotChannelRef.current = true;
                    try {
                        applyStatus(JSON.parse(String(event.data)));
                    } catch {
                        /* gói hỏng: bỏ qua, 500ms nữa có gói mới */
                    }
                };
                peer.ontrack = (event) => {
                    if (cancelled || !videoElement) return;
                    videoElement.srcObject = event.streams[0];
                };
                peer.onconnectionstatechange = () => {
                    if (cancelled || pc !== peer) return;
                    if (peer.connectionState === "connected") {
                        setState("playing");
                        setErrorMessage("");
                    } else if (
                        peer.connectionState === "failed" ||
                        peer.connectionState === "disconnected"
                    ) {
                        reconnect("Mất kết nối, đang mở lại...");
                    }
                };

                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);
                await waitForIceGathering(peer);
                if (cancelled || pc !== peer) return;

                // Mở phiên ngay tại vị trí đang xem: nối lại giữa chừng không
                // được nhảy về đầu.
                const at = pendingSeekRef.current ?? positionRef.current;
                pendingSeekRef.current = null;
                const res = await fetch(
                    `${PROXY}/cameras/${encodeURIComponent(cameraId)}/playback/whep` +
                        `?at=${Math.round(at)}&rate=${rateRef.current}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/sdp" },
                        body: peer.localDescription?.sdp ?? offer.sdp ?? "",
                    },
                );
                if (!res.ok) throw new Error((await res.text()) || `Máy chủ trả về ${res.status}`);

                sessionRef.current = res.headers.get("Location") ?? "";
                const answer = await res.text();
                if (cancelled || pc !== peer) return;
                await peer.setRemoteDescription({ type: "answer", sdp: answer });

                // Cho kênh dữ liệu một khoảng để lên tiếng; im thì mới hỏi HTTP.
                window.setTimeout(() => {
                    if (cancelled || pc !== peer) return;
                    if (!gotChannelRef.current) startPolling();
                }, DATACHANNEL_PROBE_MS);
                // Bấm timeline trong lúc đang bắt tay: áp ngay khi phiên sẵn sàng.
                if (pendingSeekRef.current != null) {
                    const target = pendingSeekRef.current;
                    pendingSeekRef.current = null;
                    void control({ atMs: target });
                }
            } catch (error) {
                if (cancelled) return;
                setState("error");
                setErrorMessage(
                    error instanceof Error ? error.message : "Không mở được bản ghi",
                );
                retryTimer = window.setTimeout(() => void connect(), RETRY_DELAY_MS);
            }
        };

        void connect();

        // Tải lại trang / đóng tab không chạy cleanup của effect — xem ghi chú
        // dài ở webrtc-player.tsx. Phiên xem lại còn tốn hơn phiên xem trực
        // tiếp: mỗi phiên là một PlaybackSource riêng đang đọc file.
        const onPageHide = (event: PageTransitionEvent) => {
            if (!event.persisted) teardown();
        };
        window.addEventListener("pagehide", onPageHide);

        return () => {
            cancelled = true;
            window.clearTimeout(retryTimer);
            window.removeEventListener("pagehide", onPageHide);
            teardown();
            if (videoElement) videoElement.srcObject = null;
        };
        // startMs cố tình KHÔNG nằm trong deps: đổi mốc là gọi seek(), không
        // phải dựng lại cả phiên WebRTC.
    }, [cameraId, control]);

    const togglePlay = useCallback(() => {
        const next = !paused;
        setPaused(next);
        void control({ paused: next });
    }, [paused, control]);

    useEffect(() => {
        const onFs = () => setIsFullscreen(document.fullscreenElement === wrapRef.current);
        document.addEventListener("fullscreenchange", onFs);
        return () => document.removeEventListener("fullscreenchange", onFs);
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        else void wrapRef.current?.requestFullscreen().catch(() => {});
    }, []);

    return (
        <div
            ref={wrapRef}
            className={`group relative flex items-center justify-center bg-black ${className ?? ""}`}
        >
            <video
                ref={videoRef}
                className="h-full w-full object-contain"
                muted
                autoPlay
                playsInline
                // Chế độ tường: bấm video KHÔNG tạm dừng (để cú bấm nổi lên ô
                // cha chọn ô); phát/dừng do thanh chung của tường lo.
                onClick={showChrome ? togglePlay : undefined}
            />

            {/* Khung phát hiện ĐÃ LƯU. Thẻ video ở đây luôn object-contain nên
                lớp phủ dùng fit="contain" để trừ đúng phần viền đen. */}
            {showDetections ? (
                <DetectionOverlay
                    motion={motionCells}
                    boxes={playbackBoxes}
                    videoRef={videoRef}
                    fit="contain"
                    transform="none"
                    transition="none"
                    showLabels={detectionLabels}
                    types={detectionTypes}
                    showZones={false}
                />
            ) : null}

            {state !== "playing" ? (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/25 border-t-white" />
                    <span className="text-xs text-white/80">
                        {state === "error" ? "Không mở được bản ghi" : "Đang mở bản ghi..."}
                    </span>
                    {errorMessage ? (
                        <span className="max-w-xs text-center text-[11px] text-white/60">
                            {errorMessage}
                        </span>
                    ) : null}
                </div>
            ) : null}

            {state === "playing" && (ended || waiting) ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-12 flex justify-center">
                    <span className="flex items-center gap-2 rounded bg-black/60 px-3 py-1.5 text-xs text-white/90">
                        {waiting ? (
                            <>
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                                Đang chờ đoạn ghi kế tiếp...
                            </>
                        ) : (
                            "Đã hết bản ghi — bấm chỗ khác trên timeline"
                        )}
                    </span>
                </div>
            ) : null}

            {showChrome && state === "playing" && paused && !ended ? (
                <button
                    type="button"
                    onClick={togglePlay}
                    className="absolute inset-0 flex items-center justify-center"
                    aria-label="Phát"
                >
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white transition group-hover:bg-black/70">
                        <Play size={30} className="ml-1" />
                    </span>
                </button>
            ) : null}

            {/* Thanh điều khiển tối giản — thanh tua là timeline bên dưới. Ẩn ở
                chế độ tường: cả tường dùng một thanh điều khiển chung. */}
            <div
                className={
                    "absolute inset-x-0 bottom-0 flex items-center gap-3 bg-linear-to-t from-black/70 to-transparent px-3 py-2 opacity-0 transition-opacity group-hover:opacity-100 " +
                    (showChrome ? "" : "hidden")
                }
            >
                <button
                    type="button"
                    onClick={togglePlay}
                    className="text-white/90 hover:text-white"
                    aria-label={paused ? "Phát" : "Tạm dừng"}
                >
                    {paused ? <Play size={18} /> : <Pause size={18} />}
                </button>
                {timeLabel ? (
                    <span className="font-mono text-xs text-white/90">{timeLabel}</span>
                ) : null}
                <SpeedPicker value={rate} onChange={onRateChange} className="ml-2" />
                <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="ml-auto text-white/90 hover:text-white"
                    aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                >
                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                </button>
            </div>
        </div>
    );
});
