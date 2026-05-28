export function InfoPill({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0 rounded-md bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                {label}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-800">{value || "N/A"}</p>
        </div>
    );
}
