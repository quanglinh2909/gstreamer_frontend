import type { LucideIcon } from "lucide-react";
import { cn } from "./camera-utils";

export function CameraStatCard({
    label,
    value,
    icon: Icon,
    tone,
}: {
    label: string;
    value: number;
    icon: LucideIcon;
    tone: string;
}) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm sm:px-4 sm:py-3">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
                <div className="min-w-0">
                    <p className="truncate text-[10px] font-medium uppercase tracking-[0.08em] text-slate-500 sm:text-xs">
                        {label}
                    </p>
                    <p className="mt-0.5 text-lg font-semibold text-slate-950 sm:mt-1 sm:text-2xl">
                        {value}
                    </p>
                </div>
                {/* Sáu ô thống kê xếp 3 cột trên điện thoại thì chỉ còn ~115px
                    mỗi ô — giấu icon để nhường chỗ cho con số. */}
                <div
                    className={cn(
                        "hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:flex",
                        tone,
                    )}
                >
                    <Icon size={18} strokeWidth={2.4} aria-hidden="true" />
                </div>
            </div>
        </div>
    );
}
