import { AlertTriangle, Plus, RefreshCw, SlidersHorizontal } from "lucide-react";
import { usePlateWhiteListSettingsManager } from "@/hooks/use-plate-white-list-settings-manager";
import { DeletePlateWhiteListSettingsModal } from "./delete-plate-white-list-settings-modal";
import { PlateWhiteListSettingsFormModal } from "./plate-white-list-settings-form-modal";
import { PlateWhiteListSettingsTable } from "./plate-white-list-settings-table";
import { cn } from "./plate-white-list-utils";

function SettingsSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="h-5 w-52 animate-pulse rounded bg-slate-200" />
                    <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 lg:grid-cols-4">
                        {Array.from({ length: 4 }, (_, cell) => (
                            <div key={cell} className="h-9 animate-pulse rounded bg-slate-100" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

export function PlateWhiteListSettingsTab() {
    const manager = usePlateWhiteListSettingsManager();
    const hasSpareCamera = manager.availableCameras.length > 0;

    return (
        <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-2xl text-sm text-slate-500">
                    Chỉ camera có trong danh sách này mới mở barrier. Camera chưa cấu hình sẽ bị bỏ
                    qua hoàn toàn, kể cả khi biển số nằm trong danh sách trắng.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={manager.openCreateEntry}
                        disabled={!hasSpareCamera}
                        title={hasSpareCamera ? undefined : "Mọi camera đều đã được cấu hình"}
                        className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#4369ee] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3156d4] disabled:opacity-50"
                    >
                        <Plus size={16} aria-hidden="true" />
                        Bật cho camera
                    </button>
                    <button
                        type="button"
                        onClick={manager.refreshEntries}
                        disabled={manager.isLoading}
                        className="inline-flex h-11 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-60"
                    >
                        <RefreshCw
                            size={16}
                            className={cn(manager.isLoading && "animate-spin")}
                            aria-hidden="true"
                        />
                        Làm mới
                    </button>
                </div>
            </div>

            {manager.errorMessage ? (
                <section className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
                        <div>
                            <p className="text-sm font-semibold">Không thể tải cấu hình barrier</p>
                            <p className="mt-1 text-sm">{manager.errorMessage}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={manager.refreshEntries}
                        className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-rose-100"
                    >
                        Thử lại
                    </button>
                </section>
            ) : null}

            {manager.isLoading ? <SettingsSkeleton /> : null}

            {!manager.isLoading && !manager.errorMessage && manager.entries.length === 0 ? (
                <section className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
                    <div className="flex max-w-md flex-col items-center gap-3 text-slate-500">
                        <SlidersHorizontal size={42} className="text-slate-400" aria-hidden="true" />
                        <p className="text-base font-semibold text-slate-900">
                            Chưa camera nào bật barrier
                        </p>
                        <p className="text-sm">
                            Barrier đang tắt trên toàn hệ thống. Bấm{" "}
                            <span className="font-semibold text-slate-700">Bật cho camera</span> để
                            chọn camera và đặt ngưỡng mở cổng.
                        </p>
                    </div>
                </section>
            ) : null}

            {!manager.isLoading && manager.entries.length > 0 ? (
                <PlateWhiteListSettingsTable
                    entries={manager.entries}
                    getCameraName={manager.getCameraName}
                    onEdit={manager.openEditEntry}
                    onDelete={manager.openDeleteEntry}
                />
            ) : null}

            {manager.isFormOpen ? (
                <PlateWhiteListSettingsFormModal
                    mode={manager.formMode}
                    form={manager.form}
                    availableCameras={manager.availableCameras}
                    errorMessage={manager.formErrorMessage}
                    isSaving={manager.isSaving}
                    onClose={manager.closeForm}
                    onSubmit={manager.handleFormSubmit}
                    onFieldChange={manager.setFormField}
                />
            ) : null}

            {manager.deleteTarget ? (
                <DeletePlateWhiteListSettingsModal
                    entry={manager.deleteTarget}
                    cameraName={manager.getCameraName(manager.deleteTarget.camera_id)}
                    errorMessage={manager.deleteErrorMessage}
                    isDeleting={manager.isDeleting}
                    onClose={manager.closeDeleteEntry}
                    onConfirm={() => void manager.confirmDeleteEntry()}
                />
            ) : null}
        </>
    );
}
