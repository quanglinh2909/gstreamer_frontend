import { useEffect } from "react";
import { LoaderCircle, Pencil, Trash2, UserRound, X } from "lucide-react";
import type { Identity } from "@/interface/identity";
import type { IdentityManager } from "@/hooks/use-identity-manager";
import { IdentityImage } from "./identity-image";
import { IdentityPlatesPanel } from "./identity-plates-panel";

export function IdentityDetailModal({
    identity,
    errorMessage,
    isLoading,
    manager,
    onClose,
    onEdit,
    onDelete,
}: {
    identity: Identity | null;
    errorMessage: string;
    isLoading: boolean;
    manager: IdentityManager;
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
                className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
                    <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4369ee]">
                            Hồ sơ identity
                        </p>
                        <h2 className="mt-1 truncate text-xl font-semibold text-slate-950">{identity.name}</h2>
                        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                            <UserRound size={13} aria-hidden="true" />
                            ID #{identity.id}
                        </span>
                    </div>
                    <button
                        type="button"
                        aria-label="Đóng chi tiết identity"
                        onClick={onClose}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-950"
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>

                {errorMessage ? (
                    <p className="border-b border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-700">
                        {errorMessage}
                    </p>
                ) : null}

                <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_360px] lg:overflow-hidden">
                    <div className="flex items-center justify-center bg-slate-50 p-5 lg:overflow-y-auto">
                        <div className="relative aspect-[4/5] w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-sm">
                            <IdentityImage
                                key={imagePath}
                                path={imagePath}
                                alt={identity.name}
                                sizes="(max-width: 1024px) 90vw, 420px"
                                mode="contain"
                            />
                            {isLoading ? (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 text-white">
                                    <LoaderCircle size={28} className="animate-spin" aria-hidden="true" />
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex min-h-0 flex-col border-t border-slate-200 lg:border-l lg:border-t-0">
                        <IdentityPlatesPanel manager={manager} />
                    </div>
                </div>

                <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
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
