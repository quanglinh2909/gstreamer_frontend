import { RefreshCw, RotateCcw } from "lucide-react";
import { cn } from "./dashboard-utils";

export function DateRangeControl({
    fromInput,
    toInput,
    hasRange,
    isLoading,
    onFromChange,
    onToChange,
    onApply,
    onReset,
    onRefresh,
}: {
    fromInput: string;
    toInput: string;
    hasRange: boolean;
    isLoading: boolean;
    onFromChange: (value: string) => void;
    onToChange: (value: string) => void;
    onApply: () => void;
    onReset: () => void;
    onRefresh: () => void;
}) {
    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500">Từ ngày</span>
                <input
                    type="datetime-local"
                    value={fromInput}
                    onChange={(event) => onFromChange(event.target.value)}
                    className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#4369ee] focus:bg-white"
                />
            </label>

            <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-500">Đến ngày</span>
                <input
                    type="datetime-local"
                    value={toInput}
                    onChange={(event) => onToChange(event.target.value)}
                    className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#4369ee] focus:bg-white"
                />
            </label>

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={onApply}
                    disabled={isLoading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#4369ee] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3156d4] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    Áp dụng
                </button>

                <button
                    type="button"
                    onClick={onReset}
                    disabled={isLoading || !hasRange}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <RotateCcw size={16} aria-hidden="true" />
                    Đặt lại
                </button>

                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <RefreshCw
                        size={16}
                        className={cn(isLoading && "animate-spin")}
                        aria-hidden="true"
                    />
                    Làm mới
                </button>
            </div>
        </div>
    );
}
