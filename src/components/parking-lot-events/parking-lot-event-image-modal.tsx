import { useEffect, useState } from "react";
import Image from "next/image";
import { ImageOff, X } from "lucide-react";
import { getParkingLotEventImageUrl } from "@/lib/parking-lot-event-view-model";

export interface ParkingLotEventPreview {
    title: string;
    label: string;
    path: string;
}

export function ParkingLotEventImageModal({
    preview,
    onClose,
}: {
    preview: ParkingLotEventPreview | null;
    onClose: () => void;
}) {
    const [erroredPath, setErroredPath] = useState<string | null>(null);

    useEffect(() => {
        if (!preview) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [preview, onClose]);

    if (!preview) {
        return null;
    }

    const imageUrl = getParkingLotEventImageUrl(preview.path);
    const hasError = erroredPath === preview.path;

    return (
        <div
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-label={preview.title}
                className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4369ee]">
                            {preview.label}
                        </p>
                        <h2 className="mt-1 truncate text-lg font-semibold text-slate-950">{preview.title}</h2>
                    </div>
                    <button
                        type="button"
                        aria-label="Đóng ảnh"
                        onClick={onClose}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-950"
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>

                <div className="relative min-h-[320px] flex-1 bg-slate-900 sm:min-h-[460px]">
                    {!imageUrl || hasError ? (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                            <ImageOff size={32} aria-hidden="true" />
                            <span className="text-sm font-medium">Không có ảnh</span>
                        </div>
                    ) : (
                        <Image
                            src={imageUrl}
                            alt={preview.title}
                            fill
                            unoptimized
                            sizes="90vw"
                            onError={() => setErroredPath(preview.path)}
                            className="object-contain"
                        />
                    )}
                </div>
            </section>
        </div>
    );
}
