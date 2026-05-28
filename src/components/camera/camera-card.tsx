import { Camera as CameraIcon, Clock3, Edit3, Trash2 } from "lucide-react";
import type { ICameraResponse } from "@/interface/camera";
import { formatCameraDate, getCameraHealth } from "@/lib/camera-view-model";
import { healthStyles } from "./camera-constants";
import { cn } from "./camera-utils";
import { InfoPill } from "./info-pill";
import type { CameraHealth } from "./types";

export function CameraCard({
    camera,
    onEdit,
    onDelete,
}: {
    camera: ICameraResponse;
    onEdit: (camera: ICameraResponse) => void;
    onDelete: (camera: ICameraResponse) => void;
}) {
    const health = getCameraHealth(camera) as CameraHealth;
    const style = healthStyles[health] ?? healthStyles.unknown;

    return (
        <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className={cn("relative aspect-video overflow-hidden bg-gradient-to-br", style.preview)}>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
                <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    <span className={cn("h-2 w-2 rounded-full", style.dot)} />
                    {style.label}
                </div>
                <div className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    {camera.codec || "No codec"}
                </div>
                <div className="relative flex h-full flex-col items-center justify-center px-6 text-center text-white">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/10 backdrop-blur">
                        <CameraIcon size={28} strokeWidth={2.3} aria-hidden="true" />
                    </div>
                    {/* <p className="mt-3 text-sm font-semibold">Preview unavailable</p> */}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
                    <h2 className="truncate text-base font-semibold text-white">
                        {camera.name || "Unnamed camera"}
                    </h2>
                    <p className="truncate text-xs text-slate-300">{camera.id}</p>
                </div>
            </div>

            <div className="space-y-4 p-4">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onEdit(camera)}
                        className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950"
                    >
                        <Edit3 size={15} aria-hidden="true" />
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(camera)}
                        className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                    >
                        <Trash2 size={15} aria-hidden="true" />
                        Delete
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <InfoPill label="Hardware" value={camera.hardware} />
                    <InfoPill label="Retry" value={String(camera.retryCount ?? 0)} />
                    <InfoPill
                        label="Recording"
                        value={camera.recordingEnabled ? camera.recordingMode || "Enabled" : "Off"}
                    />
                    <InfoPill
                        label="Motion"
                        value={camera.motionEnabled ? `${camera.motionSensitivity ?? 0}%` : "Off"}
                    />
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock3 size={14} aria-hidden="true" />
                    <span className="truncate">
                        Updated {formatCameraDate(camera.lastChangedAt)}
                    </span>
                </div>

                {camera.lastError ? (
                    <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                        {camera.lastError}
                    </div>
                ) : null}
            </div>
        </article>
    );
}
