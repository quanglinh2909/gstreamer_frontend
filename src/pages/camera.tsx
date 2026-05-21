import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
    Activity,
    AlertTriangle,
    Camera as CameraIcon,
    CheckCircle2,
    CircleDot,
    Clock3,
    Edit3,
    HardDrive,
    LoaderCircle,
    Plus,
    RefreshCw,
    Save,
    Search,
    Trash2,
    Video,
    WifiOff,
    X,
    type LucideIcon,
} from "lucide-react";
import { cameraApi } from "@/backend-api/camera-api";
import { ICameraCreate, ICameraResponse } from "@/interface/camera";
import { MainLayout } from "../components/layouts/main-layout";
import {
    buildCameraPayload,
    filterCameras,
    formatCameraDate,
    getCameraFormDefaults,
    getCameraHealth,
    getCameraStats,
} from "@/lib/camera-view-model";

type CameraHealth = "online" | "offline" | "error" | "unknown";
type StatusFilter = CameraHealth | "all";
type FeatureFilter = "all" | "recording" | "motion";
type CameraFormMode = "create" | "edit";
type CameraFormState = Omit<
    ICameraCreate,
    | "motionSensitivity"
    | "motionThreshold"
    | "preMotionSeconds"
    | "postMotionSeconds"
    | "segmentSeconds"
> & {
    motionSensitivity: string;
    motionThreshold: string;
    preMotionSeconds: string;
    postMotionSeconds: string;
    segmentSeconds: string;
};

const statusFilters: Array<{ label: string; value: StatusFilter }> = [
    { label: "All", value: "all" },
    { label: "Online", value: "online" },
    { label: "Offline", value: "offline" },
    { label: "Error", value: "error" },
];

const featureFilters: Array<{ label: string; value: FeatureFilter }> = [
    { label: "All", value: "all" },
    { label: "Recording", value: "recording" },
    { label: "Motion", value: "motion" },
];

const recordingModes: Array<{ value: string; label: string }> = [
    { value: "off", label: "Off — no recording" },
    { value: "always", label: "Always — continuous" },
    { value: "motion", label: "Motion — motion segments only" },
];

const healthStyles: Record<
    CameraHealth,
    {
        label: string;
        badge: string;
        dot: string;
        icon: LucideIcon;
        preview: string;
    }
> = {
    online: {
        label: "Online",
        badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
        dot: "bg-emerald-500",
        icon: CheckCircle2,
        preview: "from-emerald-500/20 via-slate-950 to-cyan-500/10",
    },
    offline: {
        label: "Offline",
        badge: "border-slate-200 bg-slate-100 text-slate-600",
        dot: "bg-slate-400",
        icon: WifiOff,
        preview: "from-slate-600/20 via-slate-950 to-slate-900",
    },
    error: {
        label: "Error",
        badge: "border-rose-200 bg-rose-50 text-rose-700",
        dot: "bg-rose-500",
        icon: AlertTriangle,
        preview: "from-rose-500/20 via-slate-950 to-amber-500/10",
    },
    unknown: {
        label: "Unknown",
        badge: "border-amber-200 bg-amber-50 text-amber-700",
        dot: "bg-amber-500",
        icon: CircleDot,
        preview: "from-amber-500/20 via-slate-950 to-slate-800",
    },
};

function cn(...classes: Array<string | false | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function getApiErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return "Unable to load cameras";
}

function asCameraList(data: unknown): ICameraResponse[] {
    return Array.isArray(data) ? data : [];
}

function StatCard({
    label,
    value,
    icon: Icon,
    tone,
}: {
    label: string;
    value: number;
    icon: LucideIcon;
    tone: string;
}) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                        {label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
                </div>
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tone)}>
                    <Icon size={18} strokeWidth={2.4} aria-hidden="true" />
                </div>
            </div>
        </div>
    );
}

function InfoPill({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0 rounded-md bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                {label}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-800">{value || "N/A"}</p>
        </div>
    );
}

function TextField({
    label,
    value,
    onChange,
    type = "text",
    required = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: "text" | "number";
    required?: boolean;
}) {
    return (
        <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                {label}
            </span>
            <input
                type={type}
                required={required}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#4369ee]"
            />
        </label>
    );
}

function SelectField({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: Array<{ value: string; label: string }>;
    onChange: (value: string) => void;
}) {
    return (
        <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                {label}
            </span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#4369ee]"
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

function ToggleField({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-sm font-semibold text-slate-800">{label}</span>
            <button
                type="button"
                aria-pressed={checked}
                onClick={() => onChange(!checked)}
                className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    checked ? "bg-[#4369ee]" : "bg-slate-300",
                )}
            >
                <span
                    className={cn(
                        "absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                        checked ? "translate-x-5" : "translate-x-0",
                    )}
                />
            </button>
        </label>
    );
}

function CameraFormModal({
    mode,
    form,
    errorMessage,
    isSaving,
    onClose,
    onSubmit,
    onChange,
}: {
    mode: CameraFormMode;
    form: CameraFormState;
    errorMessage: string;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onChange: <K extends keyof CameraFormState>(key: K, value: CameraFormState[K]) => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
            <form
                onSubmit={onSubmit}
                className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
            >
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div>
                        <p className="text-sm font-semibold text-[#4369ee]">
                            {mode === "create" ? "Add camera" : "Edit camera"}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-950">
                            Camera configuration
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
                        aria-label="Close"
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </div>

                <div className="space-y-5 overflow-y-auto px-5 py-5">
                    {errorMessage ? (
                        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                            <span>{errorMessage}</span>
                        </div>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-2">
                        <TextField
                            label="Name"
                            value={form.name}
                            required
                            onChange={(value) => onChange("name", value)}
                        />
                        <TextField
                            label="Hardware"
                            value={form.hardware}
                            onChange={(value) => onChange("hardware", value)}
                        />
                        <div className="md:col-span-2">
                            <TextField
                                label="RTSP"
                                value={form.rtsp}
                                required
                                onChange={(value) => onChange("rtsp", value)}
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <ToggleField
                            label="Recording"
                            checked={form.recordingEnabled}
                            onChange={(value) => onChange("recordingEnabled", value)}
                        />
                        <ToggleField
                            label="Motion"
                            checked={form.motionEnabled}
                            onChange={(value) => onChange("motionEnabled", value)}
                        />
                        <ToggleField
                            label="Keyframe only"
                            checked={form.motionKeyframeOnly}
                            onChange={(value) => onChange("motionKeyframeOnly", value)}
                        />
                        <SelectField
                            label="Recording mode"
                            value={form.recordingMode}
                            options={recordingModes}
                            onChange={(value) => onChange("recordingMode", value)}
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <TextField
                            label="Sensitivity"
                            type="number"
                            value={form.motionSensitivity}
                            onChange={(value) => onChange("motionSensitivity", value)}
                        />
                        <TextField
                            label="Threshold"
                            type="number"
                            value={form.motionThreshold}
                            onChange={(value) => onChange("motionThreshold", value)}
                        />
                        <TextField
                            label="Pre seconds"
                            type="number"
                            value={form.preMotionSeconds}
                            onChange={(value) => onChange("preMotionSeconds", value)}
                        />
                        <TextField
                            label="Post seconds"
                            type="number"
                            value={form.postMotionSeconds}
                            onChange={(value) => onChange("postMotionSeconds", value)}
                        />
                        <TextField
                            label="Segment"
                            type="number"
                            value={form.segmentSeconds}
                            onChange={(value) => onChange("segmentSeconds", value)}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#4369ee] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3156d4] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? (
                            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                        ) : (
                            <Save size={16} aria-hidden="true" />
                        )}
                        {mode === "create" ? "Create" : "Save"}
                    </button>
                </div>
            </form>
        </div>
    );
}

function DeleteConfirmModal({
    camera,
    errorMessage,
    isDeleting,
    onClose,
    onConfirm,
}: {
    camera: ICameraResponse;
    errorMessage: string;
    isDeleting: boolean;
    onClose: () => void;
    onConfirm: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-lg bg-white shadow-2xl">
                <div className="border-b border-slate-200 px-5 py-4">
                    <p className="text-sm font-semibold text-rose-600">Delete camera</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-950">
                        {camera.name || "Unnamed camera"}
                    </h2>
                </div>
                <div className="space-y-4 px-5 py-5">
                    <p className="text-sm text-slate-600">
                        This camera will be removed from the list.
                    </p>
                    {errorMessage ? (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {errorMessage}
                        </div>
                    ) : null}
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isDeleting ? (
                            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                        ) : (
                            <Trash2 size={16} aria-hidden="true" />
                        )}
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

function CameraCard({
    camera,
    onEdit,
    onDelete,
}: {
    camera: ICameraResponse;
    onEdit: (camera: ICameraResponse) => void;
    onDelete: (camera: ICameraResponse) => void;
}) {
    const health = getCameraHealth(camera) as CameraHealth;
    const style = healthStyles[health] ?? healthStyles.unknown;
    const StatusIcon = style.icon;

    return (
        <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
            <div className={cn("relative aspect-video overflow-hidden bg-gradient-to-br", style.preview)}>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
                <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    <span className={cn("h-2 w-2 rounded-full", style.dot)} />
                    {style.label}
                </div>
                <div className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                    {camera.codec || "No codec"}
                </div>
                <div className="relative flex h-full flex-col items-center justify-center px-6 text-center text-white">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/10 backdrop-blur">
                        <CameraIcon size={28} strokeWidth={2.3} aria-hidden="true" />
                    </div>
                    <p className="mt-3 text-sm font-semibold">Preview unavailable</p>
                    <p className="mt-1 max-w-full truncate text-xs text-slate-300">
                        {camera.outputRtsp || camera.inputRtsp || camera.rtsp || "Waiting for stream"}
                    </p>
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
                    <h2 className="truncate text-base font-semibold text-white">
                        {camera.name || "Unnamed camera"}
                    </h2>
                    <p className="truncate text-xs text-slate-300">{camera.id}</p>
                </div>
            </div>

            <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                            {camera.status || "Unknown status"}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                            State: {camera.state || "N/A"}
                        </p>
                    </div>
                    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", style.badge)}>
                        <StatusIcon size={13} strokeWidth={2.4} aria-hidden="true" />
                        {style.label}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onEdit(camera)}
                        className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950"
                    >
                        <Edit3 size={15} aria-hidden="true" />
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(camera)}
                        className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                    >
                        <Trash2 size={15} aria-hidden="true" />
                        Delete
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <InfoPill label="Hardware" value={camera.hardware} />
                    <InfoPill label="Retry" value={String(camera.retryCount ?? 0)} />
                    <InfoPill
                        label="Recording"
                        value={camera.recordingEnabled ? camera.recordingMode || "Enabled" : "Off"}
                    />
                    <InfoPill
                        label="Motion"
                        value={camera.motionEnabled ? `${camera.motionSensitivity ?? 0}%` : "Off"}
                    />
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock3 size={14} aria-hidden="true" />
                    <span className="truncate">
                        Updated {formatCameraDate(camera.lastChangedAt)}
                    </span>
                </div>

                {camera.lastError ? (
                    <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                        {camera.lastError}
                    </div>
                ) : null}
            </div>
        </article>
    );
}

export default function Camera() {
    const [cameras, setCameras] = useState<ICameraResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [searchText, setSearchText] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [featureFilter, setFeatureFilter] = useState<FeatureFilter>("all");
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<CameraFormMode>("create");
    const [selectedCamera, setSelectedCamera] = useState<ICameraResponse | null>(null);
    const [cameraForm, setCameraForm] = useState<CameraFormState>(
        () => getCameraFormDefaults() as CameraFormState,
    );
    const [isSaving, setIsSaving] = useState(false);
    const [formErrorMessage, setFormErrorMessage] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<ICameraResponse | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteErrorMessage, setDeleteErrorMessage] = useState("");

    const fetchCameras = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage("");

        try {
            const { data } = await cameraApi.getCameras(10, 0);
            setCameras(asCameraList(data));
            setLastUpdated(new Date());
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void fetchCameras();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [fetchCameras]);

    const stats = useMemo(() => getCameraStats(cameras), [cameras]);
    const filteredCameras = useMemo(
        () =>
            filterCameras(cameras, {
                search: searchText,
                status: statusFilter,
                feature: featureFilter,
            }) as ICameraResponse[],
        [cameras, featureFilter, searchText, statusFilter],
    );

    const openCreateCamera = () => {
        setFormMode("create");
        setSelectedCamera(null);
        setCameraForm(getCameraFormDefaults() as CameraFormState);
        setFormErrorMessage("");
        setIsFormOpen(true);
    };

    const openEditCamera = (camera: ICameraResponse) => {
        setFormMode("edit");
        setSelectedCamera(camera);
        setCameraForm(getCameraFormDefaults(camera) as CameraFormState);
        setFormErrorMessage("");
        setIsFormOpen(true);
    };

    const closeCameraForm = () => {
        if (isSaving) {
            return;
        }

        setIsFormOpen(false);
        setFormErrorMessage("");
    };

    const updateCameraForm = <K extends keyof CameraFormState>(
        key: K,
        value: CameraFormState[K],
    ) => {
        setCameraForm((currentForm) => ({
            ...currentForm,
            [key]: value,
        }));
    };

    const handleCameraFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormErrorMessage("");

        const payload = buildCameraPayload(cameraForm) as ICameraCreate;

        if (!payload.name || !payload.rtsp) {
            setFormErrorMessage("Name and RTSP are required.");
            return;
        }

        setIsSaving(true);

        try {
            if (formMode === "create") {
                await cameraApi.createCamera(payload);
            } else if (selectedCamera) {
                await cameraApi.updateCamera(selectedCamera.id, payload);
            }

            setIsFormOpen(false);
            await fetchCameras();
        } catch (error) {
            setFormErrorMessage(getApiErrorMessage(error));
        } finally {
            setIsSaving(false);
        }
    };

    const openDeleteCamera = (camera: ICameraResponse) => {
        setDeleteTarget(camera);
        setDeleteErrorMessage("");
    };

    const closeDeleteCamera = () => {
        if (isDeleting) {
            return;
        }

        setDeleteTarget(null);
        setDeleteErrorMessage("");
    };

    const confirmDeleteCamera = async () => {
        if (!deleteTarget) {
            return;
        }

        setIsDeleting(true);
        setDeleteErrorMessage("");

        try {
            await cameraApi.deleteCamera(deleteTarget.id);
            setDeleteTarget(null);
            await fetchCameras();
        } catch (error) {
            setDeleteErrorMessage(getApiErrorMessage(error));
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <MainLayout>
            <main className="h-full overflow-y-auto bg-slate-50">
                <div className="mx-auto flex min-h-full max-w-[1600px] flex-col gap-5 px-6 py-5">
                    <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm font-semibold text-[#4369ee]">Monitoring</p>
                            <h1 className="mt-1 text-2xl font-semibold text-slate-950">Cameras</h1>
                            <p className="mt-1 text-sm text-slate-500">
                                {lastUpdated
                                    ? `Last updated ${lastUpdated.toLocaleTimeString()}`
                                    : "Camera overview"}
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <button
                                type="button"
                                onClick={openCreateCamera}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#4369ee] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3156d4]"
                            >
                                <Plus size={16} aria-hidden="true" />
                                Add Camera
                            </button>
                            <button
                                type="button"
                                onClick={() => void fetchCameras()}
                                disabled={isLoading}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <RefreshCw
                                    size={16}
                                    className={cn(isLoading && "animate-spin")}
                                    aria-hidden="true"
                                />
                                Refresh
                            </button>
                        </div>
                    </header>

                    <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
                        <StatCard label="Total" value={stats.total} icon={Video} tone="bg-blue-50 text-blue-700" />
                        <StatCard label="Online" value={stats.online} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" />
                        <StatCard label="Offline" value={stats.offline} icon={WifiOff} tone="bg-slate-100 text-slate-700" />
                        <StatCard label="Errors" value={stats.error} icon={AlertTriangle} tone="bg-rose-50 text-rose-700" />
                        <StatCard label="Recording" value={stats.recording} icon={HardDrive} tone="bg-indigo-50 text-indigo-700" />
                        <StatCard label="Motion" value={stats.motion} icon={Activity} tone="bg-amber-50 text-amber-700" />
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
                                    value={searchText}
                                    onChange={(event) => setSearchText(event.target.value)}
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
                                            onClick={() => setStatusFilter(filter.value)}
                                            className={cn(
                                                "h-8 rounded-md px-3 text-sm font-semibold transition-colors",
                                                statusFilter === filter.value
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
                                            onClick={() => setFeatureFilter(filter.value)}
                                            className={cn(
                                                "h-8 rounded-md px-3 text-sm font-semibold transition-colors",
                                                featureFilter === filter.value
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

                    {errorMessage ? (
                        <section className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
                            <div className="min-w-0">
                                <p className="font-semibold">Cannot load cameras</p>
                                <p className="mt-1 break-words">{errorMessage}</p>
                            </div>
                        </section>
                    ) : null}

                    {isLoading && cameras.length === 0 ? (
                        <section className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-20 text-slate-500">
                            <div className="flex flex-col items-center gap-3 text-center">
                                <LoaderCircle className="animate-spin text-[#4369ee]" size={34} aria-hidden="true" />
                                <p className="text-sm font-semibold">Loading cameras...</p>
                            </div>
                        </section>
                    ) : null}

                    {!isLoading && filteredCameras.length === 0 ? (
                        <section className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-20 text-slate-500">
                            <div className="flex max-w-sm flex-col items-center gap-3 text-center">
                                <CameraIcon size={38} className="text-slate-400" aria-hidden="true" />
                                <p className="text-base font-semibold text-slate-800">No cameras found</p>
                                <p className="text-sm">
                                    Try changing the search text or filters.
                                </p>
                            </div>
                        </section>
                    ) : null}

                    {filteredCameras.length > 0 ? (
                        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {filteredCameras.map((camera) => (
                                <CameraCard
                                    key={camera.id}
                                    camera={camera}
                                    onEdit={openEditCamera}
                                    onDelete={openDeleteCamera}
                                />
                            ))}
                        </section>
                    ) : null}
                </div>

                {isFormOpen ? (
                    <CameraFormModal
                        mode={formMode}
                        form={cameraForm}
                        errorMessage={formErrorMessage}
                        isSaving={isSaving}
                        onClose={closeCameraForm}
                        onSubmit={handleCameraFormSubmit}
                        onChange={updateCameraForm}
                    />
                ) : null}

                {deleteTarget ? (
                    <DeleteConfirmModal
                        camera={deleteTarget}
                        errorMessage={deleteErrorMessage}
                        isDeleting={isDeleting}
                        onClose={closeDeleteCamera}
                        onConfirm={() => void confirmDeleteCamera()}
                    />
                ) : null}
            </main>
        </MainLayout>
    );
}
