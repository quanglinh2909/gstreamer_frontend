import { MapPinned, Trash2 } from "lucide-react";
import type { AiDetectionShape } from "@/interface/ai-config";
import type { AiFeatureItem } from "./ai-config-constants";

function getShapeMeta(shape: AiDetectionShape) {
    if (shape.kind === "tripwire") {
        return {
            label: "Hàng rào ảo",
            color: "text-amber-700 bg-amber-50 border-amber-200",
        };
    }

    if (shape.kind === "faceZone") {
        return {
            label: "Khuôn mặt",
            color: "text-sky-700 bg-sky-50 border-sky-200",
        };
    }

    if (shape.kind === "licensePlateZone") {
        return {
            label: "Biển số",
            color: "text-violet-700 bg-violet-50 border-violet-200",
        };
    }

    return {
        label: "Vùng cấm",
        color: "text-rose-700 bg-rose-50 border-rose-200",
    };
}

export function AiShapeList({
    activeFeatureItem,
    onRemoveShape,
    shapes,
}: {
    activeFeatureItem: AiFeatureItem;
    onRemoveShape: (shapeId: string) => void;
    shapes: AiDetectionShape[];
}) {
    return (
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {activeFeatureItem.shapeLabel}
                    </p>
                    <h2 className="text-sm font-semibold text-slate-950">
                        {shapes.length} {activeFeatureItem.pluralShapeLabel} đã lưu
                    </h2>
                </div>
                <MapPinned size={18} className="text-slate-500" aria-hidden="true" />
            </div>

            <div className="space-y-2 p-3">
                {shapes.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                        Click lên ảnh để bắt đầu vẽ {activeFeatureItem.pluralShapeLabel}.
                    </p>
                ) : null}

                {shapes.map((shape) => {
                    const meta = getShapeMeta(shape);

                    return (
                        <div
                            key={shape.id}
                            className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2"
                        >
                            <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${meta.color}`}>
                                {meta.label}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                                {shape.label}
                            </span>
                            <span className="text-xs text-slate-500">{shape.points.length} điểm</span>
                            <button
                                type="button"
                                onClick={() => onRemoveShape(shape.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 transition-colors hover:bg-rose-50"
                                aria-label={`Delete ${shape.label}`}
                            >
                                <Trash2 size={15} aria-hidden="true" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
