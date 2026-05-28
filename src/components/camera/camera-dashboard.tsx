import {
    Activity,
    AlertTriangle,
    Camera as CameraIcon,
    CheckCircle2,
    HardDrive,
    LoaderCircle,
    Plus,
    RefreshCw,
    Search,
    Video,
    WifiOff,
} from "lucide-react";
import type { CameraManager } from "@/hooks/use-camera-manager";
import { CameraCard } from "./camera-card";
import { featureFilters, statusFilters } from "./camera-constants";
import { CameraFormModal } from "./camera-form-modal";
import { CameraStatCard } from "./camera-stat-card";
import { cn } from "./camera-utils";
import { DeleteCameraModal } from "./delete-camera-modal";

export function CameraDashboard({ manager }: { manager: CameraManager }) {
    return (
        <main className="h-full overflow-y-auto bg-slate-50">
            <div className="mx-auto flex min-h-full max-w-[1600px] flex-col gap-5 px-6 py-5">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-[#4369ee]">Monitoring</p>
                        <h1 className="mt-1 text-2xl font-semibold text-slate-950">Cameras</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {manager.lastUpdated
                                ? `Last updated ${manager.lastUpdated.toLocaleTimeString()}`
                                : "Camera overview"}
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <button
                            type="button"
                            onClick={manager.openCreateCamera}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#4369ee] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3156d4]"
                        >
                            <Plus size={16} aria-hidden="true" />
                            Add Camera
                        </button>
                        <button
                            type="button"
                            onClick={() => void manager.fetchCameras()}
                            disabled={manager.isLoading}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <RefreshCw
                                size={16}
                                className={cn(manager.isLoading && "animate-spin")}
                                aria-hidden="true"
                            />
                            Refresh
                        </button>
                    </div>
                </header>

                <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                    <CameraStatCard label="Total" value={manager.stats.total} icon={Video} tone="bg-blue-50 text-blue-700" />
                    <CameraStatCard label="Online" value={manager.stats.online} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" />
                    <CameraStatCard label="Offline" value={manager.stats.offline} icon={WifiOff} tone="bg-slate-100 text-slate-700" />
                    <CameraStatCard label="Errors" value={manager.stats.error} icon={AlertTriangle} tone="bg-rose-50 text-rose-700" />
                    <CameraStatCard label="Recording" value={manager.stats.recording} icon={HardDrive} tone="bg-indigo-50 text-indigo-700" />
                    <CameraStatCard label="Motion" value={manager.stats.motion} icon={Activity} tone="bg-amber-50 text-amber-700" />
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="relative min-w-0 flex-1">
                            <Search
                                size={17}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                aria-hidden="true"
                            />
                            <input
                                value={manager.searchText}
                                onChange={(event) => manager.setSearchText(event.target.value)}
                                placeholder="Search camera, status, codec, hardware..."
                                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#4369ee] focus:bg-white"
                            />
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="flex rounded-lg bg-slate-100 p-1">
                                {statusFilters.map((filter) => (
                                    <button
                                        key={filter.value}
                                        type="button"
                                        onClick={() => manager.setStatusFilter(filter.value)}
                                        className={cn(
                                            "h-8 rounded-md px-3 text-sm font-semibold transition-colors",
                                            manager.statusFilter === filter.value
                                                ? "bg-white text-slate-950 shadow-sm"
                                                : "text-slate-500 hover:text-slate-900",
                                        )}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex rounded-lg bg-slate-100 p-1">
                                {featureFilters.map((filter) => (
                                    <button
                                        key={filter.value}
                                        type="button"
                                        onClick={() => manager.setFeatureFilter(filter.value)}
                                        className={cn(
                                            "h-8 rounded-md px-3 text-sm font-semibold transition-colors",
                                            manager.featureFilter === filter.value
                                                ? "bg-white text-slate-950 shadow-sm"
                                                : "text-slate-500 hover:text-slate-900",
                                        )}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {manager.errorMessage ? (
                    <section className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
                        <div className="min-w-0">
                            <p className="font-semibold">Cannot load cameras</p>
                            <p className="mt-1 break-words">{manager.errorMessage}</p>
                        </div>
                    </section>
                ) : null}

                {manager.isLoading && manager.filteredCameras.length === 0 ? (
                    <section className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-20 text-slate-500">
                        <div className="flex flex-col items-center gap-3 text-center">
                            <LoaderCircle className="animate-spin text-[#4369ee]" size={34} aria-hidden="true" />
                            <p className="text-sm font-semibold">Loading cameras...</p>
                        </div>
                    </section>
                ) : null}

                {!manager.isLoading && manager.filteredCameras.length === 0 ? (
                    <section className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-20 text-slate-500">
                        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
                            <CameraIcon size={38} className="text-slate-400" aria-hidden="true" />
                            <p className="text-base font-semibold text-slate-800">No cameras found</p>
                            <p className="text-sm">Try changing the search text or filters.</p>
                        </div>
                    </section>
                ) : null}

                {manager.filteredCameras.length > 0 ? (
                    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {manager.filteredCameras.map((camera) => (
                            <CameraCard
                                key={camera.id}
                                camera={camera}
                                onEdit={manager.openEditCamera}
                                onDelete={manager.openDeleteCamera}
                            />
                        ))}
                    </section>
                ) : null}
            </div>

            {manager.isFormOpen ? (
                <CameraFormModal
                    mode={manager.formMode}
                    form={manager.cameraForm}
                    errorMessage={manager.formErrorMessage}
                    isSaving={manager.isSaving}
                    onClose={manager.closeCameraForm}
                    onSubmit={manager.handleCameraFormSubmit}
                    onChange={manager.updateCameraForm}
                />
            ) : null}

            {manager.deleteTarget ? (
                <DeleteCameraModal
                    camera={manager.deleteTarget}
                    errorMessage={manager.deleteErrorMessage}
                    isDeleting={manager.isDeleting}
                    onClose={manager.closeDeleteCamera}
                    onConfirm={() => void manager.confirmDeleteCamera()}
                />
            ) : null}
        </main>
    );
}
