import { useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { AppSelect } from "@/components/common/app-select";
import { MotionCellsOverlay, parseMotionCells } from "@/components/common/motion-cells-overlay";
import { TopBarButton, TopBarCount } from "@/components/layouts/top-bar";
import type { MotionEventManager } from "@/hooks/use-motion-event-manager";
import { motionEventImageUrl } from "@/lib/recordings";

function cn(...classes: Array<string | false | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function clockLabel(ms: number): string {
    if (!Number.isFinite(ms)) return "--:--:--";
    return new Date(ms).toLocaleTimeString("vi-VN", { hour12: false });
}

function durationLabel(startMs: number, endMs: number): string {
    const sec = Math.max(0, Math.round((endMs - startMs) / 1000));
    if (sec < 60) return `${sec}s`;
    return `${Math.floor(sec / 60)}m${String(sec % 60).padStart(2, "0")}s`;
}

export function MotionEventTopActions({ manager }: { manager: MotionEventManager }) {
    return (
        <>
            <TopBarCount value={manager.events.length} unit="sự kiện" />
            <TopBarButton
                icon={RefreshCw}
                label="Làm mới"
                onClick={manager.refresh}
                disabled={manager.isLoading}
                spinning={manager.isLoading}
            />
        </>
    );
}

function MotionEventCard({
    id,
    startMs,
    endMs,
    cells,
    gridX,
    gridY,
}: {
    id: string;
    startMs: number;
    endMs: number;
    cells: string;
    gridX: number;
    gridY: number;
}) {
    const cellCount = parseMotionCells(cells, gridX, gridY).length;
    // Sự kiện ghi bởi bản CŨ (chưa có ảnh) hoặc ảnh đã bị dọn dung lượng xoá.
    // Không bắt được lỗi này thì thẻ hiện icon ảnh vỡ của trình duyệt và sập
    // xuống còn một dòng — các ô chuyển động cũng mất luôn chỗ để vẽ.
    const [imgFailed, setImgFailed] = useState(false);

    return (
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Khung ôm ĐÚNG ảnh (h-auto), không chốt chiều cao rồi
                object-contain: lớp phủ bám theo khung, mà khung to hơn ảnh thì
                mọi ô lệch đi đúng phần viền thừa. Chỉ ép 16:9 khi KHÔNG có ảnh,
                để các ô vẫn rơi đúng vị trí tương đối trên nền tối. */}
            <div className={cn("relative w-full bg-slate-950", imgFailed && "aspect-video")}>
                {!imgFailed ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={motionEventImageUrl(id)}
                        alt={`Chuyển động lúc ${clockLabel(startMs)}`}
                        // Bắt buộc lazy: một ngày có thể vài nghìn sự kiện, tải
                        // hết một lượt là ném ngần ấy request vào engine.
                        loading="lazy"
                        decoding="async"
                        onError={() => setImgFailed(true)}
                        className="block h-auto w-full"
                    />
                ) : (
                    <span className="absolute inset-0 flex items-center justify-center px-4 text-center text-[11px] text-slate-500">
                        Sự kiện này không có khung hình
                    </span>
                )}
                <MotionCellsOverlay cells={cells} gridX={gridX} gridY={gridY} />
            </div>
            <div className="space-y-1 p-3">
                <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-sm font-semibold text-slate-900">
                        {clockLabel(startMs)}
                    </span>
                    <span className="text-xs text-slate-500">
                        {durationLabel(startMs, endMs)}
                    </span>
                </div>
                <p className="text-xs text-slate-500">
                    {cellCount} ô chuyển động · lưới {gridX}×{gridY}
                </p>
            </div>
        </article>
    );
}

/**
 * Nội dung của TAB "Chuyển động" trên trang Sự kiện.
 *
 * Không có <main>/tiêu đề riêng: nó nằm TRONG khung của EventDashboard, dùng
 * chung thanh tab và thanh trên với bốn loại nhận diện kia. Chỉ phần thân là
 * khác, vì dữ liệu khác hẳn (xem ghi chú ở useMotionEventManager).
 */
export function MotionEventSection({ manager }: { manager: MotionEventManager }) {
    return (
        <>
                {manager.errorMessage ? (
                    <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
                        <AlertTriangle size={16} aria-hidden="true" />
                        {manager.errorMessage}
                    </div>
                ) : null}

                {/* Bộ lọc. Engine chỉ có API "sự kiện của MỘT camera trong MỘT
                    khoảng", nên camera là bắt buộc chứ không phải tuỳ chọn —
                    khác trang Sự kiện nhận diện (ở đó "Tất cả camera" được). */}
                <section className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                        <label className="flex flex-1 flex-col gap-1.5 md:max-w-[320px]">
                            <span className="text-xs font-semibold text-slate-500">Camera</span>
                            <AppSelect
                                aria-label="Chọn camera"
                                value={manager.selectedCameraId}
                                onChange={(event) => manager.selectCamera(event.target.value)}
                                className="h-9 bg-slate-50 font-semibold text-slate-800 focus:bg-white md:h-10"
                            >
                                {manager.cameras.map((camera) => (
                                    <option key={camera.id} value={camera.id}>
                                        {camera.name || camera.id}
                                        {camera.motionEnabled ? "" : " (chưa bật chuyển động)"}
                                    </option>
                                ))}
                            </AppSelect>
                        </label>
                        <label className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold text-slate-500">Ngày</span>
                            <input
                                type="date"
                                value={manager.day}
                                onChange={(event) => manager.selectDay(event.target.value)}
                                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 focus:border-[#4369ee] focus:bg-white focus:outline-none md:h-10"
                            />
                        </label>
                    </div>
                </section>

                {/* items-start: ảnh của mỗi sự kiện cao thấp khác nhau (bản
                    ghi cũ 4:9, bản mới 16:9), mặc định grid kéo mọi thẻ cao
                    bằng thẻ cao nhất hàng nên các thẻ ngắn thừa ra một mảng
                    trắng bằng nửa màn hình. */}
                <section className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                    {manager.visibleEvents.map((event) => (
                        <MotionEventCard
                            key={event.id}
                            id={event.id}
                            startMs={event.startMs}
                            endMs={event.endMs}
                            cells={event.cells ?? ""}
                            gridX={event.gridX || 32}
                            gridY={event.gridY || 32}
                        />
                    ))}
                </section>

                {!manager.isLoading && manager.events.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
                        Không có sự kiện chuyển động nào trong ngày này.
                    </p>
                ) : null}

                {manager.hasMore ? (
                    <button
                        type="button"
                        onClick={manager.showMore}
                        className="self-center rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        Xem thêm ({manager.events.length - manager.visibleEvents.length} sự kiện)
                    </button>
                ) : null}
        </>
    );
}
