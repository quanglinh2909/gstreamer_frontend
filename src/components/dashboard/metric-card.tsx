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
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:px-4 sm:py-3">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="min-w-0">
                    {/* truncate + title: nhãn dài như "NHẬN DIỆN BIỂN SỐ" ở khổ
                        điện thoại xuống 2 dòng làm thẻ cao thêm ~16px mỗi cái. */}
                    <p
                        title={label}
                        className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 sm:text-xs"
                    >
                        {label}
                    </p>
                    <p className="mt-0.5 truncate text-xl font-semibold text-slate-950 sm:mt-1 sm:text-2xl">
                        {value}
                    </p>
                    {subtitle ? (
                        <p className="mt-0.5 truncate text-[11px] text-slate-500 sm:text-xs">
                            {subtitle}
                        </p>
                    ) : null}
                </div>
                <div
                    className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9",
                        tone,
                    )}
                >
                    <Icon size={18} strokeWidth={2.4} aria-hidden="true" />
                </div>
            </div>

            {clamped !== undefined ? (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 sm:mt-3">
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
