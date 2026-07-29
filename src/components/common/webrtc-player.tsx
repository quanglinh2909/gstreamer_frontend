import { useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle, Search, VideoOff } from "lucide-react";
import { usePointerZoom } from "@/hooks/use-pointer-zoom";
import { useLiveDetections } from "@/hooks/use-live-detections";
import type { FeedTab } from "@/lib/event-feed-shared";
import { ICE_SERVERS } from "@/lib/webrtc-ice";
import { DetectionOverlay } from "./detection-overlay";

// Client WHEP (WebRTC-HTTP Egress Protocol) — cùng giao thức MediaMTX dùng.
//
// Luồng trao đổi, không dùng trickle ICE ở cả hai đầu:
//
//   1. tạo RTCPeerConnection, thêm transceiver video hướng recvonly
//   2. createOffer + setLocalDescription
//   3. ĐỢI gom ICE candidate của trình duyệt   <- bước hay bị bỏ sót
//   4. POST offer.sdp  ->  nhận answer.sdp + header Location
//   5. setRemoteDescription(answer)
//   6. lúc rời trang: DELETE Location, rồi pc.close()
//
// Bước 3 là bắt buộc vì phía engine cũng không trickle: nếu POST offer khi
// chưa có candidate nào thì engine không có đường nào để kết nối ngược lại và
// phiên treo ở trạng thái "connecting" cho tới lúc timeout. Nhưng cũng KHÔNG
// đợi tới "complete" — xem waitForIceGathering().
//
// Tự phục hồi: camera IP hay bật smart-encoding (IDR cách nhau hàng chục
// giây), wifi hay rớt gói — nên phiên có thể "đứng hình" mà không có event
// nào từ WebRTC. Player này canh framesDecoded qua getStats(): playing mà
// đứng yên quá lâu, hoặc kết nối failed/disconnected, thì tự đập đi nối lại.

// WHEP nằm ở engine C++ (cổng 8009), tức proxy "backend-process" — KHÔNG phải
// "/api/backend" (proxy đó trỏ sang backend Python cổng 8010 và sẽ trả về
// {"detail":"Not Found"} của FastAPI).
const WHEP_PROXY = "/api/backend-process";

// Đứng hình bao lâu thì coi là chết và nối lại. Đặt khá cao vì người xem vào
// giữa GOP dài sẽ "0 frame" một cách hợp lệ tới vài chục giây — nối lại sớm
// hơn chỉ tổ reset đồng hồ chờ IDR về 0.
const STALL_RECONNECT_MS = 15000;
const STATS_POLL_MS = 3000;
const RETRY_DELAY_MS = 2000;


type PlayerState = "idle" | "connecting" | "playing" | "reconnecting" | "error";

export function WebRtcPlayer({
    cameraId,
    className,
    muted = true,
    fit = "fill",
    onZoomedChange,
    detectionOrigin = "",
    showDetections = false,
    detectionLabels = true,
    detectionTypes,
    detectionZonesVisible = true,
}: {
    cameraId: string;
    className?: string;
    muted?: boolean;
    // "fill": giãn khít ô (tường camera nhiều ô nhỏ — chấp nhận méo nhẹ);
    // "contain": giữ đúng tỉ lệ (player lớn một ô, vd trang Xem lại).
    fit?: "fill" | "contain";
    // Báo ra ngoài khi ảnh đang được phóng to. Phần tử cha dùng tín hiệu này
    // để TẮT thuộc tính draggable của mình: nếu cha vẫn draggable, trình duyệt
    // khởi động thao tác kéo ngay khi chuột nhích và nuốt gần hết pointermove
    // — rê 110px mà ảnh chỉ dịch được 9px.
    onZoomedChange?: (zoomed: boolean) => void;
    // Vẽ khung phát hiện của AI đè lên hình. Origin là backend PYTHON
    // (WEBSOCKET_ORIGIN, cổng 8010) — KHÁC origin WHEP của engine C++.
    // Không truyền/không bật thì không mở socket nào, chi phí bằng 0.
    detectionOrigin?: string;
    showDetections?: boolean;
    detectionLabels?: boolean;
    // Chỉ vẽ khung của các loại này (undefined = hết).
    detectionTypes?: Set<FeedTab>;
    // Vẽ cả VÙNG giám sát (polygon) của cấu hình AI.
    detectionZonesVisible?: boolean;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const zoom = usePointerZoom<HTMLDivElement>();
    const [state, setState] = useState<PlayerState>("connecting");
    const [errorMessage, setErrorMessage] = useState("");
    // "idle" suy ra từ prop chứ không giữ trong state: gán state ngay trong
    // thân effect sẽ gây thêm một vòng render, và React 19 cũng chặn bằng lint.
    const displayState: PlayerState = cameraId ? state : "idle";

    const isZoomed = zoom.isZoomed;
    useEffect(() => {
        onZoomedChange?.(isZoomed);
    }, [isZoomed, onZoomedChange]);

    // Chỉ mở socket khi thực sự đang hiện hình và người dùng bật lớp phủ.
    const { boxes: detectionBoxes, zones: detectionZones } = useLiveDetections(
        detectionOrigin,
        cameraId,
        showDetections && displayState === "playing",
    );

    useEffect(() => {
        if (!cameraId) return;

        // videoRef.current có thể đã đổi khi cleanup chạy, nên giữ lại phần tử
        // đang thực sự gắn stream ngay tại đây.
        const videoElement = videoRef.current;
        let isCancelled = false;
        let pc: RTCPeerConnection | null = null;
        let sessionUrl = "";
        let retryTimer = 0;
        let statsTimer = 0;
        let attempt = 0;

        // Đợi gom ICE, nhưng KHÔNG đợi tới trạng thái "complete".
        //
        // Đo thực tế trên máy chủ: mọi candidate hữu ích đã về sau 134-243ms
        // (host -> srflx -> relay), nhưng iceGatheringState vẫn nằm ở
        // "gathering" quá 5 giây — Chrome giữ phiên gom mở vì lần cấp phát TURN
        // qua TCP không dứt điểm (không trả lời mà cũng không lỗi). Đợi
        // "complete" vì thế luôn ăn trọn 3 giây trần bên dưới, chiếm hơn nửa
        // thời gian chờ của người dùng.
        //
        // Nên chốt theo "im lặng": không có candidate mới trong QUIET_MS thì
        // coi như xong. Chỉ cho phép chốt sớm khi ĐÃ có srflx hoặc relay —
        // xem qua Internet cần engine biết địa chỉ công cộng của trình duyệt
        // thì TURN của nó mới mở quyền cho gói tin đi vào. Mạng LAN không có
        // Internet sẽ không bao giờ có srflx, nên vẫn có mốc EARLY_FLOOR_MS để
        // chốt bằng host candidate thay vì đợi hết 3s.
        const waitForIceGathering = (peer: RTCPeerConnection) =>
            new Promise<void>((resolve) => {
                if (peer.iceGatheringState === "complete") {
                    resolve();
                    return;
                }
                const QUIET_MS = 250;
                const EARLY_FLOOR_MS = 1200;
                const startedAt = Date.now();
                let hasPublic = false;
                let quietTimer = 0;

                const finish = () => {
                    window.clearTimeout(quietTimer);
                    window.clearTimeout(hardTimer);
                    peer.removeEventListener("icegatheringstatechange", onChange);
                    peer.removeEventListener("icecandidate", onCandidate);
                    resolve();
                };
                // Chốt chặn cuối: mạng chặn hẳn STUN thì không có gì để đợi.
                const hardTimer = window.setTimeout(finish, 3000);

                const armQuiet = () => {
                    window.clearTimeout(quietTimer);
                    quietTimer = window.setTimeout(() => {
                        if (hasPublic || Date.now() - startedAt >= EARLY_FLOOR_MS) finish();
                        else armQuiet();
                    }, QUIET_MS);
                };

                function onCandidate(event: RTCPeerConnectionIceEvent) {
                    // candidate rỗng = trình duyệt báo đã gom xong.
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
                function onChange() {
                    if (peer.iceGatheringState === "complete") finish();
                }
                peer.addEventListener("icecandidate", onCandidate);
                peer.addEventListener("icegatheringstatechange", onChange);
                armQuiet();
            });

        const teardownSession = () => {
            window.clearInterval(statsTimer);
            statsTimer = 0;
            // Báo engine dọn phiên ngay thay vì đợi watchdog. keepalive để
            // request vẫn đi được khi component unmount lúc chuyển trang.
            if (sessionUrl) {
                void fetch(`${WHEP_PROXY}${sessionUrl}`, {
                    method: "DELETE",
                    keepalive: true,
                }).catch(() => {});
                sessionUrl = "";
            }
            if (pc) {
                pc.ontrack = null;
                pc.onconnectionstatechange = null;
                pc.close();
                pc = null;
            }
        };

        const scheduleReconnect = (reason: string) => {
            if (isCancelled) return;
            teardownSession();
            attempt += 1;
            setState("reconnecting");
            setErrorMessage(reason);
            // Backoff nhẹ, trần 10s: camera đang khởi động lại thì thử mãi
            // từng 2s chỉ tổ dội request vô ích.
            const delay = Math.min(RETRY_DELAY_MS * attempt, 10000);
            retryTimer = window.setTimeout(() => void connect(), delay);
        };

        // Canh đứng hình: playing mà framesDecoded không nhích trong
        // STALL_RECONNECT_MS thì phiên coi như chết dù WebRTC vẫn "connected"
        // (gói rớt giữa GOP dài là rơi vào đúng ca này).
        const watchStalls = (peer: RTCPeerConnection) => {
            let lastFrames = -1;
            let stalledSince = 0;
            statsTimer = window.setInterval(async () => {
                if (isCancelled || !pc || pc !== peer) return;
                let frames = -1;
                try {
                    const stats = await peer.getStats();
                    stats.forEach((entry) => {
                        if (entry.type === "inbound-rtp" && entry.kind === "video") {
                            frames = (entry as { framesDecoded?: number }).framesDecoded ?? -1;
                        }
                    });
                } catch {
                    return;
                }
                if (frames > lastFrames) {
                    lastFrames = frames;
                    stalledSince = 0;
                    // Có frame mới nghĩa là phiên khỏe hẳn — reset backoff.
                    attempt = 0;
                    setState("playing");
                    return;
                }
                stalledSince += STATS_POLL_MS;
                if (stalledSince >= STALL_RECONNECT_MS) {
                    scheduleReconnect(
                        lastFrames <= 0
                            ? "Chưa nhận được khung hình từ camera, đang kết nối lại..."
                            : "Hình bị đứng, đang kết nối lại...",
                    );
                }
            }, STATS_POLL_MS);
        };

        const connect = async () => {
            if (isCancelled) return;
            setState(attempt === 0 ? "connecting" : "reconnecting");
            if (attempt === 0) setErrorMessage("");

            try {
                const peer = new RTCPeerConnection({ iceServers: ICE_SERVERS });
                pc = peer;

                peer.addTransceiver("video", { direction: "recvonly" });

                peer.ontrack = (event) => {
                    if (isCancelled || !videoElement) return;
                    videoElement.srcObject = event.streams[0];
                };

                peer.onconnectionstatechange = () => {
                    if (isCancelled || pc !== peer) return;
                    if (peer.connectionState === "connected") {
                        setState("playing");
                        watchStalls(peer);
                    } else if (
                        peer.connectionState === "failed" ||
                        peer.connectionState === "disconnected"
                    ) {
                        // "disconnected" của Chrome có thể tự hồi, nhưng đường
                        // nối lại của ta cũng chỉ mất ~1s trong LAN — nối lại
                        // luôn cho hành vi dễ đoán.
                        scheduleReconnect("Mất kết nối, đang kết nối lại...");
                    }
                };

                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);
                await waitForIceGathering(peer);
                if (isCancelled || pc !== peer) return;

                const response = await fetch(
                    `${WHEP_PROXY}/cameras/${encodeURIComponent(cameraId)}/whep`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/sdp" },
                        body: peer.localDescription?.sdp ?? offer.sdp ?? "",
                    },
                );

                if (!response.ok) {
                    throw new Error(
                        (await response.text()) || `Máy chủ trả về ${response.status}`,
                    );
                }

                sessionUrl = response.headers.get("Location") ?? "";
                const answerSdp = await response.text();
                if (isCancelled || pc !== peer) return;

                await peer.setRemoteDescription({ type: "answer", sdp: answerSdp });
            } catch (error) {
                if (isCancelled) return;
                // Lỗi từ server (camera offline, engine chưa chạy) thì hiện
                // lỗi và vẫn thử lại — camera online trở lại là tự có hình.
                const detail =
                    error instanceof Error ? error.message : "Không thể kết nối WebRTC";
                setState("error");
                setErrorMessage(detail);
                attempt += 1;
                retryTimer = window.setTimeout(
                    () => void connect(),
                    Math.min(RETRY_DELAY_MS * attempt, 10000),
                );
            }
        };

        void connect();

        return () => {
            isCancelled = true;
            window.clearTimeout(retryTimer);
            teardownSession();
            if (videoElement) videoElement.srcObject = null;
        };
    }, [cameraId]);

    return (
        <div className={className}>
            <div
                ref={zoom.containerRef}
                {...zoom.panHandlers}
                // Nháy đúp về lại toàn khung — thao tác quen thuộc, đỡ phải rê
                // tới nút hoàn tác ở góc.
                onDoubleClick={zoom.reset}
                // Khi đang phóng to, chặn thao tác kéo của phần tử cha (ô
                // camera ở trang Xem trực tiếp đặt draggable lên cả ô). Không
                // chặn thì giữ chuột rê ảnh sẽ bị trình duyệt hiểu thành kéo ô
                // đi, và không tài nào xem được vùng khác của ảnh đang phóng.
                onDragStart={(event) => {
                    if (!zoom.isZoomed) return;
                    event.preventDefault();
                    event.stopPropagation();
                }}
                // Rê chuột giữ nguyên mũi tên, chỉ đổi sang bàn tay lúc đang
                // thực sự kéo ảnh.
                className={`relative h-full w-full overflow-hidden bg-slate-950 ${
                    zoom.isPanning ? "cursor-grabbing" : ""
                }`}
            >
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={muted}
                    // Chrome cho kéo phần tử media theo mặc định; để nguyên thì
                    // thao tác kéo mang theo dữ liệu media của trình duyệt thay
                    // vì dữ liệu ô mà ta đặt.
                    draggable={false}
                    // object-fill chứ không phải contain/cover: ô trong tường
                    // hiếm khi đúng tỉ lệ camera, contain thì thừa viền đen còn
                    // cover thì cắt mất rìa khung hình (mất luôn dòng ngày giờ
                    // camera in ở mép). Giãn cho khít ô, chấp nhận méo nhẹ.
                    // Trang player lớn (Xem lại) truyền fit="contain" để giữ tỉ lệ.
                    className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-fill"}`}
                    style={{
                        // transform-origin ở góc trên trái để khớp với công
                        // thức trong usePointerZoom.
                        transformOrigin: "0 0",
                        transform: `translate(${zoom.transform.x}px, ${zoom.transform.y}px) scale(${zoom.transform.scale})`,
                        // Không làm mượt lúc đang kéo: mỗi khung hình đã là một
                        // vị trí mới, thêm transition sẽ thành trễ và giật.
                        transition: zoom.isPanning ? "none" : "transform 90ms linear",
                    }}
                />

                {/* Khung phát hiện AI — nhận ĐÚNG transform của thẻ video để
                    bám theo lúc phóng to/kéo ảnh. */}
                {showDetections && displayState === "playing" ? (
                    <DetectionOverlay
                        boxes={detectionBoxes}
                        zones={detectionZones}
                        showZones={detectionZonesVisible}
                        videoRef={videoRef}
                        fit={fit}
                        showLabels={detectionLabels}
                        types={detectionTypes}
                        transform={`translate(${zoom.transform.x}px, ${zoom.transform.y}px) scale(${zoom.transform.scale})`}
                        transition={zoom.isPanning ? "none" : "transform 90ms linear"}
                    />
                ) : null}

                {/* Chỉ báo đặt góc dưới TRÁI để không đụng cụm nút toàn màn
                    hình / dừng của thẻ camera ở góc dưới phải. */}
                {zoom.isZoomed && displayState === "playing" ? (
                    <button
                        type="button"
                        onClick={zoom.reset}
                        title="Về lại toàn khung (hoặc nháy đúp)"
                        className="absolute bottom-3 left-3 z-20 inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-black/55 px-3 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-black/75"
                    >
                        <Search size={13} aria-hidden="true" />
                        {zoom.transform.scale.toFixed(1)}x
                    </button>
                ) : null}

                {displayState !== "playing" ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 text-center text-white">
                        {displayState === "connecting" || displayState === "reconnecting" ? (
                            <div className="flex max-w-xs flex-col items-center gap-2 px-4">
                                <LoaderCircle size={26} className="animate-spin" aria-hidden="true" />
                                <p className="text-sm font-semibold">
                                    {displayState === "connecting"
                                        ? "Đang kết nối WebRTC..."
                                        : "Đang kết nối lại..."}
                                </p>
                                {errorMessage ? (
                                    <p className="text-xs text-slate-300">{errorMessage}</p>
                                ) : null}
                            </div>
                        ) : displayState === "error" ? (
                            <div className="flex max-w-xs flex-col items-center gap-2 px-4">
                                <AlertTriangle size={26} className="text-amber-400" aria-hidden="true" />
                                <p className="text-sm font-semibold">Không xem được luồng trực tiếp</p>
                                <p className="text-xs text-slate-300">{errorMessage}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                <VideoOff size={26} aria-hidden="true" />
                                <p className="text-sm font-semibold">Chưa chọn camera</p>
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
