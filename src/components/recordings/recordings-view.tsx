import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { AlertTriangle, Bell, CalendarDays, Eye, Radio, Search, Video } from "lucide-react";
import { DetectionFilter } from "@/components/common/detection-filter";
import { ALL_TABS, type FeedTab } from "@/lib/event-feed-shared";
import type { ICameraResponse } from "@/interface/camera";
import { WebRtcPlayer } from "@/components/common/webrtc-player";
import {
    fetchMotionEvents,
    fetchSegments,
    segmentCovering,
    type MotionEvent,
    type RecordingSegment,
} from "@/lib/recordings";
import { PlaybackVideo, type PlaybackVideoHandle } from "./playback-video";
import { Timeline, type TimelineAiEvent } from "./timeline";
import { RecordingsEventPanel } from "./event-feed-panel";
import { useCameraEventFeed } from "@/hooks/use-camera-event-feed";
import { useLiveViewers } from "@/hooks/use-live-viewers";
import { RegionSearchLayer, RegionSearchPanel, useRegionSearch } from "./region-search";

const DEFAULT_SPAN = 6 * 3_600_000;

function startOfDay(ms: number): number {
    const x = new Date(ms);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
}
function toDateInputValue(ms: number): string {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
// Khung nhìn kết thúc ĐÚNG TẠI "bây giờ": vạch live nằm sát mép phải, không
// chừa khoảng trống tương lai phía trước — đúng kiểu đầu ghi.
function liveWindow(nowMs: number, span: number): [number, number] {
    return [nowMs - span, nowMs];
}

export function RecordingsView({
    cameras,
    eventWsOrigin = "",
}: {
    cameras: ICameraResponse[];
    eventWsOrigin?: string;
}) {
    const router = useRouter();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    // Bảng sự kiện bên phải (đóng/mở bằng nút chuông).
    const [eventsPanelOpen, setEventsPanelOpen] = useState(true);
    // Vẽ khung phát hiện AI đè lên hình trực tiếp + lọc theo loại. MẶC ĐỊNH
    // TẮT: lớp phủ che mất hình, ai cần thì tự bật.
    const [showBoxes, setShowBoxes] = useState(false);
    const [boxTypes, setBoxTypes] = useState<Set<FeedTab>>(() => new Set(ALL_TABS));
    const [showZones, setShowZones] = useState(true);
    // Chế độ khoanh vùng trên hình để tìm sự kiện đã đi qua vùng đó.
    const [regionSearch, setRegionSearch] = useState(false);
    // Thông báo thoáng qua (bấm sự kiện không có bản ghi…).
    const [notice, setNotice] = useState("");
    // "live" = đang xem trực tiếp (mặc định khi vào); bấm vào timeline mới
    // chuyển sang "playback" xem bản ghi; nút LIVE quay về trực tiếp.
    const [mode, setMode] = useState<"live" | "playback">("live");
    const [dayMs, setDayMs] = useState<number>(() => startOfDay(Date.now()));
    const [segments, setSegments] = useState<RecordingSegment[]>([]);
    const [motion, setMotion] = useState<MotionEvent[]>([]);
    // Mốc MỞ phiên xem lại. Chỉ đổi khi vào lại chế độ xem lại từ live; các cú
    // bấm sau đó đi bằng lệnh seek nên KHÔNG dựng lại phiên WebRTC.
    const [playbackStartMs, setPlaybackStartMs] = useState<number>(() => Date.now());
    const [now, setNow] = useState<number>(() => Date.now());
    // Mốc đang phát lại (giờ tường). Chỉ có nghĩa ở chế độ playback.
    const [playMs, setPlayMs] = useState<number>(() => Date.now());
    // Tốc độ tua x1..x64 (thang mũ 2). Engine bơm nhanh hơn (x4 trở lên chỉ gửi
    // keyframe), KHÔNG phải playbackRate của thẻ video.
    const [speed, setSpeed] = useState(1);
    const [window_, setWindow] = useState<[number, number]>(() =>
        liveWindow(Date.now(), DEFAULT_SPAN),
    );

    // Trạng thái tìm-theo-vùng nằm ở TRANG, không ở lớp phủ: lớp kéo đè lên
    // video còn kết quả hiện ở panel bên phải, hai chỗ cách xa nhau trong cây.
    const region = useRegionSearch(selectedId ?? "", window_[0], window_[1]);

    // Dòng sự kiện cũng do TRANG giữ: timeline vẽ vạch từ chính danh sách này,
    // nên nó phải sống độc lập với việc panel bên phải đang mở hay đóng.
    const feed = useCameraEventFeed(eventWsOrigin, selectedId, !!selectedId);
    // Số người đang xem trực tiếp từng camera — badge trong danh sách bên trái.
    const { liveByCamera } = useLiveViewers(5000);
    const aiEvents = useMemo<TimelineAiEvent[]>(
        () =>
            feed.events.map((e) => ({
                key: e.key,
                ms: Number(e.event.timestamp) * 1000,
                tab: e.tab,
            })),
        [feed.events],
    );

    const playerRef = useRef<PlaybackVideoHandle>(null);
    const dateInputRef = useRef<HTMLInputElement>(null);
    const segmentsRef = useRef<RecordingSegment[]>([]);
    segmentsRef.current = segments;
    const playRef = useRef(playMs);
    playRef.current = playMs;
    const modeRef = useRef(mode);
    modeRef.current = mode;
    // Mốc chờ nhảy tới sau khi ĐỔI NGÀY (bấm một sự kiện ở ngày khác): đoạn ghi
    // của ngày mới nạp bất đồng bộ, seek được áp khi segments về (effect dưới).
    const pendingSeekRef = useRef<number | null>(null);
    // Vào chế độ xem lại tại một mốc giờ tường.
    //
    // Phiên WebRTC chỉ mở MỘT LẦN: nếu đang xem lại rồi thì cú bấm này chỉ là
    // một lệnh seek (~vài chục ms), không dựng lại gì cả. Đây chính là chỗ
    // khác biệt lớn nhất so với đường HLS cũ — hồi đó mỗi cú bấm phải tải lại
    // playlist cả ngày (1,17 MB) rồi dựng lại player.
    const enterPlayback = useCallback(
        (wallMs: number, segs?: RecordingSegment[]) => {
            if (!selectedId) return;
            const source = segs ?? segmentsRef.current;
            // Không có đoạn ghi nào PHỦ mốc này -> chẳng có gì để phát, về
            // live. Dùng chung phép kiểm với `jumpOrWarn`: hai phép kiểm khác
            // nhau thì sẽ có ca cảnh báo hiện ra mà vẫn nhảy, hoặc ngược lại.
            if (!segmentCovering(source, wallMs)) {
                setMode("live");
                return;
            }
            setPlayMs(wallMs);
            if (modeRef.current === "playback" && playerRef.current) {
                playerRef.current.seek(wallMs);
                return;
            }
            setPlaybackStartMs(wallMs);
            setMode("playback");
        },
        [selectedId],
    );

    // Co khung timeline ôm quanh một mốc giờ (giữ nguyên độ rộng đang xem).
    //
    // KHÔNG căn giữa thẳng thừng: mốc vừa bấm thường sát hiện tại, căn giữa là
    // nửa khung bên phải rơi vào TƯƠNG LAI và hiện ra một dải trống trơn. Kéo
    // mép phải về chỗ còn dữ liệu — giống hệt cách chế độ LIVE ghim "bây giờ"
    // vào mép phải.
    const focusWindowOn = useCallback((wallMs: number) => {
        setWindow(([s, e]) => {
            const span = Math.max(e - s, 10 * 60_000);
            const segs = segmentsRef.current;
            const dataEnd = segs.length
                ? Math.max(...segs.map((x) => x.endMs))
                : 0;
            const limit = Math.min(Date.now(), dataEnd || Date.now());
            // `limit` có thể nằm trước mốc bấm (dữ liệu chưa kịp về) — lúc đó
            // đừng đẩy mốc ra ngoài khung.
            const end = Math.max(Math.min(wallMs + span / 2, limit), wallMs);
            return [end - span, end];
        });
    }, []);

    // Bấm một sự kiện ở bảng bên phải -> nhảy timeline + phát lại tại thời điểm
    // đó. Sự kiện khác ngày đang xem thì đổi ngày trước; đoạn ghi nạp bất đồng
    // bộ nên seek được hoãn lại (pendingSeekRef) tới khi segments của ngày mới
    // về (effect theo dõi segments bên dưới).
    // Nhảy tới một mốc giờ, HOẶC báo nếu lúc đó camera không hề ghi. Trước đây
    // cú bấm rơi vào khe hở vẫn nhảy rồi lặng lẽ rơi về LIVE — người dùng
    // tưởng nút hỏng.
    const jumpOrWarn = useCallback(
        (wallMs: number, segs: RecordingSegment[]) => {
            if (!segmentCovering(segs, wallMs)) {
                setNotice(
                    `Không có bản ghi lúc ${new Date(wallMs).toLocaleTimeString("vi-VN")} — sự kiện này không xem lại được`,
                );
                return;
            }
            focusWindowOn(wallMs);
            enterPlayback(wallMs, segs);
        },
        [focusWindowOn, enterPlayback],
    );

    const seekToEvent = useCallback(
        (timestampSec: number) => {
            if (!selectedId || !Number.isFinite(timestampSec)) return;
            const wallMs = timestampSec * 1000;
            const evDay = startOfDay(wallMs);
            if (evDay !== dayMs) {
                pendingSeekRef.current = wallMs;
                setDayMs(evDay);
                return;
            }
            jumpOrWarn(wallMs, segmentsRef.current);
        },
        [selectedId, dayMs, jumpOrWarn],
    );

    // Thông báo tự tắt sau 4 giây.
    useEffect(() => {
        if (!notice) return;
        const t = window.setTimeout(() => setNotice(""), 4000);
        return () => window.clearTimeout(t);
    }, [notice]);

    // Áp mốc chờ khi đoạn ghi của đúng ngày đã nạp xong.
    useEffect(() => {
        const pending = pendingSeekRef.current;
        if (pending == null || segments.length === 0) return;
        if (startOfDay(pending) !== dayMs) return;
        pendingSeekRef.current = null;
        jumpOrWarn(pending, segments);
    }, [segments, dayMs, jumpOrWarn]);

    const dayStart = dayMs;
    const dayEnd = dayMs + 24 * 3_600_000;
    const isToday = useMemo(() => startOfDay(Date.now()) === dayMs, [dayMs]);

    // CỐ Ý không tự chọn camera nào khi vào trang: mở sẵn camera đầu danh sách
    // là tự động dựng một phiên WebRTC mà người dùng không hề yêu cầu. Họ chọn
    // thì mới xem. Ngoại lệ duy nhất là `?id=` trên URL — đó là lựa chọn cũ
    // của chính họ, khôi phục lại ngay bên dưới.

    // Chọn camera + ghi vào URL, để F5 (hoặc gửi link cho người khác) vẫn đứng
    // đúng camera đó. `replace` chứ không `push`: đổi camera mấy chục lần mà
    // nhét hết vào lịch sử thì nút Quay lại thành vô dụng. `shallow` để Next
    // không chạy lại getServerSideProps.
    const pickCamera = useCallback(
        (id: string) => {
            setSelectedId(id);
            void router.replace(
                { pathname: router.pathname, query: { ...router.query, id } },
                undefined,
                { shallow: true },
            );
        },
        [router],
    );

    // Khôi phục camera từ `?id=` đúng MỘT lần, và chỉ khi id đó có thật trong
    // danh sách — link cũ trỏ tới camera đã xoá thì rơi về màn hình "chọn
    // camera" chứ không dựng phiên tới một id không tồn tại.
    const restoredRef = useRef(false);
    useEffect(() => {
        if (restoredRef.current || !router.isReady || cameras.length === 0) return;
        restoredRef.current = true;
        const wanted = typeof router.query.id === "string" ? router.query.id : "";
        if (wanted && cameras.some((c) => c.id === wanted)) setSelectedId(wanted);
    }, [router.isReady, router.query.id, cameras]);

    // Đồng hồ 1s: cập nhật "bây giờ"; ở chế độ live, nếu khung đang bám mép
    // phải thì trượt theo (đã kéo về quá khứ thì thôi, không giật khung).
    useEffect(() => {
        const t = window.setInterval(() => {
            const n = Date.now();
            setNow(n);
            if (modeRef.current === "live") {
                setWindow(([s, e]) => {
                    if (n > e && n - e < 5_000) {
                        // Trượt khung để mép phải luôn = "bây giờ".
                        const shift = n - e;
                        return [s + shift, e + shift];
                    }
                    return [s, e];
                });
            }
        }, 1000);
        return () => window.clearInterval(t);
    }, []);

    // Nạp đoạn + chuyển động + playlist khi đổi camera/ngày.
    useEffect(() => {
        if (!selectedId) return;
        let cancelled = false;

        // fit=true chỉ ở lần nạp đầu (đổi camera/ngày): co khung timeline ôm
        // sát vùng có ghi thay vì 6h trống phía trước. Lần làm mới định kỳ
        // KHÔNG fit lại để không phá khung người dùng đang phóng/trượt.
        const load = async (fit: boolean) => {
            const [segs, evs] = await Promise.all([
                fetchSegments(selectedId, dayStart, dayEnd),
                fetchMotionEvents(selectedId, dayStart, dayEnd),
            ]);
            if (cancelled) return;
            setSegments(segs);
            setMotion(evs);
            // Co khung timeline ôm sát vùng có ghi của NGÀY đang chọn — KHÔNG
            // đụng tới video/mode. Chọn ngày chỉ để XEM timeline; muốn xem lại
            // thì bấm vào timeline, muốn xem trực tiếp thì bấm nút LIVE.
            if (fit && segs.length > 0) {
                if (isToday) {
                    const end = Date.now();
                    const s0 = segs[0].startMs;
                    if (end - s0 > 60_000) setWindow([s0, end]);
                } else {
                    const last = segs[segs.length - 1];
                    setWindow([segs[0].startMs, Math.min(dayEnd, last.endMs)]);
                }
            }
        };
        // Làm mới riêng phần ĐUÔI (vài phút gần nhất) cho nhanh.
        //
        // Không dùng lại load() cho việc này: nó tải đoạn của CẢ NGÀY — camera
        // ghi 4 giây một đoạn thì tới ~9.000 đoạn, gọi mỗi 10 giây là quá phí.
        // Đuôi chỉ có vài chục đoạn nên gọi dày thoải mái, và đây mới là chỗ
        // người dùng nhìn: thiếu nó thì mép phải timeline luôn đen trễ cả một
        // đoạn ghi (camera 60s/đoạn là đen tới hai phút) dù camera đang ghi.
        const loadTail = async () => {
            const now = Date.now();
            const tail = await fetchSegments(selectedId, now - 3 * 60_000, now + 60_000);
            if (cancelled || tail.length === 0) return;
            setSegments((prev) => {
                const byId = new Map(prev.map((s) => [s.id, s]));
                for (const seg of tail) byId.set(seg.id, seg);
                return [...byId.values()].sort((a, b) => a.startMs - b.startMs);
            });
        };

        void load(true);
        // Ngày hôm nay thì làm mới định kỳ để đoạn vừa đóng hiện lên timeline.
        // Nạp lại CẢ NGÀY thưa thôi: 5,5 MB cho camera ghi 4 giây một đoạn.
        // Đuôi đã lo phần dữ liệu mới, lần nạp đầy đủ này chỉ để bắt các thay
        // đổi ở quá khứ (đoạn bị dọn theo hạn mức dung lượng).
        const timer = isToday ? window.setInterval(() => void load(false), 5 * 60_000) : 0;
        const tailTimer = isToday ? window.setInterval(() => void loadTail(), 5_000) : 0;

        return () => {
            cancelled = true;
            if (timer) window.clearInterval(timer);
            if (tailTimer) window.clearInterval(tailTimer);
        };
    }, [selectedId, dayStart, dayEnd, isToday]);

    // Bấm/kéo-thả timeline: xem bản ghi tại mốc đó. Bấm sát "bây giờ" (chưa có
    // bản ghi để phát) thì về live.
    const handleSeek = useCallback(
        (wallMs: number) => {
            if (wallMs > now - 3_000) {
                setMode("live");
                return;
            }
            enterPlayback(wallMs);
        },
        [now, enterPlayback],
    );

    // Engine báo vị trí đang phát (epoch ms) — không phải suy ra từ
    // currentTime: bản ghi có khoảng trống nên thời gian media và giờ tường
    // không tỉ lệ với nhau.
    const handlePosition = useCallback((wallMs: number) => {
        if (modeRef.current !== "playback") return;
        setPlayMs(wallMs);
    }, []);

    const goLive = useCallback(() => {
        setMode("live");
        setDayMs(startOfDay(Date.now()));
        setWindow(([s, e]) => liveWindow(Date.now(), e - s));
    }, []);

    // Chọn một ngày từ lịch: CHỈ đổi khung timeline sang ngày đó, không đụng
    // video/mode. Khung co sát vùng có ghi khi dữ liệu về (load(fit)).
    const pickDay = useCallback((value: string) => {
        const [y, m, d] = value.split("-").map(Number);
        if (!y || !m || !d) return;
        const day = new Date(y, m - 1, d).getTime();
        setDayMs(day);
        if (startOfDay(Date.now()) === day) {
            setWindow(([s0, e0]) => liveWindow(Date.now(), e0 - s0));
        } else {
            setWindow([day, day + 24 * 3_600_000]);
        }
    }, []);

    // Nghe sự kiện 'change' GỐC của trình duyệt trên input date, KHÔNG dùng
    // onChange của React: React nuốt onChange khi giá trị trùng bộ-theo-dõi của
    // nó (chọn LẠI đúng ngày đang chọn), khiến không snap khung về được. Nút mở
    // lịch xoá tạm value="" nên chọn cùng ngày vẫn làm DOM đổi -> 'change' bắn.
    // selectedId trong deps: input date chỉ render sau khi đã chọn camera; hiệu
    // ứng phải chạy LẠI lúc đó để gắn listener (lần đầu ref còn null).
    useEffect(() => {
        const el = dateInputRef.current;
        if (!el) return;
        const onNative = () => { if (el.value) pickDay(el.value); };
        el.addEventListener("change", onNative);
        return () => el.removeEventListener("change", onNative);
    }, [pickDay, selectedId]);

    const selected = cameras.find((c) => c.id === selectedId) ?? null;
    const playhead = mode === "live" ? now : playMs;

    return (
        <div className="flex h-full min-h-0 bg-slate-950 text-slate-100">
            {/* Danh sách camera */}
            <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800">
                <div className="border-b border-slate-800 px-4 py-3">
                    <h1 className="text-sm font-semibold">Xem lại</h1>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Live mặc định · bấm timeline để xem bản ghi
                    </p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto py-1">
                    {cameras.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-slate-500">Chưa có camera</div>
                    ) : (
                        cameras.map((cam) => (
                            <button
                                key={cam.id}
                                type="button"
                                onClick={() => {
                                    pickCamera(cam.id);
                                    setMode("live");
                                    setDayMs(startOfDay(Date.now()));
                                    setWindow(([s, e]) => liveWindow(Date.now(), e - s));
                                }}
                                className={
                                    "flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors " +
                                    (cam.id === selectedId
                                        ? "bg-sky-500/15 text-sky-200"
                                        : "text-slate-300 hover:bg-slate-800/60")
                                }
                            >
                                <Video size={15} className="shrink-0" />
                                <span className="min-w-0 flex-1 truncate">{cam.name || cam.id}</span>
                                {(liveByCamera.get(cam.id) ?? 0) > 0 ? (
                                    <span
                                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300"
                                        title={`${liveByCamera.get(cam.id)} người đang xem trực tiếp camera này`}
                                    >
                                        <Eye size={11} aria-hidden="true" />
                                        {liveByCamera.get(cam.id)}
                                    </span>
                                ) : null}
                                <span
                                    className={
                                        "h-1.5 w-1.5 shrink-0 rounded-full " +
                                        (cam.state === "online" ? "bg-emerald-400" : "bg-slate-600")
                                    }
                                />
                            </button>
                        ))
                    )}
                </div>
            </aside>

            {/* Player + timeline */}
            <div className="flex min-w-0 flex-1 flex-col">
                {!selectedId ? (
                    <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
                        Chọn một camera bên trái để xem
                    </div>
                ) : (
                    <>
                        <div className="flex shrink-0 items-center gap-3 border-b border-slate-800 px-4 py-2">
                            <span className="truncate text-sm font-semibold">
                                {selected?.name || selectedId}
                            </span>
                            {mode === "live" ? (
                                <span className="flex items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                                    LIVE
                                </span>
                            ) : (
                                <span className="rounded bg-slate-700/50 px-1.5 py-0.5 text-[11px] font-semibold text-slate-300">
                                    XEM LẠI
                                </span>
                            )}
                            {/* Khung AI chỉ có nghĩa khi đang xem trực tiếp —
                                xem lại là đọc file, AI không chạy trên đó. */}
                            <button
                                type="button"
                                onClick={() => setRegionSearch((v) => !v)}
                                title="Khoanh một vùng trên hình để tìm sự kiện đã đi qua đó"
                                className={
                                    "ml-auto inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs font-medium transition-colors " +
                                    (regionSearch
                                        ? "border-sky-500 bg-sky-500/15 text-sky-300"
                                        : "border-slate-600 text-slate-300 hover:border-slate-500 hover:text-slate-100")
                                }
                            >
                                <Search size={13} />
                                Tìm theo vùng
                            </button>
                            <div>
                                <DetectionFilter
                                    enabled={showBoxes}
                                    onEnabledChange={setShowBoxes}
                                    types={boxTypes}
                                    onTypesChange={setBoxTypes}
                                    zonesVisible={showZones}
                                    onZonesVisibleChange={setShowZones}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setEventsPanelOpen((v) => !v)}
                                // Đang tìm theo vùng thì panel phải là của kết
                                // quả tìm — bấm nút này sẽ chẳng thấy gì đổi.
                                disabled={regionSearch}
                                title={
                                    regionSearch
                                        ? "Thoát tìm theo vùng để xem lại bảng sự kiện"
                                        : eventsPanelOpen
                                          ? "Ẩn bảng sự kiện"
                                          : "Hiện bảng sự kiện"
                                }
                                className={
                                    "inline-flex items-center gap-1.5 rounded border px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 " +
                                    (eventsPanelOpen && !regionSearch
                                        ? "border-sky-500 bg-sky-500/15 text-sky-300"
                                        : "border-slate-600 text-slate-300 hover:border-slate-500 hover:text-slate-100")
                                }
                            >
                                <Bell size={13} />
                                Sự kiện
                            </button>
                        </div>

                        <div className="relative min-h-0 flex-1 bg-black p-2">
                            {/* Thông báo thoáng qua. Đặt trên video, z cao hơn
                                cả lớp tìm-theo-vùng để không bị che. */}
                            {notice ? (
                                <div className="pointer-events-none absolute inset-x-0 top-4 z-40 flex justify-center px-4">
                                    <div className="flex items-center gap-2 rounded-lg bg-amber-500/95 px-3 py-2 text-xs font-medium text-slate-900 shadow-lg">
                                        <AlertTriangle size={14} className="shrink-0" />
                                        {notice}
                                    </div>
                                </div>
                            ) : null}

                            {mode === "live" ? (
                                <WebRtcPlayer
                                    cameraId={selectedId}
                                    className="h-full w-full"
                                    fit="contain"
                                    detectionOrigin={eventWsOrigin}
                                    showDetections={showBoxes}
                                    detectionTypes={boxTypes}
                                    detectionZonesVisible={showZones}
                                />
                            ) : (
                                <PlaybackVideo
                                    key={selectedId}
                                    ref={playerRef}
                                    cameraId={selectedId}
                                    startMs={playbackStartMs}
                                    className="h-full w-full"
                                    timeLabel={new Date(playMs).toLocaleTimeString()}
                                    rate={speed}
                                    onRateChange={setSpeed}
                                    onPosition={handlePosition}
                                    showDetections={showBoxes}
                                    detectionTypes={boxTypes}
                                />
                            )}

                            {regionSearch ? (
                                <RegionSearchLayer
                                    state={region}
                                    onClose={() => {
                                        setRegionSearch(false);
                                        region.reset();
                                    }}
                                />
                            ) : null}
                        </div>

                        {/* Timeline + cụm điều khiển bên phải (LIVE, chọn ngày) */}
                        <div className="flex shrink-0 items-stretch gap-3 border-t border-slate-800 bg-slate-950 px-4 pb-3 pt-8">
                            <div className="min-w-0 flex-1">
                                <Timeline
                                    windowStart={window_[0]}
                                    windowEnd={window_[1]}
                                    nowMs={now}
                                    playheadMs={playhead}
                                    segments={segments}
                                    motionEvents={motion}
                                    aiEvents={aiEvents}
                                    cameraId={selectedId}
                                    cameraLabel={selected?.name || selectedId || ""}
                                    isLive={mode === "live"}
                                    onSeek={handleSeek}
                                    onWindowChange={(s, e) => setWindow([s, e])}
                                />
                            </div>
                            {/* justify-center + mb-6: căn cụm nút vào giữa phần
                                THÂN timeline (trừ hàng chú thích dưới cùng),
                                không bị tụt lệch so với các dải. */}
                            <div className="mb-6 flex w-32 shrink-0 flex-col justify-center gap-2 border-l border-slate-800 pl-3 mt-[15px]">
                                <button
                                    type="button"
                                    onClick={goLive}
                                    className={
                                        "flex items-center justify-center gap-1.5 rounded border px-2 py-1.5 text-xs font-semibold transition-colors " +
                                        (mode === "live"
                                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                                            : "border-slate-600 text-slate-300 hover:border-emerald-500/60 hover:text-emerald-300")
                                    }
                                >
                                    <Radio size={13} />
                                    LIVE
                                </button>
                                {/* Nút hiển thị ngày: bấm là bung lịch, KHÔNG
                                    "bôi chọn" từng số như input date gốc. Input
                                    date thật ẩn phía sau, chỉ giữ giá trị + mở
                                    picker qua showPicker(). */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const el = dateInputRef.current;
                                            if (!el) return;
                                            // Đồng bộ value theo ngày ĐANG CHỌN để lịch
                                            // bật lên tô đúng ngày đó (input uncontrolled
                                            // nên phải set tay). Chọn ngày KHÁC -> 'change'
                                            // bắn -> pickDay. Chọn lại đúng ngày này thì
                                            // là no-op (đằng nào cũng đang ở ngày đó).
                                            el.value = toDateInputValue(dayMs);
                                            if (el.showPicker) el.showPicker();
                                            else el.focus();
                                        }}
                                        className="flex w-full items-center justify-between gap-2 rounded border border-slate-600 bg-slate-900 px-2 py-2 text-xs text-slate-200 transition-colors hover:border-slate-500"
                                    >
                                        <span className="font-mono">
                                            {new Date(dayMs).toLocaleDateString("vi-VN")}
                                        </span>
                                        <CalendarDays size={14} className="shrink-0 text-slate-400" />
                                    </button>
                                    <input
                                        ref={dateInputRef}
                                        type="date"
                                        defaultValue={toDateInputValue(dayMs)}
                                        max={toDateInputValue(Date.now())}
                                        // Không controlled, không onChange của React —
                                        // xem useEffect nghe 'change' gốc ở trên.
                                        // Ẩn hoàn toàn nhưng vẫn trong layout để
                                        // showPicker() neo lịch đúng vị trí nút.
                                        className="pointer-events-none absolute inset-0 h-full w-full opacity-0 [color-scheme:dark]"
                                        tabIndex={-1}
                                        aria-hidden="true"
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Panel phải — MỘT chỗ, hai nội dung. Đang tìm theo vùng thì kết
                quả chiếm chỗ bảng sự kiện: cùng lúc mở cả hai thì màn hình
                không đủ rộng, mà lúc đó người dùng cũng chỉ quan tâm kết quả
                tìm. Thoát tìm là bảng sự kiện tự hiện lại. */}
            {selectedId && regionSearch ? (
                <RegionSearchPanel
                    state={region}
                    cameraLabel={selected?.name || selectedId}
                    onPick={seekToEvent}
                    onClose={() => {
                        setRegionSearch(false);
                        region.reset();
                    }}
                />
            ) : selectedId && eventsPanelOpen ? (
                /* Bảng sự kiện realtime + lịch sử của camera đang xem. Socket
                   đã lọc theo camera ở backend nên chỉ nhận đúng camera này. */
                <RecordingsEventPanel
                    feed={feed}
                    cameraLabel={selected?.name || selectedId}
                    onSeek={seekToEvent}
                    onClose={() => setEventsPanelOpen(false)}
                />
            ) : null}
        </div>
    );
}
