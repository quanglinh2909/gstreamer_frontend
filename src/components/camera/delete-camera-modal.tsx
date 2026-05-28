import { LoaderCircle, Trash2 } from "lucide-react";
import type { ICameraResponse } from "@/interface/camera";

export function DeleteCameraModal({
    camera,
    errorMessage,
    isDeleting,
    onClose,
    onConfirm,
}: {
    camera: ICameraResponse;
    errorMessage: string;
    isDeleting: boolean;
    onClose: () => void;
    onConfirm: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-lg bg-white shadow-2xl">
                <div className="border-b border-slate-200 px-5 py-4">
                    <p className="text-sm font-semibold text-rose-600">Delete camera</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-950">
                        {camera.name || "Unnamed camera"}
                    </h2>
                </div>
                <div className="space-y-4 px-5 py-5">
                    <p className="text-sm text-slate-600">
                        This camera will be removed from the list.
                    </p>
                    {errorMessage ? (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {errorMessage}
                        </div>
                    ) : null}
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isDeleting ? (
                            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                        ) : (
                            <Trash2 size={16} aria-hidden="true" />
                        )}
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
