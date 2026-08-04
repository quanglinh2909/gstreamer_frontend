import { Activity, AlertTriangle, Images, RefreshCw, ScanFace, ScanLine, Shield, ShieldAlert } from "lucide-react";
import type { EventManager } from "@/hooks/use-event-manager";
import type { ICameraResponse } from "@/interface/camera";
import { AppSelect } from "@/components/common/app-select";
import { TopBarButton, TopBarCount, TopBarDot } from "@/components/layouts/top-bar";
import type { EventPageTab } from "@/interface/recognition-event";
import type { MotionEventManager } from "@/hooks/use-motion-event-manager";
import { MotionEventSection } from "@/components/motion-events/motion-event-dashboard";
import { EventCard } from "./event-card";
import { EventImageModal } from "./event-image-modal";
import { EventPagination } from "./event-pagination";
import { cn } from "./event-utils";

const eventTabs: Array<{ id: EventPageTab; label: string; icon: typeof ScanLine }> = [
    { id: "face", label: "Khuôn mặt", icon: ScanFace },
    { id: "plate", label: "Biển số", icon: ScanLine },
    { id: "restricted", label: "Vùng cấm", icon: ShieldAlert },
    { id: "mask", label: "Khẩu trang", icon: Shield },
    { id: "motion", label: "Chuyển động", icon: Activity },
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

// Cho thanh trên của MainLayout (chỉ khổ điện thoại). Chấm trạng thái tách
// riêng vì nó đứng TRƯỚC tiêu đề, không nằm trong cụm nút.
export function EventTopStatus({ manager }: { manager: EventManager }) {
    return (
        <TopBarDot
            tone={
                manager.socketStatus === "connected"
                    ? "ok"
                    : manager.socketStatus === "error"
                        ? "bad"
                        : "warn"
            }
            label={getSocketStatusLabel(manager.socketStatus)}
        />
    );
}

export function EventTopActions({
    manager,
    motionManager,
    pageTab,
}: {
    manager: EventManager;
    motionManager: MotionEventManager;
    pageTab: EventPageTab;
}) {
    // Thanh trên của điện thoại phải nói về TAB ĐANG MỞ: đếm số sự kiện nhận
    // diện trong khi người dùng đang xem chuyển động là một con số vô nghĩa
    // đứng ngay cạnh danh sách nó không mô tả.
    const isMotion = pageTab === "motion";
    return (
        <>
            <TopBarCount
                value={isMotion ? motionManager.events.length : manager.eventPage.total}
                unit="sự kiện"
            />
            <TopBarButton
                icon={RefreshCw}
                label="Làm mới"
                onClick={isMotion ? motionManager.refresh : manager.refreshEvents}
                disabled={isMotion ? motionManager.isLoading : manager.isLoading}
                spinning={isMotion ? motionManager.isLoading : manager.isLoading}
            />
        </>
    );
}

export function EventDashboard({
    manager,
    motionManager,
    pageTab,
    onSelectTab,
}: {
    manager: EventManager;
    motionManager: MotionEventManager;
    pageTab: EventPageTab;
    onSelectTab: (tab: EventPageTab) => void;
}) {
    // Tab chuyển động thay CẢ THÂN trang: nó có bộ lọc riêng (một camera +
    // một ngày) và không phân trang. Chỉ thanh tab và thanh trên là dùng chung.
    const isMotion = pageTab === "motion";
    const selectedCameraLabel = manager.selectedEvent
        ? getCameraLabel(manager.cameras, manager.selectedEvent.camera_id)
        : "";
    const activeLabel = eventTabs.find((tab) => tab.id === manager.activeTab)?.label ?? "Sự kiện";
    const portraitCards = manager.activeTab !== "plate";
    // Điện thoại: 2 cột. Thẻ dọc rộng ~185px vẫn đọc được tên, mà một màn hình
    // thấy được 4 sự kiện thay vì 1.
    const galleryClassName = cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4",
        portraitCards
            ? "lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7"
            : "lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
    );

    return (
        <main className="h-full overflow-y-auto bg-slate-50">
            <div className="mx-auto flex min-h-full max-w-[1600px] flex-col gap-3 px-3 py-3 sm:gap-5 sm:px-6 sm:py-5">
                {/* Ẩn hẳn trên điện thoại: tiêu đề, trạng thái, số đếm và nút làm
                    mới đã dồn lên thanh trên (xem EventTopActions). */}
                <header className="hidden flex-wrap items-center justify-between gap-3 md:flex">
                    <div>
                        {/* <p className="text-sm font-semibold text-[#4369ee]">Monitoring</p> */}
                        <h1 className="mt-1 text-2xl font-semibold text-slate-950">
                            Sự kiện
                        </h1>

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
                            <p className="text-lg font-semibold text-slate-950">
                                {isMotion ? motionManager.events.length : manager.eventPage.total} sự kiện
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={isMotion ? motionManager.refresh : manager.refreshEvents}
                            disabled={isMotion ? motionManager.isLoading : manager.isLoading}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <RefreshCw
                                size={16}
                                aria-hidden="true"
                                className={cn(
                                    (isMotion ? motionManager.isLoading : manager.isLoading) &&
                                        "animate-spin",
                                )}
                            />
                            Làm mới
                        </button>
                    </div>
                </header>

                {/* Nút "N sự kiện mới" nằm trong header nên mất theo header trên
                    điện thoại — dựng lại ở đây, vì đây là thứ người dùng cần bấm
                    chứ không phải thông tin trang trí. */}
                {manager.pendingEvents > 0 ? (
                    <button
                        type="button"
                        onClick={manager.showLatestEvents}
                        className="self-start rounded-full bg-blue-50 px-4 py-1.5 text-sm font-semibold text-[#4369ee] md:hidden"
                    >
                        {manager.pendingEvents} sự kiện mới
                    </button>
                ) : null}

                <section className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm sm:p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3">
                        <div
                            role="tablist"
                            aria-label="Loại sự kiện"
                            // overflow-x-auto: năm tab tiếng Việt ở khổ 390px
                            // không đủ chỗ; cho cuộn ngang thay vì ép xuống dòng
                            // làm hàng tab cao gấp đôi.
                            className="flex w-full overflow-x-auto rounded-lg bg-slate-100 p-1 md:w-auto"
                        >
                            {eventTabs.map((tab) => {
                                const Icon = tab.icon;
                                const isActive = tab.id === pageTab;

                                return (
                                    <button
                                        key={tab.id}
                                        role="tab"
                                        type="button"
                                        aria-selected={isActive}
                                        onClick={() => onSelectTab(tab.id)}
                                        className={cn(
                                            // flex-1 + nowrap: ba nhãn tiếng Việt
                                            // ở khổ 390px mà không ép thì "Khuôn
                                            // mặt" tự xuống dòng, hàng tab cao gấp đôi.
                                            "inline-flex h-9 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-semibold transition-colors md:h-10 md:flex-none md:gap-2 md:px-5 md:text-sm",
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

                        <label className={cn("flex flex-col gap-1.5 md:min-w-[250px]", isMotion && "hidden")}>

                            <AppSelect
                                aria-label="Lọc theo camera"
                                value={manager.selectedCameraId}
                                onChange={(event) => manager.handleSelectCamera(event.target.value)}
                                disabled={manager.isCameraLoading}
                                className="h-9 bg-slate-50 font-semibold text-slate-800 focus:bg-white md:h-10"
                            >
                                <option value="">Tất cả camera</option>
                                {manager.cameras.map((camera) => (
                                    <option key={camera.id} value={camera.id}>
                                        {camera.name || camera.id}
                                    </option>
                                ))}
                            </AppSelect>
                        </label>


                    </div>
                </section>



                {isMotion ? <MotionEventSection manager={motionManager} /> : null}

                {!isMotion && manager.cameraErrorMessage ? (
                    <p className="text-sm text-amber-700">
                        Không thể tải bộ lọc camera. Đang hiển thị sự kiện tổng hợp.
                    </p>
                ) : null}

                {!isMotion && manager.errorMessage ? (
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

                {!isMotion && manager.isLoading ? (
                    <section className={galleryClassName}>
                        {Array.from({ length: 8 }, (_, index) => (
                            <EventSkeleton key={index} portrait={portraitCards} />
                        ))}
                    </section>
                ) : null}

                {!isMotion && !manager.isLoading && !manager.errorMessage && manager.eventPage.items.length === 0 ? (
                    <section className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center sm:px-6 sm:py-20">
                        <div className="flex max-w-sm flex-col items-center gap-3 text-slate-500">
                            <Images size={40} className="text-slate-400" aria-hidden="true" />
                            <p className="text-base font-semibold text-slate-900">Chưa có sự kiện {activeLabel.toLowerCase()}</p>
                            <p className="text-sm">Thử chọn camera khác hoặc làm mới danh sách sự kiện.</p>
                        </div>
                    </section>
                ) : null}

                {!isMotion && !manager.isLoading && manager.eventPage.items.length > 0 ? (
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

                {!isMotion && !manager.isLoading && !manager.errorMessage ? (
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
