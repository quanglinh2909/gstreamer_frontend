import { cn } from "./dashboard-utils";

export function PerCoreUsage({ perCore }: { perCore: number[] }) {
    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">CPU theo từng nhân</h2>
            <p className="mt-0.5 text-xs text-slate-500">Mức sử dụng hiện tại của mỗi core (%)</p>

            <div className="mt-4 flex flex-col gap-2.5">
                {perCore.length === 0 ? (
                    <p className="text-sm text-slate-400">Không có dữ liệu.</p>
                ) : (
                    perCore.map((usage, index) => {
                        const clamped = Math.max(0, Math.min(100, usage));
                        return (
                            <div key={index} className="flex items-center gap-3">
                                <span className="w-12 shrink-0 text-xs font-medium text-slate-500">
                                    Core {index}
                                </span>
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className={cn(
                                            "h-full rounded-full",
                                            clamped >= 85
                                                ? "bg-rose-500"
                                                : clamped >= 60
                                                  ? "bg-amber-500"
                                                  : "bg-[#4369ee]",
                                        )}
                                        style={{ width: `${clamped}%` }}
                                    />
                                </div>
                                <span className="w-12 shrink-0 text-right text-xs tabular-nums text-slate-700">
                                    {usage.toFixed(1)}%
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
