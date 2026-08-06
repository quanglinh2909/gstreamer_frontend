import { useEffect } from "react";
import { AlertTriangle, LoaderCircle, Search, VideoOff } from "lucide-react";
import { usePointerZoom } from "@/hooks/use-pointer-zoom";
import { useLiveDetections } from "@/hooks/use-live-detections";
import { useMoqVideo } from "@/hooks/use-moq-video";
import type { FeedTab } from "@/lib/event-feed-shared";
import { DetectionOverlay, type MotionOverlayCells } from "./detection-overlay";

// Trình phát TRỰC TIẾP qua MoQ (Media over QUIC) — đường xem thứ hai, song
// song WebRtcPlayer, cùng bộ prop để hai bên thay nhau được.
//
// Khác WebRTC ở chỗ nào:
//   * KHÔNG SDP/ICE/DTLS/SRTP. Không đợi gom candidate, không mDNS, không phụ
//     thuộc TURN — chỉ một cú bắt tay QUIC tới đúng một cổng UDP.
//   * Trình duyệt tự giải mã bằng WebCodecs; đổi lại phải vẽ lên canvas.
//   * Mỗi GOP đi trên một stream QUIC riêng nên mất một nhóm không kéo theo
//     nhóm sau.
//
// Đổi lại là điều kiện khắt khe hơn: WebTransport chỉ tồn tại trong secure
// context. Không có thì component báo đúng lý do và người dùng còn WebRTC.

type PlayerState = "idle" | "connecting" | "playing" | "reconnecting" | "error";

export function MoqPlayer({
    cameraId,
    className,
    fit = "fill",
    onZoomedChange,
    detectionOrigin = "",
    showDetections = false,
    detectionLabels = true,
    detectionTypes,
    detectionZonesVisible = true,
    motionCells = null,
}: {
    cameraId: string;
    className?: string;
    fit?: "fill" | "contain";
    onZoomedChange?: (zoomed: boolean) => void;
    detectionOrigin?: string;
    showDetections?: boolean;
    detectionLabels?: boolean;
    detectionTypes?: Set<FeedTab>;
    detectionZonesVisible?: boolean;
    motionCells?: MotionOverlayCells | null;
}) {
    const zoom = usePointerZoom<HTMLDivElement>();
    const { canvasRef, state, errorMessage } = useMoqVideo({ cameraId, mode: "live" });
    const displayState: PlayerState = cameraId ? state : "idle";

    const isZoomed = zoom.isZoomed;
    useEffect(() => {
        onZoomedChange?.(isZoomed);
    }, [isZoomed, onZoomedChange]);

    const { boxes: detectionBoxes, zones: detectionZones } = useLiveDetections(
        detectionOrigin,
        cameraId,
        showDetections && displayState === "playing",
    );

    return (
        <div className={className}>
            <div
                ref={zoom.containerRef}
                {...zoom.panHandlers}
                onDoubleClick={zoom.reset}
                onDragStart={(event) => {
                    if (!zoom.isZoomed) return;
                    event.preventDefault();
                    event.stopPropagation();
                }}
                className={`relative h-full w-full overflow-hidden bg-slate-950 ${
                    zoom.isPanning ? "cursor-grabbing" : ""
                }`}
            >
                <canvas
                    ref={canvasRef}
                    draggable={false}
                    className={`h-full w-full ${
                        fit === "contain" ? "object-contain" : "object-fill"
                    }`}
                    style={{
                        transformOrigin: "0 0",
                        transform: `translate(${zoom.transform.x}px, ${zoom.transform.y}px) scale(${zoom.transform.scale})`,
                        transition: zoom.isPanning ? "none" : "transform 90ms linear",
                    }}
                />

                {showDetections && displayState === "playing" ? (
                    <DetectionOverlay
                        boxes={detectionBoxes}
                        zones={detectionZones}
                        motion={motionCells}
                        showZones={detectionZonesVisible}
                        videoRef={canvasRef}
                        fit={fit}
                        showLabels={detectionLabels}
                        types={detectionTypes}
                        transform={`translate(${zoom.transform.x}px, ${zoom.transform.y}px) scale(${zoom.transform.scale})`}
                        transition={zoom.isPanning ? "none" : "transform 90ms linear"}
                    />
                ) : null}

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
                                        ? "Đang kết nối MoQ..."
                                        : "Đang kết nối lại..."}
                                </p>
                                {errorMessage ? (
                                    <p className="text-xs text-slate-300">{errorMessage}</p>
                                ) : null}
                            </div>
                        ) : displayState === "error" ? (
                            <div className="flex max-w-sm flex-col items-center gap-2 px-4">
                                <AlertTriangle size={26} className="text-amber-400" aria-hidden="true" />
                                <p className="text-sm font-semibold">Không xem được bằng MoQ</p>
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
