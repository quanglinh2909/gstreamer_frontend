import { useEffect, useRef, useState } from "react";
import { cameraApi } from "@/backend-api/camera-api";
import { faceRecognitionApi } from "@/backend-api/face-recognition-api";
import { plateRecognitionApi } from "@/backend-api/plate-recognition-api";
import { restrictedAreaApi } from "@/backend-api/restricted-area-api";
import type { ICameraResponse } from "@/interface/camera";
import type {
    RecognitionEvent,
    RecognitionEventPage,
    RecognitionEventTab,
} from "@/interface/recognition-event";
import { getEventSocketUrl, incrementEventPageTotal, mergeLiveEvents } from "@/lib/event-view-model";
import { useEventSocketStore } from "@/stores/use-event-socket-store";

export const EVENT_PAGE_SIZE = 20;

type PagesByTab = Record<RecognitionEventTab, number>;
type PendingEventsByTab = Record<RecognitionEventTab, number>;

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

function asCameraList(data: unknown): ICameraResponse[] {
    return Array.isArray(data) ? data : [];
}

function getEmptyEventPage(page = 1): RecognitionEventPage {
    return {
        items: [],
        total: 0,
        page,
        size: EVENT_PAGE_SIZE,
        pages: 0,
    };
}

function getNonNegativeNumber(value: unknown, fallback: number) {
    const numericValue = Number(value);

    return Number.isFinite(numericValue) ? Math.max(0, numericValue) : fallback;
}

function asEventPage(data: unknown, fallbackPage: number): RecognitionEventPage {
    if (!data || typeof data !== "object") {
        return getEmptyEventPage(fallbackPage);
    }

    const page = data as Partial<RecognitionEventPage>;

    return {
        items: Array.isArray(page.items) ? (page.items as RecognitionEvent[]) : [],
        total: getNonNegativeNumber(page.total, 0),
        page: Math.max(1, getNonNegativeNumber(page.page, fallbackPage)),
        size: Math.max(1, getNonNegativeNumber(page.size, EVENT_PAGE_SIZE)),
        pages: getNonNegativeNumber(page.pages, 0),
    };
}

export function useEventManager(websocketOrigin = "") {
    const socketStatus = useEventSocketStore((state) => state.status);
    const socketErrorMessage = useEventSocketStore((state) => state.errorMessage);
    const receivedEvents = useEventSocketStore((state) => state.receivedEvents);
    const connectSocket = useEventSocketStore((state) => state.connect);
    const disconnectSocket = useEventSocketStore((state) => state.disconnect);
    const [cameras, setCameras] = useState<ICameraResponse[]>([]);
    const [isCameraLoading, setIsCameraLoading] = useState(true);
    const [cameraErrorMessage, setCameraErrorMessage] = useState("");
    const [activeTab, setActiveTab] = useState<RecognitionEventTab>("face");
    const [selectedCameraId, setSelectedCameraId] = useState("");
    const [pagesByTab, setPagesByTab] = useState<PagesByTab>({ plate: 1, face: 1, restricted: 1 });
    const [eventPage, setEventPage] = useState<RecognitionEventPage>(() => getEmptyEventPage());
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedEvent, setSelectedEvent] = useState<RecognitionEvent | null>(null);
    const [pendingEventsByTab, setPendingEventsByTab] = useState<PendingEventsByTab>({ plate: 0, face: 0, restricted: 0 });
    const handledSequenceRef = useRef(0);
    const currentPage = pagesByTab[activeTab];
    const pendingEvents = pendingEventsByTab[activeTab];

    useEffect(() => {
        let isCancelled = false;

        const loadCameras = async () => {
            setIsCameraLoading(true);
            setCameraErrorMessage("");

            try {
                const { data } = await cameraApi.getCameras(100, 0);

                if (!isCancelled) {
                    setCameras(asCameraList(data));
                }
            } catch (error) {
                if (!isCancelled) {
                    setCameraErrorMessage(getErrorMessage(error, "Không thể tải danh sách camera."));
                }
            } finally {
                if (!isCancelled) {
                    setIsCameraLoading(false);
                }
            }
        };

        const timer = window.setTimeout(() => {
            void loadCameras();
        }, 0);

        return () => {
            isCancelled = true;
            window.clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        const socketUrl = getEventSocketUrl(websocketOrigin, activeTab);

        connectSocket(socketUrl, activeTab);

        return () => disconnectSocket();
    }, [activeTab, connectSocket, disconnectSocket, websocketOrigin]);

    useEffect(() => {
        let isCancelled = false;

        const loadEvents = async () => {
            const socketSequenceAtRequestStart = useEventSocketStore.getState().messageSequence;

            setIsLoading(true);
            setErrorMessage("");
            setEventPage(getEmptyEventPage(currentPage));

            const params = {
                page: currentPage,
                size: EVENT_PAGE_SIZE,
                ...(selectedCameraId ? { camera_id: selectedCameraId } : {}),
            };

            try {
                const { data } =
                    activeTab === "plate"
                        ? await plateRecognitionApi.events(params)
                        : activeTab === "restricted"
                            ? await restrictedAreaApi.events(params)
                            : await faceRecognitionApi.events(params);

                if (!isCancelled) {
                    let nextPage = asEventPage(data, currentPage);

                    const bufferedEvents = useEventSocketStore
                        .getState()
                        .receivedEvents.filter(
                            (receivedEvent) =>
                                receivedEvent.tab === activeTab &&
                                receivedEvent.sequence > socketSequenceAtRequestStart &&
                                receivedEvent.sequence <= handledSequenceRef.current &&
                                (!selectedCameraId || receivedEvent.event.camera_id === selectedCameraId),
                        )
                        .map((receivedEvent) => receivedEvent.event);

                    nextPage =
                        currentPage === 1
                            ? mergeLiveEvents(nextPage, bufferedEvents, selectedCameraId)
                            : incrementEventPageTotal(nextPage, bufferedEvents.length);

                    if (currentPage === 1) {
                        setPendingEventsByTab((currentPendingEvents) => ({
                            ...currentPendingEvents,
                            [activeTab]: 0,
                        }));
                    }

                    setEventPage(nextPage);
                }
            } catch (error) {
                if (!isCancelled) {
                    setErrorMessage(getErrorMessage(error, "Không thể tải sự kiện nhận diện."));
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
    }, [activeTab, currentPage, refreshKey, selectedCameraId]);

    useEffect(() => {
        const unhandledEvents = receivedEvents.filter(
            (receivedEvent) => receivedEvent.sequence > handledSequenceRef.current,
        );

        if (unhandledEvents.length === 0) {
            return;
        }

        handledSequenceRef.current = Math.max(
            ...unhandledEvents.map((receivedEvent) => receivedEvent.sequence),
        );

        const matchingEvents = unhandledEvents
            .filter(
                (receivedEvent) =>
                    receivedEvent.tab === activeTab &&
                    (!selectedCameraId || receivedEvent.event.camera_id === selectedCameraId),
            )
            .map((receivedEvent) => receivedEvent.event);

        if (matchingEvents.length === 0) {
            return;
        }

        if (currentPage === 1) {
            setEventPage((currentEventPage) =>
                mergeLiveEvents(currentEventPage, matchingEvents, selectedCameraId),
            );
            return;
        }

        setEventPage((currentEventPage) => incrementEventPageTotal(currentEventPage, matchingEvents.length));
        setPendingEventsByTab((currentPendingEvents) => ({
            ...currentPendingEvents,
            [activeTab]: currentPendingEvents[activeTab] + matchingEvents.length,
        }));
    }, [activeTab, currentPage, receivedEvents, selectedCameraId]);

    const handleSelectTab = (tab: RecognitionEventTab) => {
        setActiveTab(tab);
        setSelectedEvent(null);
    };

    const handleSelectCamera = (cameraId: string) => {
        setSelectedCameraId(cameraId);
        setPagesByTab({ plate: 1, face: 1, restricted: 1 });
        setPendingEventsByTab({ plate: 0, face: 0, restricted: 0 });
        setSelectedEvent(null);
    };

    const handlePageChange = (page: number) => {
        setPagesByTab((currentPages) => ({
            ...currentPages,
            [activeTab]: Math.max(1, page),
        }));
    };

    const refreshEvents = () => {
        setRefreshKey((currentKey) => currentKey + 1);
    };

    const showLatestEvents = () => {
        setPendingEventsByTab((currentPendingEvents) => ({
            ...currentPendingEvents,
            [activeTab]: 0,
        }));

        if (pagesByTab[activeTab] === 1) {
            setRefreshKey((currentKey) => currentKey + 1);
            return;
        }

        setPagesByTab((currentPages) => ({ ...currentPages, [activeTab]: 1 }));
    };

    return {
        activeTab,
        cameraErrorMessage,
        cameras,
        closeEventPreview: () => setSelectedEvent(null),
        currentPage,
        errorMessage,
        eventPage,
        handlePageChange,
        handleSelectCamera,
        handleSelectTab,
        isCameraLoading,
        isLoading,
        openEventPreview: setSelectedEvent,
        pendingEvents,
        refreshEvents,
        selectedCameraId,
        selectedEvent,
        showLatestEvents,
        socketErrorMessage,
        socketStatus,
    };
}

export type EventManager = ReturnType<typeof useEventManager>;
