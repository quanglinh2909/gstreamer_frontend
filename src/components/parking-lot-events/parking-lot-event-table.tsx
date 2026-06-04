import { useState } from "react";
import Image from "next/image";
import { Clock, ImageOff, ScanLine, SmilePlus, SquareParking, UserRound } from "lucide-react";
import type { ParkingLotEvent } from "@/interface/parking-lot-event";
import {
    formatParkingLotEventTimestamp,
    getParkingLotEventImageUrl,
} from "@/lib/parking-lot-event-view-model";
import {
    ParkingLotEventImageModal,
    type ParkingLotEventPreview,
} from "./parking-lot-event-image-modal";

function EventThumbnail({
    label,
    path,
    onOpen,
}: {
    label: string;
    path: string;
    onOpen: () => void;
}) {
    const [hasError, setHasError] = useState(false);
    const imageUrl = getParkingLotEventImageUrl(path);

    if (!imageUrl || hasError) {
        return (
            <div
                className="flex h-14 w-14 flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-400"
                aria-label={`${label}: không có ảnh`}
            >
                <ImageOff size={16} aria-hidden="true" />
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={onOpen}
            aria-label={`Xem ảnh ${label}`}
            className="group relative h-14 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-900 transition-colors hover:border-[#4369ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4369ee]"
        >
            <Image
                src={imageUrl}
                alt={label}
                fill
                unoptimized
                sizes="56px"
                onError={() => setHasError(true)}
                className="object-cover transition-transform duration-300 group-hover:scale-[1.06]"
            />
        </button>
    );
}

export function ParkingLotEventTable({ events }: { events: ParkingLotEvent[] }) {
    const [preview, setPreview] = useState<ParkingLotEventPreview | null>(null);

    return (
        <>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead className="bg-slate-50">
                        <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                            <th className="px-5 py-4">ID</th>
                            <th className="px-5 py-4">Thời gian</th>
                            <th className="px-5 py-4">Bãi xe</th>
                            <th className="px-5 py-4">Identity</th>
                            <th className="px-5 py-4">Biển số</th>
                            <th className="px-5 py-4">Hình ảnh</th>
                            <th className="px-5 py-4">Camera</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.map((event) => (
                            <tr
                                key={event.id}
                                className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80"
                            >
                                <td className="px-5 py-4 text-sm text-slate-500">#{event.id}</td>
                                <td className="px-5 py-4">
                                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                                        <Clock size={14} className="text-slate-400" aria-hidden="true" />
                                        {formatParkingLotEventTimestamp(event.timestamp)}
                                    </span>
                                </td>
                                <td className="px-5 py-4">
                                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-800">
                                        <SquareParking size={15} className="text-[#4369ee]" aria-hidden="true" />
                                        {event.parking_lot_name || `#${event.parking_lot_id}`}
                                    </span>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-2">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                            <UserRound size={15} aria-hidden="true" />
                                        </span>
                                        <span className="flex min-w-0 flex-col leading-tight">
                                            <span className="truncate text-sm font-medium text-slate-800">
                                                {event.name || "Không xác định"}
                                            </span>
                                            <span className="text-xs text-slate-400">ID #{event.identity_id}</span>
                                        </span>
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    {event.plate_number ? (
                                        <span className="inline-flex rounded-lg bg-blue-50 px-3 py-1.5 font-mono text-sm font-bold tracking-wide text-[#3156d4]">
                                            {event.plate_number}
                                        </span>
                                    ) : (
                                        <span className="text-sm text-slate-400">--</span>
                                    )}
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex items-center gap-2">
                                        <EventThumbnail
                                            label="Khuôn mặt"
                                            path={event.face_image_full}
                                            onOpen={() =>
                                                setPreview({
                                                    title: event.name || `ID #${event.identity_id}`,
                                                    label: "Ảnh khuôn mặt",
                                                    path: event.face_image_full,
                                                })
                                            }
                                        />
                                        <EventThumbnail
                                            label="Biển số"
                                            path={event.plate_image_full}
                                            onOpen={() =>
                                                setPreview({
                                                    title: event.plate_number || `ID #${event.id}`,
                                                    label: "Ảnh biển số",
                                                    path: event.plate_image_full,
                                                })
                                            }
                                        />
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex flex-col gap-1 text-xs text-slate-500">
                                        <span className="inline-flex items-center gap-1.5">
                                            <SmilePlus size={13} className="text-slate-400" aria-hidden="true" />
                                            {event.face_camera_id || "--"}
                                        </span>
                                        <span className="inline-flex items-center gap-1.5">
                                            <ScanLine size={13} className="text-slate-400" aria-hidden="true" />
                                            {event.plate_camera_id || "--"}
                                        </span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        <ParkingLotEventImageModal preview={preview} onClose={() => setPreview(null)} />
        </>
    );
}
