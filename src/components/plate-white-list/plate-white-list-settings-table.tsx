import { Pencil, Trash2 } from "lucide-react";
import type { PlateWhiteListSettings } from "@/interface/plate-white-list-settings";

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div>
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">{label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
            {hint ? <p className="mt-0.5 text-xs text-slate-400">{hint}</p> : null}
        </div>
    );
}

export function PlateWhiteListSettingsTable({
    entries,
    getCameraName,
    onEdit,
    onDelete,
}: {
    entries: PlateWhiteListSettings[];
    getCameraName: (cameraId: string) => string;
    onEdit: (entry: PlateWhiteListSettings) => void;
    onDelete: (entry: PlateWhiteListSettings) => void;
}) {
    return (
        <div className="space-y-3">
            {entries.map((entry) => {
                const cameraName = getCameraName(entry.camera_id);

                return (
                    <section
                        key={entry.camera_id}
                        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-base font-semibold text-slate-950">
                                        {cameraName || "Camera không xác định"}
                                    </h3>
                                    <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                        Đang bật
                                    </span>
                                </div>
                                <p className="mt-1 font-mono text-xs text-slate-400">{entry.camera_id}</p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => onEdit(entry)}
                                    aria-label={`Sửa cấu hình ${cameraName || entry.camera_id}`}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:text-[#4369ee]"
                                >
                                    <Pencil size={15} aria-hidden="true" />
                                    Sửa
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onDelete(entry)}
                                    aria-label={`Tắt barrier cho ${cameraName || entry.camera_id}`}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                                >
                                    <Trash2 size={15} aria-hidden="true" />
                                    Tắt
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3 lg:grid-cols-5">
                            <Metric
                                label="Chờ giữa 2 lần mở"
                                value={entry.pre_time === 0 ? "Chỉ mở 1 lần" : `${entry.pre_time}s`}
                                hint={entry.pre_time === 0 ? "mỗi biển 1 lần duy nhất" : undefined}
                            />
                            <Metric
                                label="Sai số ký tự"
                                value={
                                    entry.max_edit_distance === 0
                                        ? "Khớp tuyệt đối"
                                        : `≤ ${entry.max_edit_distance} ký tự`
                                }
                                hint={entry.max_edit_distance > 0 ? "có thể mở nhầm xe" : undefined}
                            />
                            <Metric label="Tin cậy OCR" value={entry.ocr_confidence.toFixed(2)} />
                            <Metric label="Ký tự tối thiểu" value={`${entry.min_plate_length}`} />
                            <Metric label="Xung barrier" value={`${entry.barrier_duration}s`} />
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
