import { AlertTriangle, Link2, Loader2, Plus, RefreshCw, Trash2, Pencil } from "lucide-react";
import { usePlateGateGroupManager } from "@/hooks/use-plate-gate-group-manager";
import { PlateGateGroupFormModal } from "./plate-gate-group-form-modal";
import { cn } from "./plate-white-list-utils";

export function PlateGateGroupTab() {
    const manager = usePlateGateGroupManager();
    const canAssign = manager.assignableCameras.length > 0;

    return (
        <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <p className="hidden max-w-3xl text-sm text-slate-500 sm:block">
                    Cụm gồm các camera cùng điều khiển <b>một</b> barrier — ví dụ một làn vừa
                    vào vừa ra. Xe mở cổng ở một camera trong cụm thì các camera còn lại không
                    mở lại cho tới khi hết thời gian chờ <b>của cụm</b>.
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={manager.openCreate}
                        disabled={!canAssign}
                        title={canAssign ? undefined : "Chưa có camera nào bật barrier ở tab Cấu hình"}
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#4369ee] px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3156d4] disabled:opacity-50 sm:h-11 sm:px-4"
                    >
                        <Plus size={16} aria-hidden="true" />
                        Tạo cụm
                    </button>
                    <button
                        type="button"
                        onClick={manager.refresh}
                        disabled={manager.isLoading}
                        aria-label="Làm mới"
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-60 sm:h-11 sm:px-4"
                    >
                        <RefreshCw size={16} className={cn(manager.isLoading && "animate-spin")} aria-hidden="true" />
                        Làm mới
                    </button>
                </div>
            </div>

            {manager.errorMessage ? (
                <div className="mt-3 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>{manager.errorMessage}</span>
                </div>
            ) : null}

            {manager.isLoading ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 size={16} className="animate-spin" /> Đang tải danh sách cụm…
                </div>
            ) : null}

            {!manager.isLoading && manager.groups.length === 0 ? (
                <section className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                    <Link2 size={28} className="mx-auto text-slate-300" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold text-slate-700">Chưa có cụm nào</p>
                    <p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">
                        Không có cụm thì mỗi camera dùng “Chờ giữa 2 lần mở” của riêng nó — đúng
                        cho các cổng độc lập. Chỉ tạo cụm khi nhiều camera cùng mở <b>một</b>
                        {" "}barrier, nếu không xe vừa vào sẽ bị khoá ở cổng ra.
                    </p>
                </section>
            ) : null}

            {!manager.isLoading && manager.groups.length > 0 ? (
                <div className="mt-3 space-y-3">
                    {manager.groups.map((group) => (
                        <section
                            key={group.id}
                            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                        >
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0">
                                    <h3 className="flex items-center gap-2 text-base font-semibold text-slate-950">
                                        <Link2 size={16} className="text-[#4369ee]" aria-hidden="true" />
                                        {group.name}
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-600">
                                        Chờ chung{" "}
                                        <b>
                                            {group.pre_time === 0
                                                ? "— mỗi biển chỉ mở 1 lần"
                                                : `${group.pre_time}s`}
                                        </b>
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => manager.openEdit(group)}
                                        aria-label={`Sửa cụm ${group.name}`}
                                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:text-[#4369ee]"
                                    >
                                        <Pencil size={15} aria-hidden="true" />
                                        Sửa
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => manager.openDelete(group)}
                                        aria-label={`Xoá cụm ${group.name}`}
                                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-600 hover:bg-rose-50"
                                    >
                                        <Trash2 size={15} aria-hidden="true" />
                                        Xoá
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 border-t border-slate-100 pt-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.06em] text-slate-400">
                                    Camera trong cụm ({group.camera_ids.length})
                                </p>
                                {group.camera_ids.length > 0 ? (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {group.camera_ids.map((cameraId) => (
                                            <span
                                                key={cameraId}
                                                className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                                            >
                                                {manager.getCameraName(cameraId)}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    // Cụm rỗng không sai, nhưng nó cũng không làm gì cả —
                                    // nói thẳng thay vì để một ô trống khó hiểu.
                                    <p className="mt-1 text-sm text-amber-700">
                                        Chưa có camera nào — cụm này hiện không có tác dụng.
                                    </p>
                                )}
                            </div>
                        </section>
                    ))}
                </div>
            ) : null}

            {manager.isFormOpen ? <PlateGateGroupFormModal manager={manager} /> : null}

            {manager.deleteTarget ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
                        <h2 className="text-lg font-semibold text-slate-950">
                            Xoá cụm “{manager.deleteTarget.name}”?
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Các camera trong cụm <b>không bị tắt barrier</b>. Chúng quay về dùng
                            “Chờ giữa 2 lần mở” của riêng mình, nghĩa là mỗi camera lại mở cổng
                            độc lập — nếu chúng cùng một barrier thì lỗi mở chồng sẽ quay lại.
                        </p>
                        {manager.deleteErrorMessage ? (
                            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                {manager.deleteErrorMessage}
                            </p>
                        ) : null}
                        <div className="mt-5 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={manager.closeDelete}
                                disabled={manager.isDeleting}
                                className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                onClick={manager.confirmDelete}
                                disabled={manager.isDeleting}
                                className="inline-flex h-10 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                            >
                                {manager.isDeleting ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Trash2 size={16} />
                                )}
                                Xoá cụm
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}
