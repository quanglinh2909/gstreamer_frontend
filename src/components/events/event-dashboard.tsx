import { AlertTriangle, Images, RefreshCw, ScanFace, ScanLine, ShieldAlert } from "lucide-react";
import type { EventManager } from "@/hooks/use-event-manager";
import type { ICameraResponse } from "@/interface/camera";
import type { RecognitionEventTab } from "@/interface/recognition-event";
import { EventCard } from "./event-card";
import { EventImageModal } from "./event-image-modal";
import { EventPagination } from "./event-pagination";
import { cn } from "./event-utils";

const eventTabs: Array<{ id: RecognitionEventTab; label: string; icon: typeof ScanLine }> = [
    { id: "face", label: "Khuôn mặt", icon: ScanFace },
    { id: "plate", label: "Biển số", icon: ScanLine },
    { id: "restricted", label: "Vùng cấm", icon: ShieldAlert },
];

function getCameraLabel(cameras: ICameraResponse[], cameraId: string) {
    return cameras.find((camera) => camera.id === cameraId)?.name || cameraId || "Camera không xác định";
}

function EventSkeleton({ portrait }: { portrait: boolean }) {
    return (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className={cn("animate-pulse bg-slate-200", portrait ? "aspect-[5/6]" : "h-32")} />
            <div className={cn(portrait ? "space-y-3 p-4" : "space-y-2 p-3")}>
                <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
                <div className="h-6 w-36 animate-pulse rounded bg-slate-200" />
                <div className="h-4 w-44 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
            </div>
        </div>
    );
}

function getSocketStatusLabel(status: EventManager["socketStatus"]) {
    switch (status) {
        case "connected":
            return "Trực tuyến";
        case "connecting":
            return "Đang kết nối";
        case "reconnecting":
            return "Đang kết nối lại";
        case "error":
            return "Mất kết nối";
        default:
            return "Chưa kết nối";
    }
}

export function EventDashboard({ manager }: { manager: EventManager }) {
    const selectedCameraLabel = manager.selectedEvent
        ? getCameraLabel(manager.cameras, manager.selectedEvent.camera_id)
        : "";
    const activeLabel = eventTabs.find((tab) => tab.id === manager.activeTab)?.label ?? "Sự kiện";
    const portraitCards = manager.activeTab !== "plate";
    const galleryClassName = cn(
        "grid gap-4 sm:grid-cols-2",
        portraitCards
            ? "lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7"
            : "lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
    );

    return (
        <main className="h-full overflow-y-auto bg-slate-50">
            <div className="mx-auto flex min-h-full max-w-[1600px] flex-col gap-5 px-6 py-5">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        {/* <p className="text-sm font-semibold text-[#4369ee]">Monitoring</p> */}
                        <h1 className="mt-1 text-2xl font-semibold text-slate-950">Sự kiện nhận diện</h1>

                        <section className="mt-1">
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <span
                                        className={cn(
                                            "h-2.5 w-2.5 rounded-full",
                                            manager.socketStatus === "connected"
                                                ? "bg-emerald-500"
                                                : manager.socketStatus === "error"
                                                    ? "bg-rose-500"
                                                    : "bg-amber-400",
                                        )}
                                    />
                                    {/* <span className="font-semibold text-slate-900">Realtime khuôn mặt</span> */}
                                    <span className="text-slate-500">{getSocketStatusLabel(manager.socketStatus)}</span>
                                    {manager.socketStatus === "error" && manager.socketErrorMessage ? (
                                        <span className="text-rose-600">{manager.socketErrorMessage}</span>
                                    ) : null}
                                </div>

                                {manager.pendingEvents > 0 ? (
                                    <button
                                        type="button"
                                        onClick={manager.showLatestEvents}
                                        className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-[#4369ee] transition-colors hover:bg-blue-100"
                                    >
                                        {manager.pendingEvents} sự kiện mới
                                    </button>
                                ) : null}
                        </section>

                    </div>

                    <div className="flex items-center gap-3">
                        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-right shadow-sm">
                            {/* <p className="text-xs font-medium text-slate-500">{activeLabel}</p> */}
                            <p className="text-lg font-semibold text-slate-950">{manager.eventPage.total} sự kiện</p>
                        </div>
                        <button
                            type="button"
                            onClick={manager.refreshEvents}
                            disabled={manager.isLoading}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <RefreshCw
                                size={16}
                                aria-hidden="true"
                                className={cn(manager.isLoading && "animate-spin")}
                            />
                            Làm mới
                        </button>
                    </div>
                </header>

                <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div role="tablist" aria-label="Loại sự kiện" className="flex rounded-lg bg-slate-100 p-1">
                            {eventTabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = tab.id === manager.activeTab;

                                return (
                                    <button
                                        key={tab.id}
                                        role="tab"
                                        type="button"
                                        aria-selected={isActive}
                                        onClick={() => manager.handleSelectTab(tab.id)}
                                        className={cn(
                                            "inline-flex h-10 items-center gap-2 rounded-md px-5 text-sm font-semibold transition-colors",
                                            isActive
                                                ? "bg-[#4369ee] text-white shadow-sm"
                                                : "text-slate-600 hover:text-slate-950",
                                        )}
                                    >
                                        <Icon size={16} aria-hidden="true" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        <label className="flex min-w-[250px] flex-col gap-1.5">

                            <select
                                aria-label="Lọc theo camera"
                                value={manager.selectedCameraId}
                                onChange={(event) => manager.handleSelectCamera(event.target.value)}
                                disabled={manager.isCameraLoading}
                                className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800 outline-none transition-colors focus:border-[#4369ee] focus:bg-white disabled:opacity-60"
                            >
                                <option value="">Tất cả camera</option>
                                {manager.cameras.map((camera) => (
                                    <option key={camera.id} value={camera.id}>
                                        {camera.name || camera.id}
                                    </option>
                                ))}
                            </select>
                        </label>


                    </div>
                </section>



                {manager.cameraErrorMessage ? (
                    <p className="text-sm text-amber-700">
                        Không thể tải bộ lọc camera. Đang hiển thị sự kiện tổng hợp.
                    </p>
                ) : null}

                {manager.errorMessage ? (
                    <section className="flex flex-col items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
                            <div>
                                <p className="text-sm font-semibold">Không thể tải sự kiện</p>
                                <p className="mt-1 text-sm">{manager.errorMessage}</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={manager.refreshEvents}
                            className="rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold transition-colors hover:bg-rose-100"
                        >
                            Thử lại
                        </button>
                    </section>
                ) : null}

                {manager.isLoading ? (
                    <section className={galleryClassName}>
                        {Array.from({ length: 8 }, (_, index) => (
                            <EventSkeleton key={index} portrait={portraitCards} />
                        ))}
                    </section>
                ) : null}

                {!manager.isLoading && !manager.errorMessage && manager.eventPage.items.length === 0 ? (
                    <section className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center">
                        <div className="flex max-w-sm flex-col items-center gap-3 text-slate-500">
                            <Images size={40} className="text-slate-400" aria-hidden="true" />
                            <p className="text-base font-semibold text-slate-900">Chưa có sự kiện {activeLabel.toLowerCase()}</p>
                            <p className="text-sm">Thử chọn camera khác hoặc làm mới danh sách sự kiện.</p>
                        </div>
                    </section>
                ) : null}

                {!manager.isLoading && manager.eventPage.items.length > 0 ? (
                    <section className={galleryClassName}>
                        {manager.eventPage.items.map((event) => (
                            <EventCard
                                key={`${manager.activeTab}-${event.id}`}
                                event={event}
                                tab={manager.activeTab}
                                cameraLabel={getCameraLabel(manager.cameras, event.camera_id)}
                                onPreview={manager.openEventPreview}
                            />
                        ))}
                    </section>
                ) : null}

                {!manager.isLoading && !manager.errorMessage ? (
                    <EventPagination
                        currentPage={manager.currentPage}
                        totalPages={manager.eventPage.pages}
                        onPageChange={manager.handlePageChange}
                    />
                ) : null}
            </div>

            <EventImageModal
                event={manager.selectedEvent}
                tab={manager.activeTab}
                cameraLabel={selectedCameraLabel}
                onClose={manager.closeEventPreview}
            />
        </main>
    );
}
