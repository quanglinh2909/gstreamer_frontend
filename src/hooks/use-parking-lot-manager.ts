import { type FormEvent, useEffect, useState } from "react";
import { parkingLotApi } from "@/backend-api/parking-lot-api";
import { cameraApi } from "@/backend-api/camera-api";
import type { ParkingLot, ParkingLotPage } from "@/interface/parking-lot";
import type { ICameraResponse } from "@/interface/camera";
import {
    buildParkingLotPayload,
    getParkingLotFormError,
} from "@/lib/parking-lot-view-model";

export const PARKING_LOT_PAGE_SIZE = 20;

export type ParkingLotFormMode = "create" | "edit";

export interface ParkingLotFormState {
    name: string;
    faceCameraId: string;
    plateCameraId: string;
}

function emptyParkingLotPage(page = 1): ParkingLotPage {
    return {
        items: [],
        total: 0,
        page,
        size: PARKING_LOT_PAGE_SIZE,
        pages: 0,
    };
}

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

function asCameraList(data: unknown): ICameraResponse[] {
    return Array.isArray(data) ? data : [];
}

function asNonNegativeNumber(value: unknown, fallback: number) {
    const numericValue = Number(value);

    return Number.isFinite(numericValue) ? Math.max(0, numericValue) : fallback;
}

function asParkingLotPage(data: unknown, requestedPage: number): ParkingLotPage {
    if (Array.isArray(data)) {
        return {
            items: data as ParkingLot[],
            total: data.length,
            page: requestedPage,
            size: PARKING_LOT_PAGE_SIZE,
            pages: data.length ? 1 : 0,
        };
    }

    if (!data || typeof data !== "object") {
        return emptyParkingLotPage(requestedPage);
    }

    const response = data as Partial<ParkingLotPage>;

    return {
        items: Array.isArray(response.items) ? response.items : [],
        total: asNonNegativeNumber(response.total, 0),
        page: Math.max(1, asNonNegativeNumber(response.page, requestedPage)),
        size: Math.max(1, asNonNegativeNumber(response.size, PARKING_LOT_PAGE_SIZE)),
        pages: asNonNegativeNumber(response.pages, 0),
    };
}

function createForm(parkingLot?: ParkingLot | null): ParkingLotFormState {
    return {
        name: parkingLot?.name ?? "",
        faceCameraId: parkingLot?.face_camera_id ?? "",
        plateCameraId: parkingLot?.plate_camera_id ?? "",
    };
}

export function useParkingLotManager() {
    const [parkingLotPage, setParkingLotPage] = useState<ParkingLotPage>(() => emptyParkingLotPage());
    const [searchText, setSearchText] = useState("");
    const [submittedName, setSubmittedName] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [cameras, setCameras] = useState<ICameraResponse[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<ParkingLotFormMode>("create");
    const [editTarget, setEditTarget] = useState<ParkingLot | null>(null);
    const [form, setForm] = useState<ParkingLotFormState>(() => createForm());
    const [isSaving, setIsSaving] = useState(false);
    const [formErrorMessage, setFormErrorMessage] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<ParkingLot | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteErrorMessage, setDeleteErrorMessage] = useState("");

    useEffect(() => {
        let isCancelled = false;

        const loadCameras = async () => {
            try {
                const { data } = await cameraApi.getCameras(100, 0);

                if (!isCancelled) {
                    setCameras(asCameraList(data));
                }
            } catch {
                // Camera list is non-critical for browsing parking lots; ignore errors here.
            }
        };

        void loadCameras();

        return () => {
            isCancelled = true;
        };
    }, []);

    useEffect(() => {
        let isCancelled = false;

        const loadParkingLots = async () => {
            setIsLoading(true);
            setErrorMessage("");

            try {
                const { data } = await parkingLotApi.list({
                    page: currentPage,
                    size: PARKING_LOT_PAGE_SIZE,
                    ...(submittedName ? { name: submittedName } : {}),
                });

                if (!isCancelled) {
                    setParkingLotPage(asParkingLotPage(data, currentPage));
                }
            } catch (error) {
                if (!isCancelled) {
                    setErrorMessage(getErrorMessage(error, "Không thể tải danh sách bãi xe."));
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        const timer = window.setTimeout(() => {
            void loadParkingLots();
        }, 0);

        return () => {
            isCancelled = true;
            window.clearTimeout(timer);
        };
    }, [currentPage, refreshKey, submittedName]);

    const refreshParkingLots = () => {
        setRefreshKey((key) => key + 1);
    };

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const nextName = searchText.trim();

        setCurrentPage(1);

        if (nextName === submittedName && currentPage === 1) {
            refreshParkingLots();
            return;
        }

        setSubmittedName(nextName);
    };

    const clearSearch = () => {
        setSearchText("");
        setCurrentPage(1);

        if (!submittedName && currentPage === 1) {
            refreshParkingLots();
            return;
        }

        setSubmittedName("");
    };

    const openCreateParkingLot = () => {
        setFormMode("create");
        setEditTarget(null);
        setForm(createForm());
        setFormErrorMessage("");
        setIsFormOpen(true);
    };

    const openEditParkingLot = (parkingLot: ParkingLot) => {
        setFormMode("edit");
        setEditTarget(parkingLot);
        setForm(createForm(parkingLot));
        setFormErrorMessage("");
        setIsFormOpen(true);
    };

    const closeForm = () => {
        if (!isSaving) {
            setIsFormOpen(false);
            setFormErrorMessage("");
        }
    };

    const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const validationError = getParkingLotFormError(form);

        if (validationError) {
            setFormErrorMessage(validationError);
            return;
        }

        setIsSaving(true);
        setFormErrorMessage("");

        try {
            const payload = buildParkingLotPayload(form);

            if (formMode === "create") {
                await parkingLotApi.create(payload);
            } else if (editTarget) {
                await parkingLotApi.update(editTarget.id, payload);
            }

            setIsFormOpen(false);
            refreshParkingLots();
        } catch (error) {
            setFormErrorMessage(getErrorMessage(error, "Không thể lưu bãi xe."));
        } finally {
            setIsSaving(false);
        }
    };

    const openDeleteParkingLot = (parkingLot: ParkingLot) => {
        setDeleteTarget(parkingLot);
        setDeleteErrorMessage("");
    };

    const closeDeleteParkingLot = () => {
        if (!isDeleting) {
            setDeleteTarget(null);
            setDeleteErrorMessage("");
        }
    };

    const confirmDeleteParkingLot = async () => {
        if (!deleteTarget) {
            return;
        }

        setIsDeleting(true);
        setDeleteErrorMessage("");

        try {
            await parkingLotApi.delete(deleteTarget.id);
            setDeleteTarget(null);

            if (currentPage > 1 && parkingLotPage.items.length === 1) {
                setCurrentPage(currentPage - 1);
            } else {
                refreshParkingLots();
            }
        } catch (error) {
            setDeleteErrorMessage(getErrorMessage(error, "Không thể xóa bãi xe."));
        } finally {
            setIsDeleting(false);
        }
    };

    return {
        cameras,
        clearSearch,
        closeDeleteParkingLot,
        closeForm,
        confirmDeleteParkingLot,
        currentPage,
        deleteErrorMessage,
        deleteTarget,
        editTarget,
        errorMessage,
        form,
        formErrorMessage,
        formMode,
        handleFormSubmit,
        handleSearchSubmit,
        isDeleting,
        isFormOpen,
        isLoading,
        isSaving,
        openCreateParkingLot,
        openDeleteParkingLot,
        openEditParkingLot,
        parkingLotPage,
        refreshParkingLots,
        searchText,
        setCurrentPage,
        setFormName: (name: string) => setForm((current) => ({ ...current, name })),
        setFormFaceCameraId: (faceCameraId: string) =>
            setForm((current) => ({ ...current, faceCameraId })),
        setFormPlateCameraId: (plateCameraId: string) =>
            setForm((current) => ({ ...current, plateCameraId })),
        setSearchText,
        submittedName,
    };
}

export type ParkingLotManager = ReturnType<typeof useParkingLotManager>;
