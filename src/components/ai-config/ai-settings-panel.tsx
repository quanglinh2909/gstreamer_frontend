import { Eraser, MonitorPlay, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import type {
    AiCameraConfig,
    AiConfidenceKey,
    AiDetectionShape,
    AiFeatureId,
    AiTracker,
} from "@/interface/ai-config";
import { getAiFeatureItem } from "./ai-config-constants";
import { AiFeatureRow } from "./ai-feature-row";

export function AiSettingsPanel({
    activeFeatureId,
    config,
    draftPointCount,
    isSavingRecognition,
    canViewDebug,
    onClearDraft,
    onAddZone,
    onConfidenceChange,
    onMaxFpsChange,
    onOverlapThresholdChange,
    onRemoveShape,
    onReset,
    onSaveRecognition,
    onToggleFeature,
    onTrackerChange,
    onViewDebug,
    recognitionErrorMessage,
    recognitionMessage,
    shapes,
}: {
    activeFeatureId: AiFeatureId;
    config: AiCameraConfig | null;
    draftPointCount: number;
    isSavingRecognition: boolean;
    canViewDebug: boolean;
    onClearDraft: () => void;
    onAddZone: () => void;
    onConfidenceChange: (featureId: AiFeatureId, key: AiConfidenceKey, confidence: number) => void;
    onMaxFpsChange: (featureId: AiFeatureId, maxFps: number) => void;
    onOverlapThresholdChange: (featureId: AiFeatureId, overlapThreshold: number) => void;
    onRemoveShape: (shapeId: string) => void;
    onReset: () => void;
    onSaveRecognition: () => void;
    onToggleFeature: (featureId: AiFeatureId) => void;
    onTrackerChange: (featureId: AiFeatureId, tracker: AiTracker) => void;
    onViewDebug: () => void;
    recognitionErrorMessage: string;
    recognitionMessage: string;
    shapes: AiDetectionShape[];
}) {
    const activeFeatureItem = getAiFeatureItem(activeFeatureId);
    const activeFeature = config ? config.features[activeFeatureId] : null;
    const canAddZone = activeFeatureItem.shapeKind !== "tripwire" && draftPointCount >= 3;
    const canSave = activeFeatureId === "face" || activeFeatureId === "licensePlate" || activeFeatureId === "restrictedZone";

    return (
        <aside className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-950">{activeFeatureItem.label}</h2>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                <section>
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                            {/* <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {activeFeatureItem.shapeLabel}
                            </p> */}
                            {/* <h3 className="text-sm font-semibold text-slate-950">
                                {shapes.length} {activeFeatureItem.pluralShapeLabel}
                            </h3> */}
                        </div>
                        <button
                            type="button"
                            onClick={onAddZone}
                            disabled={!canAddZone}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                            <Plus size={15} aria-hidden="true" />
                            Thêm vùng
                        </button>
                    </div>

                    {draftPointCount > 0 ? (
                        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                            <span>Đang vẽ {draftPointCount} điểm</span>
                            <button
                                type="button"
                                onClick={onClearDraft}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white"
                                aria-label="Clear draft"
                            >
                                <Eraser size={15} aria-hidden="true" />
                            </button>
                        </div>
                    ) : null}

                    <div className="space-y-2">
                        {shapes.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-slate-300 px-3 py-5 text-center text-sm text-slate-500">
                                Click lên ảnh để vẽ {activeFeatureItem.pluralShapeLabel}.
                            </p>
                        ) : null}

                        {shapes.map((shape) => (
                            <div
                                key={shape.id}
                                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
                            >
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
                        ))}
                    </div>

                    {activeFeatureItem.shapeKind === "tripwire" ? (
                        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                            Hàng rào ảo tự tạo sau khi chọn đủ 2 điểm.
                        </p>
                    ) : null}
                </section>

                {config && activeFeature ? (
                    <AiFeatureRow
                        id={activeFeatureId}
                        label={activeFeatureItem.label}
                        description={activeFeatureItem.description}
                        feature={activeFeature}
                        confidenceControls={activeFeatureItem.confidenceControls}
                        onToggle={onToggleFeature}
                        onConfidenceChange={onConfidenceChange}
                        onMaxFpsChange={onMaxFpsChange}
                        onOverlapThresholdChange={onOverlapThresholdChange}
                        onTrackerChange={onTrackerChange}
                    />
                ) : (
                    <div className="rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                        Chọn camera để cấu hình AI.
                    </div>
                )}

                <section>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Lưu cấu hình</p>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={onSaveRecognition}
                            disabled={!config || isSavingRecognition || !canSave}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#4369ee] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#3457d6] disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                            <Save size={15} aria-hidden="true" />
                            Lưu
                        </button>
                        <button
                            type="button"
                            onClick={onViewDebug}
                            disabled={!canSave || !canViewDebug}
                            title={canViewDebug ? "Xem video debug" : "Chưa có job debug"}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:border-[#4369ee] hover:text-[#4369ee] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        >
                            <MonitorPlay size={15} aria-hidden="true" />
                            Xem debug
                        </button>
                    </div>
                    {recognitionMessage ? (
                        <p className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                            {recognitionMessage}
                        </p>
                    ) : null}
                    {recognitionErrorMessage ? (
                        <p className="mt-2 rounded-md bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                            {recognitionErrorMessage}
                        </p>
                    ) : null}
                </section>
            </div>


        </aside>
    );
}
