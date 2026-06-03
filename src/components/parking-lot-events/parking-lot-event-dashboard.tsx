import { AlertTriangle, Filter, RefreshCw, ScanLine, SquareParking, UserRound, X } from "lucide-react";
import type { ParkingLotEventManager } from "@/hooks/use-parking-lot-event-manager";
import { ParkingLotEventPagination } from "./parking-lot-event-pagination";
import { ParkingLotEventTable } from "./parking-lot-event-table";
import { cn } from "./parking-lot-event-utils";

function ParkingLotEventSkeleton() {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <div className="h-4 w-64 animate-pulse rounded bg-slate-200" />
            </div>
            <div className="space-y-1 p-3">
                {Array.from({ length: 6 }, (_, index) => (
                    <div key={index} className="flex items-center gap-6 rounded-lg px-2 py-3">
                        <div className="h-4 w-10 animate-pulse rounded bg-slate-100" />
                        <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
                        <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
                        <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-100" />
                        <div className="ml-auto h-4 w-24 animate-pulse rounded bg-slate-100" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ParkingLotEventDashboard({ manager }: { manager: ParkingLotEventManager }) {
    return (
        <main className="h-full overflow-y-auto bg-slate-50">
            <div className="mx-auto flex min-h-full max-w-[1400px] flex-col gap-5 px-6 py-5">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-[#4369ee]">Parking</p>
                        <h1 className="mt-1 text-2xl font-semibold text-slate-950">Sự kiện bãi xe</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Lịch sử nhận diện khuôn mặt và biển số tại các bãi xe.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-right shadow-sm">
                            <p className="text-lg font-semibold text-slate-950">Tổng: {manager.parkingLotEventPage.total}</p>
                        </div>
                        <button
                            type="button"
                            onClick={manager.refreshEvents}
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
                    onSubmit={manager.handleFilterSubmit}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,160px)_auto]">
                        <div className="relative">
                            <UserRound
                                size={16}
                                aria-hidden="true"
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                value={manager.filterDraft.name}
                                onChange={(event) => manager.setFilterName(event.target.value)}
                                placeholder="Tên identity..."
                                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#4369ee] focus:bg-white"
                            />
                        </div>
                        <div className="relative">
                            <ScanLine
                                size={16}
                                aria-hidden="true"
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />
                            <input
                                value={manager.filterDraft.plateNumber}
                                onChange={(event) => manager.setFilterPlateNumber(event.target.value)}
                                placeholder="Biển số..."
                                className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 font-mono text-sm uppercase tracking-wide text-slate-900 outline-none transition-colors focus:border-[#4369ee] focus:bg-white"
                            />
                        </div>
                        <input
                            type="number"
                            min={1}
                            value={manager.filterDraft.identityId}
                            onChange={(event) => manager.setFilterIdentityId(event.target.value)}
                            placeholder="ID identity"
                            className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#4369ee] focus:bg-white"
                        />
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-[#4369ee] bg-blue-50 px-5 text-sm font-semibold text-[#4369ee] transition-colors hover:bg-blue-100"
                            >
                                <Filter size={16} aria-hidden="true" />
                                Lọc
                            </button>
                            {manager.hasActiveFilter ? (
                                <button
                                    type="button"
                                    onClick={manager.clearFilters}
                                    aria-label="Xóa bộ lọc"
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                                >
                                    <X size={16} aria-hidden="true" />
                                </button>
                            ) : null}
                        </div>
                    </div>
                    {manager.hasActiveFilter ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>Đang lọc:</span>
                            {manager.submittedName ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                                    <UserRound size={12} aria-hidden="true" />
                                    {manager.submittedName}
                                </span>
                            ) : null}
                            {manager.submittedPlateNumber ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-mono font-medium text-slate-700">
                                    <ScanLine size={12} aria-hidden="true" />
                                    {manager.submittedPlateNumber}
                                </span>
                            ) : null}
                            {manager.submittedIdentityId ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">
                                    ID #{manager.submittedIdentityId}
                                </span>
                            ) : null}
                        </div>
                    ) : null}
                </form>

                {manager.errorMessage ? (
                    <section className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
                            <div>
                                <p className="text-sm font-semibold">Không thể tải sự kiện bãi xe</p>
                                <p className="mt-1 text-sm">{manager.errorMessage}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={manager.refreshEvents}
                            className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-rose-100"
                        >
                            Thử lại
                        </button>
                    </section>
                ) : null}

                {manager.isLoading ? <ParkingLotEventSkeleton /> : null}

                {!manager.isLoading && !manager.errorMessage && manager.parkingLotEventPage.items.length === 0 ? (
                    <section className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
                        <div className="flex max-w-sm flex-col items-center gap-3 text-slate-500">
                            <SquareParking size={42} className="text-slate-400" aria-hidden="true" />
                            <p className="text-base font-semibold text-slate-900">Chưa có sự kiện phù hợp</p>
                            <p className="text-sm">Thử thay đổi bộ lọc để xem các sự kiện khác.</p>
                        </div>
                    </section>
                ) : null}

                {!manager.isLoading && manager.parkingLotEventPage.items.length > 0 ? (
                    <ParkingLotEventTable events={manager.parkingLotEventPage.items} />
                ) : null}

                {!manager.isLoading && !manager.errorMessage ? (
                    <ParkingLotEventPagination
                        currentPage={manager.currentPage}
                        totalPages={manager.parkingLotEventPage.pages}
                        onPageChange={manager.setCurrentPage}
                    />
                ) : null}
            </div>
        </main>
    );
}
