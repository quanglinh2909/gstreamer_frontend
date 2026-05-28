import { AlertTriangle, Plus, RefreshCw, ScanLine, Search, X } from "lucide-react";
import type { PlateWhiteListManager } from "@/hooks/use-plate-white-list-manager";
import { DeletePlateWhiteListModal } from "./delete-plate-white-list-modal";
import { PlateWhiteListFormModal } from "./plate-white-list-form-modal";
import { PlateWhiteListPagination } from "./plate-white-list-pagination";
import { PlateWhiteListTable } from "./plate-white-list-table";
import { cn } from "./plate-white-list-utils";

function PlateWhiteListSkeleton() {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="space-y-1 p-3">
                {Array.from({ length: 5 }, (_, index) => (
                    <div key={index} className="flex items-center gap-6 rounded-lg px-2 py-3">
                        <div className="h-9 w-32 animate-pulse rounded-lg bg-slate-200" />
                        <div className="h-4 w-44 animate-pulse rounded bg-slate-100" />
                        <div className="ml-auto h-9 w-32 animate-pulse rounded bg-slate-100" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function PlateWhiteListDashboard({ manager }: { manager: PlateWhiteListManager }) {
    return (
        <main className="h-full overflow-y-auto bg-slate-50">
            <div className="mx-auto flex min-h-full max-w-[1400px] flex-col gap-5 px-6 py-5">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h1 className="mt-1 text-2xl font-semibold text-slate-950">Danh sách biển số trắng</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Quản lý biển số được nhận diện và cho phép trong hệ thống.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-right shadow-sm">
                            <p className="text-lg font-semibold text-slate-950">Tổng: {manager.plateWhiteListPage.total}</p>
                        </div>
                        <button
                            type="button"
                            onClick={manager.openCreateEntry}
                            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#4369ee] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3156d4]"
                        >
                            <Plus size={16} aria-hidden="true" />
                            Thêm biển số
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
                </header>

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
                                placeholder="Tìm theo biển số..."
                                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-10 font-mono text-sm uppercase tracking-wide text-slate-900 outline-none transition-colors focus:border-[#4369ee] focus:bg-white"
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
                    {manager.submittedPlateNumber ? (
                        <p className="mt-3 text-sm text-slate-500">
                            Kết quả cho:{" "}
                            <span className="font-mono font-semibold text-slate-800">
                                {manager.submittedPlateNumber}
                            </span>
                        </p>
                    ) : null}
                </form>

                {manager.errorMessage ? (
                    <section className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
                            <div>
                                <p className="text-sm font-semibold">Không thể tải danh sách biển số</p>
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

                {manager.isLoading ? <PlateWhiteListSkeleton /> : null}

                {!manager.isLoading && !manager.errorMessage && manager.plateWhiteListPage.items.length === 0 ? (
                    <section className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
                        <div className="flex max-w-sm flex-col items-center gap-3 text-slate-500">
                            <ScanLine size={42} className="text-slate-400" aria-hidden="true" />
                            <p className="text-base font-semibold text-slate-900">Chưa có biển số phù hợp</p>
                            <p className="text-sm">Thêm biển số mới hoặc thử từ khóa tìm kiếm khác.</p>
                        </div>
                    </section>
                ) : null}

                {!manager.isLoading && manager.plateWhiteListPage.items.length > 0 ? (
                    <PlateWhiteListTable
                        entries={manager.plateWhiteListPage.items}
                        onEdit={manager.openEditEntry}
                        onDelete={manager.openDeleteEntry}
                    />
                ) : null}

                {!manager.isLoading && !manager.errorMessage ? (
                    <PlateWhiteListPagination
                        currentPage={manager.currentPage}
                        totalPages={manager.plateWhiteListPage.pages}
                        onPageChange={manager.setCurrentPage}
                    />
                ) : null}
            </div>

            {manager.isFormOpen ? (
                <PlateWhiteListFormModal
                    mode={manager.formMode}
                    entry={manager.editTarget}
                    form={manager.form}
                    errorMessage={manager.formErrorMessage}
                    isSaving={manager.isSaving}
                    onClose={manager.closeForm}
                    onSubmit={manager.handleFormSubmit}
                    onPlateNumberChange={manager.setFormPlateNumber}
                    onNameChange={manager.setFormName}
                />
            ) : null}

            {manager.deleteTarget ? (
                <DeletePlateWhiteListModal
                    entry={manager.deleteTarget}
                    errorMessage={manager.deleteErrorMessage}
                    isDeleting={manager.isDeleting}
                    onClose={manager.closeDeleteEntry}
                    onConfirm={() => void manager.confirmDeleteEntry()}
                />
            ) : null}
        </main>
    );
}
