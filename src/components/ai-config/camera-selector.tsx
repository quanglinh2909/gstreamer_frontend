import { Camera, LoaderCircle, RefreshCw, WifiOff } from "lucide-react";
import type { ICameraResponse } from "@/interface/camera";
import { getCameraHealth } from "@/lib/camera-view-model";
import { cn } from "./ai-config-utils";

export function CameraSelector({
    cameras,
    isLoading,
    selectedCameraId,
    onRefresh,
    onSelectCamera,
}: {
    cameras: ICameraResponse[];
    isLoading: boolean;
    selectedCameraId: string;
    onRefresh: () => void;
    onSelectCamera: (cameraId: string) => void;
}) {
    return (
        <aside className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Camera</p>
                </div>
                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Refresh cameras"
                >
                    <RefreshCw size={16} className={cn(isLoading && "animate-spin")} aria-hidden="true" />
                </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
                {isLoading && cameras.length === 0 ? (
                    <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-slate-500">
                        <LoaderCircle className="animate-spin text-[#4369ee]" size={24} aria-hidden="true" />
                        Đang tải camera...
                    </div>
                ) : null}

                {!isLoading && cameras.length === 0 ? (
                    <div className="flex h-32 flex-col items-center justify-center gap-2 text-center text-sm text-slate-500">
                        <WifiOff size={24} aria-hidden="true" />
                        Chưa có camera để cấu hình.
                    </div>
                ) : null}

                <div className="space-y-2">
                    {cameras.map((camera) => {
                        const active = camera.id === selectedCameraId;
                        const health = getCameraHealth(camera);

                        return (
                            <button
                                key={camera.id}
                                type="button"
                                onClick={() => onSelectCamera(camera.id)}
                                className={cn(
                                    "flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition-colors",
                                    active
                                        ? "border-[#4369ee] bg-blue-50 text-slate-950"
                                        : "border-transparent bg-white text-slate-700 hover:bg-slate-50",
                                )}
                            >
                                <span
                                    className={cn(
                                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                                        active ? "bg-[#4369ee] text-white" : "bg-slate-100 text-slate-500",
                                    )}
                                >
                                    <Camera size={18} aria-hidden="true" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold">
                                        {camera.name || "Unnamed camera"}
                                    </span>
                                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                                        {health} · {camera.codec || "No codec"}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </aside>
    );
}
