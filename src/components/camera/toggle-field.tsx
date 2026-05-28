import { cn } from "./camera-utils";

export function ToggleField({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-sm font-semibold text-slate-800">{label}</span>
            <button
                type="button"
                aria-pressed={checked}
                onClick={() => onChange(!checked)}
                className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    checked ? "bg-[#4369ee]" : "bg-slate-300",
                )}
            >
                <span
                    className={cn(
                        "absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                        checked ? "translate-x-5" : "translate-x-0",
                    )}
                />
            </button>
        </label>
    );
}
