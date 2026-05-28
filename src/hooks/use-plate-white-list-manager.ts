import { type FormEvent, useEffect, useState } from "react";
import { plateWhiteListApi } from "@/backend-api/plate-white-list-api";
import type { PlateWhiteListEntry, PlateWhiteListPage } from "@/interface/plate-white-list";
import {
    buildPlateWhiteListPayload,
    getPlateWhiteListFormError,
} from "@/lib/plate-white-list-view-model";

export const PLATE_WHITE_LIST_PAGE_SIZE = 20;

export type PlateWhiteListFormMode = "create" | "edit";

export interface PlateWhiteListFormState {
    plateNumber: string;
    name: string;
}

function emptyPlateWhiteListPage(page = 1): PlateWhiteListPage {
    return {
        items: [],
        total: 0,
        page,
        size: PLATE_WHITE_LIST_PAGE_SIZE,
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

function asPlateWhiteListPage(data: unknown, requestedPage: number): PlateWhiteListPage {
    if (!data || typeof data !== "object") {
        return emptyPlateWhiteListPage(requestedPage);
    }

    const response = data as Partial<PlateWhiteListPage>;

    return {
        items: Array.isArray(response.items) ? response.items : [],
        total: asNonNegativeNumber(response.total, 0),
        page: Math.max(1, asNonNegativeNumber(response.page, requestedPage)),
        size: Math.max(1, asNonNegativeNumber(response.size, PLATE_WHITE_LIST_PAGE_SIZE)),
        pages: asNonNegativeNumber(response.pages, 0),
    };
}

function createForm(entry?: PlateWhiteListEntry | null): PlateWhiteListFormState {
    return {
        plateNumber: entry?.plate_number ?? "",
        name: entry?.name ?? "",
    };
}

export function usePlateWhiteListManager() {
    const [plateWhiteListPage, setPlateWhiteListPage] = useState<PlateWhiteListPage>(() => emptyPlateWhiteListPage());
    const [searchText, setSearchText] = useState("");
    const [submittedPlateNumber, setSubmittedPlateNumber] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<PlateWhiteListFormMode>("create");
    const [editTarget, setEditTarget] = useState<PlateWhiteListEntry | null>(null);
    const [form, setForm] = useState<PlateWhiteListFormState>(() => createForm());
    const [isSaving, setIsSaving] = useState(false);
    const [formErrorMessage, setFormErrorMessage] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<PlateWhiteListEntry | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteErrorMessage, setDeleteErrorMessage] = useState("");

    useEffect(() => {
        let isCancelled = false;

        const loadEntries = async () => {
            setIsLoading(true);
            setErrorMessage("");

            try {
                const { data } = await plateWhiteListApi.list({
                    page: currentPage,
                    size: PLATE_WHITE_LIST_PAGE_SIZE,
                    ...(submittedPlateNumber ? { plate_number: submittedPlateNumber } : {}),
                });

                if (!isCancelled) {
                    setPlateWhiteListPage(asPlateWhiteListPage(data, currentPage));
                }
            } catch (error) {
                if (!isCancelled) {
                    setErrorMessage(getErrorMessage(error, "Không thể tải danh sách biển số trắng."));
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        const timer = window.setTimeout(() => {
            void loadEntries();
        }, 0);

        return () => {
            isCancelled = true;
            window.clearTimeout(timer);
        };
    }, [currentPage, refreshKey, submittedPlateNumber]);

    const refreshEntries = () => {
        setRefreshKey((key) => key + 1);
    };

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const nextPlateNumber = searchText.trim().toUpperCase();

        setCurrentPage(1);

        if (nextPlateNumber === submittedPlateNumber && currentPage === 1) {
            refreshEntries();
            return;
        }

        setSubmittedPlateNumber(nextPlateNumber);
    };

    const clearSearch = () => {
        setSearchText("");
        setCurrentPage(1);

        if (!submittedPlateNumber && currentPage === 1) {
            refreshEntries();
            return;
        }

        setSubmittedPlateNumber("");
    };

    const openCreateEntry = () => {
        setFormMode("create");
        setEditTarget(null);
        setForm(createForm());
        setFormErrorMessage("");
        setIsFormOpen(true);
    };

    const openEditEntry = (entry: PlateWhiteListEntry) => {
        setFormMode("edit");
        setEditTarget(entry);
        setForm(createForm(entry));
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
        const validationError = getPlateWhiteListFormError(form);

        if (validationError) {
            setFormErrorMessage(validationError);
            return;
        }

        setIsSaving(true);
        setFormErrorMessage("");

        try {
            const payload = buildPlateWhiteListPayload(form);

            if (formMode === "create") {
                await plateWhiteListApi.create(payload);
            } else if (editTarget) {
                await plateWhiteListApi.update(editTarget.id, payload);
            }

            setIsFormOpen(false);
            refreshEntries();
        } catch (error) {
            setFormErrorMessage(getErrorMessage(error, "Không thể lưu biển số."));
        } finally {
            setIsSaving(false);
        }
    };

    const openDeleteEntry = (entry: PlateWhiteListEntry) => {
        setDeleteTarget(entry);
        setDeleteErrorMessage("");
    };

    const closeDeleteEntry = () => {
        if (!isDeleting) {
            setDeleteTarget(null);
            setDeleteErrorMessage("");
        }
    };

    const confirmDeleteEntry = async () => {
        if (!deleteTarget) {
            return;
        }

        setIsDeleting(true);
        setDeleteErrorMessage("");

        try {
            await plateWhiteListApi.delete(deleteTarget.id);
            setDeleteTarget(null);

            if (currentPage > 1 && plateWhiteListPage.items.length === 1) {
                setCurrentPage(currentPage - 1);
            } else {
                refreshEntries();
            }
        } catch (error) {
            setDeleteErrorMessage(getErrorMessage(error, "Không thể xóa biển số."));
        } finally {
            setIsDeleting(false);
        }
    };

    return {
        clearSearch,
        closeDeleteEntry,
        closeForm,
        confirmDeleteEntry,
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
        openCreateEntry,
        openDeleteEntry,
        openEditEntry,
        plateWhiteListPage,
        refreshEntries,
        searchText,
        setCurrentPage,
        setFormName: (name: string) => setForm((current) => ({ ...current, name })),
        setFormPlateNumber: (plateNumber: string) => setForm((current) => ({ ...current, plateNumber })),
        setSearchText,
        submittedPlateNumber,
    };
}

export type PlateWhiteListManager = ReturnType<typeof usePlateWhiteListManager>;
