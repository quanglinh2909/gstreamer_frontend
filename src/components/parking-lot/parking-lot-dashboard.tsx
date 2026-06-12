import {
    AlertTriangle,
    ArrowDownToLine,
    ArrowUpFromLine,
    CheckCircle2,
    Plus,
    RefreshCw,
    Search,
    SquareParking,
    X,
} from "lucide-react";
import type { ParkingLotManager } from "@/hooks/use-parking-lot-manager";
import { DeleteParkingLotModal } from "./delete-parking-lot-modal";
import { ParkingLotFormModal } from "./parking-lot-form-modal";
import { ParkingLotPagination } from "./parking-lot-pagination";
import { ParkingLotTable } from "./parking-lot-table";
import { cn } from "./parking-lot-utils";

function ParkingLotSkeleton() {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="space-y-1 p-3">
                {Array.from({ length: 5 }, (_, index) => (
                    <div key={index} className="flex items-center gap-6 rounded-lg px-2 py-3">
                        <div className="h-4 w-10 animate-pulse rounded bg-slate-100" />
                        <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                        <div className="h-9 w-72 animate-pulse rounded-lg bg-slate-100" />
                        <div className="ml-auto h-9 w-32 animate-pulse rounded bg-slate-100" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ParkingLotDashboard({ manager }: { manager: ParkingLotManager }) {
    return (
        <main className="h-full overflow-y-auto bg-slate-50">
            <div className="mx-auto flex min-h-full max-w-[1400px] flex-col gap-5 px-6 py-5">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-[#4369ee]">Parking</p>
                        <h1 className="mt-1 text-2xl font-semibold text-slate-950">Quản lý bãi xe</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Kết nối camera khuôn mặt và camera biển số cho từng bãi xe.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-right shadow-sm">
                            <p className="text-lg font-semibold text-slate-950">Tổng: {manager.parkingLotPage.total}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void manager.controlBarrier("open")}
                            disabled={manager.barrierAction !== null}
                            className="inline-flex h-11 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60"
                        >
                            <ArrowUpFromLine
                                size={16}
                                className={cn(manager.barrierAction === "open" && "animate-pulse")}
                                aria-hidden="true"
                            />
                            Mở barrier
                        </button>
                        <button
                            type="button"
                            onClick={() => void manager.controlBarrier("close")}
                            disabled={manager.barrierAction !== null}
                            className="inline-flex h-11 items-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:opacity-60"
                        >
                            <ArrowDownToLine
                                size={16}
                                className={cn(manager.barrierAction === "close" && "animate-pulse")}
                                aria-hidden="true"
                            />
                            Đóng barrier
                        </button>
                        <button
                            type="button"
                            onClick={manager.openCreateParkingLot}
                            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#4369ee] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3156d4]"
                        >
                            <Plus size={16} aria-hidden="true" />
                            Thêm bãi xe
                        </button>
                        <button
                            type="button"
                            onClick={manager.refreshParkingLots}
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
                </header>

                {manager.barrierMessage ? (
                    <div
                        className={cn(
                            "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium",
                            manager.barrierError
                                ? "border-rose-200 bg-rose-50 text-rose-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700",
                        )}
                    >
                        {manager.barrierError ? (
                            <AlertTriangle size={16} aria-hidden="true" />
                        ) : (
                            <CheckCircle2 size={16} aria-hidden="true" />
                        )}
                        {manager.barrierMessage}
                    </div>
                ) : null}

                <form
                    onSubmit={manager.handleSearchSubmit}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative min-w-0 flex-1">
                            <Search
                                size={17}
                                aria-hidden="true"
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                value={manager.searchText}
                                onChange={(event) => manager.setSearchText(event.target.value)}
                                placeholder="Tìm theo tên bãi xe..."
                                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-900 outline-none transition-colors focus:border-[#4369ee] focus:bg-white"
                            />
                            {manager.searchText ? (
                                <button
                                    type="button"
                                    aria-label="Xóa tìm kiếm"
                                    onClick={manager.clearSearch}
                                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                                >
                                    <X size={16} aria-hidden="true" />
                                </button>
                            ) : null}
                        </div>
                        <button
                            type="submit"
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#4369ee] bg-blue-50 px-5 text-sm font-semibold text-[#4369ee] transition-colors hover:bg-blue-100"
                        >
                            <Search size={16} aria-hidden="true" />
                            Tìm kiếm
                        </button>
                    </div>
                    {manager.submittedName ? (
                        <p className="mt-3 text-sm text-slate-500">
                            Kết quả cho: <span className="font-semibold text-slate-800">{manager.submittedName}</span>
                        </p>
                    ) : null}
                </form>

                {manager.errorMessage ? (
                    <section className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
                            <div>
                                <p className="text-sm font-semibold">Không thể tải danh sách bãi xe</p>
                                <p className="mt-1 text-sm">{manager.errorMessage}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={manager.refreshParkingLots}
                            className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-rose-100"
                        >
                            Thử lại
                        </button>
                    </section>
                ) : null}

                {manager.isLoading ? <ParkingLotSkeleton /> : null}

                {!manager.isLoading && !manager.errorMessage && manager.parkingLotPage.items.length === 0 ? (
                    <section className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
                        <div className="flex max-w-sm flex-col items-center gap-3 text-slate-500">
                            <SquareParking size={42} className="text-slate-400" aria-hidden="true" />
                            <p className="text-base font-semibold text-slate-900">Chưa có bãi xe phù hợp</p>
                            <p className="text-sm">Thêm bãi xe mới hoặc thử từ khóa tìm kiếm khác.</p>
                        </div>
                    </section>
                ) : null}

                {!manager.isLoading && manager.parkingLotPage.items.length > 0 ? (
                    <ParkingLotTable
                        parkingLots={manager.parkingLotPage.items}
                        cameras={manager.cameras}
                        onEdit={manager.openEditParkingLot}
                        onDelete={manager.openDeleteParkingLot}
                    />
                ) : null}

                {!manager.isLoading && !manager.errorMessage ? (
                    <ParkingLotPagination
                        currentPage={manager.currentPage}
                        totalPages={manager.parkingLotPage.pages}
                        onPageChange={manager.setCurrentPage}
                    />
                ) : null}
            </div>

            {manager.isFormOpen ? (
                <ParkingLotFormModal
                    mode={manager.formMode}
                    parkingLot={manager.editTarget}
                    form={manager.form}
                    cameras={manager.cameras}
                    errorMessage={manager.formErrorMessage}
                    isSaving={manager.isSaving}
                    onClose={manager.closeForm}
                    onSubmit={manager.handleFormSubmit}
                    onNameChange={manager.setFormName}
                    onFaceCameraChange={manager.setFormFaceCameraId}
                    onPlateCameraChange={manager.setFormPlateCameraId}
                />
            ) : null}

            {manager.deleteTarget ? (
                <DeleteParkingLotModal
                    parkingLot={manager.deleteTarget}
                    errorMessage={manager.deleteErrorMessage}
                    isDeleting={manager.isDeleting}
                    onClose={manager.closeDeleteParkingLot}
                    onConfirm={() => void manager.confirmDeleteParkingLot()}
                />
            ) : null}
        </main>
    );
}
