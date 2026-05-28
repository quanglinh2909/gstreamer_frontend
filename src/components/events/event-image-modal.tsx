import { useEffect, useState } from "react";
import Image from "next/image";
import { Camera, ImageOff, X } from "lucide-react";
import type { RecognitionEvent, RecognitionEventTab } from "@/interface/recognition-event";
import {
    formatEventConfidence,
    formatEventTimestamp,
    getEventImageUrl,
    getEventResultLabel,
} from "@/lib/event-view-model";

function getEventPreviewTypeLabel(tab: RecognitionEventTab) {
    if (tab === "plate") {
        return "Biển số nhận diện";
    }

    if (tab === "restricted") {
        return "Sự kiện vùng cấm";
    }

    return "Khuôn mặt nhận diện";
}

function FullEventImage({ path, alt }: { path: string; alt: string }) {
    const [hasImageError, setHasImageError] = useState(false);
    const imageUrl = getEventImageUrl(path);

    if (!imageUrl || hasImageError) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-slate-100 text-slate-400">
                <ImageOff size={42} aria-hidden="true" />
                <span className="text-sm font-semibold">Không thể hiển thị ảnh</span>
            </div>
        );
    }

    return (
        <Image
            src={imageUrl}
            alt={alt}
            fill
            unoptimized
            sizes="90vw"
            onError={() => setHasImageError(true)}
            className="object-contain"
        />
    );
}

export function EventImageModal({
    event,
    tab,
    cameraLabel,
    onClose,
}: {
    event: RecognitionEvent | null;
    tab: RecognitionEventTab;
    cameraLabel: string;
    onClose: () => void;
}) {
    useEffect(() => {
        if (!event) {
            return;
        }

        const handleKeyDown = (keyboardEvent: KeyboardEvent) => {
            if (keyboardEvent.key === "Escape") {
                onClose();
            }
        };
        const previousOverflow = document.body.style.overflow;

        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [event, onClose]);

    if (!event) {
        return null;
    }

    const resultLabel = getEventResultLabel(event, tab);
    const imagePath = event.image_full || event.image_crop;

    return (
        <div
            role="presentation"
            onMouseDown={(mouseEvent) => {
                if (mouseEvent.target === mouseEvent.currentTarget) {
                    onClose();
                }
            }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-label={`Ảnh sự kiện ${resultLabel}`}
                className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4369ee]">
                            {getEventPreviewTypeLabel(tab)}
                        </p>
                        <h2 className="mt-1 truncate text-xl font-semibold text-slate-950">{resultLabel}</h2>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                                <Camera size={15} aria-hidden="true" />
                                {cameraLabel}
                            </span>
                            <span>{formatEventConfidence(event.confidence)}</span>
                            <span>{formatEventTimestamp(event.timestamp)}</span>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Đóng ảnh sự kiện"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-950"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </header>

                <div className="relative min-h-[300px] flex-1 bg-slate-950 sm:min-h-[480px]">
                    <FullEventImage key={imagePath} path={imagePath} alt={resultLabel} />
                </div>
            </section>
        </div>
    );
}
