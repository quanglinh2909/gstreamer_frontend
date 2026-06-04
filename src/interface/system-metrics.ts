export interface MetricSampleBase {
    id: number;
    ts: number;
}

export interface CpuUsageSample extends MetricSampleBase {
    usage_percent: number;
    per_core: number[];
}

export interface CpuTemperatureSample extends MetricSampleBase {
    soc_c: number;
    bigcore0_c: number;
    bigcore1_c: number;
    littlecore_c: number;
    center_c: number;
    gpu_c: number;
    npu_c: number;
}

export interface MemorySample extends MetricSampleBase {
    total_bytes: number;
    used_bytes: number;
    available_bytes: number;
    percent: number;
}

export interface DiskSample extends MetricSampleBase {
    total_bytes: number;
    used_bytes: number;
    free_bytes: number;
    percent: number;
}

export interface LoadAvgSample extends MetricSampleBase {
    load1: number;
    load5: number;
    load15: number;
    cpu_count: number;
}

export interface AcceleratorSample extends MetricSampleBase {
    load_percent: number;
    core0: number;
    core1: number;
    core2: number;
}

export interface SystemMetricsSnapshot {
    cpu_usage: CpuUsageSample | null;
    cpu_temperature: CpuTemperatureSample | null;
    memory: MemorySample | null;
    disk: DiskSample | null;
    load_avg: LoadAvgSample | null;
    npu: AcceleratorSample | null;
    rga: AcceleratorSample | null;
}

export interface SystemMetricsHistory {
    cpu_usage: CpuUsageSample[];
    cpu_temperature: CpuTemperatureSample[];
    memory: MemorySample[];
    disk: DiskSample[];
    load_avg: LoadAvgSample[];
    npu: AcceleratorSample[];
    rga: AcceleratorSample[];
}

export interface SystemMetricsResponse {
    current: SystemMetricsSnapshot | null;
    history: SystemMetricsHistory;
}

/**
 * from_ts / to_ts are Epoch seconds. The backend only returns records with
 * ts >= from_ts. When omitted, the backend returns its most recent window.
 */
export interface SystemMetricsQuery {
    limit?: number;
    from_ts?: number;
    to_ts?: number;
}

export interface AiEnabledCount {
    total: number;
    by_type: Record<string, number>;
}

/**
 * Realtime push from ws://<origin>/system-metrics. Unlike the REST samples,
 * the sub-objects carry no `id`/`ts` of their own — only a single top-level
 * `ts` (Epoch seconds) applies to the whole frame.
 */
export interface SystemMetricsSocketMessage {
    type: string;
    ts: number;
    cpu_usage: Pick<CpuUsageSample, "usage_percent" | "per_core">;
    cpu_temperature: Omit<CpuTemperatureSample, "id" | "ts">;
    memory: Omit<MemorySample, "id" | "ts">;
    disk: Omit<DiskSample, "id" | "ts">;
    load_avg: Omit<LoadAvgSample, "id" | "ts">;
    npu: Omit<AcceleratorSample, "id" | "ts">;
    rga: Omit<AcceleratorSample, "id" | "ts">;
}
