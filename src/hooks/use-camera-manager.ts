import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { cameraApi } from "@/backend-api/camera-api";
import type {
    CameraStateMessage,
    ICameraCreate,
    ICameraResponse,
} from "@/interface/camera";
import {
    buildCameraPayload,
    filterCameras,
    getCameraFormDefaults,
    getCameraStats,
} from "@/lib/camera-view-model";
import type {
    CameraFormMode,
    CameraFormState,
    FeatureFilter,
    StatusFilter,
} from "@/components/camera/types";

export type CameraSocketStatus =
    | "idle"
    | "connecting"
    | "connected"
    | "reconnecting"
    | "error";

const MAX_RECONNECT_DELAY = 5000;

function getApiErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return "Unable to load cameras";
}

function asCameraList(data: unknown): ICameraResponse[] {
    return Array.isArray(data) ? data : [];
}

function parseCameraStateMessage(raw: unknown): CameraStateMessage | null {
    if (typeof raw !== "string") {
        return null;
    }

    try {
        const value = JSON.parse(raw) as Partial<CameraStateMessage>;

        if (typeof value?.id !== "string" || typeof value.state !== "string") {
            return null;
        }

        return {
            id: value.id,
            state: value.state,
            lastError: typeof value.lastError === "string" ? value.lastError : "",
            lastChangedAt: typeof value.lastChangedAt === "string" ? value.lastChangedAt : "",
        };
    } catch {
        return null;
    }
}

export function useCameraManager(websocketOrigin = "") {
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
    const [socketStatus, setSocketStatus] = useState<CameraSocketStatus>("idle");

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

    const handleStateMessage = useCallback((raw: unknown) => {
        const message = parseCameraStateMessage(raw);

        if (!message) {
            return;
        }

        setCameras((previous) => {
            let changed = false;

            const next = previous.map((camera) => {
                if (camera.id !== message.id) {
                    return camera;
                }

                changed = true;

                // The pushed `state` is authoritative; mirror it into `status`
                // too so the stale REST `status` can't mask it in health checks.
                return {
                    ...camera,
                    status: message.state,
                    state: message.state,
                    lastError: message.lastError,
                    lastChangedAt: message.lastChangedAt || camera.lastChangedAt,
                };
            });

            return changed ? next : previous;
        });

        setLastUpdated(new Date());
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const baseUrl = websocketOrigin.trim().replace(/\/+$/, "");
        const url = `${baseUrl}/camera-state`;
        let socket: WebSocket | null = null;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
        let attempts = 0;
        let disposed = false;

        const connect = () => {
            if (disposed) {
                return;
            }

            setSocketStatus(attempts === 0 ? "connecting" : "reconnecting");

            try {
                socket = new WebSocket(url);
            } catch {
                setSocketStatus("error");
                return;
            }

            socket.onopen = () => {
                attempts = 0;
                setSocketStatus("connected");
            };

            socket.onmessage = (event) => handleStateMessage(event.data);

            socket.onerror = () => setSocketStatus("error");

            socket.onclose = () => {
                if (disposed) {
                    return;
                }

                attempts += 1;
                const delay = Math.min(1000 * 2 ** (attempts - 1), MAX_RECONNECT_DELAY);
                setSocketStatus("reconnecting");
                reconnectTimer = setTimeout(connect, delay);
            };
        };

        // Deferred so the effect doesn't call setState synchronously.
        const startTimer = window.setTimeout(() => {
            if (!baseUrl) {
                setSocketStatus("idle");
                return;
            }
            connect();
        }, 0);

        return () => {
            disposed = true;
            window.clearTimeout(startTimer);
            if (reconnectTimer) {
                clearTimeout(reconnectTimer);
            }
            socket?.close();
            setSocketStatus("idle");
        };
    }, [websocketOrigin, handleStateMessage]);

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

    return {
        cameraForm,
        closeCameraForm,
        closeDeleteCamera,
        confirmDeleteCamera,
        deleteErrorMessage,
        deleteTarget,
        errorMessage,
        featureFilter,
        fetchCameras,
        filteredCameras,
        formErrorMessage,
        formMode,
        handleCameraFormSubmit,
        isDeleting,
        isFormOpen,
        isLoading,
        isSaving,
        lastUpdated,
        openCreateCamera,
        openDeleteCamera,
        openEditCamera,
        searchText,
        setFeatureFilter,
        setSearchText,
        setStatusFilter,
        socketStatus,
        stats,
        statusFilter,
        updateCameraForm,
    };
}

export type CameraManager = ReturnType<typeof useCameraManager>;
