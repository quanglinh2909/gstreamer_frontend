import { Camera, Crosshair, MousePointer2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import type {
    AiCameraConfig,
    AiDetectionShape,
    AiFeatureId,
    AiPoint,
    AiShapeKind,
} from "@/interface/ai-config";
import type { ICameraResponse } from "@/interface/camera";
import { getAiFeatureItem } from "./ai-config-constants";
import { cn } from "./ai-config-utils";

const DRAG_CLICK_THRESHOLD = 0.006;

const shapeStyles: Record<AiShapeKind, { fill: string; stroke: string }> = {
    faceZone: {
        fill: "rgba(14, 165, 233, 0.2)",
        stroke: "#38bdf8",
    },
    licensePlateZone: {
        fill: "rgba(139, 92, 246, 0.2)",
        stroke: "#8b5cf6",
    },
    restrictedZone: {
        fill: "rgba(244, 63, 94, 0.22)",
        stroke: "#fb7185",
    },
    tripwire: {
        fill: "transparent",
        stroke: "#f59e0b",
    },
};

type CanvasDrag =
    | {
        lastPoint: AiPoint;
        mode: "shape";
        pointerId: number;
        shapeId: string;
    }
    | {
        mode: "shapePoint";
        moved: boolean;
        pointIndex: number;
        pointerId: number;
        shapeId: string;
        startPoint: AiPoint;
    }
    | {
        mode: "draftPoint";
        moved: boolean;
        pointIndex: number;
        pointerId: number;
        startPoint: AiPoint;
    };

type DeleteConfirm = {
    label: string;
    shapeId: string;
    x: number;
    y: number;
};

function toSvgPoint(point: AiPoint) {
    return `${point.x * 100},${point.y * 100}`;
}

function getPolygonPoints(points: AiPoint[]) {
    return points.map(toSvgPoint).join(" ");
}

function getPointerPoint(event: React.PointerEvent, element: HTMLElement | SVGElement): AiPoint {
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    return {
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y)),
    };
}

function getPopupPosition(event: React.MouseEvent, element: HTMLElement | SVGElement) {
    const rect = element.getBoundingClientRect();

    return {
        x: Math.min(rect.width - 196, Math.max(8, event.clientX - rect.left)),
        y: Math.min(rect.height - 108, Math.max(8, event.clientY - rect.top)),
    };
}

function getPointDistance(start: AiPoint, end: AiPoint) {
    return Math.hypot(end.x - start.x, end.y - start.y);
}

function getSegments(points: AiPoint[], close: boolean) {
    if (points.length < 2) {
        return [];
    }

    const limit = close ? points.length : points.length - 1;

    return Array.from({ length: limit }, (_, index) => ({
        end: points[(index + 1) % points.length],
        index,
        start: points[index],
    }));
}

function ShapeOverlay({
    onEdgeInsertStart,
    onPointDragStart,
    onShapeContextMenu,
    onShapeDragStart,
    onShapePointRemove,
    shape,
}: {
    onEdgeInsertStart: (shape: AiDetectionShape, pointIndex: number, event: React.PointerEvent<SVGElement>) => void;
    onPointDragStart: (shapeId: string, pointIndex: number, event: React.PointerEvent<SVGElement>) => void;
    onShapeContextMenu: (shape: AiDetectionShape, event: React.MouseEvent<SVGElement>) => void;
    onShapeDragStart: (shapeId: string, event: React.PointerEvent<SVGElement>) => void;
    onShapePointRemove: (shapeId: string, pointIndex: number) => void;
    shape: AiDetectionShape;
}) {
    const style = shapeStyles[shape.kind];

    if (shape.kind === "tripwire") {
        const [start, end] = shape.points;

        if (!start || !end) {
            return null;
        }

        return (
            <g>
                <line
                    x1={start.x * 100}
                    y1={start.y * 100}
                    x2={end.x * 100}
                    y2={end.y * 100}
                    stroke={style.stroke}
                    strokeWidth="1.7"
                    strokeLinecap="round"
                />
                <line
                    x1={start.x * 100}
                    y1={start.y * 100}
                    x2={end.x * 100}
                    y2={end.y * 100}
                    stroke="transparent"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="cursor-grab active:cursor-grabbing"
                    pointerEvents="stroke"
                    onContextMenu={(event) => onShapeContextMenu(shape, event)}
                    onPointerDown={(event) => onShapeDragStart(shape.id, event)}
                />
                {[start, end].map((point, index) => (
                    <circle
                        key={`${shape.id}-${index}`}
                        cx={point.x * 100}
                        cy={point.y * 100}
                        r="1.7"
                        fill="#ffffff"
                        stroke={style.stroke}
                        strokeWidth="0.7"
                        className="cursor-grab active:cursor-grabbing"
                        onContextMenu={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onShapePointRemove(shape.id, index);
                        }}
                        onPointerDown={(event) => onPointDragStart(shape.id, index, event)}
                    />
                ))}
            </g>
        );
    }

    return (
        <g>
            <polygon
                points={getPolygonPoints(shape.points)}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth="1.4"
                className="cursor-grab active:cursor-grabbing"
                onContextMenu={(event) => onShapeContextMenu(shape, event)}
                onPointerDown={(event) => onShapeDragStart(shape.id, event)}
            />
            {getSegments(shape.points, true).map((segment) => (
                <line
                    key={`${shape.id}-edge-${segment.index}`}
                    x1={segment.start.x * 100}
                    y1={segment.start.y * 100}
                    x2={segment.end.x * 100}
                    y2={segment.end.y * 100}
                    stroke="transparent"
                    strokeWidth="5"
                    strokeLinecap="round"
                    pointerEvents="stroke"
                    className="cursor-copy"
                    onContextMenu={(event) => onShapeContextMenu(shape, event)}
                    onPointerDown={(event) => onEdgeInsertStart(shape, segment.index, event)}
                />
            ))}
            {shape.points.map((point, index) => (
                <circle
                    key={`${shape.id}-${index}`}
                    cx={point.x * 100}
                    cy={point.y * 100}
                    r="1.55"
                    fill="#ffffff"
                    stroke={style.stroke}
                    strokeWidth="0.6"
                    className="cursor-grab active:cursor-grabbing"
                    onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onShapePointRemove(shape.id, index);
                    }}
                    onPointerDown={(event) => onPointDragStart(shape.id, index, event)}
                />
            ))}
        </g>
    );
}

export function AiDetectionCanvas({
    activeFeatureId,
    camera,
    config,
    draftPoints,
    isSnapshotLoading,
    onDraftPointInsert,
    onDraftPointMove,
    onDraftPointRemove,
    onPoint,
    onShapeDeleteRequest,
    onShapeMove,
    onShapePointInsert,
    onShapePointMove,
    onShapePointRemove,
    snapshotErrorMessage,
    snapshotUrl,
}: {
    activeFeatureId: AiFeatureId;
    camera: ICameraResponse | null;
    config: AiCameraConfig | null;
    draftPoints: AiPoint[];
    isSnapshotLoading: boolean;
    onDraftPointInsert: (pointIndex: number, point: AiPoint) => void;
    onDraftPointMove: (pointIndex: number, point: AiPoint) => void;
    onDraftPointRemove: (pointIndex: number) => void;
    onPoint: (point: AiPoint) => void;
    onShapeDeleteRequest: (shapeId: string) => void;
    onShapeMove: (shapeId: string, delta: AiPoint) => void;
    onShapePointInsert: (shapeId: string, pointIndex: number, point: AiPoint) => void;
    onShapePointMove: (shapeId: string, pointIndex: number, point: AiPoint) => void;
    onShapePointRemove: (shapeId: string, pointIndex: number) => void;
    snapshotErrorMessage: string;
    snapshotUrl: string;
}) {
    const surfaceRef = useRef<HTMLDivElement | null>(null);
    const svgRef = useRef<SVGSVGElement | null>(null);
    const dragRef = useRef<CanvasDrag | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null);
    const activeFeatureItem = getAiFeatureItem(activeFeatureId);
    const activeShapes = (config?.shapes ?? []).filter((shape) => shape.kind === activeFeatureItem.shapeKind);
    const canDraw = Boolean(camera && config && snapshotUrl);
    const draftStyle = shapeStyles[activeFeatureItem.shapeKind];

    const capturePointer = (pointerId: number) => {
        if (svgRef.current?.hasPointerCapture(pointerId)) {
            return;
        }

        svgRef.current?.setPointerCapture(pointerId);
    };

    const releasePointer = (pointerId: number) => {
        if (!svgRef.current?.hasPointerCapture(pointerId)) {
            return;
        }

        svgRef.current.releasePointerCapture(pointerId);
    };

    const handleSurfacePointerDown = (event: React.PointerEvent<SVGRectElement>) => {
        if (!canDraw || !surfaceRef.current || event.button !== 0) {
            return;
        }

        setDeleteConfirm(null);
        onPoint(getPointerPoint(event, surfaceRef.current));
    };

    const handleShapeDragStart = (shapeId: string, event: React.PointerEvent<SVGElement>) => {
        if (!canDraw || !surfaceRef.current || event.button !== 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        setDeleteConfirm(null);
        capturePointer(event.pointerId);
        dragRef.current = {
            lastPoint: getPointerPoint(event, surfaceRef.current),
            mode: "shape",
            pointerId: event.pointerId,
            shapeId,
        };
    };

    const handlePointDragStart = (
        shapeId: string,
        pointIndex: number,
        event: React.PointerEvent<SVGElement>,
    ) => {
        if (!canDraw || !surfaceRef.current) {
            return;
        }

        if (event.button !== 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        setDeleteConfirm(null);
        capturePointer(event.pointerId);
        dragRef.current = {
            mode: "shapePoint",
            moved: false,
            pointIndex,
            pointerId: event.pointerId,
            shapeId,
            startPoint: getPointerPoint(event, surfaceRef.current),
        };
    };

    const handleDraftPointDragStart = (pointIndex: number, event: React.PointerEvent<SVGElement>) => {
        if (!canDraw || !surfaceRef.current) {
            return;
        }

        if (event.button !== 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        setDeleteConfirm(null);
        capturePointer(event.pointerId);
        dragRef.current = {
            mode: "draftPoint",
            moved: false,
            pointIndex,
            pointerId: event.pointerId,
            startPoint: getPointerPoint(event, surfaceRef.current),
        };
    };

    const handleEdgeInsertStart = (
        shape: AiDetectionShape,
        pointIndex: number,
        event: React.PointerEvent<SVGElement>,
    ) => {
        if (!canDraw || !surfaceRef.current) {
            return;
        }

        if (event.button !== 0 || shape.kind === "tripwire") {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        setDeleteConfirm(null);
        capturePointer(event.pointerId);

        const point = getPointerPoint(event, surfaceRef.current);
        onShapePointInsert(shape.id, pointIndex, point);
        dragRef.current = {
            mode: "shapePoint",
            moved: true,
            pointIndex: pointIndex + 1,
            pointerId: event.pointerId,
            shapeId: shape.id,
            startPoint: point,
        };
    };

    const handleDraftEdgeInsertStart = (pointIndex: number, event: React.PointerEvent<SVGElement>) => {
        if (!canDraw || !surfaceRef.current || activeFeatureItem.shapeKind === "tripwire") {
            return;
        }

        if (event.button !== 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        setDeleteConfirm(null);
        capturePointer(event.pointerId);

        const point = getPointerPoint(event, surfaceRef.current);
        onDraftPointInsert(pointIndex, point);
        dragRef.current = {
            mode: "draftPoint",
            moved: true,
            pointIndex: pointIndex + 1,
            pointerId: event.pointerId,
            startPoint: point,
        };
    };

    const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
        if (!surfaceRef.current || !dragRef.current || dragRef.current.pointerId !== event.pointerId) {
            return;
        }

        const nextPoint = getPointerPoint(event, surfaceRef.current);

        if (dragRef.current.mode === "shape") {
            const delta = {
                x: nextPoint.x - dragRef.current.lastPoint.x,
                y: nextPoint.y - dragRef.current.lastPoint.y,
            };

            onShapeMove(dragRef.current.shapeId, delta);
            dragRef.current = {
                ...dragRef.current,
                lastPoint: nextPoint,
            };
            return;
        }

        const moved = dragRef.current.moved ||
            getPointDistance(dragRef.current.startPoint, nextPoint) >= DRAG_CLICK_THRESHOLD;

        if (!moved) {
            return;
        }

        if (dragRef.current.mode === "shapePoint") {
            onShapePointMove(dragRef.current.shapeId, dragRef.current.pointIndex, nextPoint);
        } else {
            onDraftPointMove(dragRef.current.pointIndex, nextPoint);
        }

        dragRef.current = {
            ...dragRef.current,
            moved,
        };
    };

    const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
        if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
            return;
        }

        releasePointer(event.pointerId);
        dragRef.current = null;
    };

    const handleShapeContextMenu = (shape: AiDetectionShape, event: React.MouseEvent<SVGElement>) => {
        if (!surfaceRef.current) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        const position = getPopupPosition(event, surfaceRef.current);
        setDeleteConfirm({
            label: shape.label,
            shapeId: shape.id,
            ...position,
        });
    };

    return (
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-slate-950">
                        {camera?.name || "Chưa chọn camera"}
                    </h2>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    <Crosshair size={14} aria-hidden="true" />
                    {activeFeatureItem.drawHint}
                </div>
            </div>

            <div className="p-4">
                <div
                    ref={surfaceRef}
                    className={cn(
                        "relative aspect-video overflow-hidden rounded-lg border border-slate-800 bg-slate-950",
                        canDraw ? "cursor-crosshair" : "cursor-not-allowed",
                    )}
                >
                    {snapshotUrl ? (
                        <Image
                            src={snapshotUrl}
                            alt=""
                            fill
                            unoptimized
                            sizes="100vw"
                            className="object-fill"
                            draggable={false}
                        />
                    ) : (
                        <>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(67,105,238,0.42),transparent_30%),radial-gradient(circle_at_82%_74%,rgba(16,185,129,0.28),transparent_27%),linear-gradient(135deg,#020617,#111827_55%,#0f172a)]" />
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:36px_36px]" />
                        </>
                    )}

                    <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        {camera?.status || "camera"}
                    </div>

                    {!snapshotUrl ? (
                        <div className="absolute inset-0 flex items-center justify-center text-white">
                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/10 backdrop-blur">
                                    <Camera size={31} aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">{camera?.name || "Select a camera"}</p>
                                    <p className="mt-1 text-xs text-slate-300">
                                        {snapshotErrorMessage ||
                                            (isSnapshotLoading
                                                ? "Đang tải snapshot..."
                                                : camera?.outputRtsp || camera?.rtsp || "Preview placeholder")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <svg
                        ref={svgRef}
                        className="absolute inset-0 h-full w-full"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        onContextMenu={(event) => event.preventDefault()}
                        onPointerCancel={handlePointerUp}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                    >
                        <rect
                            x="0"
                            y="0"
                            width="100"
                            height="100"
                            fill="transparent"
                            onPointerDown={handleSurfacePointerDown}
                        />

                        {activeShapes.map((shape) => (
                            <ShapeOverlay
                                key={shape.id}
                                shape={shape}
                                onEdgeInsertStart={handleEdgeInsertStart}
                                onPointDragStart={handlePointDragStart}
                                onShapeContextMenu={handleShapeContextMenu}
                                onShapeDragStart={handleShapeDragStart}
                                onShapePointRemove={onShapePointRemove}
                            />
                        ))}

                        {draftPoints.length > 0 ? (
                            <g>
                                {activeFeatureItem.shapeKind === "tripwire" && draftPoints.length === 2 ? (
                                    <line
                                        x1={draftPoints[0].x * 100}
                                        y1={draftPoints[0].y * 100}
                                        x2={draftPoints[1].x * 100}
                                        y2={draftPoints[1].y * 100}
                                        stroke={draftStyle.stroke}
                                        strokeWidth="1.5"
                                        strokeDasharray="3 2"
                                        strokeLinecap="round"
                                    />
                                ) : draftPoints.length >= 3 ? (
                                    <polygon
                                        points={getPolygonPoints(draftPoints)}
                                        fill={draftStyle.fill}
                                        stroke={draftStyle.stroke}
                                        strokeWidth="1.3"
                                        strokeDasharray="3 2"
                                    />
                                ) : (
                                    <polyline
                                        points={getPolygonPoints(draftPoints)}
                                        fill="none"
                                        stroke={draftStyle.stroke}
                                        strokeWidth="1.3"
                                        strokeDasharray="3 2"
                                    />
                                )}

                                {activeFeatureItem.shapeKind !== "tripwire"
                                    ? getSegments(draftPoints, draftPoints.length >= 3).map((segment) => (
                                        <line
                                            key={`draft-edge-${segment.index}`}
                                            x1={segment.start.x * 100}
                                            y1={segment.start.y * 100}
                                            x2={segment.end.x * 100}
                                            y2={segment.end.y * 100}
                                            stroke="transparent"
                                            strokeWidth="5"
                                            strokeLinecap="round"
                                            pointerEvents="stroke"
                                            className="cursor-copy"
                                            onPointerDown={(event) =>
                                                handleDraftEdgeInsertStart(segment.index, event)
                                            }
                                        />
                                    ))
                                    : null}

                                {draftPoints.map((point, index) => (
                                    <circle
                                        key={`${point.x}-${point.y}-${index}`}
                                        cx={point.x * 100}
                                        cy={point.y * 100}
                                        r="1.45"
                                        fill="#ffffff"
                                        stroke={draftStyle.stroke}
                                        strokeWidth="0.7"
                                        className="cursor-grab active:cursor-grabbing"
                                        onContextMenu={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            onDraftPointRemove(index);
                                        }}
                                        onPointerDown={(event) => handleDraftPointDragStart(index, event)}
                                    />
                                ))}
                            </g>
                        ) : null}
                    </svg>

                    {!canDraw ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35 text-sm font-semibold text-white">
                            {camera ? "Đợi snapshot để vẽ vùng nhận diện" : "Chọn camera để vẽ vùng nhận diện"}
                        </div>
                    ) : null}

                    {deleteConfirm ? (
                        <div
                            className="absolute z-20 w-48 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-lg"
                            style={{
                                left: deleteConfirm.x,
                                top: deleteConfirm.y,
                            }}
                        >
                            <p className="font-semibold text-slate-950">Xóa vùng?</p>
                            <p className="mt-1 truncate text-xs text-slate-500">{deleteConfirm.label}</p>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setDeleteConfirm(null)}
                                    className="h-8 rounded-md border border-slate-200 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onShapeDeleteRequest(deleteConfirm.shapeId);
                                        setDeleteConfirm(null);
                                    }}
                                    className="h-8 rounded-md bg-rose-600 text-xs font-semibold text-white transition-colors hover:bg-rose-700"
                                >
                                    Xóa vùng
                                </button>
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="mt-3 flex flex-col gap-2 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <MousePointer2 size={16} aria-hidden="true" />
                        <span>
                            {draftPoints.length > 0
                                ? `Đang chọn ${draftPoints.length} điểm`
                                : "Click để đặt điểm, kéo điểm/cạnh bằng chuột trái, click phải điểm để xóa điểm hoặc click phải vùng để xóa vùng"}
                        </span>
                    </div>
                    <span className="font-medium text-slate-700">
                        {activeShapes.length}{" "}
                        {activeFeatureItem.pluralShapeLabel}
                    </span>
                </div>
            </div>
        </section>
    );
}
