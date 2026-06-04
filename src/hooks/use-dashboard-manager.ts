import { useCallback, useEffect, useRef, useState } from "react";
import { systemMetricsApi } from "@/backend-api/system-metrics-api";
import type {
    AcceleratorSample,
    AiEnabledCount,
    CpuTemperatureSample,
    DiskSample,
    LoadAvgSample,
    MemorySample,
    MetricSampleBase,
    SystemMetricsHistory,
    SystemMetricsQuery,
    SystemMetricsResponse,
    SystemMetricsSnapshot,
    SystemMetricsSocketMessage,
    UptimeSample,
} from "@/interface/system-metrics";

export type SocketStatus =
    | "idle"
    | "connecting"
    | "connected"
    | "reconnecting"
    | "error";

// Keep realtime history bounded to the same window the REST endpoint returns.
const MAX_HISTORY = 500;
const MAX_RECONNECT_DELAY = 5000;

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error && error.message ? error.message : fallback;
}

// "YYYY-MM-DDTHH:mm" (datetime-local value) parsed as local time -> Epoch sec.
function inputToEpoch(value: string): number | undefined {
    if (!value) {
        return undefined;
    }

    const ms = new Date(value).getTime();

    return Number.isFinite(ms) ? Math.floor(ms / 1000) : undefined;
}

function emptyHistory(): SystemMetricsHistory {
    return {
        cpu_usage: [],
        cpu_temperature: [],
        memory: [],
        disk: [],
        load_avg: [],
        npu: [],
        rga: [],
    };
}

// Prepend a fresh sample (history is newest-first), replacing any existing
// sample that shares the same ts, and cap the series length.
function pushSample<T extends MetricSampleBase>(series: T[] | undefined | null, sample: T): T[] {
    const safe = Array.isArray(series) ? series : [];
    const head = safe[0]?.ts === sample.ts ? safe.slice(1) : safe;
    return [sample, ...head].slice(0, MAX_HISTORY);
}

function parseSocketMessage(raw: unknown): SystemMetricsSocketMessage | null {
    if (typeof raw !== "string") {
        return null;
    }

    try {
        const value = JSON.parse(raw) as Partial<SystemMetricsSocketMessage>;

        if (value?.type !== "system_metrics" || typeof value.ts !== "number") {
            return null;
        }

        if (!value.cpu_usage || !value.memory || !value.load_avg) {
            return null;
        }

        return value as SystemMetricsSocketMessage;
    } catch {
        return null;
    }
}

// A socket frame carries one top-level ts; stamp every sub-sample with it.
function messageToSnapshot(message: SystemMetricsSocketMessage): SystemMetricsSnapshot {
    const base: MetricSampleBase = { id: message.ts, ts: message.ts };

    const memory: MemorySample = {
        ...base,
        total_bytes: message.memory.total_bytes,
        used_bytes: message.memory.used_bytes,
        available_bytes:
            message.memory.available_bytes ??
            Math.max(0, message.memory.total_bytes - message.memory.used_bytes),
        percent: message.memory.percent,
    };

    const disk: DiskSample | null = message.disk ? { ...base, ...message.disk } : null;

    const cpuTemperature: CpuTemperatureSample | null = message.cpu_temperature
        ? { ...base, ...message.cpu_temperature }
        : null;

    const npu: AcceleratorSample | null = message.npu ? { ...base, ...message.npu } : null;
    const rga: AcceleratorSample | null = message.rga ? { ...base, ...message.rga } : null;
    const loadAvg: LoadAvgSample = { ...base, ...message.load_avg };
    const uptime: UptimeSample | null = message.uptime ? { ...message.uptime } : null;

    return {
        cpu_usage: { ...base, ...message.cpu_usage },
        cpu_temperature: cpuTemperature,
        memory,
        disk,
        load_avg: loadAvg,
        npu,
        rga,
        uptime,
    };
}

// Append a live snapshot to history (only used in live mode, no custom range).
function appendSnapshot(
    history: SystemMetricsHistory,
    snapshot: SystemMetricsSnapshot,
): SystemMetricsHistory {
    return {
        cpu_usage: snapshot.cpu_usage
            ? pushSample(history.cpu_usage, snapshot.cpu_usage)
            : history.cpu_usage,
        cpu_temperature: snapshot.cpu_temperature
            ? pushSample(history.cpu_temperature, snapshot.cpu_temperature)
            : history.cpu_temperature,
        memory: snapshot.memory ? pushSample(history.memory, snapshot.memory) : history.memory,
        disk: snapshot.disk ? pushSample(history.disk, snapshot.disk) : history.disk,
        load_avg: snapshot.load_avg
            ? pushSample(history.load_avg, snapshot.load_avg)
            : history.load_avg,
        npu: snapshot.npu ? pushSample(history.npu, snapshot.npu) : history.npu,
        rga: snapshot.rga ? pushSample(history.rga, snapshot.rga) : history.rga,
    };
}

export interface DashboardManager {
    metrics: SystemMetricsResponse | null;
    aiCount: AiEnabledCount | null;
    isLoading: boolean;
    errorMessage: string;
    lastUpdated: Date | null;
    socketStatus: SocketStatus;
    fromInput: string;
    toInput: string;
    hasRange: boolean;
    setFromInput: (value: string) => void;
    setToInput: (value: string) => void;
    applyRange: () => void;
    resetRange: () => void;
    refresh: () => void;
}

export function useDashboardManager(websocketOrigin = ""): DashboardManager {
    const [metrics, setMetrics] = useState<SystemMetricsResponse | null>(null);
    const [aiCount, setAiCount] = useState<AiEnabledCount | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [socketStatus, setSocketStatus] = useState<SocketStatus>("idle");
    const [fromInput, setFromInput] = useState("");
    const [toInput, setToInput] = useState("");

    const hasRange = Boolean(fromInput || toInput);

    // Live frames append to charts only when no custom range is active; keep
    // the flag in a ref so the long-lived socket handler reads the latest value.
    const liveModeRef = useRef(!hasRange);

    useEffect(() => {
        liveModeRef.current = !hasRange;
    }, [hasRange]);

    const load = useCallback(async (query: SystemMetricsQuery) => {
        setIsLoading(true);
        setErrorMessage("");

        try {
            const [metricsResponse, aiResponse] = await Promise.all([
                systemMetricsApi.metrics(query),
                systemMetricsApi.aiEnabledCount(),
            ]);

            setMetrics(metricsResponse.data);
            setAiCount(aiResponse.data);
            setLastUpdated(new Date());
        } catch (error) {
            setErrorMessage(getErrorMessage(error, "Không tải được dữ liệu hệ thống."));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        // Default on entry: no range, backend returns its most recent window.
        // Deferred to a timer so the effect doesn't call setState synchronously.
        const timer = window.setTimeout(() => {
            void load({});
        }, 0);

        return () => window.clearTimeout(timer);
    }, [load]);

    const handleSocketMessage = useCallback((raw: unknown) => {
        const message = parseSocketMessage(raw);

        if (!message) {
            return;
        }

        const snapshot = messageToSnapshot(message);

        setMetrics((prev) => {
            const previous = prev ?? { current: null, history: emptyHistory() };
            return {
                current: snapshot,
                history: liveModeRef.current
                    ? appendSnapshot(previous.history, snapshot)
                    : previous.history,
            };
        });
        setLastUpdated(new Date());
    }, []);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        const baseUrl = websocketOrigin.trim().replace(/\/+$/, "");
        const url = `${baseUrl}/system-metrics`;
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

            socket.onmessage = (event) => handleSocketMessage(event.data);

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
    }, [websocketOrigin, handleSocketMessage]);

    const applyRange = useCallback(() => {
        void load({
            from_ts: inputToEpoch(fromInput),
            to_ts: inputToEpoch(toInput),
        });
    }, [fromInput, toInput, load]);

    const resetRange = useCallback(() => {
        setFromInput("");
        setToInput("");
        void load({});
    }, [load]);

    const refresh = useCallback(() => {
        void load({
            from_ts: inputToEpoch(fromInput),
            to_ts: inputToEpoch(toInput),
        });
    }, [fromInput, toInput, load]);

    return {
        metrics,
        aiCount,
        isLoading,
        errorMessage,
        lastUpdated,
        socketStatus,
        fromInput,
        toInput,
        hasRange,
        setFromInput,
        setToInput,
        applyRange,
        resetRange,
        refresh,
    };
}
