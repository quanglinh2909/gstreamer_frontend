import {
    CartesianGrid,
    Legend,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { formatClock, formatDateTime } from "./dashboard-utils";

export interface ChartSeries {
    key: string;
    name: string;
    color: string;
}

interface ChartPoint {
    ts: number;
    [key: string]: number;
}

export function MetricChart({
    title,
    subtitle,
    data,
    series,
    unit,
    domain,
}: {
    title: string;
    subtitle?: string;
    data: ChartPoint[];
    series: ChartSeries[];
    unit?: string;
    domain?: [number | "auto", number | "auto"];
}) {
    const hasData = data.length > 0;

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                    {subtitle ? (
                        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
                    ) : null}
                </div>
                <span className="text-xs text-slate-400">{data.length} điểm</span>
            </div>

            <div className="mt-3 h-56">
                {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" vertical={false} />
                            <XAxis
                                dataKey="ts"
                                tickFormatter={formatClock}
                                tick={{ fontSize: 11, fill: "#94a3b8" }}
                                tickLine={false}
                                axisLine={{ stroke: "#e2e8f0" }}
                                minTickGap={40}
                            />
                            <YAxis
                                domain={domain ?? ["auto", "auto"]}
                                tick={{ fontSize: 11, fill: "#94a3b8" }}
                                tickLine={false}
                                axisLine={false}
                                width={44}
                                unit={unit}
                            />
                            <Tooltip
                                labelFormatter={(ts) => formatDateTime(Number(ts))}
                                formatter={(value, name) => [
                                    `${Number(value).toFixed(1)}${unit ?? ""}`,
                                    name,
                                ]}
                                contentStyle={{
                                    borderRadius: 8,
                                    border: "1px solid #e2e8f0",
                                    fontSize: 12,
                                }}
                            />
                            {series.length > 1 ? (
                                <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
                            ) : null}
                            {series.map((item) => (
                                <Line
                                    key={item.key}
                                    type="monotone"
                                    dataKey={item.key}
                                    name={item.name}
                                    stroke={item.color}
                                    strokeWidth={2}
                                    dot={false}
                                    isAnimationActive={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                        Không có dữ liệu trong khoảng thời gian này.
                    </div>
                )}
            </div>
        </div>
    );
}
