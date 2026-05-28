import { AlertTriangle, ShieldCheck } from "lucide-react";
import type { AiConfigManager } from "@/hooks/use-ai-config-manager";
import { aiFeatureItems, getAiFeatureItem } from "./ai-config-constants";
import { cn } from "./ai-config-utils";
import { AiDetectionCanvas } from "./ai-detection-canvas";
import { AiDebugModal } from "./ai-debug-modal";
import { AiSettingsPanel } from "./ai-settings-panel";
import { CameraSelector } from "./camera-selector";

export function AiConfigDashboard({ manager }: { manager: AiConfigManager }) {
    const activeFeatureItem = getAiFeatureItem(manager.activeFeatureId);
    const activeShapes =
        manager.selectedConfig?.shapes.filter((shape) => shape.kind === activeFeatureItem.shapeKind) ?? [];

    return (
        <main className="h-full overflow-y-auto bg-slate-50">
            <div className="mx-auto flex min-h-full max-w-[1700px] flex-col gap-5 px-6 py-5">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>

                        <h1 className="mt-1 text-2xl font-semibold text-slate-950">
                            Cấu hình AI cho từng camera
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Bật nhận diện, chọn tỷ lệ tin cậy và vẽ vùng xử lý trên khung hình.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                        <ShieldCheck size={17} aria-hidden="true" />
                        Snapshot và cấu hình AI
                    </div>
                </header>

                {manager.errorMessage ? (
                    <section className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
                        <div className="min-w-0">
                            <p className="font-semibold">Cannot load cameras</p>
                            <p className="mt-1 break-words">{manager.errorMessage}</p>
                        </div>
                    </section>
                ) : null}

                <section className="grid min-h-[720px] gap-4 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
                    <CameraSelector
                        cameras={manager.cameras}
                        isLoading={manager.isLoading}
                        selectedCameraId={manager.selectedCameraId}
                        onRefresh={() => void manager.fetchCameras()}
                        onSelectCamera={manager.handleSelectCamera}
                    />

                    <div className="min-w-0 space-y-4">
                        <section className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm md:grid-cols-4">
                            {aiFeatureItems.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => manager.handleSelectFeature(item.id)}
                                    className={cn(
                                        "h-10 rounded-md px-3 text-sm font-semibold transition-colors",
                                        manager.activeFeatureId === item.id
                                            ? "bg-[#4369ee] text-white shadow-sm"
                                            : "bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950",
                                    )}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </section>

                        <AiDetectionCanvas
                            activeFeatureId={manager.activeFeatureId}
                            camera={manager.selectedCamera}
                            config={manager.selectedConfig}
                            draftPoints={manager.draftPoints}
                            isSnapshotLoading={manager.isSnapshotLoading}
                            onDraftPointInsert={manager.insertDraftPoint}
                            onDraftPointMove={manager.moveDraftPoint}
                            onDraftPointRemove={manager.removeDraftPoint}
                            onPoint={manager.addCanvasPoint}
                            onShapePointInsert={manager.insertShapePoint}
                            onShapePointMove={manager.moveShapePoint}
                            onShapeMove={manager.moveShape}
                            onShapeDeleteRequest={manager.removeShape}
                            onShapePointRemove={manager.removeShapePoint}
                            snapshotErrorMessage={manager.snapshotErrorMessage}
                            snapshotUrl={manager.snapshotUrl}
                        />
                    </div>

                    <AiSettingsPanel
                        activeFeatureId={manager.activeFeatureId}
                        canViewDebug={Boolean(manager.debugStreamUrl)}
                        config={manager.selectedConfig}
                        draftPointCount={manager.draftPoints.length}
                        isSavingRecognition={manager.isSavingRecognition}
                        shapes={activeShapes}
                        onAddZone={manager.addActiveZone}
                        onClearDraft={manager.clearDraft}
                        onConfidenceChange={manager.setFeatureConfidence}
                        onMaxFpsChange={manager.setFeatureMaxFps}
                        onOverlapThresholdChange={manager.setFeatureOverlapThreshold}
                        onTrackerChange={manager.setFeatureTracker}
                        onRemoveShape={manager.removeShape}
                        onReset={manager.resetCurrentConfig}
                        onSaveRecognition={manager.saveActiveRecognitionConfig}
                        onToggleFeature={manager.toggleFeature}
                        onViewDebug={manager.openDebugPreview}
                        recognitionErrorMessage={manager.recognitionErrorMessage}
                        recognitionMessage={manager.recognitionMessage}
                    />
                </section>
            </div>

            <AiDebugModal
                featureLabel={activeFeatureItem.label}
                isOpen={manager.isDebugPreviewOpen}
                onClose={manager.closeDebugPreview}
                streamUrl={manager.debugStreamUrl}
            />
        </main>
    );
}
