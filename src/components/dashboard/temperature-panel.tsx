import type { CpuTemperatureSample } from "@/interface/system-metrics";
import { cn, formatTemp } from "./dashboard-utils";

const SENSORS: Array<{ key: keyof CpuTemperatureSample; label: string }> = [
    { key: "soc_c", label: "SoC" },
    { key: "bigcore0_c", label: "Big core 0" },
    { key: "bigcore1_c", label: "Big core 1" },
    { key: "littlecore_c", label: "Little core" },
    { key: "center_c", label: "Center" },
    { key: "gpu_c", label: "GPU" },
    { key: "npu_c", label: "NPU" },
];

function toneFor(value: number): string {
    if (value >= 80) {
        return "text-rose-600";
    }
    if (value >= 65) {
        return "text-amber-600";
    }
    return "text-slate-900";
}

export function TemperaturePanel({
    temperature,
}: {
    temperature: CpuTemperatureSample | null;
}) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Nhiệt độ</h2>
            <p className="mt-0.5 text-xs text-slate-500">Cảm biến nhiệt hiện tại</p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SENSORS.map((sensor) => {
                    const value = temperature ? Number(temperature[sensor.key]) : undefined;
                    return (
                        <div
                            key={sensor.key}
                            className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                        >
                            <p className="text-xs text-slate-500">{sensor.label}</p>
                            <p
                                className={cn(
                                    "mt-0.5 text-lg font-semibold tabular-nums",
                                    value !== undefined ? toneFor(value) : "text-slate-400",
                                )}
                            >
                                {formatTemp(value)}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
