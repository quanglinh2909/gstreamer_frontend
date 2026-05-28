
export function TextField({
    label,
    value,
    onChange,
    type = "text",
    required = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: "text" | "number";
    required?: boolean;
}) {
    return (
        <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                {label}
            </span>
            <input
                type={type}
                required={required}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#4369ee]"
            />
        </label>
    );
}