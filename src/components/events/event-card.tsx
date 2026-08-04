import { useState } from "react";
import Image from "next/image";
import { Camera, ImageOff } from "lucide-react";
import type { RecognitionEvent, RecognitionEventTab } from "@/interface/recognition-event";
import {
    formatEventConfidence,
    formatEventTimestamp,
    getEventImageUrl,
    getEventResultLabel,
} from "@/lib/event-view-model";
import { cn } from "./event-utils";

function EventThumbnail({
    alt,
    path,
    preserveDetails,
}: {
    alt: string;
    path: string;
    preserveDetails: boolean;
}) {
    const [hasImageError, setHasImageError] = useState(false);
    const imageUrl = getEventImageUrl(path);

    if (!imageUrl || hasImageError) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-400">
                <ImageOff size={28} aria-hidden="true" />
                <span className="text-xs font-medium">Không có ảnh</span>
            </div>
        );
    }

    return (
        <Image
            src={imageUrl}
            alt={alt}
            fill
            unoptimized
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
            onError={() => setHasImageError(true)}
            className={cn(
                preserveDetails
                    ? "object-contain"
                    : "object-cover transition-transform duration-300 group-hover:scale-[1.03]",
            )}
        />
    );
}

export function EventCard({
    event,
    tab,
    cameraLabel,
    onPreview,
}: {
    event: RecognitionEvent;
    tab: RecognitionEventTab;
    cameraLabel: string;
    onPreview: (event: RecognitionEvent) => void;
}) {
    const resultLabel = getEventResultLabel(event, tab);
    const compactCard = tab === "plate";
    const preserveDetails = tab === "restricted";

    return (
        <button
            type="button"
            onClick={() => onPreview(event)}
            className="group overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4369ee]"
        >
            <div
                className={cn(
                    "relative overflow-hidden bg-slate-100",
                    compactCard ? "h-24 sm:h-32" : "aspect-[5/6]",
                )}
            >
                <EventThumbnail path={event.image_crop} alt={resultLabel} preserveDetails={preserveDetails} />
                <span
                    className={cn(
                        "absolute rounded-full bg-slate-950/70 font-semibold text-white backdrop-blur-sm",
                        compactCard ? "right-2 top-2 px-2 py-0.5 text-[11px]" : "right-3 top-3 px-2.5 py-1 text-xs",
                    )}
                >
                    {formatEventConfidence(event.confidence)}
                </span>
            </div>

            <div
                className={cn(
                    "space-y-1.5 p-2.5",
                    compactCard ? "sm:space-y-2 sm:p-3" : "sm:space-y-3 sm:p-4",
                )}
            >
                <div>
                    {/* <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#4369ee]">
                        {tab === "plate" ? "Biển số" : "Khuôn mặt"}
                    </p> */}
                    <h2
                        className={cn(
                            "mt-1 truncate text-sm font-semibold text-slate-950",
                            compactCard ? "" : "sm:text-base",
                        )}
                    >
                        {resultLabel}
                    </h2>
                </div>

                <div
                    className={cn(
                        "flex items-center gap-1.5 text-xs text-slate-600 sm:gap-2",
                        compactCard ? "" : "sm:text-sm",
                    )}
                >
                    <Camera size={14} className="shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="truncate">{cameraLabel}</span>
                </div>

                <p
                    className={cn(
                        "border-t border-slate-100 pt-1.5 text-[11px] font-medium text-slate-500",
                        compactCard ? "sm:pt-2" : "sm:pt-3 sm:text-xs",
                    )}
                >
                    {formatEventTimestamp(event.timestamp)}
                </p>
            </div>
        </button>
    );
}
