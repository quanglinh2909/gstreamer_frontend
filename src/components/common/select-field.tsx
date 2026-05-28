import { ChevronDown } from "lucide-react";

export function SelectField({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: Array<{ label: string; value: string }>;
    onChange: (value: string) => void;
}) {
    return (
        <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-sm font-semibold text-slate-800">{label}</span>
            <div className="relative">
                <select
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="h-6 cursor-pointer appearance-none rounded-md border border-slate-200 bg-white pl-2.5 pr-7 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-[#4369ee]"
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <ChevronDown
                    size={13}
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
                    aria-hidden="true"
                />
            </div>
        </label>
    );
}
