import { Link2, Pencil, Trash2 } from "lucide-react";
import type { PlateGateGroup } from "@/interface/plate-gate-group";
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
    groups,
    getCameraName,
    onEdit,
    onDelete,
}: {
    entries: PlateWhiteListSettings[];
    groups: PlateGateGroup[];
    getCameraName: (cameraId: string) => string;
    onEdit: (entry: PlateWhiteListSettings) => void;
    onDelete: (entry: PlateWhiteListSettings) => void;
}) {
    return (
        <div className="space-y-3">
            {entries.map((entry) => {
                const cameraName = getCameraName(entry.camera_id);
                const group =
                    entry.gate_group_id == null
                        ? null
                        : groups.find((item) => item.id === entry.gate_group_id) ?? null;
                // Ai dùng chung đồng hồ chờ với camera này. Hiện thẳng tên chứ
                // không chỉ hiện tên cụm: khi cổng không mở, câu hỏi đầu tiên
                // là "camera nào đang giữ đồng hồ" — bắt người dùng đối chiếu
                // 16 dòng để tự suy ra là bỏ mặc họ.
                const mates = group
                    ? entries
                          .filter(
                              (other) =>
                                  other.camera_id !== entry.camera_id &&
                                  other.gate_group_id === group.id,
                          )
                          .map((other) => getCameraName(other.camera_id) || other.camera_id)
                    : [];

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
                                {group ? (
                                    <p className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-800">
                                        <Link2 size={13} aria-hidden="true" />
                                        <span>
                                            Cụm <b>{group.name}</b>
                                            {mates.length > 0
                                                ? ` — chung đồng hồ chờ với ${mates.join(", ")}`
                                                : " — chưa có camera nào khác trong cụm"}
                                        </span>
                                    </p>
                                ) : null}
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
                            {/* Hiện con số ĐANG CÓ HIỆU LỰC, không phải con số
                                lưu trong dòng này. Thuộc cụm mà vẫn khoe
                                pre_time riêng thì người dùng đọc ra một mốc
                                thời gian không hề được dùng. */}
                            <Metric
                                label="Chờ giữa 2 lần mở"
                                value={
                                    group
                                        ? group.pre_time === 0
                                            ? "Chỉ mở 1 lần"
                                            : `${group.pre_time}s`
                                        : entry.pre_time === 0
                                          ? "Chỉ mở 1 lần"
                                          : `${entry.pre_time}s`
                                }
                                hint={
                                    group
                                        ? `theo cụm ${group.name}${
                                              entry.pre_time !== group.pre_time
                                                  ? ` — ${entry.pre_time}s riêng bị bỏ qua`
                                                  : ""
                                          }`
                                        : entry.pre_time === 0
                                          ? "mỗi biển 1 lần duy nhất"
                                          : undefined
                                }
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
