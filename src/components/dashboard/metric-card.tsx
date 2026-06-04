import type { LucideIcon } from "lucide-react";
import { cn } from "./dashboard-utils";

export function MetricCard({
    label,
    value,
    subtitle,
    icon: Icon,
    tone,
    percent,
}: {
    label: string;
    value: string;
    subtitle?: string;
    icon: LucideIcon;
    tone: string;
    /** When provided (0-100) a thin progress bar is rendered below the value. */
    percent?: number;
}) {
    const clamped =
        percent === undefined ? undefined : Math.max(0, Math.min(100, percent));

    return (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                        {label}
                    </p>
                    <p className="mt-1 truncate text-2xl font-semibold text-slate-950">{value}</p>
                    {subtitle ? (
                        <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
                    ) : null}
                </div>
                <div
                    className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                        tone,
                    )}
                >
                    <Icon size={18} strokeWidth={2.4} aria-hidden="true" />
                </div>
            </div>

            {clamped !== undefined ? (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all",
                            clamped >= 85
                                ? "bg-rose-500"
                                : clamped >= 60
                                  ? "bg-amber-500"
                                  : "bg-[#4369ee]",
                        )}
                        style={{ width: `${clamped}%` }}
                    />
                </div>
            ) : null}
        </div>
    );
}
