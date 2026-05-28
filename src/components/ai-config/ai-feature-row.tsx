import { CheckCircle2 } from "lucide-react";
import type { AiConfidenceKey, AiFeatureConfig, AiFeatureId, AiTracker } from "@/interface/ai-config";
import { cn } from "./ai-config-utils";

export function AiFeatureRow({
    confidenceControls,
    description,
    feature,
    id,
    label,
    onMaxFpsChange,
    onOverlapThresholdChange,
    onTrackerChange,
    onConfidenceChange,
    onToggle,
}: {
    confidenceControls: Array<{
        key: AiConfidenceKey;
        label: string;
    }>;
    description: string;
    feature: AiFeatureConfig;
    id: AiFeatureId;
    label: string;
    onConfidenceChange: (featureId: AiFeatureId, key: AiConfidenceKey, confidence: number) => void;
    onMaxFpsChange: (featureId: AiFeatureId, maxFps: number) => void;
    onOverlapThresholdChange: (featureId: AiFeatureId, overlapThreshold: number) => void;
    onTrackerChange: (featureId: AiFeatureId, tracker: AiTracker) => void;
    onToggle: (featureId: AiFeatureId) => void;
}) {
    const isTrackedFeature = id === "face" || id === "licensePlate" || id === "restrictedZone";
    const overlapThreshold = feature.overlapThreshold ?? 30;
    const tracker = feature.tracker ?? "bytetrack";

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-950">{label}</h3>
                        {feature.enabled ? (
                            <CheckCircle2 size={15} className="text-emerald-600" aria-hidden="true" />
                        ) : null}
                    </div>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
                </div>
                <button
                    type="button"
                    onClick={() => onToggle(id)}
                    className={cn(
                        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                        feature.enabled ? "bg-[#4369ee]" : "bg-slate-300",
                    )}
                    aria-pressed={feature.enabled}
                    aria-label={`Toggle ${label}`}
                >
                    <span
                        className={cn(
                            "absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                            feature.enabled ? "translate-x-5" : "translate-x-0",
                        )}
                    />
                </button>
            </div>

            <div className="mt-4 space-y-4">
                {confidenceControls.map((control) => {
                    const value = feature[control.key] ?? 70;

                    return (
                        <div key={control.key}>
                            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                                <span>{control.label}</span>
                                <span className="text-slate-900">{value}%</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={100}
                                value={value}
                                onChange={(event) => onConfidenceChange(id, control.key, Number(event.target.value))}
                                className="h-2 w-full cursor-pointer accent-[#4369ee]"
                            />
                        </div>
                    );
                })}
                {isTrackedFeature ? (
                    <>
                        <div>
                            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                                <span>Ngưỡng chồng lấp</span>
                                <span className="text-slate-900">{overlapThreshold}%</span>
                            </div>
                            <input
                                type="range"
                                min={0}
                                max={100}
                                value={overlapThreshold}
                                onChange={(event) => onOverlapThresholdChange(id, Number(event.target.value))}
                                className="h-2 w-full cursor-pointer accent-[#4369ee]"
                            />
                        </div>

                        <fieldset>
                            <legend className="mb-2 text-xs font-semibold text-slate-500">Tracker</legend>
                            <div className="grid grid-cols-3 gap-2">
                                {([
                                    { value: "bytetrack", label: "ByteTrack" },
                                    { value: "botsort", label: "BoT-SORT" },
                                    { value: "ocsort", label: "OC-SORT" },
                                ] as const).map((option) => (
                                    <label
                                        key={option.value}
                                        className={cn(
                                            "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
                                            tracker === option.value
                                                ? "border-[#4369ee] bg-blue-50 text-[#3156d4]"
                                                : "border-slate-200 text-slate-600 hover:bg-slate-50",
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name={`tracker-${id}`}
                                            value={option.value}
                                            checked={tracker === option.value}
                                            onChange={() => onTrackerChange(id, option.value)}
                                            className="accent-[#4369ee]"
                                        />
                                        {option.label}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    </>
                ) : null}
                <div>
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span>Max FPS</span>
                        <span className="text-slate-900">{feature.maxFps}</span>
                    </div>
                    <input
                        type="range"
                        min={1}
                        max={25}
                        value={feature.maxFps}
                        onChange={(event) => onMaxFpsChange(id, Number(event.target.value))}
                        className="h-2 w-full cursor-pointer accent-[#4369ee]"
                    />
                </div>
            </div>
        </section>
    );
}
