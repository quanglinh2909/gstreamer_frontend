import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, MonitorPlay, X } from "lucide-react";
import { WebRtcPlayer } from "@/components/common/webrtc-player";
import type { MotionOverlayCells } from "@/components/common/detection-overlay";
import { PlaybackVideo } from "@/components/recordings/playback-video";
import type { ICameraResponse } from "@/interface/camera";
import type { FeedTab } from "@/lib/event-feed-shared";

function cn(...classes: Array<string | false | undefined>) {
    return classes.filter(Boolean).join(" ");
}

// Thông tin ô ở chế độ XEM LẠI đồng bộ. Khi có (và camera khác null) thì ô hiện
// PlaybackVideo thay cho WebRtcPlayer; tốc độ/tạm dừng/seek do TƯỜNG làm chủ.
export type TileReview = {
    startMs: number;
    rate: number;
    paused: boolean;
    seekSignal: { ms: number; gen: number };
    onPosition: (wallMs: number) => void;
};

export function LiveTile({
    camera,
    index,
    isSelected,
    isDropTarget,
    dropLabel,
    review,
    detectionOrigin = "",
    showDetections = false,
    detectionTypes,
    detectionZonesVisible = true,
    motionCells = null,
    onSelect,
    onClear,
    onDragStartTile,
    onDragEndTile,
    onDragOverTile,
    onDragLeaveTile,
    onDropTile,
    className,
}: {
    camera: ICameraResponse | null;
    index: number;
    isSelected: boolean;
    isDropTarget: boolean;
    // Nhãn hiện trên ô sắp nhận thả, ví dụ "3 camera" khi kéo nhiều cùng lúc.
    dropLabel?: string;
    // Có giá trị = tường đang ở chế độ xem lại; ô phát bản ghi thay vì trực tiếp.
    review?: TileReview;
    // Khung phát hiện AI vẽ đè lên hình trực tiếp (origin = backend Python).
    detectionOrigin?: string;
    showDetections?: boolean;
    detectionTypes?: Set<FeedTab>;
    detectionZonesVisible?: boolean;
    // Ô chuyển động gần nhất của camera này — tường mở MỘT socket rồi chia cho
    // từng ô, xem ghi chú ở WebRtcPlayer.
    motionCells?: MotionOverlayCells | null;
    onSelect: () => void;
    onClear: () => void;
    onDragStartTile: () => void;
    onDragEndTile: () => void;
    onDragOverTile: () => void;
    onDragLeaveTile: () => void;
    onDropTile: () => void;
    // Lớp phụ từ tường (dùng để ẨN các ô khác khi một ô đang xem lớn).
    className?: string;
}) {
    const tileRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    // Ảnh trong ô đang được phóng to thì ô KHÔNG kéo được nữa, để cử chỉ giữ
    // chuột thuộc về việc rê ảnh. Bỏ zoom về 1x là ô kéo được trở lại.
    const [isZoomed, setIsZoomed] = useState(false);
    // Xem lại không có phóng ảnh — reset để ô luôn kéo được khi rời chế độ live.
    useEffect(() => {
        if (review) setIsZoomed(false);
    }, [review]);

    useEffect(() => {
        const onChange = () =>
            setIsFullscreen(document.fullscreenElement === tileRef.current);
        document.addEventListener("fullscreenchange", onChange);
        return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);

    const toggleFullscreen = useCallback(() => {
        const element = tileRef.current;
        if (!element) return;
        if (document.fullscreenElement) {
            void document.exitFullscreen().catch(() => {});
        } else {
            void element.requestFullscreen().catch(() => {});
        }
    }, []);

    return (
        <div
            ref={tileRef}
            onClick={onSelect}
            // Giữ chuột ở BẤT KỲ đâu trong ô là kéo được. Khi ảnh đang phóng
            // to, player tự huỷ thao tác kéo này (preventDefault trên
            // dragstart) để nhường cho cử chỉ rê ảnh — xem webrtc-player.
            draggable={camera !== null && !isZoomed}
            onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                // Firefox không khởi động thao tác kéo nếu không có dữ liệu.
                event.dataTransfer.setData("text/plain", `slot:${index}`);
                onDragStartTile();
            }}
            onDragEnd={onDragEndTile}
            // dragover PHẢI preventDefault, nếu không trình duyệt coi đây là
            // vùng không nhận thả và sự kiện drop không bao giờ bắn.
            onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                onDragOverTile();
            }}
            onDragLeave={onDragLeaveTile}
            onDrop={(event) => {
                event.preventDefault();
                onDropTile();
            }}
            className={cn(
                className,
                "group relative overflow-hidden bg-black",
                // Rê chuột giữ nguyên mũi tên, chỉ đổi sang bàn tay lúc nhấn giữ.
                camera && !isZoomed ? "active:cursor-grabbing" : undefined,
                // Viền chọn vẽ bằng outline chứ không phải border: border làm
                // đổi kích thước hộp nên ô đang chọn sẽ nhích lệch so với các ô
                // còn lại, cả lưới rung mỗi lần đổi ô.
                "outline -outline-offset-1",
                isDropTarget
                    ? "outline-2 outline-sky-400"
                    : isSelected
                      ? "outline-1 outline-emerald-400"
                      : "outline-1 outline-slate-800",
            )}
        >
            {/* Lớp phủ báo chỗ sắp thả. pointer-events-none để không nuốt mất
                sự kiện drop của ô bên dưới. */}
            {isDropTarget ? (
                <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-sky-400/15">
                    {dropLabel ? (
                        <span className="rounded-md bg-sky-500 px-2.5 py-1 text-xs font-semibold text-white shadow">
                            {dropLabel}
                        </span>
                    ) : null}
                </div>
            ) : null}

            {camera ? (
                <>
                    {review ? (
                        <PlaybackVideo
                            cameraId={camera.id}
                            startMs={review.startMs}
                            rate={review.rate}
                            paused={review.paused}
                            seekSignal={review.seekSignal}
                            onPosition={review.onPosition}
                            onRateChange={() => {}}
                            showChrome={false}
                            showDetections={showDetections}
                            detectionTypes={detectionTypes}
                            detectionLabels={false}
                            className="h-full w-full"
                        />
                    ) : (
                        <WebRtcPlayer
                            cameraId={camera.id}
                            className="h-full w-full"
                            onZoomedChange={setIsZoomed}
                            detectionOrigin={detectionOrigin}
                            showDetections={showDetections}
                            detectionTypes={detectionTypes}
                            detectionZonesVisible={detectionZonesVisible}
                            motionCells={motionCells}
                            // Ô trên tường nhỏ, nhãn chữ che mất hình — chỉ vẽ khung.
                            detectionLabels={false}
                        />
                    )}

                    {/* Thanh tiêu đề chỉ hiện khi rê chuột: xem tường 16 ô mà ô
                        nào cũng có thanh chữ thường trực thì rối và che mất
                        phần hình. */}
                    <div
                        onClick={(event) => event.stopPropagation()}
                        className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 bg-linear-to-b from-black/75 to-transparent px-2 py-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                        <span className="truncate text-xs font-semibold text-white">
                            {camera.name || camera.id}
                        </span>
                        <span className="pointer-events-auto flex shrink-0 items-center gap-1">
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    toggleFullscreen();
                                }}
                                aria-label={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                                className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-200 hover:bg-white/15 hover:text-white"
                            >
                                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                            </button>
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    // Thoát toàn màn hình trước khi gỡ, nếu không
                                    // người dùng ở lại một màn hình đen trống.
                                    if (document.fullscreenElement === tileRef.current) {
                                        void document.exitFullscreen().catch(() => {});
                                    }
                                    onClear();
                                }}
                                aria-label="Gỡ camera khỏi ô"
                                className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-200 hover:bg-rose-500/80 hover:text-white"
                            >
                                <X size={13} />
                            </button>
                        </span>
                    </div>
                </>
            ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-700">
                    <MonitorPlay size={26} aria-hidden="true" />
                    <span className="text-[11px] font-medium">Ô {index + 1}</span>
                </div>
            )}
        </div>
    );
}
