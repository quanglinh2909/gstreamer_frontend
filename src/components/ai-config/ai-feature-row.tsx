import { CheckCircle2 } from "lucide-react";
import { HintLabel } from "@/components/common/hint-label";
import type { AiConfidenceKey, AiFeatureConfig, AiFeatureId, AiTracker } from "@/interface/ai-config";
import { cn } from "./ai-config-utils";
import { RestrictedModelPicker } from "./restricted-model-picker";

export function AiFeatureRow({
    confidenceControls,
    description,
    feature,
    id,
    label,
    onMaxFpsChange,
    onOverlapThresholdChange,
    onTrackerChange,
    onCountConfirmChange,
    onReAlertSecondsChange,
    onBarrierDurationChange,
    onMinPlateLengthChange,
    onDetectModelChange,
    onConfidenceChange,
    onSaveDetectionsChange,
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
    onSaveDetectionsChange: (featureId: AiFeatureId, saveDetections: boolean) => void;
    onOverlapThresholdChange: (featureId: AiFeatureId, overlapThreshold: number) => void;
    onTrackerChange: (featureId: AiFeatureId, tracker: AiTracker) => void;
    onCountConfirmChange: (featureId: AiFeatureId, countConfirm: number) => void;
    onReAlertSecondsChange: (featureId: AiFeatureId, reAlertSeconds: number) => void;
    onBarrierDurationChange: (featureId: AiFeatureId, barrierDuration: number) => void;
    onMinPlateLengthChange: (featureId: AiFeatureId, minPlateLength: number) => void;
    onDetectModelChange: (
        featureId: AiFeatureId,
        patch: { modelFile?: string; modelType?: string; classFilter?: string },
    ) => void;
    onToggle: (featureId: AiFeatureId) => void;
}) {
    const isTrackedFeature = id === "face" || id === "licensePlate" || id === "restrictedZone" || id === "faceMask";
    const isFaceMask = id === "faceMask";
    const isLicensePlate = id === "licensePlate";
    const overlapThreshold = feature.overlapThreshold ?? 30;
    const tracker = feature.tracker ?? "bytetrack";
    const countConfirm = feature.countConfirm ?? 3;
    const reAlertSeconds = feature.reAlertSeconds ?? 0;
    const barrierDuration = feature.barrierDuration ?? 0.5;
    const minPlateLength = feature.minPlateLength ?? 8;

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
                {/* Mô tả nằm sau dấu "?" chứ không in thẳng ra: bảng này có
                    tới bốn tính năng, mỗi tính năng vài đoạn giải thích thì
                    người dùng phải cuộn qua cả màn chữ mới tới được cái núm
                    cần chỉnh. Ai cần thì bấm. */}
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <HintLabel
                            label={label}
                            labelClassName="text-sm font-semibold text-slate-950"
                            placement="bottom"
                            hint={description}
                        />
                        {feature.enabled ? (
                            <CheckCircle2 size={15} className="text-emerald-600" aria-hidden="true" />
                        ) : null}
                    </div>
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
                            {/* 1 cột trên điện thoại: chia 3 thì mỗi ô chỉ còn
                                ~100px, "BoT-SORT" và "OC-SORT" bị cắt mất đuôi. */}
                            <div className="grid gap-2 sm:grid-cols-3">
                                {([
                                    { value: "bytetrack", label: "ByteTrack" },
                                    { value: "botsort", label: "BoT-SORT" },
                                    { value: "ocsort", label: "OC-SORT" },
                                ] as const).map((option) => (
                                    <label
                                        key={option.value}
                                        className={cn(
                                            // px-2/gap-1.5: bảng cài đặt bên phải
                                            // rộng cố định 360px, chia 3 cột thì
                                            // px-3 làm "ByteTrack" bị cắt đuôi.
                                            "flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-2 text-[11px] font-semibold transition-colors sm:text-xs",
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
                {id === "restrictedZone" ? (
                    <RestrictedModelPicker
                        modelFile={feature.modelFile}
                        modelType={feature.modelType}
                        classFilter={feature.classFilter}
                        onChange={(patch) => onDetectModelChange(id, patch)}
                    />
                ) : null}
                {isFaceMask ? (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col">
                            <label className="mb-2 block text-xs font-semibold leading-4 text-slate-500">
                                Số lần xác nhận
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={30}
                                value={countConfirm}
                                onChange={(event) => onCountConfirmChange(id, Number(event.target.value))}
                                className="mt-auto w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#4369ee] focus:outline-none"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="mb-2 block text-xs font-semibold leading-4 text-slate-500">
                                Báo lại sau (giây)
                            </label>
                            <input
                                type="number"
                                min={0}
                                max={3600}
                                value={reAlertSeconds}
                                onChange={(event) => onReAlertSecondsChange(id, Number(event.target.value))}
                                className="mt-auto w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#4369ee] focus:outline-none"
                            />
                        </div>
                        <div className="col-span-2">
                            <HintLabel
                                label="Độ dài xung barrier (giây)"
                                labelClassName="text-xs font-semibold leading-4 text-slate-500"
                                className="mb-2"
                                hint="Thời gian giữ tín hiệu mở barrier khi phát hiện người KHÔNG đeo khẩu trang. Tuỳ phần cứng từng cổng — xung quá ngắn thì barrier không kịp nhận, quá dài thì cổng mở lâu hơn cần thiết."
                            />
                            <input
                                type="number"
                                min={0.1}
                                max={10}
                                step={0.1}
                                value={barrierDuration}
                                onChange={(event) => onBarrierDurationChange(id, Number(event.target.value))}
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#4369ee] focus:outline-none"
                            />
                        </div>
                    </div>
                ) : null}
                {isLicensePlate ? (
                    <div>
                        <HintLabel
                            label="Số ký tự tối thiểu để lưu sự kiện"
                            labelClassName="text-xs font-semibold text-slate-500"
                            className="mb-2"
                            hint={
                                <>
                                    Biển đọc được ngắn hơn mức này sẽ không ghi thành sự kiện, hệ
                                    thống đợi frame sau đọc lại. Ngưỡng mở barrier nằm riêng ở trang
                                    <span className="font-semibold text-slate-800">
                                        {" "}
                                        Danh sách biển số trắng → Cấu hình
                                    </span>
                                    .
                                </>
                            }
                        />
                        <input
                            type="number"
                            min={1}
                            max={12}
                            value={minPlateLength}
                            onChange={(event) => onMinPlateLengthChange(id, Number(event.target.value))}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-[#4369ee] focus:outline-none"
                        />
                    </div>
                ) : null}
                {/* Lưu khung phát hiện để XEM LẠI vẽ được box/pose và tìm sự
                    kiện theo vùng vẽ trên hình. Mặc định TẮT vì đây là ghi
                    liên tục theo mỗi khung hình. */}
                <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 p-3">
                    <input
                        id={`save-detections-${id}`}
                        type="checkbox"
                        checked={Boolean(feature.saveDetections)}
                        onChange={(event) => onSaveDetectionsChange(id, event.target.checked)}
                        className="mt-0.5 h-4 w-4 cursor-pointer accent-[#4369ee]"
                    />
                    <HintLabel
                        label="Lưu khung phát hiện để xem lại"
                        labelClassName="cursor-pointer text-xs font-semibold text-slate-900"
                        className="min-w-0 flex-1"
                        hint="Bật thì khi xem lại bản ghi sẽ vẽ được khung/khớp xương, và vẽ một vùng trên hình để tìm sự kiện đã đi qua vùng đó. Tốn thêm ~10 MB/ngày cho mỗi AI."
                    />
                </div>
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
