import { type FormEvent, useEffect, useState } from "react";
import { parkingLotEventApi } from "@/backend-api/parking-lot-event-api";
import type { ParkingLotEventPage } from "@/interface/parking-lot-event";

export const PARKING_LOT_EVENT_PAGE_SIZE = 20;

export interface ParkingLotEventFilterState {
    name: string;
    plateNumber: string;
    identityId: string;
}

function emptyFilter(): ParkingLotEventFilterState {
    return { name: "", plateNumber: "", identityId: "" };
}

function emptyParkingLotEventPage(page = 1): ParkingLotEventPage {
    return {
        items: [],
        total: 0,
        page,
        size: PARKING_LOT_EVENT_PAGE_SIZE,
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

function asParkingLotEventPage(data: unknown, requestedPage: number): ParkingLotEventPage {
    if (Array.isArray(data)) {
        return {
            items: data as ParkingLotEventPage["items"],
            total: data.length,
            page: requestedPage,
            size: PARKING_LOT_EVENT_PAGE_SIZE,
            pages: data.length ? 1 : 0,
        };
    }

    if (!data || typeof data !== "object") {
        return emptyParkingLotEventPage(requestedPage);
    }

    const response = data as Partial<ParkingLotEventPage>;

    return {
        items: Array.isArray(response.items) ? response.items : [],
        total: asNonNegativeNumber(response.total, 0),
        page: Math.max(1, asNonNegativeNumber(response.page, requestedPage)),
        size: Math.max(1, asNonNegativeNumber(response.size, PARKING_LOT_EVENT_PAGE_SIZE)),
        pages: asNonNegativeNumber(response.pages, 0),
    };
}

function buildListParams(page: number, filter: ParkingLotEventFilterState) {
    const params: {
        page: number;
        size: number;
        name?: string;
        identity_id?: number;
        plate_number?: string;
    } = { page, size: PARKING_LOT_EVENT_PAGE_SIZE };

    if (filter.name) {
        params.name = filter.name;
    }

    if (filter.plateNumber) {
        params.plate_number = filter.plateNumber;
    }

    if (filter.identityId) {
        const numericId = Number(filter.identityId);

        if (Number.isFinite(numericId)) {
            params.identity_id = numericId;
        }
    }

    return params;
}

export function useParkingLotEventManager() {
    const [parkingLotEventPage, setParkingLotEventPage] = useState<ParkingLotEventPage>(
        () => emptyParkingLotEventPage(),
    );
    const [filterDraft, setFilterDraft] = useState<ParkingLotEventFilterState>(() => emptyFilter());
    const [submittedFilter, setSubmittedFilter] = useState<ParkingLotEventFilterState>(() => emptyFilter());
    const [currentPage, setCurrentPage] = useState(1);
    const [refreshKey, setRefreshKey] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const submittedName = submittedFilter.name;
    const submittedPlateNumber = submittedFilter.plateNumber;
    const submittedIdentityId = submittedFilter.identityId;

    useEffect(() => {
        let isCancelled = false;

        const loadEvents = async () => {
            setIsLoading(true);
            setErrorMessage("");

            try {
                const { data } = await parkingLotEventApi.list(
                    buildListParams(currentPage, {
                        name: submittedName,
                        plateNumber: submittedPlateNumber,
                        identityId: submittedIdentityId,
                    }),
                );

                if (!isCancelled) {
                    setParkingLotEventPage(asParkingLotEventPage(data, currentPage));
                }
            } catch (error) {
                if (!isCancelled) {
                    setErrorMessage(getErrorMessage(error, "Không thể tải sự kiện bãi xe."));
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        const timer = window.setTimeout(() => {
            void loadEvents();
        }, 0);

        return () => {
            isCancelled = true;
            window.clearTimeout(timer);
        };
    }, [currentPage, refreshKey, submittedName, submittedPlateNumber, submittedIdentityId]);

    const refreshEvents = () => {
        setRefreshKey((key) => key + 1);
    };

    const hasActiveFilter = Boolean(submittedName || submittedPlateNumber || submittedIdentityId);

    const handleFilterSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const nextFilter: ParkingLotEventFilterState = {
            name: filterDraft.name.trim(),
            plateNumber: filterDraft.plateNumber.trim(),
            identityId: filterDraft.identityId.trim(),
        };

        const isUnchanged =
            nextFilter.name === submittedName &&
            nextFilter.plateNumber === submittedPlateNumber &&
            nextFilter.identityId === submittedIdentityId;

        setCurrentPage(1);

        if (isUnchanged && currentPage === 1) {
            refreshEvents();
            return;
        }

        setSubmittedFilter(nextFilter);
    };

    const clearFilters = () => {
        setFilterDraft(emptyFilter());
        setCurrentPage(1);

        if (!hasActiveFilter && currentPage === 1) {
            refreshEvents();
            return;
        }

        setSubmittedFilter(emptyFilter());
    };

    return {
        clearFilters,
        currentPage,
        errorMessage,
        filterDraft,
        handleFilterSubmit,
        hasActiveFilter,
        isLoading,
        parkingLotEventPage,
        refreshEvents,
        setCurrentPage,
        setFilterIdentityId: (identityId: string) =>
            setFilterDraft((current) => ({ ...current, identityId })),
        setFilterName: (name: string) => setFilterDraft((current) => ({ ...current, name })),
        setFilterPlateNumber: (plateNumber: string) =>
            setFilterDraft((current) => ({ ...current, plateNumber })),
        submittedIdentityId,
        submittedName,
        submittedPlateNumber,
    };
}

export type ParkingLotEventManager = ReturnType<typeof useParkingLotEventManager>;
