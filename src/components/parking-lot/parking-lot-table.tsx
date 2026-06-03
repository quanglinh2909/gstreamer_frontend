import { ArrowRight, Pencil, ScanLine, SmilePlus, Trash2 } from "lucide-react";
import type { ParkingLot } from "@/interface/parking-lot";
import type { ICameraResponse } from "@/interface/camera";
import { getCameraLabel } from "./parking-lot-utils";

function CameraChip({
    icon: Icon,
    label,
    name,
}: {
    icon: typeof ScanLine;
    label: string;
    name: string;
}) {
    return (
        <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5">
            <Icon size={15} className="shrink-0 text-[#4369ee]" aria-hidden="true" />
            <span className="flex min-w-0 flex-col leading-tight">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                    {label}
                </span>
                <span className="truncate text-sm font-medium text-slate-800">{name}</span>
            </span>
        </span>
    );
}

export function ParkingLotTable({
    parkingLots,
    cameras,
    onEdit,
    onDelete,
}: {
    parkingLots: ParkingLot[];
    cameras: ICameraResponse[];
    onEdit: (parkingLot: ParkingLot) => void;
    onDelete: (parkingLot: ParkingLot) => void;
}) {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead className="bg-slate-50">
                        <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                            <th className="px-5 py-4">ID</th>
                            <th className="px-5 py-4">Tên bãi xe</th>
                            <th className="px-5 py-4">Camera kết nối</th>
                            <th className="px-5 py-4 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {parkingLots.map((parkingLot) => (
                            <tr
                                key={parkingLot.id}
                                className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80"
                            >
                                <td className="px-5 py-4 text-sm text-slate-500">#{parkingLot.id}</td>
                                <td className="px-5 py-4 text-sm font-semibold text-slate-800">
                                    {parkingLot.name || "Không xác định"}
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <CameraChip
                                            icon={SmilePlus}
                                            label="Khuôn mặt"
                                            name={getCameraLabel(cameras, parkingLot.face_camera_id)}
                                        />
                                        <ArrowRight size={16} className="shrink-0 text-slate-300" aria-hidden="true" />
                                        <CameraChip
                                            icon={ScanLine}
                                            label="Biển số"
                                            name={getCameraLabel(cameras, parkingLot.plate_camera_id)}
                                        />
                                    </div>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onEdit(parkingLot)}
                                            aria-label={`Sửa ${parkingLot.name}`}
                                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:text-[#4369ee]"
                                        >
                                            <Pencil size={15} aria-hidden="true" />
                                            Sửa
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onDelete(parkingLot)}
                                            aria-label={`Xóa ${parkingLot.name}`}
                                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                                        >
                                            <Trash2 size={15} aria-hidden="true" />
                                            Xóa
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
