import { useMemo, useState } from "react";
import { Bell, Camera, ImageOff, X } from "lucide-react";
import type { ICameraResponse } from "@/interface/camera";
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
    TYPE_META,
    type BoxRect,
    type FeedTab,
} from "@/lib/event-feed-shared";
import { useLiveEventFeed } from "@/hooks/use-live-event-feed";

export function EventFeedPanel({
    origin,
    cameras,
    wallCameraIds,
    onClose,
}: {
    origin: string;
    cameras: ICameraResponse[];
    wallCameraIds: string[];
    onClose: () => void;
}) {
    // Loại sự kiện đang bật (chọn "vài cái" hay "tất cả"). Mặc định bật hết.
    const [enabled, setEnabled] = useState<Set<FeedTab>>(() => new Set(ALL_TABS));
    // Chỉ hiện sự kiện của các camera ĐANG mở trên tường (mặc định: mọi camera).
    const [onlyWall, setOnlyWall] = useState(false);
    // Ảnh phóng to đang xem (image_full).
    const [lightbox, setLightbox] = useState<{
        url: string;
        label: string;
        box?: BoxRect;
        boxColor?: string;
    } | null>(null);

    const { events, connected } = useLiveEventFeed(origin, true);

    const cameraName = useMemo(() => {
        const map = new Map<string, string>();
        for (const c of cameras) map.set(c.id, c.name || c.id);
        return map;
    }, [cameras]);
    const wallSet = useMemo(() => new Set(wallCameraIds), [wallCameraIds]);

    const toggleTab = (tab: FeedTab) => {
        setEnabled((prev) => {
            const next = new Set(prev);
            if (next.has(tab)) next.delete(tab);
            else next.add(tab);
            return next;
        });
    };

    const visible = events.filter(
        (e) => enabled.has(e.tab) && (!onlyWall || wallSet.has(e.event.camera_id)),
    );

    return (
        <aside className="flex w-96 shrink-0 flex-col border-l border-slate-800 bg-slate-900">
            {/* Tiêu đề + trạng thái kết nối + đóng */}
            <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
                <Bell size={15} className="text-slate-300" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-white">Sự kiện</h2>
                <span
                    title={connected ? "Đang nhận realtime" : "Mất kết nối"}
                    className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        connected ? "bg-emerald-400" : "bg-slate-600",
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

            {/* Bộ lọc loại sự kiện + phạm vi camera */}
            <div className="flex flex-col gap-2 border-b border-slate-800 px-3 py-2.5">
                <div className="flex flex-wrap gap-1.5">
                    {ALL_TABS.map((tab) => {
                        const on = enabled.has(tab);
                        return (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => toggleTab(tab)}
                                className={cn(
                                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                                    on
                                        ? TYPE_META[tab].chip
                                        : "border-slate-700 text-slate-500 hover:text-slate-300",
                                )}
                            >
                                {TYPE_META[tab].label}
                            </button>
                        );
                    })}
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                    <input
                        type="checkbox"
                        checked={onlyWall}
                        onChange={(e) => setOnlyWall(e.target.checked)}
                        className="h-3.5 w-3.5 accent-sky-500"
                    />
                    Chỉ camera đang xem trên tường
                </label>
            </div>

            {/* Dòng sự kiện realtime */}
            <div className="min-h-0 flex-1 overflow-y-auto">
                {enabled.size === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-slate-500">
                        Chọn ít nhất một loại sự kiện ở trên
                    </p>
                ) : visible.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-slate-500">
                        Chưa có sự kiện nào — sẽ hiện ngay khi camera bắn lên
                    </p>
                ) : (
                    <ul className="flex flex-col gap-2.5 p-3">
                        {visible.map((item) => (
                            <FeedRow
                                key={item.key}
                                tab={item.tab}
                                event={item.event}
                                cameraLabel={cameraName.get(item.event.camera_id) || item.event.camera_id}
                                onOpen={(url, label, box, boxColor) =>
                                    setLightbox({ url, label, box, boxColor })
                                }
                            />
                        ))}
                    </ul>
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
    cameraLabel,
    onOpen,
}: {
    tab: FeedTab;
    event: RecognitionEvent;
    cameraLabel: string;
    onOpen: (url: string, label: string, box?: BoxRect, boxColor?: string) => void;
}) {
    const [imgError, setImgError] = useState(false);
    const label = feedLabel(tab, event);
    const cropUrl = getEventImageUrl(event.image_crop);
    const fullUrl = getEventImageUrl(event.image_full) || cropUrl;
    // Có khung phát hiện thì hiện ẢNH FULL (cả cảnh) và vẽ box lên; không thì
    // dùng ảnh crop như cũ. Ảnh full để box map đúng: dùng w-full h-auto (đúng
    // tỉ lệ ảnh, không letterbox) nên toạ độ % của box trùng khít.
    const box = getBox(event);
    const boxColor = boxColorClass(tab, event);
    const imgUrl = box ? fullUrl : cropUrl;

    return (
        <li>
            <button
                type="button"
                onClick={() =>
                    (fullUrl || cropUrl) &&
                    onOpen(fullUrl || cropUrl, `${label} · ${cameraLabel}`, box, boxColor)
                }
                className="group block w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-800/30 text-left shadow-sm transition-colors hover:border-slate-600 hover:bg-slate-800/60"
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

                    {/* Khung phát hiện vẽ trên ảnh full */}
                    {box && !imgError ? (
                        <div
                            className={cn(
                                "pointer-events-none absolute rounded-sm border-2 shadow-[0_0_0_1px_rgba(0,0,0,0.55)]",
                                boxColor,
                            )}
                            style={boxPosStyle(box)}
                        />
                    ) : null}

                    {/* Badge loại — góc trên trái */}
                    <span
                        className={cn(
                            "absolute left-2 top-2 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset backdrop-blur-sm",
                            TYPE_META[tab].badge,
                        )}
                    >
                        {TYPE_META[tab].label}
                    </span>

                    {/* Độ tin cậy — góc trên phải */}
                    <span className="absolute right-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white/95 backdrop-blur-sm">
                        {formatEventConfidence(event.confidence)}
                    </span>

                    {/* Nhãn + giờ nổi trên dải mờ dưới đáy ảnh */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2 pt-6">
                        <p className="truncate text-sm font-semibold text-white">{label}</p>
                        <p className="truncate text-[11px] text-white/70">
                            {formatEventTimestamp(event.timestamp)}
                        </p>
                    </div>
                </div>

                {/* Chân thẻ: tên camera */}
                <div className="flex items-center gap-1.5 px-3 py-2">
                    <Camera size={13} className="shrink-0 text-slate-500" aria-hidden="true" />
                    <span className="truncate text-xs font-medium text-slate-300">{cameraLabel}</span>
                </div>
            </button>
        </li>
    );
}
