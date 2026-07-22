import { useEffect } from "react";
import { LoaderCircle, Power, X } from "lucide-react";
import type { PlateWhiteListSettings } from "@/interface/plate-white-list-settings";

export function DeletePlateWhiteListSettingsModal({
    entry,
    cameraName,
    errorMessage,
    isDeleting,
    onClose,
    onConfirm,
}: {
    entry: PlateWhiteListSettings;
    cameraName: string;
    errorMessage: string;
    isDeleting: boolean;
    onClose: () => void;
    onConfirm: () => void;
}) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !isDeleting) {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isDeleting, onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <section
                role="dialog"
                aria-modal="true"
                aria-label={`Tắt barrier cho ${cameraName || entry.camera_id}`}
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-rose-600">Tắt barrier</p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-950">
                            {cameraName || "Camera không xác định"}
                        </h2>
                        <p className="mt-1 truncate font-mono text-xs text-slate-400">
                            {entry.camera_id}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        aria-label="Đóng xác nhận tắt"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>
                <div className="space-y-4 px-5 py-5">
                    <p className="text-sm text-slate-600">
                        Camera này sẽ <span className="font-semibold text-slate-900">ngừng mở barrier</span> hoàn
                        toàn — biển số có nằm trong danh sách trắng cũng không mở nữa. Danh sách biển số
                        không bị ảnh hưởng, bật lại lúc nào cũng được.
                    </p>
                    {errorMessage ? (
                        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {errorMessage}
                        </p>
                    ) : null}
                </div>
                <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                        {isDeleting ? <LoaderCircle size={16} className="animate-spin" /> : <Power size={16} />}
                        Xác nhận tắt
                    </button>
                </footer>
            </section>
        </div>
    );
}
