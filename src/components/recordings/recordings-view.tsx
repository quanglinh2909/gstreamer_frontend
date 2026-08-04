import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import {
    AlertTriangle,
    Bell,
    CalendarDays,
    Eye,
    Menu,
    Radio,
    Search,
    Video,
    X,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import { DetectionFilter } from "@/components/common/detection-filter";
import { useMotionEventFeed } from "@/hooks/use-motion-event-feed";
import { SpeedPicker } from "@/components/common/speed-picker";
import {
    DrawerBackdrop,
    DrawerToggle,
    drawerClass,
} from "@/components/common/side-drawer";
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
import { MAX_SPAN, MIN_SPAN, Timeline, type TimelineAiEvent } from "./timeline";
import { RecordingsEventPanel } from "./event-feed-panel";
import { useCameraEventFeed } from "@/hooks/use-camera-event-feed";
import { useLiveViewers } from "@/hooks/use-live-viewers";
import { RegionSearchLayer, RegionSearchPanel, useRegionSearch } from "./region-search";
import { useAppMenuStore } from "@/stores/use-app-menu-store";

// Giữ ô của một KHUNG trên hình bấy nhiêu lâu. Engine bắn 5 khung/giây khi có
// động; hết động là không còn gói nào, nên phải tự hết hạn — không thì ô cuối
// cùng nằm lì trên hình và người xem tưởng vẫn đang có chuyển động.
const MOTION_FRAME_HOLD_MS = 1_200;

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
    engineWsOrigin = "",
}: {
    cameras: ICameraResponse[];
    // Backend PYTHON (/ws): sự kiện nhận diện.
    eventWsOrigin?: string;
    // ENGINE C++ (/wsc): sự kiện CHUYỂN ĐỘNG (motioncells chạy trong engine).
    engineWsOrigin?: string;
}) {
    const router = useRouter();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const toggleAppMenu = useAppMenuStore((state) => state.toggle);
    // Bảng sự kiện: MỞ SẴN ở mọi khổ màn. Trên mobile nó không phủ lên video nữa
    // mà nằm ngay dưới, nên mở sẵn là đúng — vào trang thấy luôn hình và dòng
    // sự kiện, không phải đi tìm nút bật.
    const [eventsPanelOpen, setEventsPanelOpen] = useState(true);
    // Ngăn kéo danh sách camera — chỉ có tác dụng dưới md, xem side-drawer.tsx.
    const [camListOpen, setCamListOpen] = useState(false);
    // Vẽ khung phát hiện AI đè lên hình trực tiếp + lọc theo loại. MẶC ĐỊNH
    // TẮT: lớp phủ che mất hình, ai cần thì tự bật.
    const [showBoxes, setShowBoxes] = useState(false);
    const [boxTypes, setBoxTypes] = useState<Set<FeedTab>>(() => new Set(ALL_TABS));
    const [showZones, setShowZones] = useState(true);
    // Vẽ ô đã động lên hình. Riêng khỏi `boxTypes` vì chuyển động không phải một
    // FeedTab — engine tự dò, không đi qua AI. Mặc định BẬT như mọi loại khung
    // khác (boxTypes khởi tạo bằng ALL_TABS): bật "Khung AI" là thấy đủ mọi thứ
    // đang được vẽ, không phải đi tìm thêm một công tắc nữa.
    const [showMotionCells, setShowMotionCells] = useState(true);
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

    // Ô chuyển động cho lớp phủ. Hai chế độ, hai nguồn khác hẳn nhau:
    //   live     -> WebSocket của engine, giữ lại vài giây sau khi sự kiện đóng
    //   playback -> tra trong danh sách sự kiện CỦA NGÀY (trang đã tải sẵn cho
    //               timeline) xem mốc đang phát rơi vào sự kiện nào
    const motionOverlayOn = showBoxes && showMotionCells && mode === "live";
    const frameCameras = useMemo(
        () => (motionOverlayOn && selectedId ? [selectedId] : []),
        [motionOverlayOn, selectedId],
    );
    const liveMotionOverlay = useMotionEventFeed(
        engineWsOrigin,
        motionOverlayOn,
        selectedId,
        frameCameras,
    );
    const motionOverlay = useMemo(() => {
        if (!showBoxes || !showMotionCells) return null;
        if (mode === "live") {
            // KHUNG realtime (5 gói/giây) là nguồn chính: thấy động là thấy
            // ngay, kể cả chỗ động ngoài vùng (vẽ đỏ) và cả những đợt động nhỏ
            // chưa đủ ngưỡng sinh sự kiện.
            const frame = selectedId ? liveMotionOverlay.frames[selectedId] : undefined;
            if (frame && now - frame.atMs <= MOTION_FRAME_HOLD_MS) {
                return {
                    cells: frame.inside,
                    outside: frame.outside,
                    gridX: frame.gridX,
                    gridY: frame.gridY,
                };
            }
            return null;
        }
        // Xem lại: sự kiện CHỨA mốc đang phát. Không lấy "gần nhất" — tua tới
        // chỗ không có chuyển động mà vẫn vẽ ô là nói dối người xem.
        const hit = motion.find((m) => m.startMs <= playMs && playMs <= m.endMs);
        if (!hit || !hit.cells) return null;
        return { cells: hit.cells, gridX: hit.gridX || 32, gridY: hit.gridY || 32 };
    }, [
        showBoxes,
        showMotionCells,
        mode,
        selectedId,
        liveMotionOverlay.frames,
        now,
        motion,
        playMs,
    ]);

    const playerRef = useRef<PlaybackVideoHandle>(null);
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

    // Phóng/thu khung timeline. Ở cấp TRANG chứ không trong Timeline nữa: nút
    // bấm giờ nổi trên video (khổ điện thoại), tức khác hẳn nhánh cây với thanh
    // timeline. Neo vào GIỮA khung — chạm không có vị trí con trỏ thường trực.
    const zoomTimeline = useCallback((factor: number) => {
        setWindow(([start, end]) => {
            const span = Math.max(MIN_SPAN, end - start);
            const centre = start + span / 2;
            const next = Math.min(MAX_SPAN, Math.max(MIN_SPAN, span * factor));
            let s = centre - next / 2;
            let e = centre + next / 2;
            // Không cho khung trôi quá "bây giờ" — giống clampWindow của Timeline.
            const maxEnd = Date.now();
            if (e > maxEnd) {
                e = maxEnd;
                s = maxEnd - next;
            }
            return [s, e];
        });
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


    const selected = cameras.find((c) => c.id === selectedId) ?? null;
    const playhead = mode === "live" ? now : playMs;

    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-950 text-slate-100 md:flex-row">
            {/* Danh sách camera — ngăn kéo trên mobile, cột từ md. */}
            <DrawerBackdrop open={camListOpen} onClose={() => setCamListOpen(false)} />
            <aside
                className={
                    "flex flex-col border-r border-slate-800 bg-slate-950 md:shrink-0 " +
                    drawerClass("left", camListOpen, "md:w-64")
                }
            >
                <div className="flex items-start gap-2 border-b border-slate-800 px-4 py-3">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-sm font-semibold">Xem lại</h1>
                        <p className="mt-0.5 text-xs text-slate-500">
                            Live mặc định · bấm timeline để xem bản ghi
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setCamListOpen(false)}
                        aria-label="Đóng danh sách camera"
                        className="-mr-1 -mt-1 shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 md:hidden"
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
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
                                    // Ngăn kéo che hết khung xem trên mobile.
                                    setCamListOpen(false);
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
            {/* shrink-0 trên mobile: cụm video+timeline lấy đúng chiều cao
                nó cần, phần còn lại nhường hết cho bảng sự kiện bên dưới. */}
            <div className="flex min-w-0 shrink-0 flex-col md:flex-1">
                {/* MỘT thanh duy nhất trên mobile: nút mở ngăn kéo + tên
                    camera + toàn bộ nút điều khiển. Trước đây là HAI hàng chồng
                    nhau, mà hàng trên gần như trống — 44px đó trên màn điện
                    thoại là bằng hai dòng sự kiện.

                    Dựng NGOÀI nhánh điều kiện bên dưới: lúc chưa chọn camera
                    nào mà thanh này không tồn tại thì không còn cách nào mở
                    được danh sách camera. */}
                <div className="flex shrink-0 items-center gap-2 border-b border-slate-800 px-3 py-2 md:gap-3 md:px-4">
                    {/* Menu ỨNG DỤNG — trang này tắt thanh ngang của MainLayout
                        để khỏi tốn thêm 44px chiều cao. */}
                    <DrawerToggle label="Mở menu" onClick={toggleAppMenu}>
                        <Menu size={16} aria-hidden="true" />
                    </DrawerToggle>
                    <DrawerToggle
                        label="Danh sách camera"
                        onClick={() => setCamListOpen(true)}
                    >
                        <Video size={16} aria-hidden="true" />
                    </DrawerToggle>
                    {/* flex-1 + min-w-0: tên dài thì tự cắt bớt, KHÔNG đẩy cụm
                        nút bên phải ra khỏi thanh. */}
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {selected?.name || "Xem lại"}
                    </span>
                    {selectedId ? (
                        <>
                            {/* Badge trạng thái: chỉ từ md. Dưới md nút LIVE đã
                                nằm ngay trên thanh này và tự báo trạng thái bằng
                                màu (xanh = đang xem trực tiếp), giữ thêm badge
                                nữa là nói hai lần cùng một chuyện. */}
                            {mode === "live" ? (
                                <span className="hidden items-center gap-1 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300 md:flex">
                                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                                    LIVE
                                </span>
                            ) : (
                                <span className="hidden rounded bg-slate-700/50 px-1.5 py-0.5 text-[11px] font-semibold text-slate-300 md:inline">
                                    XEM LẠI
                                </span>
                            )}
                            {/* Khung AI chỉ có nghĩa khi đang xem trực tiếp —
                                xem lại là đọc file, AI không chạy trên đó. */}
                            {/* LIVE + chọn ngày — dưới md thì nằm ở ĐÂY chứ không
                                ở hàng dưới timeline, để hàng đó chỉ còn hai nút
                                phóng và trả chiều cao lại cho bảng sự kiện. */}
                            <div className="flex shrink-0 items-center gap-2 md:hidden">
                                <PlaybackControls
                                    compact
                                    isLive={mode === "live"}
                                    dayMs={dayMs}
                                    onGoLive={goLive}
                                    onPickDay={pickDay}
                                />
                            </div>
                            {/* Tìm theo vùng = kéo chuột khoanh vùng trên hình,
                                thao tác này không dùng được bằng ngón tay nên ẩn
                                hẳn dưới md thay vì để một nút bấm vào không ra gì. */}
                            <button
                                type="button"
                                onClick={() => setRegionSearch((v) => !v)}
                                title="Khoanh một vùng trên hình để tìm sự kiện đã đi qua đó"
                                className={
                                    "hidden shrink-0 items-center gap-1.5 rounded border px-2 py-1 text-xs font-medium transition-colors md:inline-flex " +
                                    (regionSearch
                                        ? "border-sky-500 bg-sky-500/15 text-sky-300"
                                        : "border-slate-600 text-slate-300 hover:border-slate-500 hover:text-slate-100")
                                }
                            >
                                <Search size={13} />
                                {/* Chữ chỉ hiện từ sm: bốn nút kèm chữ không
                                    vừa một hàng 390px, mà cuộn ngang thanh
                                    công cụ thì nút cuối luôn bị khuất. */}
                                <span className="hidden sm:inline">Tìm theo vùng</span>
                            </button>
                            {/* compact (chỉ icon) ở khổ hẹp — bản có chữ
                                "Khung AI" rộng gấp đôi. */}
                            <div className="shrink-0 sm:hidden">
                                <DetectionFilter
                                    compact
                                    enabled={showBoxes}
                                    onEnabledChange={setShowBoxes}
                                    types={boxTypes}
                                    onTypesChange={setBoxTypes}
                                    zonesVisible={showZones}
                                    onZonesVisibleChange={setShowZones}
                                    motionVisible={showMotionCells}
                                    onMotionVisibleChange={setShowMotionCells}
                                />
                            </div>
                            <div className="hidden shrink-0 sm:block">
                                <DetectionFilter
                                    enabled={showBoxes}
                                    onEnabledChange={setShowBoxes}
                                    types={boxTypes}
                                    onTypesChange={setBoxTypes}
                                    zonesVisible={showZones}
                                    onZonesVisibleChange={setShowZones}
                                    motionVisible={showMotionCells}
                                    onMotionVisibleChange={setShowMotionCells}
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
                                    "hidden shrink-0 items-center gap-1.5 rounded border px-2 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 md:inline-flex " +
                                    (eventsPanelOpen && !regionSearch
                                        ? "border-sky-500 bg-sky-500/15 text-sky-300"
                                        : "border-slate-600 text-slate-300 hover:border-slate-500 hover:text-slate-100")
                                }
                            >
                                <Bell size={13} />
                                <span className="hidden sm:inline">Sự kiện</span>
                            </button>
                        </>
                    ) : null}
                </div>

                {!selectedId ? (
                    // min-h trên mobile: cột cha là shrink-0 nên flex-1 ở đây
                    // không có chiều cao nào để căn giữa, chữ bị cắt cụt sát
                    // mép thanh công cụ.
                    <div className="flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-slate-500 md:min-h-0">
                        <span>Chọn một camera để xem</span>
                        {/* Trên mobile danh sách nằm trong ngăn kéo — không có
                            nút này thì chỉ còn cái icon nhỏ trên thanh, người
                            dùng lần đầu rất dễ đứng nhìn màn hình trống. */}
                        <button
                            type="button"
                            onClick={() => setCamListOpen(true)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 md:hidden"
                        >
                            <Video size={14} aria-hidden="true" />
                            Mở danh sách camera
                        </button>
                    </div>
                ) : (
                    <>

                        {/* 16:9 cố định trên mobile (đúng tỉ lệ khung camera, không thừa
                            dải đen); từ md mới giãn theo chỗ trống như cũ. */}
                        {/* Chiều cao video trên mobile = nhỏ hơn của (16:9 theo bề ngang) và
                            (34% chiều cao màn). Chốt trần theo vh là để trên máy màn
                            thấp / Safari hiện thanh dưới, video không nuốt hết chỗ và
                            đẩy bảng sự kiện ra ngoài khung nhìn. Player fit="contain"
                            nên thừa chỗ chỉ ra dải đen, không méo hình. */}
                        <div className="relative h-[min(56.25vw,34vh)] w-full shrink-0 bg-black md:h-auto md:min-h-0 md:flex-1 md:p-2">
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
                                    motionCells={motionOverlay}
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
                                    motionCells={motionOverlay}
                                />
                            )}

                            {/* Nút phóng NỔI trên video (chỉ mobile): trước đây
                                chúng chiếm một hàng riêng phía trên timeline, mà
                                hàng đó chỉ có hai cái nút — 36px lấy mất của
                                bảng sự kiện. Góc dưới-trái để không đè lên dấu
                                thời gian OSD (góc trên-phải) của camera. */}
                            <div className="absolute inset-x-2 bottom-2 z-20 flex items-center gap-1.5 md:hidden">
                                <button
                                    type="button"
                                    onClick={() => zoomTimeline(1 / 2)}
                                    aria-label="Phóng to khung thời gian"
                                    className="flex h-8 w-8 items-center justify-center rounded-md border border-white/20 bg-slate-950/60 text-slate-100 backdrop-blur-sm"
                                >
                                    <ZoomIn size={15} aria-hidden="true" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => zoomTimeline(2)}
                                    aria-label="Thu nhỏ khung thời gian"
                                    className="flex h-8 w-8 items-center justify-center rounded-md border border-white/20 bg-slate-950/60 text-slate-100 backdrop-blur-sm"
                                >
                                    <ZoomOut size={15} aria-hidden="true" />
                                </button>
                                {/* Tua nhanh — chỉ ở chế độ XEM LẠI (live thì
                                    không có tốc độ nào để đổi). Đặt ở đây vì
                                    bản gốc nằm trong lớp điều khiển của
                                    PlaybackVideo, mà lớp đó hiện ra bằng
                                    group-hover — màn cảm ứng không có hover nên
                                    trên điện thoại nó không bao giờ bung ra. */}
                                {mode === "playback" ? (
                                    <SpeedPicker
                                        value={speed}
                                        onChange={setSpeed}
                                        className="ml-auto"
                                    />
                                ) : null}
                            </div>

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
                        <div className="flex shrink-0 flex-col items-stretch gap-2 border-t border-slate-800 bg-slate-950 px-3 pb-1.5 pt-2 md:flex-row md:gap-3 md:px-4 md:pb-3 md:pt-8">
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
                                    showMobileZoom={false}
                                />
                            </div>
                            {/* Desktop giữ nguyên cột phải; mobile thì cụm này
                                đã được nhét vào hàng điều khiển của timeline
                                (prop `controls`) nên ẩn đi để khỏi lặp. */}
                            <div className="mb-6 mt-[15px] hidden w-32 shrink-0 flex-col justify-center gap-2 border-l border-slate-800 pl-3 md:flex">
                                <PlaybackControls
                                    isLive={mode === "live"}
                                    dayMs={dayMs}
                                    onGoLive={goLive}
                                    onPickDay={pickDay}
                                />
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
                    cameraId={selectedId}
                    cameraLabel={selected?.name || selectedId}
                    // Chuyển động của ngày đang chọn — trang đã tải sẵn cho
                    // timeline, panel dùng lại chứ không gọi lại endpoint.
                    motionEvents={motion}
                    motionOrigin={engineWsOrigin}
                    onSeek={seekToEvent}
                    onClose={() => setEventsPanelOpen(false)}
                />
            ) : null}
        </div>
    );
}

/**
 * Cụm "về LIVE" + "chọn ngày".
 *
 * Là component RIÊNG vì nó được dựng ở HAI chỗ: cột phải của timeline (desktop)
 * và hàng điều khiển trong timeline (mobile). Mỗi bản tự giữ ref + listener của
 * input date, nếu dùng chung một ref ở cấp trang thì bản dựng sau ghi đè ref của
 * bản trước và nút mở lịch của bản kia bấm không lên gì.
 */
function PlaybackControls({
    isLive,
    dayMs,
    onGoLive,
    onPickDay,
    compact = false,
}: {
    isLive: boolean;
    dayMs: number;
    onGoLive: () => void;
    onPickDay: (value: string) => void;
    compact?: boolean;
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    // Giữ value của input khớp ngày đang chọn. Trước đây việc này làm trong
    // onClick của nút, nhưng dưới md cú chạm đi thẳng vào input nên onClick
    // không chạy — thiếu chỗ này thì lịch bung ra tô sai ngày.
    useEffect(() => {
        if (inputRef.current) inputRef.current.value = toDateInputValue(dayMs);
    }, [dayMs]);

    // Nghe 'change' GỐC của trình duyệt chứ KHÔNG dùng onChange của React:
    // React nuốt onChange khi giá trị trùng bộ-theo-dõi của nó (chọn LẠI đúng
    // ngày đang chọn), khiến không snap khung về được.
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        const onNative = () => {
            if (el.value) onPickDay(el.value);
        };
        el.addEventListener("change", onNative);
        return () => el.removeEventListener("change", onNative);
    }, [onPickDay]);

    return (
        <>
            <button
                type="button"
                onClick={onGoLive}
                className={
                    "flex shrink-0 items-center justify-center gap-1.5 rounded border text-xs font-semibold transition-colors " +
                    (compact ? "px-2 py-1 " : "px-2 py-1.5 ") +
                    (isLive
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                        : "border-slate-600 text-slate-300 hover:border-emerald-500/60 hover:text-emerald-300")
                }
            >
                <Radio size={13} />
                LIVE
            </button>
            {/* Bấm là bung lịch, KHÔNG "bôi chọn" từng số như input date gốc:
                input thật ẩn phía sau, chỉ giữ giá trị + mở picker. */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => {
                        const el = inputRef.current;
                        if (!el) return;
                        // Đồng bộ value theo ngày ĐANG CHỌN để lịch bật lên tô
                        // đúng ngày đó (input uncontrolled nên phải set tay).
                        el.value = toDateInputValue(dayMs);
                        if (el.showPicker) el.showPicker();
                        else el.focus();
                    }}
                    className={
                        "flex items-center justify-between gap-2 rounded border border-slate-600 bg-slate-900 text-xs text-slate-200 transition-colors hover:border-slate-500 " +
                        // compact = nằm trên thanh công cụ hẹp: bỏ w-full (nó
                        // kéo nút giãn hết chỗ còn lại) và bớt padding.
                        (compact ? "px-2 py-1" : "w-full px-2 py-2")
                    }
                >
                    <span className="font-mono">
                        {new Date(dayMs).toLocaleDateString("vi-VN")}
                    </span>
                    <CalendarDays size={14} className="shrink-0 text-slate-400" />
                </button>
                <input
                    ref={inputRef}
                    type="date"
                    defaultValue={toDateInputValue(dayMs)}
                    max={toDateInputValue(Date.now())}
                    // Ẩn hoàn toàn nhưng vẫn trong layout để showPicker() neo
                    // lịch đúng vị trí nút.
                    //
                    // pointer-events CHỈ tắt từ md: trên iOS Safari, gọi
                    // showPicker() vào một input đang ẩn thì lịch không bung —
                    // bấm nút chọn ngày chẳng ra gì. Dưới md để input trong suốt
                    // NHẬN thẳng cú chạm (nó phủ đúng lên nút), trình duyệt tự
                    // mở bánh xe chọn ngày như với mọi input date bình thường.
                    className="absolute inset-0 h-full w-full opacity-0 [color-scheme:dark] md:pointer-events-none"
                    tabIndex={-1}
                    aria-hidden="true"
                />
            </div>
        </>
    );
}
