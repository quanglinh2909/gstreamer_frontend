import { type FormEvent, useEffect, useRef, useState } from "react";
import { identityApi } from "@/backend-api/identity-api";
import type { Identity, IdentityPage, IdentityPlate } from "@/interface/identity";
import {
    buildIdentityFormData,
    getIdentityFormError,
} from "@/lib/identity-view-model";

export const IDENTITY_PAGE_SIZE = 20;

export type IdentityFormMode = "create" | "edit";

export type IdentityFormState = {
    name: string;
    image: File | null;
    previewUrl: string;
};

function emptyIdentityPage(page = 1): IdentityPage {
    return {
        items: [],
        total: 0,
        page,
        size: IDENTITY_PAGE_SIZE,
        pages: 0,
    };
}

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

function asNonNegativeNumber(value: unknown, fallback: number) {
    const numericValue = Number(value);

    return Number.isFinite(numericValue) ? Math.max(0, numericValue) : fallback;
}

function asIdentityPage(data: unknown, requestedPage: number): IdentityPage {
    if (Array.isArray(data)) {
        return {
            items: data as Identity[],
            total: data.length,
            page: requestedPage,
            size: IDENTITY_PAGE_SIZE,
            pages: data.length ? 1 : 0,
        };
    }

    if (!data || typeof data !== "object") {
        return emptyIdentityPage(requestedPage);
    }

    const response = data as Partial<IdentityPage>;

    return {
        items: Array.isArray(response.items) ? response.items : [],
        total: asNonNegativeNumber(response.total, 0),
        page: Math.max(1, asNonNegativeNumber(response.page, requestedPage)),
        size: Math.max(1, asNonNegativeNumber(response.size, IDENTITY_PAGE_SIZE)),
        pages: asNonNegativeNumber(response.pages, 0),
    };
}

function createIdentityForm(identity?: Identity | null): IdentityFormState {
    return {
        name: identity?.name ?? "",
        image: null,
        previewUrl: "",
    };
}

export function useIdentityManager() {
    const detailRequestRef = useRef(0);
    const platesRequestRef = useRef(0);
    const formPreviewUrlRef = useRef("");
    const [identityPage, setIdentityPage] = useState<IdentityPage>(() => emptyIdentityPage());
    const [searchText, setSearchText] = useState("");
    const [submittedName, setSubmittedName] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [selectedIdentity, setSelectedIdentity] = useState<Identity | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [detailErrorMessage, setDetailErrorMessage] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<IdentityFormMode>("create");
    const [editTarget, setEditTarget] = useState<Identity | null>(null);
    const [form, setForm] = useState<IdentityFormState>(() => createIdentityForm());
    const [isSaving, setIsSaving] = useState(false);
    const [formErrorMessage, setFormErrorMessage] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<Identity | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteErrorMessage, setDeleteErrorMessage] = useState("");
    const [plates, setPlates] = useState<IdentityPlate[]>([]);
    const [isPlatesLoading, setIsPlatesLoading] = useState(false);
    const [platesErrorMessage, setPlatesErrorMessage] = useState("");
    const [newPlateNumber, setNewPlateNumber] = useState("");
    const [isAddingPlate, setIsAddingPlate] = useState(false);
    const [editingPlateId, setEditingPlateId] = useState<number | null>(null);
    const [editingPlateNumber, setEditingPlateNumber] = useState("");
    const [isSavingPlate, setIsSavingPlate] = useState(false);
    const [deletingPlateId, setDeletingPlateId] = useState<number | null>(null);

    const clearFormPreview = () => {
        if (formPreviewUrlRef.current) {
            URL.revokeObjectURL(formPreviewUrlRef.current);
            formPreviewUrlRef.current = "";
        }
    };

    useEffect(
        () => () => {
            if (formPreviewUrlRef.current) {
                URL.revokeObjectURL(formPreviewUrlRef.current);
            }
        },
        [],
    );

    useEffect(() => {
        let isCancelled = false;

        const loadIdentities = async () => {
            setIsLoading(true);
            setErrorMessage("");

            try {
                const { data } = await identityApi.list({
                    page: currentPage,
                    size: IDENTITY_PAGE_SIZE,
                    ...(submittedName ? { name: submittedName } : {}),
                });

                if (!isCancelled) {
                    setIdentityPage(asIdentityPage(data, currentPage));
                }
            } catch (error) {
                if (!isCancelled) {
                    setErrorMessage(getErrorMessage(error, "Không thể tải danh sách identity."));
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        const timer = window.setTimeout(() => {
            void loadIdentities();
        }, 0);

        return () => {
            isCancelled = true;
            window.clearTimeout(timer);
        };
    }, [currentPage, refreshKey, submittedName]);

    const refreshIdentities = () => {
        setRefreshKey((key) => key + 1);
    };

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const nextName = searchText.trim();

        setCurrentPage(1);

        if (nextName === submittedName && currentPage === 1) {
            refreshIdentities();
            return;
        }

        setSubmittedName(nextName);
    };

    const clearSearch = () => {
        setSearchText("");
        setCurrentPage(1);

        if (!submittedName && currentPage === 1) {
            refreshIdentities();
            return;
        }

        setSubmittedName("");
    };

    const resetPlateState = () => {
        platesRequestRef.current += 1;
        setPlates([]);
        setIsPlatesLoading(false);
        setPlatesErrorMessage("");
        setNewPlateNumber("");
        setIsAddingPlate(false);
        setEditingPlateId(null);
        setEditingPlateNumber("");
        setIsSavingPlate(false);
        setDeletingPlateId(null);
    };

    const loadPlates = async (identityId: number) => {
        const requestId = platesRequestRef.current + 1;
        platesRequestRef.current = requestId;
        setIsPlatesLoading(true);
        setPlatesErrorMessage("");

        try {
            const { data } = await identityApi.listPlates(identityId);

            if (platesRequestRef.current === requestId) {
                setPlates(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            if (platesRequestRef.current === requestId) {
                setPlatesErrorMessage(getErrorMessage(error, "Không thể tải danh sách phương tiện."));
            }
        } finally {
            if (platesRequestRef.current === requestId) {
                setIsPlatesLoading(false);
            }
        }
    };

    const openIdentityDetail = async (identity: Identity) => {
        const requestId = detailRequestRef.current + 1;
        detailRequestRef.current = requestId;
        setSelectedIdentity(identity);
        setIsDetailLoading(true);
        setDetailErrorMessage("");
        resetPlateState();
        void loadPlates(identity.id);

        try {
            const { data } = await identityApi.detail(identity.id);

            if (detailRequestRef.current === requestId) {
                setSelectedIdentity(data);
            }
        } catch (error) {
            if (detailRequestRef.current === requestId) {
                setDetailErrorMessage(getErrorMessage(error, "Không thể tải chi tiết identity."));
            }
        } finally {
            if (detailRequestRef.current === requestId) {
                setIsDetailLoading(false);
            }
        }
    };

    const closeIdentityDetail = () => {
        detailRequestRef.current += 1;
        setSelectedIdentity(null);
        setIsDetailLoading(false);
        setDetailErrorMessage("");
        resetPlateState();
    };

    const addPlate = async () => {
        if (!selectedIdentity) {
            return;
        }

        const plateNumber = newPlateNumber.trim();

        if (!plateNumber) {
            setPlatesErrorMessage("Vui lòng nhập biển số phương tiện.");
            return;
        }

        setIsAddingPlate(true);
        setPlatesErrorMessage("");

        try {
            await identityApi.createPlate(selectedIdentity.id, { plate_number: plateNumber });
            setNewPlateNumber("");
            await loadPlates(selectedIdentity.id);
        } catch (error) {
            setPlatesErrorMessage(getErrorMessage(error, "Không thể thêm phương tiện."));
        } finally {
            setIsAddingPlate(false);
        }
    };

    const startEditPlate = (plate: IdentityPlate) => {
        setEditingPlateId(plate.id);
        setEditingPlateNumber(plate.plate_number);
        setPlatesErrorMessage("");
    };

    const cancelEditPlate = () => {
        setEditingPlateId(null);
        setEditingPlateNumber("");
    };

    const saveEditPlate = async () => {
        if (editingPlateId === null) {
            return;
        }

        const plateNumber = editingPlateNumber.trim();

        if (!plateNumber) {
            setPlatesErrorMessage("Vui lòng nhập biển số phương tiện.");
            return;
        }

        setIsSavingPlate(true);
        setPlatesErrorMessage("");

        try {
            await identityApi.updatePlate(editingPlateId, { plate_number: plateNumber });
            setEditingPlateId(null);
            setEditingPlateNumber("");

            if (selectedIdentity) {
                await loadPlates(selectedIdentity.id);
            }
        } catch (error) {
            setPlatesErrorMessage(getErrorMessage(error, "Không thể cập nhật phương tiện."));
        } finally {
            setIsSavingPlate(false);
        }
    };

    const deletePlate = async (plateId: number) => {
        setDeletingPlateId(plateId);
        setPlatesErrorMessage("");

        try {
            await identityApi.deletePlate(plateId);

            if (editingPlateId === plateId) {
                setEditingPlateId(null);
                setEditingPlateNumber("");
            }

            if (selectedIdentity) {
                await loadPlates(selectedIdentity.id);
            }
        } catch (error) {
            setPlatesErrorMessage(getErrorMessage(error, "Không thể xóa phương tiện."));
        } finally {
            setDeletingPlateId(null);
        }
    };

    const openCreateIdentity = () => {
        clearFormPreview();
        setFormMode("create");
        setEditTarget(null);
        setForm(createIdentityForm());
        setFormErrorMessage("");
        setIsFormOpen(true);
    };

    const openEditIdentity = (identity: Identity) => {
        closeIdentityDetail();
        clearFormPreview();
        setFormMode("edit");
        setEditTarget(identity);
        setForm(createIdentityForm(identity));
        setFormErrorMessage("");
        setIsFormOpen(true);
    };

    const closeIdentityForm = () => {
        if (isSaving) {
            return;
        }

        clearFormPreview();
        setIsFormOpen(false);
        setFormErrorMessage("");
    };

    const setFormName = (name: string) => {
        setForm((current) => ({ ...current, name }));
    };

    const setFormImage = (image: File | null) => {
        clearFormPreview();
        const previewUrl = image ? URL.createObjectURL(image) : "";
        formPreviewUrlRef.current = previewUrl;
        setForm((current) => ({ ...current, image, previewUrl }));
    };

    const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const validationError = getIdentityFormError(form, formMode);

        if (validationError) {
            setFormErrorMessage(validationError);
            return;
        }

        setIsSaving(true);
        setFormErrorMessage("");

        try {
            const payload = buildIdentityFormData(form);

            if (formMode === "create") {
                await identityApi.create(payload);
            } else if (editTarget) {
                await identityApi.update(editTarget.id, payload);
            }

            clearFormPreview();
            setIsFormOpen(false);
            closeIdentityDetail();
            refreshIdentities();
        } catch (error) {
            setFormErrorMessage(getErrorMessage(error, "Không thể lưu identity."));
        } finally {
            setIsSaving(false);
        }
    };

    const openDeleteIdentity = (identity: Identity) => {
        closeIdentityDetail();
        setDeleteTarget(identity);
        setDeleteErrorMessage("");
    };

    const closeDeleteIdentity = () => {
        if (isDeleting) {
            return;
        }

        setDeleteTarget(null);
        setDeleteErrorMessage("");
    };

    const confirmDeleteIdentity = async () => {
        if (!deleteTarget) {
            return;
        }

        setIsDeleting(true);
        setDeleteErrorMessage("");

        try {
            await identityApi.delete(deleteTarget.id);
            setDeleteTarget(null);
            closeIdentityDetail();

            if (currentPage > 1 && identityPage.items.length === 1) {
                setCurrentPage(currentPage - 1);
            } else {
                refreshIdentities();
            }
        } catch (error) {
            setDeleteErrorMessage(getErrorMessage(error, "Không thể xóa identity."));
        } finally {
            setIsDeleting(false);
        }
    };

    return {
        addPlate,
        cancelEditPlate,
        clearSearch,
        closeDeleteIdentity,
        closeIdentityDetail,
        closeIdentityForm,
        confirmDeleteIdentity,
        currentPage,
        deleteErrorMessage,
        deletePlate,
        deleteTarget,
        deletingPlateId,
        detailErrorMessage,
        editTarget,
        editingPlateId,
        editingPlateNumber,
        errorMessage,
        form,
        formErrorMessage,
        formMode,
        handleFormSubmit,
        handleSearchSubmit,
        identityPage,
        isAddingPlate,
        isDeleting,
        isDetailLoading,
        isFormOpen,
        isLoading,
        isPlatesLoading,
        isSaving,
        isSavingPlate,
        newPlateNumber,
        openCreateIdentity,
        openDeleteIdentity,
        openEditIdentity,
        openIdentityDetail,
        plates,
        platesErrorMessage,
        refreshIdentities,
        saveEditPlate,
        searchText,
        selectedIdentity,
        setCurrentPage,
        setEditingPlateNumber,
        setFormImage,
        setFormName,
        setNewPlateNumber,
        setSearchText,
        startEditPlate,
        submittedName,
    };
}

export type IdentityManager = ReturnType<typeof useIdentityManager>;
