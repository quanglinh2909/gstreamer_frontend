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
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-500">
                        {label}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">{value}</p>
                </div>
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tone)}>
                    <Icon size={18} strokeWidth={2.4} aria-hidden="true" />
                </div>
            </div>
        </div>
    );
}
