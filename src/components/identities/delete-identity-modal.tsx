import { useEffect } from "react";
import { LoaderCircle, Trash2, X } from "lucide-react";
import type { Identity } from "@/interface/identity";

export function DeleteIdentityModal({
    identity,
    errorMessage,
    isDeleting,
    onClose,
    onConfirm,
}: {
    identity: Identity;
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
                aria-label={`Xóa identity ${identity.name}`}
                className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div>
                        <p className="text-sm font-semibold text-rose-600">Xóa identity</p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-950">{identity.name}</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        aria-label="Đóng xác nhận xóa"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50"
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>
                <div className="space-y-4 px-5 py-5">
                    <p className="text-sm text-slate-600">
                        Hồ sơ này sẽ bị xóa khỏi danh sách nhận diện. Thao tác không thể hoàn tác.
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
                        className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isDeleting ? (
                            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                        ) : (
                            <Trash2 size={16} aria-hidden="true" />
                        )}
                        Xác nhận xóa
                    </button>
                </footer>
            </section>
        </div>
    );
}
