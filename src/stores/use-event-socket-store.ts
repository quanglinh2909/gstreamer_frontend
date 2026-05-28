import { create } from "zustand";
import type {
    FaceRecognitionEvent,
    PlateRecognitionEvent,
    RecognitionEvent,
    RecognitionEventBase,
    RecognitionEventTab,
    RestrictedAreaEvent,
} from "@/interface/recognition-event";

export type EventSocketStatus = "idle" | "connecting" | "connected" | "reconnecting" | "error";

export interface ReceivedRecognitionEvent {
    sequence: number;
    tab: RecognitionEventTab;
    event: RecognitionEvent;
}

interface EventSocketState {
    status: EventSocketStatus;
    errorMessage: string;
    messageSequence: number;
    receivedEvents: ReceivedRecognitionEvent[];
    connect: (url: string, tab: RecognitionEventTab) => void;
    disconnect: () => void;
}

const MAX_BUFFERED_EVENTS = 40;
const MAX_RECONNECT_DELAY = 5000;

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let currentUrl = "";
let currentTab: RecognitionEventTab | null = null;
let shouldReconnect = false;

function hasRecognitionEventBase(value: unknown): value is RecognitionEventBase {
    if (!value || typeof value !== "object") {
        return false;
    }

    const event = value as Partial<RecognitionEventBase>;

    return (
        typeof event.id === "number" &&
        Number.isFinite(event.id) &&
        typeof event.camera_id === "string" &&
        typeof event.confidence === "number" &&
        Number.isFinite(event.confidence) &&
        typeof event.timestamp === "number" &&
        Number.isFinite(event.timestamp) &&
        typeof event.image_full === "string" &&
        typeof event.image_crop === "string"
    );
}

function isFaceRecognitionEvent(value: unknown): value is FaceRecognitionEvent {
    if (!hasRecognitionEventBase(value)) {
        return false;
    }

    const event = value as Partial<FaceRecognitionEvent>;

    return event.name === undefined || event.name === null || typeof event.name === "string";
}

function isPlateRecognitionEvent(value: unknown): value is PlateRecognitionEvent {
    return hasRecognitionEventBase(value) && typeof (value as Partial<PlateRecognitionEvent>).plate_number === "string";
}

function isRestrictedAreaEvent(value: unknown): value is RestrictedAreaEvent {
    return hasRecognitionEventBase(value);
}

function parseRecognitionEvent(message: unknown, tab: RecognitionEventTab): RecognitionEvent | null {
    if (typeof message !== "string") {
        return null;
    }

    try {
        const event: unknown = JSON.parse(message);

        if (tab === "face") {
            return isFaceRecognitionEvent(event) ? event : null;
        }

        if (tab === "restricted") {
            return isRestrictedAreaEvent(event) ? event : null;
        }

        return isPlateRecognitionEvent(event) ? event : null;
    } catch {
        return null;
    }
}

function clearReconnectTimer() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }
}

function stopSocket() {
    shouldReconnect = false;
    clearReconnectTimer();

    const activeSocket = socket;
    socket = null;
    activeSocket?.close();
}

function openSocket(url: string, tab: RecognitionEventTab, reconnecting: boolean) {
    if (typeof window === "undefined") {
        return;
    }

    useEventSocketStore.setState({
        errorMessage: "",
        status: reconnecting ? "reconnecting" : "connecting",
    });

    let nextSocket: WebSocket;

    try {
        nextSocket = new WebSocket(url);
    } catch {
        shouldReconnect = false;
        useEventSocketStore.setState({
            errorMessage: "Địa chỉ WebSocket không hợp lệ.",
            status: "error",
        });
        return;
    }

    socket = nextSocket;

    nextSocket.onopen = () => {
        if (socket !== nextSocket) {
            return;
        }

        reconnectAttempts = 0;
        useEventSocketStore.setState({ errorMessage: "", status: "connected" });
    };

    nextSocket.onmessage = (message) => {
        if (socket !== nextSocket) {
            return;
        }

        const event = parseRecognitionEvent(message.data, tab);

        if (!event) {
            return;
        }

        useEventSocketStore.setState((state) => {
            if (state.receivedEvents.some((receivedEvent) =>
                receivedEvent.tab === tab && receivedEvent.event.id === event.id
            )) {
                return state;
            }

            const sequence = state.messageSequence + 1;

            return {
                messageSequence: sequence,
                receivedEvents: [{ event, sequence, tab }, ...state.receivedEvents].slice(0, MAX_BUFFERED_EVENTS),
            };
        });
    };

    nextSocket.onerror = () => {
        if (socket === nextSocket) {
            useEventSocketStore.setState({
                errorMessage: "Mất kết nối dữ liệu realtime.",
                status: "error",
            });
        }
    };

    nextSocket.onclose = () => {
        if (socket !== nextSocket) {
            return;
        }

        socket = null;
        const reconnectTab = currentTab;

        if (!shouldReconnect || !currentUrl || !reconnectTab) {
            useEventSocketStore.setState({ status: "idle" });
            return;
        }

        reconnectAttempts += 1;
        const delay = Math.min(1000 * 2 ** (reconnectAttempts - 1), MAX_RECONNECT_DELAY);

        useEventSocketStore.setState({ status: "reconnecting" });
        reconnectTimer = setTimeout(() => openSocket(currentUrl, reconnectTab, true), delay);
    };
}

export const useEventSocketStore = create<EventSocketState>((set) => ({
    status: "idle",
    errorMessage: "",
    messageSequence: 0,
    receivedEvents: [],
    connect: (url, tab) => {
        const nextUrl = url.trim();

        if (!nextUrl) {
            stopSocket();
            currentUrl = "";
            currentTab = null;
            set({ errorMessage: "Chưa cấu hình WebSocket.", status: "error" });
            return;
        }

        if (
            shouldReconnect &&
            currentUrl === nextUrl &&
            currentTab === tab &&
            socket &&
            socket.readyState < WebSocket.CLOSING
        ) {
            return;
        }

        stopSocket();
        currentUrl = nextUrl;
        currentTab = tab;
        shouldReconnect = true;
        reconnectAttempts = 0;
        set({ errorMessage: "", receivedEvents: [], status: "connecting" });
        openSocket(nextUrl, tab, false);
    },
    disconnect: () => {
        stopSocket();
        currentUrl = "";
        currentTab = null;
        set({ errorMessage: "", receivedEvents: [], status: "idle" });
    },
}));
