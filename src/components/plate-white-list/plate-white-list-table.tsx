import { Pencil, Trash2 } from "lucide-react";
import type { PlateWhiteListEntry } from "@/interface/plate-white-list";

export function PlateWhiteListTable({
    entries,
    onEdit,
    onDelete,
}: {
    entries: PlateWhiteListEntry[];
    onEdit: (entry: PlateWhiteListEntry) => void;
    onDelete: (entry: PlateWhiteListEntry) => void;
}) {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                    <thead className="bg-slate-50">
                        <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                            <th className="px-5 py-4">ID</th>
                            <th className="px-5 py-4">Tên</th>
                            <th className="px-5 py-4">Biển số</th>
                            <th className="px-5 py-4 text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((entry) => (
                            <tr key={entry.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/80">
                                <td className="px-5 py-4 text-sm text-slate-500">#{entry.id}</td>
                                <td className="px-5 py-4 text-sm font-medium text-slate-800">
                                    {entry.name || "Không xác định"}
                                </td>
                                <td className="px-5 py-4">
                                    <span className="inline-flex rounded-lg bg-blue-50 px-3 py-2 font-mono text-base font-bold tracking-wide text-[#3156d4]">
                                        {entry.plate_number}
                                    </span>
                                </td>

                                <td className="px-5 py-4">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onEdit(entry)}
                                            aria-label={`Sửa ${entry.plate_number}`}
                                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:text-[#4369ee]"
                                        >
                                            <Pencil size={15} aria-hidden="true" />
                                            Sửa
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onDelete(entry)}
                                            aria-label={`Xóa ${entry.plate_number}`}
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
