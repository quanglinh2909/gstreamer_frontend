import { AlertTriangle, Plus, RefreshCw, Search, UsersRound, X } from "lucide-react";
import type { IdentityManager } from "@/hooks/use-identity-manager";
import { cn } from "./identity-utils";
import { DeleteIdentityModal } from "./delete-identity-modal";
import { IdentityCard } from "./identity-card";
import { IdentityDetailModal } from "./identity-detail-modal";
import { IdentityFormModal } from "./identity-form-modal";
import { IdentityPagination } from "./identity-pagination";

function IdentitySkeleton() {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="aspect-[5/6] animate-pulse bg-slate-200" />
            <div className="space-y-3 p-4">
                <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
                <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
            </div>
        </div>
    );
}

export function IdentityDashboard({ manager }: { manager: IdentityManager }) {
    return (
        <main className="h-full overflow-y-auto bg-slate-50">
            <div className="mx-auto flex min-h-full max-w-[1600px] flex-col gap-5 px-6 py-5">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-[#4369ee]">Recognition Library</p>
                        <h1 className="mt-1 text-2xl font-semibold text-slate-950">Quản lý identity</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Quản lý ảnh mẫu và tên người dùng cho nhận diện khuôn mặt.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-right shadow-sm">
                            <p className="text-xs font-medium text-slate-500">Tổng hồ sơ</p>
                            <p className="text-lg font-semibold text-slate-950">{manager.identityPage.total}</p>
                        </div>
                        <button
                            type="button"
                            onClick={manager.openCreateIdentity}
                            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#4369ee] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3156d4]"
                        >
                            <Plus size={16} aria-hidden="true" />
                            Thêm identity
                        </button>
                        <button
                            type="button"
                            onClick={manager.refreshIdentities}
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
                                placeholder="Tìm theo tên identity..."
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
                                <p className="text-sm font-semibold">Không thể tải identity</p>
                                <p className="mt-1 text-sm">{manager.errorMessage}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={manager.refreshIdentities}
                            className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-rose-100"
                        >
                            Thử lại
                        </button>
                    </section>
                ) : null}

                {manager.isLoading ? (
                    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7">
                        {Array.from({ length: 8 }, (_, index) => (
                            <IdentitySkeleton key={index} />
                        ))}
                    </section>
                ) : null}

                {!manager.isLoading && !manager.errorMessage && manager.identityPage.items.length === 0 ? (
                    <section className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
                        <div className="flex max-w-sm flex-col items-center gap-3 text-slate-500">
                            <UsersRound size={42} className="text-slate-400" aria-hidden="true" />
                            <p className="text-base font-semibold text-slate-900">Chưa có identity phù hợp</p>
                            <p className="text-sm">Thêm hồ sơ mới hoặc thử từ khóa tìm kiếm khác.</p>
                        </div>
                    </section>
                ) : null}

                {!manager.isLoading && manager.identityPage.items.length > 0 ? (
                    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7">
                        {manager.identityPage.items.map((identity) => (
                            <IdentityCard
                                key={identity.id}
                                identity={identity}
                                onOpen={manager.openIdentityDetail}
                            />
                        ))}
                    </section>
                ) : null}

                {!manager.isLoading && !manager.errorMessage ? (
                    <IdentityPagination
                        currentPage={manager.currentPage}
                        totalPages={manager.identityPage.pages}
                        onPageChange={manager.setCurrentPage}
                    />
                ) : null}
            </div>

            <IdentityDetailModal
                identity={manager.selectedIdentity}
                isLoading={manager.isDetailLoading}
                errorMessage={manager.detailErrorMessage}
                manager={manager}
                onClose={manager.closeIdentityDetail}
                onEdit={() => {
                    if (manager.selectedIdentity) {
                        manager.openEditIdentity(manager.selectedIdentity);
                    }
                }}
                onDelete={() => {
                    if (manager.selectedIdentity) {
                        manager.openDeleteIdentity(manager.selectedIdentity);
                    }
                }}
            />

            {manager.isFormOpen ? (
                <IdentityFormModal
                    mode={manager.formMode}
                    identity={manager.editTarget}
                    form={manager.form}
                    errorMessage={manager.formErrorMessage}
                    isSaving={manager.isSaving}
                    onClose={manager.closeIdentityForm}
                    onSubmit={manager.handleFormSubmit}
                    onNameChange={manager.setFormName}
                    onMacBluetoothChange={manager.setFormMacBluetooth}
                    onImageChange={manager.setFormImage}
                />
            ) : null}

            {manager.deleteTarget ? (
                <DeleteIdentityModal
                    identity={manager.deleteTarget}
                    errorMessage={manager.deleteErrorMessage}
                    isDeleting={manager.isDeleting}
                    onClose={manager.closeDeleteIdentity}
                    onConfirm={() => void manager.confirmDeleteIdentity()}
                />
            ) : null}
        </main>
    );
}
