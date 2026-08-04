import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, CornerDownLeft, ImageOff, Loader2, Maximize2, X } from "lucide-react";
import type { RecognitionEvent } from "@/interface/recognition-event";
import {
    formatEventConfidence,
    formatEventTimestamp,
    getEventImageUrl,
} from "@/lib/event-view-model";
import {
    ALL_TABS,
    boxColorClass,
    boxPosStyle,
    cn,
    feedLabel,
    getBox,
    MOTION_META,
    TYPE_META,
    type BoxRect,
    type FeedTab,
} from "@/lib/event-feed-shared";
import { useCameraEventFeed } from "@/hooks/use-camera-event-feed";
import { useMotionEventFeed } from "@/hooks/use-motion-event-feed";
import { MotionFeedRow } from "@/components/common/motion-feed-row";
import { parseMotionCells } from "@/components/common/motion-cells-overlay";
import type { MotionEvent } from "@/lib/recordings";

// Bảng sự kiện của MỘT camera trên trang Xem lại. Gộp realtime + lịch sử (cuộn
// xuống tải thêm), bấm một sự kiện thì nhảy timeline tới đúng thời điểm đó.
export function RecordingsEventPanel({
    feed,
    cameraId,
    cameraLabel,
    motionEvents,
    motionOrigin,
    onSeek,
    onClose,
}: {
    // Dòng sự kiện do TRANG giữ, không phải panel tự gọi hook: timeline cũng
    // cần đúng danh sách này để vẽ vạch, và nó phải còn dữ liệu cả khi panel
    // đang đóng.
    feed: ReturnType<typeof useCameraEventFeed>;
    cameraId: string;
    cameraLabel: string;
    // Chuyển động của NGÀY đang chọn — trang đã tải sẵn cho timeline, dùng lại
    // thay vì gọi lại cùng một endpoint lần nữa.
    motionEvents: MotionEvent[];
    // Origin WebSocket của ENGINE (/wsc) cho chuyển động realtime.
    motionOrigin: string;
    onSeek: (timestampSec: number) => void;
    onClose: () => void;
}) {
    const [enabled, setEnabled] = useState<Set<FeedTab>>(() => new Set(ALL_TABS));
    // Chip riêng, không nằm trong `enabled` — chuyển động không phải FeedTab.
    const [motionOn, setMotionOn] = useState(true);
    const [lightbox, setLightbox] = useState<{
        url: string;
        label: string;
        box?: BoxRect;
        boxColor?: string;
    } | null>(null);

    const { events, connected, hasMore, loadingInitial, loadingMore, loadMore } = feed;

    const scrollRef = useRef<HTMLDivElement>(null);

    const toggleTab = (tab: FeedTab) => {
        setEnabled((prev) => {
            const next = new Set(prev);
            if (next.has(tab)) next.delete(tab);
            else next.add(tab);
            return next;
        });
    };

    const liveMotion = useMotionEventFeed(motionOrigin, motionOn, cameraId);

    // Chuyển động: lịch sử (REST, cả ngày) + realtime (WS engine). Khử trùng
    // theo GIÂY bắt đầu — bản realtime không có id (engine bắn TRƯỚC khi ghi
    // DB), nên id không dùng làm khoá chung được; mốc bắt đầu thì cùng một
    // chuỗi ISO ở cả hai đường.
    const motionRows = useMemo(() => {
        if (!motionOn) return [];
        const seen = new Set<number>();
        const rows: Array<{ key: string; eventId?: string; startMs: number; endMs: number; cells: string; gridX: number; gridY: number }> = [];
        const push = (
            key: string,
            startMs: number,
            endMs: number,
            cells: string,
            gridX: number,
            gridY: number,
            // Id hàng motion_events — chỉ sự kiện LỊCH SỬ mới có; sự kiện
            // realtime tới qua WebSocket trước khi engine ghi DB nên chưa có.
            eventId?: string,
        ) => {
            if (!Number.isFinite(startMs)) return;
            const sec = Math.floor(startMs / 1000);
            if (seen.has(sec)) return;
            seen.add(sec);
            rows.push({ key, eventId, startMs, endMs, cells, gridX, gridY });
        };
        for (const m of liveMotion.events) {
            push(m.key, m.startMs, m.endMs, m.cells, m.gridX, m.gridY);
        }
        for (const m of motionEvents) {
            push(`h-${m.id}`, m.startMs, m.endMs, m.cells ?? "", m.gridX || 10, m.gridY || 10, m.id);
        }
        return rows;
    }, [motionOn, liveMotion.events, motionEvents]);

    // Gộp nhận dạng + chuyển động vào một dòng thời gian, mới nhất lên đầu.
    const visible = useMemo(() => {
        const rows: Array<{ sortMs: number; node: React.ReactNode }> = [];
        for (const e of events) {
            if (!enabled.has(e.tab)) continue;
            rows.push({
                sortMs: Number(e.event.timestamp) * 1000,
                node: (
                    <FeedRow
                        key={e.key}
                        tab={e.tab}
                        event={e.event}
                        onSeek={() => onSeek(Number(e.event.timestamp))}
                        onOpen={(url, label, box, boxColor) =>
                            setLightbox({ url, label, box, boxColor })
                        }
                    />
                ),
            });
        }
        for (const m of motionRows) {
            rows.push({
                sortMs: m.startMs,
                node: (
                    <MotionFeedRow
                        key={m.key}
                        cameraId={cameraId}
                        eventId={m.eventId}
                        startMs={m.startMs}
                        endMs={m.endMs}
                        cells={m.cells}
                        gridX={m.gridX}
                        gridY={m.gridY}
                        cellCount={parseMotionCells(m.cells, m.gridX, m.gridY).length}
                        // onSeek nhận GIÂY (giống sự kiện nhận dạng), không phải ms.
                        onSeek={() => onSeek(m.startMs / 1000)}
                    />
                ),
            });
        }
        rows.sort((a, b) => b.sortMs - a.sortMs);
        return rows;
    }, [events, motionRows, enabled, cameraId, onSeek]);

    const nothingSelected = enabled.size === 0 && !motionOn;

    // Cuộn gần đáy -> tải thêm lịch sử. Kiểm tra cả sau mỗi lần render (danh
    // sách sau lọc có thể ngắn hơn khung nhìn nên chưa cuộn được).
    const maybeLoadMore = useCallback(() => {
        const el = scrollRef.current;
        if (!el || !hasMore || loadingMore || loadingInitial) return;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 240) {
            void loadMore();
        }
    }, [hasMore, loadingMore, loadingInitial, loadMore]);

    useEffect(() => {
        maybeLoadMore();
    }, [visible.length, maybeLoadMore]);

    return (
        <aside
            /* Trên điện thoại KHÔNG phủ lên video mà nằm NGAY DƯỚI nó, chiếm
               hết phần còn lại của màn hình — xem lại camera là vừa nhìn hình
               vừa lướt sự kiện, che mất một trong hai thì hỏng cả việc. Cột
               bên phải chỉ quay lại từ md. */
            className="flex min-h-0 flex-1 flex-col border-t border-slate-800 bg-slate-900 md:w-96 md:flex-none md:shrink-0 md:border-l md:border-t-0"
        >
            {/* Tiêu đề — chỉ từ md.
                Dưới md bảng này LUÔN nằm dưới video và không đóng được (nút
                chuông đã ẩn ở khổ điện thoại), nên hàng tiêu đề chẳng nói thêm
                gì mà ăn mất ~45px — bằng nửa một thẻ sự kiện. */}
            <div className="hidden items-center gap-2 border-b border-slate-800 px-4 py-3 md:flex">
                <Bell size={15} className="text-slate-300" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-white">Sự kiện camera</h2>
                {/* Hai backend khác nhau: nhận dạng qua Python, chuyển động qua
                    engine. Một bên chết mà chấm vẫn xanh thì người dùng ngồi
                    chờ sự kiện không bao giờ tới. */}
                <span
                    title={
                        !connected
                            ? "Mất kết nối sự kiện nhận dạng"
                            : motionOn && !liveMotion.connected
                              ? "Mất kết nối sự kiện chuyển động"
                              : "Đang nhận realtime"
                    }
                    className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        connected && (!motionOn || liveMotion.connected)
                            ? "bg-emerald-400"
                            : "bg-slate-600",
                    )}
                />
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Đóng bảng sự kiện"
                    className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                >
                    <X size={15} />
                </button>
            </div>

            {/* Bộ lọc loại + tên camera */}
            <div className="flex flex-col gap-2 border-b border-slate-800 px-3 py-1.5 md:py-2.5">
                {/* Tên camera đã nằm ngay trên thanh công cụ ở khổ điện thoại */}
                <p className="hidden truncate text-xs text-slate-400 md:block">
                    Camera: <span className="font-medium text-slate-200">{cameraLabel}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {ALL_TABS.map((tab) => {
                        const on = enabled.has(tab);
                        return (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => toggleTab(tab)}
                                className={cn(
                                    // Gọn hơn dưới md: bốn chip cỡ desktop vừa
                                    // đúng một hàng 390px nhưng không còn chỗ
                                    // thở, chỉ cần nhãn dài thêm một chữ là
                                    // xuống dòng thành hai hàng.
                                    "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors md:px-2.5 md:py-1 md:text-xs",
                                    on
                                        ? TYPE_META[tab].chip
                                        : "border-slate-700 text-slate-500 hover:text-slate-300",
                                )}
                            >
                                {TYPE_META[tab].label}
                            </button>
                        );
                    })}
                    <button
                        type="button"
                        onClick={() => setMotionOn((v) => !v)}
                        className={cn(
                            "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors md:px-2.5 md:py-1 md:text-xs",
                            motionOn
                                ? MOTION_META.chip
                                : "border-slate-700 text-slate-500 hover:text-slate-300",
                        )}
                    >
                        {MOTION_META.label}
                    </button>
                </div>
            </div>

            {/* Danh sách sự kiện */}
            <div
                ref={scrollRef}
                onScroll={maybeLoadMore}
                className="min-h-0 flex-1 overflow-y-auto"
            >
                {nothingSelected ? (
                    <p className="px-4 py-6 text-center text-xs text-slate-500">
                        Chọn ít nhất một loại sự kiện ở trên
                    </p>
                ) : loadingInitial && visible.length === 0 ? (
                    <p className="flex items-center justify-center gap-2 px-4 py-6 text-center text-xs text-slate-500">
                        <Loader2 size={14} className="animate-spin" /> Đang tải sự kiện…
                    </p>
                ) : visible.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-slate-500">
                        Chưa có sự kiện nào cho camera này
                    </p>
                ) : (
                    <>
                        <ul className="flex flex-col gap-2.5 p-3">
                            {visible.map((row) => row.node)}
                        </ul>
                        <div className="px-4 pb-4 pt-1 text-center text-xs text-slate-500">
                            {loadingMore ? (
                                <span className="inline-flex items-center gap-2">
                                    <Loader2 size={13} className="animate-spin" /> Đang tải thêm…
                                </span>
                            ) : hasMore ? (
                                <button
                                    type="button"
                                    onClick={() => void loadMore()}
                                    className="text-slate-400 underline-offset-2 hover:text-slate-200 hover:underline"
                                >
                                    Tải thêm sự kiện cũ
                                </button>
                            ) : (
                                "Đã hết sự kiện cũ"
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Xem ảnh lớn */}
            {lightbox ? (
                <div
                    onClick={() => setLightbox(null)}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
                >
                    <div className="max-h-full max-w-3xl">
                        <div className="relative inline-block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={lightbox.url}
                                alt={lightbox.label}
                                className="block max-h-[80vh] w-auto rounded-lg object-contain"
                            />
                            {lightbox.box ? (
                                <div
                                    className={cn(
                                        "pointer-events-none absolute rounded-sm border-2",
                                        lightbox.boxColor ?? "border-sky-400",
                                    )}
                                    style={boxPosStyle(lightbox.box)}
                                />
                            ) : null}
                        </div>
                        <p className="mt-2 text-center text-sm text-white/90">{lightbox.label}</p>
                    </div>
                </div>
            ) : null}
        </aside>
    );
}

function FeedRow({
    tab,
    event,
    onSeek,
    onOpen,
}: {
    tab: FeedTab;
    event: RecognitionEvent;
    onSeek: () => void;
    onOpen: (url: string, label: string, box?: BoxRect, boxColor?: string) => void;
}) {
    const [imgError, setImgError] = useState(false);
    const label = feedLabel(tab, event);
    const cropUrl = getEventImageUrl(event.image_crop);
    const fullUrl = getEventImageUrl(event.image_full) || cropUrl;
    const box = getBox(event);
    const boxColor = boxColorClass(tab, event);
    const imgUrl = box ? fullUrl : cropUrl;

    return (
        <li>
            <div className="group block w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-800/30 text-left shadow-sm transition-colors hover:border-sky-600/70 hover:bg-slate-800/60">
                {/* Bấm ảnh -> nhảy timeline tới thời điểm sự kiện */}
                <button
                    type="button"
                    onClick={onSeek}
                    title="Nhảy tới đoạn ghi của sự kiện này"
                    className="block w-full"
                >
                    <div className={cn("relative w-full bg-slate-950", box ? "" : "h-44")}>
                        {imgUrl && !imgError ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={imgUrl}
                                alt={label}
                                onError={() => setImgError(true)}
                                className={
                                    box
                                        ? "block h-auto w-full"
                                        : "h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                                }
                            />
                        ) : (
                            <span className="flex h-44 w-full flex-col items-center justify-center gap-1 text-slate-600">
                                <ImageOff size={26} />
                                <span className="text-[11px]">Không có ảnh</span>
                            </span>
                        )}

                        {box && !imgError ? (
                            <div
                                className={cn(
                                    "pointer-events-none absolute rounded-sm border-2 shadow-[0_0_0_1px_rgba(0,0,0,0.55)]",
                                    boxColor,
                                )}
                                style={boxPosStyle(box)}
                            />
                        ) : null}

                        {/* Badge loại */}
                        <span
                            className={cn(
                                "absolute left-2 top-2 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset backdrop-blur-sm",
                                TYPE_META[tab].badge,
                            )}
                        >
                            {TYPE_META[tab].label}
                        </span>

                        {/* Độ tin cậy */}
                        <span className="absolute right-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white/95 backdrop-blur-sm">
                            {formatEventConfidence(event.confidence)}
                        </span>

                        {/* Nhãn + giờ + gợi ý nhảy */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2 pt-6">
                            <p className="truncate text-sm font-semibold text-white">{label}</p>
                            <p className="flex items-center gap-1 text-[11px] text-white/70">
                                {formatEventTimestamp(event.timestamp)}
                                <span className="ml-auto inline-flex items-center gap-1 text-sky-300 opacity-0 transition-opacity group-hover:opacity-100">
                                    <CornerDownLeft size={11} /> Xem lại
                                </span>
                            </p>
                        </div>
                    </div>
                </button>

                {/* Chân thẻ: nút mở ảnh lớn (không nhảy timeline) */}
                <button
                    type="button"
                    onClick={() =>
                        (fullUrl || cropUrl) &&
                        onOpen(fullUrl || cropUrl, `${label} · ${formatEventTimestamp(event.timestamp)}`, box, boxColor)
                    }
                    className="flex w-full items-center gap-1.5 px-3 py-2 text-xs text-slate-400 transition-colors hover:text-slate-200"
                >
                    <Maximize2 size={13} className="shrink-0" aria-hidden="true" />
                    Xem ảnh lớn
                </button>
            </div>
        </li>
    );
}
