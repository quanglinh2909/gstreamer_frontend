import { useMemo } from "react";
import {
    AlertTriangle,
    Car,
    Cpu,
    Gauge,
    HardDrive,
    LoaderCircle,
    Layers,
    MemoryStick,
    ScanFace,
    ScanLine,
    ShieldAlert,
    Thermometer,
    Zap,
} from "lucide-react";
import type { DashboardManager, SocketStatus } from "@/hooks/use-dashboard-manager";
import { DateRangeControl } from "./date-range-control";
import {
    cn,
    formatBytes,
    formatPercent,
    formatTemp,
    mergeByTs,
    sortByTsAsc,
} from "./dashboard-utils";
import { MetricCard } from "./metric-card";
import { MetricChart } from "./metric-chart";
import { PerCoreUsage } from "./per-core-usage";
import { TemperaturePanel } from "./temperature-panel";

const AI_TYPE_META: Record<string, { label: string; icon: typeof Car; tone: string }> = {
    plate_recognition: { label: "Nhận diện biển số", icon: Car, tone: "bg-blue-50 text-blue-700" },
    face_recognition: { label: "Nhận diện khuôn mặt", icon: ScanFace, tone: "bg-violet-50 text-violet-700" },
    restricted_area: { label: "Vùng hạn chế", icon: ShieldAlert, tone: "bg-amber-50 text-amber-700" },
};

const SOCKET_META: Record<SocketStatus, { label: string; dot: string; text: string }> = {
    idle: { label: "Offline", dot: "bg-slate-400", text: "text-slate-500" },
    connecting: { label: "Đang kết nối", dot: "bg-amber-400 animate-pulse", text: "text-amber-600" },
    connected: { label: "Live", dot: "bg-emerald-500 animate-pulse", text: "text-emerald-600" },
    reconnecting: { label: "Kết nối lại", dot: "bg-amber-400 animate-pulse", text: "text-amber-600" },
    error: { label: "Mất kết nối", dot: "bg-rose-500", text: "text-rose-600" },
};

function SocketStatusBadge({ status }: { status: SocketStatus }) {
    const meta = SOCKET_META[status];
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold",
                meta.text,
            )}
        >
            <span className={cn("h-2 w-2 rounded-full", meta.dot)} aria-hidden="true" />
            {meta.label}
        </span>
    );
}

function aiTypeMeta(key: string) {
    return (
        AI_TYPE_META[key] ?? {
            label: key,
            icon: ScanLine,
            tone: "bg-slate-100 text-slate-700",
        }
    );
}

export function Dashboard({ manager }: { manager: DashboardManager }) {
    const { metrics, aiCount } = manager;
    const current = metrics?.current ?? null;
    const history = metrics?.history;

    const cpuData = useMemo(
        () =>
            history
                ? sortByTsAsc(history.cpu_usage).map((s) => ({
                    ts: s.ts,
                    usage_percent: s.usage_percent,
                }))
                : [],
        [history],
    );

    const memData = useMemo(
        () =>
            history
                ? sortByTsAsc(history.memory).map((s) => ({ ts: s.ts, percent: s.percent }))
                : [],
        [history],
    );

    const diskData = useMemo(
        () =>
            history
                ? sortByTsAsc(history.disk).map((s) => ({ ts: s.ts, percent: s.percent }))
                : [],
        [history],
    );

    const tempData = useMemo(
        () =>
            history
                ? sortByTsAsc(history.cpu_temperature).map((s) => ({
                    ts: s.ts,
                    soc_c: s.soc_c,
                    gpu_c: s.gpu_c,
                    npu_c: s.npu_c,
                }))
                : [],
        [history],
    );

    const acceleratorData = useMemo(
        () =>
            history
                ? mergeByTs(history.npu, history.rga, (npu, rga) => ({
                    npu: npu?.load_percent ?? 0,
                    rga: rga?.load_percent ?? 0,
                }))
                : [],
        [history],
    );

    const loadData = useMemo(
        () =>
            history
                ? sortByTsAsc(history.load_avg).map((s) => ({
                    ts: s.ts,
                    load1: s.load1,
                    load5: s.load5,
                    load15: s.load15,
                }))
                : [],
        [history],
    );

    const isInitialLoading = manager.isLoading && !metrics;

    return (
        <main className="h-full overflow-y-auto bg-slate-50">
            <div className="mx-auto flex min-h-full max-w-[1600px] flex-col gap-5 px-6 py-5">
                <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div>

                        <h1 className="mt-1 text-2xl font-semibold text-slate-950">
                            Tổng quan hệ thống
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {manager.lastUpdated
                                ? `Cập nhật lúc ${manager.lastUpdated.toLocaleTimeString()}`
                                : "Thống kê AI đang bật và thông số phần cứng"}
                        </p>
                    </div>

                    <DateRangeControl
                        fromInput={manager.fromInput}
                        toInput={manager.toInput}
                        hasRange={manager.hasRange}
                        isLoading={manager.isLoading}
                        onFromChange={manager.setFromInput}
                        onToChange={manager.setToInput}
                        onApply={manager.applyRange}
                        onReset={manager.resetRange}
                        onRefresh={manager.refresh}
                    />
                </header>

                {manager.errorMessage ? (
                    <section className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
                        <div className="min-w-0">
                            <p className="font-semibold">Không tải được dữ liệu</p>
                            <p className="mt-1 break-words">{manager.errorMessage}</p>
                        </div>
                    </section>
                ) : null}

                {isInitialLoading ? (
                    <section className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-20 text-slate-500">
                        <div className="flex flex-col items-center gap-3 text-center">
                            <LoaderCircle className="animate-spin text-[#4369ee]" size={34} aria-hidden="true" />
                            <p className="text-sm font-semibold">Đang tải dữ liệu hệ thống...</p>
                        </div>
                    </section>
                ) : null}

                {!isInitialLoading ? (
                    <>
                        {/* AI đang bật */}
                        <section className="flex flex-col gap-3">
                            <h2 className="text-sm font-semibold text-slate-700">AI đang bật</h2>
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                <MetricCard
                                    label="Tổng AI bật"
                                    value={String(aiCount?.total ?? 0)}
                                    subtitle="Số luồng AI đang hoạt động"
                                    icon={ScanLine}
                                    tone="bg-emerald-50 text-emerald-700"
                                />
                                {Object.entries(aiCount?.by_type ?? {}).map(([key, count]) => {
                                    const meta = aiTypeMeta(key);
                                    return (
                                        <MetricCard
                                            key={key}
                                            label={meta.label}
                                            value={String(count)}
                                            icon={meta.icon}
                                            tone={meta.tone}
                                        />
                                    );
                                })}
                            </div>
                        </section>

                        {/* Thông số hiện tại */}
                        <section className="flex flex-col gap-3">
                            <h2 className="text-sm font-semibold text-slate-700">Thông số hiện tại</h2>
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-7">
                                <MetricCard
                                    label="CPU"
                                    value={formatPercent(current?.cpu_usage?.usage_percent)}
                                    subtitle={`${current?.cpu_usage?.per_core.length ?? 0} nhân`}
                                    icon={Cpu}
                                    tone="bg-blue-50 text-blue-700"
                                    percent={current?.cpu_usage?.usage_percent}
                                />
                                <MetricCard
                                    label="RAM"
                                    value={formatPercent(current?.memory?.percent)}
                                    subtitle={
                                        current?.memory
                                            ? `${formatBytes(current.memory.used_bytes)} / ${formatBytes(current.memory.total_bytes)}`
                                            : undefined
                                    }
                                    icon={MemoryStick}
                                    tone="bg-indigo-50 text-indigo-700"
                                    percent={current?.memory?.percent}
                                />
                                <MetricCard
                                    label="Ổ cứng"
                                    value={formatPercent(current?.disk?.percent)}
                                    subtitle={
                                        current?.disk
                                            ? `${formatBytes(current.disk.used_bytes)} / ${formatBytes(current.disk.total_bytes)}`
                                            : undefined
                                    }
                                    icon={HardDrive}
                                    tone="bg-teal-50 text-teal-700"
                                    percent={current?.disk?.percent}
                                />
                                <MetricCard
                                    label="NPU"
                                    value={formatPercent(current?.npu?.load_percent)}
                                    subtitle={
                                        current?.npu
                                            ? `core ${current.npu.core0}/${current.npu.core1}/${current.npu.core2}`
                                            : undefined
                                    }
                                    icon={Zap}
                                    tone="bg-fuchsia-50 text-fuchsia-700"
                                    percent={current?.npu?.load_percent}
                                />
                                <MetricCard
                                    label="RGA"
                                    value={formatPercent(current?.rga?.load_percent)}
                                    subtitle={
                                        current?.rga
                                            ? `core ${current.rga.core0}/${current.rga.core1}/${current.rga.core2}`
                                            : undefined
                                    }
                                    icon={Layers}
                                    tone="bg-cyan-50 text-cyan-700"
                                    percent={current?.rga?.load_percent}
                                />
                                <MetricCard
                                    label="Tải hệ thống"
                                    value={current?.load_avg ? current.load_avg.load1.toFixed(2) : "—"}
                                    subtitle={
                                        current?.load_avg
                                            ? `5m ${current.load_avg.load5.toFixed(2)} · 15m ${current.load_avg.load15.toFixed(2)}`
                                            : undefined
                                    }
                                    icon={Gauge}
                                    tone="bg-amber-50 text-amber-700"
                                />
                                <MetricCard
                                    label="Nhiệt SoC"
                                    value={formatTemp(current?.cpu_temperature?.soc_c)}
                                    subtitle={
                                        current?.cpu_temperature
                                            ? `GPU ${formatTemp(current.cpu_temperature.gpu_c)} · NPU ${formatTemp(current.cpu_temperature.npu_c)}`
                                            : undefined
                                    }
                                    icon={Thermometer}
                                    tone="bg-rose-50 text-rose-700"
                                />
                            </div>
                        </section>

                        {/* Chi tiết hiện tại */}
                        <section className="grid gap-4 lg:grid-cols-2">
                            <PerCoreUsage perCore={current?.cpu_usage?.per_core ?? []} />
                            <TemperaturePanel temperature={current?.cpu_temperature ?? null} />
                        </section>

                        {/* Biểu đồ lịch sử */}
                        <section className="grid gap-4 xl:grid-cols-2">
                            <MetricChart
                                title="Mức sử dụng CPU"
                                subtitle="usage_percent theo thời gian"
                                data={cpuData}
                                unit="%"
                                domain={[0, 100]}
                                series={[{ key: "usage_percent", name: "CPU", color: "#4369ee" }]}
                            />
                            <MetricChart
                                title="Bộ nhớ sử dụng"
                                subtitle="percent theo thời gian"
                                data={memData}
                                unit="%"
                                domain={[0, 100]}
                                series={[{ key: "percent", name: "RAM", color: "#6366f1" }]}
                            />
                            <MetricChart
                                title="Ổ cứng sử dụng"
                                subtitle="percent theo thời gian"
                                data={diskData}
                                unit="%"
                                domain={[0, 100]}
                                series={[{ key: "percent", name: "Disk", color: "#0d9488" }]}
                            />
                            <MetricChart
                                title="Nhiệt độ"
                                subtitle="SoC / GPU / NPU theo thời gian"
                                data={tempData}
                                unit="°C"
                                series={[
                                    { key: "soc_c", name: "SoC", color: "#ef4444" },
                                    { key: "gpu_c", name: "GPU", color: "#f59e0b" },
                                    { key: "npu_c", name: "NPU", color: "#8b5cf6" },
                                ]}
                            />
                            <MetricChart
                                title="Tải NPU / RGA"
                                subtitle="load_percent theo thời gian"
                                data={acceleratorData}
                                unit="%"
                                domain={[0, "auto"]}
                                series={[
                                    { key: "npu", name: "NPU", color: "#d946ef" },
                                    { key: "rga", name: "RGA", color: "#06b6d4" },
                                ]}
                            />
                            <MetricChart
                                title="Tải trung bình (load average)"
                                subtitle="1 / 5 / 15 phút"
                                data={loadData}
                                series={[
                                    { key: "load1", name: "1m", color: "#4369ee" },
                                    { key: "load5", name: "5m", color: "#10b981" },
                                    { key: "load15", name: "15m", color: "#f59e0b" },
                                ]}
                            />
                        </section>
                    </>
                ) : null}
            </div>
        </main>
    );
}
