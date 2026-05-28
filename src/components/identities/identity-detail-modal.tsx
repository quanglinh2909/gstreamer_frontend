import { useEffect } from "react";
import { LoaderCircle, Pencil, Trash2, UserRound, X } from "lucide-react";
import type { Identity } from "@/interface/identity";
import { IdentityImage } from "./identity-image";

export function IdentityDetailModal({
    identity,
    errorMessage,
    isLoading,
    onClose,
    onEdit,
    onDelete,
}: {
    identity: Identity | null;
    errorMessage: string;
    isLoading: boolean;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}) {
    useEffect(() => {
        if (!identity) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [identity, onClose]);

    if (!identity) {
        return null;
    }

    const imagePath = identity.image_full || identity.image_crop;

    return (
        <div
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-label={`Chi tiết identity ${identity.name}`}
                className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4369ee]">
                            Hồ sơ identity
                        </p>
                        <h2 className="mt-1 text-xl font-semibold text-slate-950">{identity.name}</h2>
                        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-500">
                            <UserRound size={15} aria-hidden="true" />
                            ID #{identity.id}
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-label="Đóng chi tiết identity"
                        onClick={onClose}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-950"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </header>

                {errorMessage ? (
                    <p className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">
                        {errorMessage}
                    </p>
                ) : null}

                <div className="relative min-h-[340px] flex-1 bg-slate-950 sm:min-h-[500px]">
                    <IdentityImage
                        key={imagePath}
                        path={imagePath}
                        alt={identity.name}
                        sizes="90vw"
                        mode="contain"
                    />
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 text-white">
                            <LoaderCircle size={28} className="animate-spin" aria-hidden="true" />
                        </div>
                    ) : null}
                </div>

                <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
                    <button
                        type="button"
                        onClick={onEdit}
                        disabled={isLoading}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
                    >
                        <Pencil size={16} aria-hidden="true" />
                        Sửa
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        disabled={isLoading}
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
                    >
                        <Trash2 size={16} aria-hidden="true" />
                        Xóa
                    </button>
                </footer>
            </section>
        </div>
    );
}
