import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import type { MotionEvent, RecordingSegment } from "@/lib/recordings";
import { thumbnailUrl } from "@/lib/recordings";
import type { FeedTab } from "@/lib/event-feed-shared";

// Một sự kiện AI để đánh dấu trên timeline.
export type TimelineAiEvent = { key: string; ms: number; tab: FeedTab };

// Cùng hệ màu với badge trong bảng sự kiện và khung vẽ đè lên video — nhìn
// vạch là biết ngay loại nào mà không cần chú thích riêng cho từng loại.
const AI_TICK_COLOR: Record<FeedTab, string> = {
    face: "#34d399",
    plate: "#38bdf8",
    restricted: "#f43f5e",
    mask: "#fbbf24",
};

// Làm tròn mốc rê chuột về bó này trước khi xin ảnh: các lần rê sát nhau trong
// cùng một bó dùng CHUNG một URL nên cache lại (trình duyệt + blob) — engine chỉ
// giải mã một lần cho mỗi bó 10s.
const THUMB_BUCKET_MS = 10_000;
// Chờ con trỏ dừng lại ngần này rồi mới xin ảnh: rê lướt qua không bắn hàng
// loạt request.
const THUMB_DEBOUNCE_MS = 110;
// Trần số ảnh giữ trong bộ nhớ; quá thì thu hồi blob cũ nhất.
const THUMB_CACHE_MAX = 80;

// Các mức bước thời gian (ms) cho thước, tăng dần.
const STEPS = [
    // Bước dưới 1 phút cho lúc phóng sâu (nhãn kèm giây).
    5_000, 10_000, 15_000, 30_000,
    60_000, 2 * 60_000, 3 * 60_000, 5 * 60_000, 10 * 60_000, 15 * 60_000,
    20 * 60_000, 30 * 60_000,
    3_600_000, 2 * 3_600_000, 3 * 3_600_000, 6 * 3_600_000, 12 * 3_600_000,
    24 * 3_600_000,
];
// Bề ngang tối thiểu cho một nhãn "HH:MM" trên thước. Số nhãn được tính từ bề
// rộng THẬT của thanh chứ không phải hằng số: trước đây cố định 22 nhãn — vừa
// đẹp trên thanh 1500px của desktop, nhưng trên điện thoại thanh chỉ còn ~340px
// nên 22 nhãn nằm đè lên nhau thành một vệt số không đọc được.
const LABEL_MIN_PX = 68;
// Nửa bề rộng bong bóng giờ ("LIVE 16:26:21" ~90px) — dùng để kẹp nó trong khung.
const BUBBLE_HALF_PX = 48;
export const MIN_SPAN = 2 * 60_000; // phóng sâu nhất: 2 phút toàn khung
export const MAX_SPAN = 7 * 24 * 3_600_000; // rộng nhất: 7 ngày

function pad(n: number) {
    return String(n).padStart(2, "0");
}
function hm(ms: number) {
    const d = new Date(ms);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function hms(ms: number) {
    const d = new Date(ms);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function dmy(ms: number) {
    const d = new Date(ms);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Timeline kiểu đầu ghi, CỬA SỔ TRƯỢT: khung [windowStart, windowEnd] cố định
// khi phát, playhead (vạch đỏ + bong bóng giờ) nằm ĐÚNG VỊ TRÍ thời gian của nó
// trong khung — vào trang xem live thì nó ở sát mép phải (mốc "bây giờ"), không
// bị ghim giữa. Khung không bao giờ trôi quá "bây giờ" (tương lai không có gì
// để xem). Lăn = phóng quanh con trỏ, giữ-kéo = trượt, bấm = tua.
export function Timeline({
    windowStart,
    windowEnd,
    nowMs,
    playheadMs,
    segments,
    motionEvents,
    aiEvents = [],
    cameraId,
    cameraLabel,
    isLive,
    onSeek,
    onWindowChange,
    controls,
    showMobileZoom = true,
}: {
    windowStart: number;
    windowEnd: number;
    nowMs: number;
    playheadMs: number | null;
    segments: RecordingSegment[];
    motionEvents: MotionEvent[];
    // Vạch sự kiện AI trên làn riêng dưới làn chuyển động.
    aiEvents?: TimelineAiEvent[];
    cameraId: string;
    cameraLabel: string;
    isLive: boolean;
    onSeek: (ms: number) => void;
    onWindowChange: (start: number, end: number) => void;
    // Cụm nút của TRANG (LIVE, chọn ngày) nhét vào hàng điều khiển mobile —
    // gộp chung một hàng thay vì để chúng ăn thêm một dòng riêng bên dưới.
    controls?: ReactNode;
    // false = trang tự dựng nút phóng ở chỗ khác (Xem lại đặt nổi lên video để
    // khỏi tốn một hàng riêng). Mặc định true cho tường Live View.
    showMobileZoom?: boolean;
}) {
    const trackRef = useRef<HTMLDivElement>(null);
    // Bề rộng thật của thanh, để tính mật độ nhãn. Khởi tạo 1200 (cỡ desktop)
    // cho lần render đầu trước khi đo được — ResizeObserver sửa ngay sau đó.
    const [trackWidth, setTrackWidth] = useState(1200);
    useEffect(() => {
        const el = trackRef.current;
        if (!el) return;
        const observer = new ResizeObserver(([entry]) => {
            setTrackWidth(entry.contentRect.width);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    const span = Math.max(MIN_SPAN, windowEnd - windowStart);
    // Con trỏ: rê là MŨI TÊN thường, chỉ khi nhấn giữ kéo mới thành bàn tay nắm.
    const [isDragging, setIsDragging] = useState(false);
    // Mốc thời gian dưới con trỏ khi rê (vạch + giờ theo chuột).
    const [hoverMs, setHoverMs] = useState<number | null>(null);
    const drag = useRef<{ startX: number; startWindow: [number, number]; moved: boolean } | null>(
        null,
    );

    // Ảnh xem trước khi rê chuột: khung JPEG tại mốc dưới con trỏ. Ảnh keyed
    // theo BÓ 10s (thumbUrl), còn VỊ TRÍ vẽ bám theo hoverMs thật (mượt trong
    // cùng một bó). Cache blob theo bó để rê qua lại không gọi lại engine.
    const thumbCache = useRef<Map<number, string>>(new Map());
    const [thumbUrl, setThumbUrl] = useState<string | null>(null);

    // Mốc rê chuột có nằm trong một đoạn ĐÃ ghi không — chỉ xin ảnh khi có, để
    // khỏi bắn 404 vào các khoảng trống.
    const hoverOnRecording =
        hoverMs != null &&
        segments.some((s) => s.startMs <= (hoverMs as number) && s.endMs > (hoverMs as number));
    const hoverBucket =
        hoverMs != null && hoverOnRecording
            ? Math.floor((hoverMs as number) / THUMB_BUCKET_MS) * THUMB_BUCKET_MS
            : null;

    useEffect(() => {
        if (hoverBucket == null || isDragging || !cameraId) {
            setThumbUrl(null);
            return;
        }
        const cached = thumbCache.current.get(hoverBucket);
        if (cached) {
            setThumbUrl(cached);
            return;
        }
        let cancelled = false;
        const timer = window.setTimeout(async () => {
            try {
                const res = await fetch(thumbnailUrl(cameraId, hoverBucket, 288));
                if (!res.ok || cancelled) return;
                const blob = await res.blob();
                if (cancelled) return;
                const url = URL.createObjectURL(blob);
                const cache = thumbCache.current;
                cache.set(hoverBucket, url);
                // Thu hồi blob cũ nhất khi vượt trần (Map giữ thứ tự chèn).
                if (cache.size > THUMB_CACHE_MAX) {
                    const oldest = cache.keys().next().value as number | undefined;
                    if (oldest != null) {
                        URL.revokeObjectURL(cache.get(oldest) as string);
                        cache.delete(oldest);
                    }
                }
                setThumbUrl(url);
            } catch {
                /* rê chuột hụt ảnh không sao, bỏ qua */
            }
        }, THUMB_DEBOUNCE_MS);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [hoverBucket, isDragging, cameraId]);

    // Thu hồi mọi blob khi rời component HOẶC khi đổi camera — cache keyed theo
    // epoch-ms nên cùng một mốc ở camera khác sẽ trả nhầm ảnh camera cũ.
    useEffect(() => {
        const cache = thumbCache.current;
        return () => {
            for (const url of cache.values()) URL.revokeObjectURL(url);
            cache.clear();
        };
    }, [cameraId]);

    // Không cho khung trôi quá "bây giờ": mép phải tối đa = hiện tại, không lộ
    // vùng tương lai trống phía trước vạch live.
    const clampWindow = useCallback(
        (start: number, end: number): [number, number] => {
            const s = end - start;
            const maxEnd = nowMs;
            if (end > maxEnd) return [maxEnd - s, maxEnd];
            return [start, end];
        },
        [nowMs],
    );

    const pct = useCallback(
        (ms: number) => ((ms - windowStart) / span) * 100,
        [windowStart, span],
    );
    const timeAtClientX = useCallback(
        (clientX: number) => {
            const el = trackRef.current;
            if (!el) return windowStart;
            const rect = el.getBoundingClientRect();
            const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
            return windowStart + ratio * span;
        },
        [windowStart, span],
    );

    // Lăn = phóng, neo mốc thời gian dưới con trỏ.
    useEffect(() => {
        const el = trackRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const rect = el.getBoundingClientRect();
            const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
            const anchor = windowStart + ratio * span;
            const factor = e.deltaY > 0 ? 1.2 : 1 / 1.2;
            const newSpan = Math.min(MAX_SPAN, Math.max(MIN_SPAN, span * factor));
            const [s, en] = clampWindow(anchor - ratio * newSpan, anchor - ratio * newSpan + newSpan);
            onWindowChange(s, en);
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [windowStart, span, clampWindow, onWindowChange]);

    // Phóng bằng NÚT — điện thoại không có con lăn, mà không đổi được độ rộng
    // khung thì timeline chỉ còn xem được đúng 6 giờ mặc định. Neo vào GIỮA
    // khung thay vì vào con trỏ (chạm không có vị trí con trỏ thường trực).
    const zoomBy = useCallback(
        (factor: number) => {
            const center = windowStart + span / 2;
            const newSpan = Math.min(MAX_SPAN, Math.max(MIN_SPAN, span * factor));
            const [s, en] = clampWindow(center - newSpan / 2, center + newSpan / 2);
            onWindowChange(s, en);
        },
        [windowStart, span, clampWindow, onWindowChange],
    );

    const onPointerDown = (e: React.PointerEvent) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        drag.current = { startX: e.clientX, startWindow: [windowStart, windowEnd], moved: false };
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (!drag.current) {
            // Đang rê không nhấn: hiện vạch + giờ tại vị trí con trỏ.
            setHoverMs(Math.min(nowMs, timeAtClientX(e.clientX)));
            return;
        }
        const el = trackRef.current;
        if (!el) return;
        const dx = e.clientX - drag.current.startX;
        if (Math.abs(dx) > 3 && !drag.current.moved) {
            drag.current.moved = true;
            setIsDragging(true); // chỉ đổi con trỏ khi THẬT SỰ kéo
            setHoverMs(null); // đang kéo thì ẩn vạch rê cho đỡ rối
        }
        if (!drag.current.moved) return;
        const dt = (dx / el.getBoundingClientRect().width) * span;
        const [s0, e0] = drag.current.startWindow;
        const [s, en] = clampWindow(s0 - dt, e0 - dt);
        onWindowChange(s, en);
    };
    const onPointerUp = (e: React.PointerEvent) => {
        const d = drag.current;
        drag.current = null;
        setIsDragging(false);
        if (d && !d.moved) onSeek(Math.min(nowMs, timeAtClientX(e.clientX))); // click = tua
    };
    const onPointerLeave = () => setHoverMs(null);

    // Thước: bước nhãn sao cho hai nhãn cạnh nhau cách >= LABEL_MIN_PX.
    const maxLabels = Math.max(3, Math.floor(trackWidth / LABEL_MIN_PX));
    const majorStep = STEPS.find((s) => span / s <= maxLabels) ?? STEPS[STEPS.length - 1];
    // Vạch nhỏ không giới hạn sàn 1 phút nữa (chặn ở 1s) để phóng sâu vẫn mịn.
    const minorStep = Math.max(1_000, Math.round(majorStep / 4));
    const majorIsDay = majorStep >= 24 * 3_600_000;
    // Bước < 1 phút thì nhãn phải có giây, không thì hai nhãn kề nhau trùng chữ.
    const labelWithSeconds = majorStep < 60_000;

    const minorTicks: number[] = [];
    for (let t = Math.ceil(windowStart / minorStep) * minorStep; t <= windowEnd; t += minorStep) {
        minorTicks.push(t);
    }
    const majorTicks: number[] = [];
    for (let t = Math.ceil(windowStart / majorStep) * majorStep; t <= windowEnd; t += majorStep) {
        majorTicks.push(t);
    }
    const dayMs = 24 * 3_600_000;
    const dayMarks: number[] = [];
    const firstDay = new Date(windowStart);
    firstDay.setHours(0, 0, 0, 0);
    for (let t = firstDay.getTime(); t <= windowEnd; t += dayMs) {
        if (t >= windowStart - dayMs) dayMarks.push(t);
    }
    // Nhãn ngày nào KHÔNG được vẽ.
    //
    // Nhãn của mốc đầu bị kẹp vào mép trái (labelAt = windowStart), nên khi
    // khung nhìn bắt đầu ngay trước nửa đêm thì "23/07/2026" và "24/07/2026"
    // nằm chồng lên nhau — đúng cảnh đầu ngày. Ngày nào chỉ còn một mẩu nhỏ
    // trong khung thì bỏ nhãn của nó, giữ nhãn ngày chiếm phần lớn khung.
    const MIN_DAY_LABEL_PCT = 12;
    const hiddenDayLabels = new Set<number>();
    dayMarks.forEach((t, i) => {
        const next = dayMarks[i + 1];
        if (next == null) return;
        const from = Math.max(0, pct(Math.max(t, windowStart)));
        if (pct(next) - from < MIN_DAY_LABEL_PCT) hiddenDayLabels.add(t);
    });

    const visible = <T extends { startMs: number; endMs: number }>(items: T[]) =>
        items.filter((it) => it.endMs > windowStart && it.startMs < windowEnd);

    const playheadVisible =
        playheadMs != null && playheadMs >= windowStart && playheadMs <= windowEnd;
    // Bong bóng giờ kẹp vào trong mép để không tràn ra ngoài khung.
    //
    // Kẹp theo PIXEL chứ không theo phần trăm cố định: bong bóng "LIVE 16:26:21"
    // rộng ~90px, tức nửa của nó là 45px. Trên thanh 1500px thì 45px chỉ là 3%
    // nên mốc 4%/96% cũ vừa đủ; trên thanh 340px của điện thoại thì 45px đã là
    // 13% — kẹp ở 96% vẫn thò hẳn nửa bong bóng ra ngoài màn hình.
    const bubbleMarginPct = trackWidth > 0 ? (BUBBLE_HALF_PX / trackWidth) * 100 : 4;
    const bubblePct = playheadVisible
        ? Math.min(100 - bubbleMarginPct, Math.max(bubbleMarginPct, pct(playheadMs as number)))
        : 0;

    return (
        <div className="relative select-none">
            {/* Hàng điều khiển — CHỈ mobile. Trên desktop con lăn lo việc phóng,
                còn LIVE/chọn ngày nằm ở cột bên phải timeline, nên hàng này
                không có gì để hiện. Trang nào tự đặt nút phóng chỗ khác thì tắt
                bằng showMobileZoom. */}
            {showMobileZoom || controls ? (
                <div className="mb-2 flex items-center gap-1 md:hidden">
                    <button
                        type="button"
                        onClick={() => zoomBy(1 / 2)}
                        aria-label="Phóng to khung thời gian"
                        className="flex h-7 w-8 items-center justify-center rounded border border-slate-600 text-slate-200"
                    >
                        <ZoomIn size={14} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        onClick={() => zoomBy(2)}
                        aria-label="Thu nhỏ khung thời gian"
                        className="flex h-7 w-8 items-center justify-center rounded border border-slate-600 text-slate-200"
                    >
                        <ZoomOut size={14} aria-hidden="true" />
                    </button>
                    {controls ? <div className="ml-auto flex items-center gap-2">{controls}</div> : null}
                </div>
            ) : null}
            <div
                ref={trackRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerLeave}
                className={"relative touch-none " + (isDragging ? "cursor-grabbing" : "")}
            >
                {/* Dải NGÀY (tầng trên). overflow-hidden + bỏ nhãn quá sát mép
                    phải: nhãn ngày ở mốc nửa đêm cuối (pct ~100%) tràn ra ngoài
                    thanh, đè lên cụm nút LIVE/chọn ngày bên phải. */}
                <div className="relative hidden h-5 overflow-hidden border-b border-slate-700/60 text-[11px] text-slate-300 md:block">
                    {dayMarks.map((t) => {
                        const labelAt = Math.max(t, windowStart);
                        const labelPct = Math.max(0, pct(labelAt));
                        return (
                            <div key={t}>
                                <div
                                    className="absolute inset-y-0 w-px bg-slate-600"
                                    style={{ left: `${pct(t)}%` }}
                                />
                                {labelPct <= 90 && !hiddenDayLabels.has(t) ? (
                                    <div
                                        className="absolute top-0.5 whitespace-nowrap px-1 font-medium"
                                        style={{ left: `${labelPct}%` }}
                                    >
                                        {dmy(t)}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>

                {/* Thước GIỜ (tầng dưới) + vạch */}
                <div className="relative h-5 text-[10px] text-slate-400 md:h-6">
                    {minorTicks.map((t) => (
                        <div
                            key={"mi" + t}
                            className="absolute top-0 h-1.5 w-px bg-slate-600/70"
                            style={{ left: `${pct(t)}%` }}
                        />
                    ))}
                    {majorTicks.map((t) => (
                        <div key={"ma" + t}>
                            <div
                                className="absolute top-0 h-2.5 w-px bg-slate-500"
                                style={{ left: `${pct(t)}%` }}
                            />
                            <div
                                className="absolute top-2 -translate-x-1/2 whitespace-nowrap md:top-2.5"
                                style={{ left: `${pct(t)}%` }}
                            >
                                {majorIsDay ? dmy(t) : labelWithSeconds ? hms(t) : hm(t)}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Dải GHI HÌNH (xanh lá) */}
                {/* Không bo góc mép phải: vạch live nằm sát mép, bo góc tạo khe hở nhìn như thiếu dữ liệu. */}
                <div className="relative mt-0.5 h-6 overflow-hidden rounded-l-sm bg-slate-800/70 md:mt-1 md:h-8">
                    {majorTicks.map((t) => (
                        <div
                            key={"g" + t}
                            className="absolute inset-y-0 w-px bg-slate-700/40"
                            style={{ left: `${pct(t)}%` }}
                        />
                    ))}
                    {visible(segments).map((seg) => {
                        // Chỉ coi là "đang ghi" (dải emerald kéo tới bây giờ) khi
                        // đoạn recording THẬT SỰ mới. Hàng 'recording' mồ côi (ghi
                        // bị tắt/treo trước đó) start cách xa hiện tại -> vẽ như
                        // đoạn thường tới endMs ước lượng, KHÔNG kéo dài tới now
                        // (nếu không dải xanh giả kéo suốt tới giờ, bấm vào lại lỗi).
                        const live = seg.status === "recording" && nowMs - seg.startMs < 120_000;
                        const endMs = live ? nowMs : seg.endMs;
                        const left = pct(seg.startMs);
                        const width = pct(endMs) - left;
                        return (
                            <div
                                key={seg.id}
                                className={
                                    "absolute inset-y-0 " +
                                    (live ? "bg-emerald-400" : "bg-green-500")
                                }
                                style={{ left: `${left}%`, width: `${Math.max(0.1, width)}%` }}
                            />
                        );
                    })}
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-white/95 drop-shadow">
                        {cameraLabel}
                    </span>
                </div>

                {/* Dải CHUYỂN ĐỘNG */}
                <div className="relative mt-0.5 h-2 overflow-hidden rounded-l-sm bg-slate-800/40">
                    {visible(motionEvents).map((ev) => {
                        const left = pct(ev.startMs);
                        const width = pct(ev.endMs) - left;
                        return (
                            <div
                                key={ev.id}
                                className="absolute inset-y-0 bg-amber-400"
                                style={{ left: `${left}%`, width: `${Math.max(0.1, width)}%` }}
                            />
                        );
                    })}
                </div>

                {/* Làn SỰ KIỆN AI. Sự kiện là một thời ĐIỂM chứ không phải một
                    khoảng, nên vẽ vạch mảnh; bấm vào vẫn tua như mọi chỗ khác
                    trên thanh vì cả khối này nằm trong vùng bắt chuột.

                    ẨN dưới md: trên điện thoại thanh timeline chỉ rộng ~340px
                    nên các vạch dồn thành một vệt không đọc ra mốc nào, mà danh
                    sách sự kiện ngay bên dưới đã liệt kê đủ kèm giờ và ảnh —
                    bấm vào đó tua chính xác hơn nhiều so với chấm vào vạch. */}
                <div className="relative mt-0.5 hidden h-2.5 overflow-hidden rounded-l-sm bg-slate-800/40 md:block">
                    {aiEvents.map((ev) =>
                        ev.ms >= windowStart && ev.ms <= windowEnd ? (
                            <div
                                key={ev.key}
                                title={hms(ev.ms)}
                                className="absolute inset-y-0 w-[2px] -translate-x-1/2 rounded-full"
                                style={{
                                    left: `${pct(ev.ms)}%`,
                                    backgroundColor: AI_TICK_COLOR[ev.tab],
                                }}
                            />
                        ) : null,
                    )}
                </div>

                {/* Vạch rê chuột: giờ tại vị trí con trỏ */}
                {hoverMs != null && !isDragging ? (
                    <>
                        <div
                            className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-slate-300/70 md:top-5"
                            style={{ left: `${pct(hoverMs)}%` }}
                        />
                        {/* Ảnh xem trước nổi phía trên thanh; nếu có ảnh thì chính
                            nó mang nhãn giờ, khỏi cần chip giờ riêng bên dưới. */}
                        {thumbUrl ? (
                            // width CỐ ĐỊNH (inline) để hộp không bị "shrink-to-fit"
                            // co lại khi rê sát mép phải — hộp absolute chỉ đặt left
                            // nên gần mép sẽ tự thu theo khoảng trống còn lại. Clamp
                            // tâm về [11,89]% để hộp 288px không tràn khỏi thanh.
                            <div
                                className="pointer-events-none absolute z-30 -translate-x-1/2"
                                style={{
                                    left: `${Math.min(89, Math.max(11, pct(hoverMs)))}%`,
                                    bottom: "calc(100% + 6px)",
                                    width: "min(288px, 70vw)",
                                }}
                            >
                                <div className="overflow-hidden rounded-md border border-slate-500 bg-slate-900 shadow-xl">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={thumbUrl} alt="" className="block h-auto w-full" />
                                    <div className="py-0.5 text-center font-mono text-[10px] text-slate-100">
                                        {hms(hoverMs)}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="pointer-events-none absolute -top-6 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-slate-700 px-1.5 py-0.5 font-mono text-[11px] text-white"
                                style={{ left: `${Math.min(96, Math.max(4, pct(hoverMs)))}%` }}
                            >
                                {hms(hoverMs)}
                            </div>
                        )}
                    </>
                ) : null}

                {/* Playhead tại ĐÚNG vị trí thời gian của nó + bong bóng giờ */}
                {playheadVisible ? (
                    <>
                        <div
                            className={
                                "pointer-events-none absolute bottom-0 top-5 z-10 w-0.5 " +
                                (isLive ? "bg-emerald-400" : "bg-rose-500")
                            }
                            style={{ left: `${pct(playheadMs as number)}%` }}
                        />
                        {/* Ở chế độ LIVE trên mobile thì BỎ bong bóng giờ: nó
                            nổi lên trên thanh, đúng chỗ hàng nút vừa dọn lên,
                            nên hai thứ đè nhau. Mất mát bằng không — giờ hiện
                            tại đã có sẵn trên OSD của camera, mà vạch live màu
                            xanh vẫn còn đó để biết đang ở đâu. Chế độ xem lại
                            vẫn giữ (lúc đó bong bóng là thông tin duy nhất cho
                            biết đang phát ở mốc nào). */}
                        <div
                            className={
                                // top-0 dưới md (nằm ĐÈ lên thước giờ) thay vì
                                // nổi lên trên thanh: phía trên giờ là hàng
                                // điều khiển (nút phóng, thanh tốc độ) nên bong
                                // bóng nổi lên là che mất các nấc tua.
                                "pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded px-2 py-0.5 font-mono text-xs text-white ring-1 md:-top-6 " +
                                (isLive
                                    ? "hidden bg-emerald-600 ring-emerald-400 md:block"
                                    : "bg-slate-900 ring-slate-600")
                            }
                            style={{ left: `${bubblePct}%` }}
                        >
                            {isLive ? "LIVE " + hms(playheadMs as number) : hms(playheadMs as number)}
                        </div>
                    </>
                ) : null}
            </div>

        </div>
    );
}

