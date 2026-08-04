import { useCallback, useEffect, useMemo, useState } from "react";
import { HardDrive, Loader2, Save } from "lucide-react";

// UI cấu hình tự dọn dung lượng — gọi backend Python qua proxy /api/backend.
// Mô hình "giữ tối thiểu N GB trống": xem storage-auto-cleanup.
const BASE = "/api/backend/storage-policy";

interface Policy {
    enabled: boolean;
    min_free_gb: number;
    target_free_gb: number;
    w_record: number;
    w_event_face: number;
    w_event_plate: number;
    w_parking_lot_event: number;
    w_restricted_area: number;
    w_event_mask: number;
    w_motion_event: number;
}
interface StatusResp {
    disk: {
        total_bytes: number;
        used_bytes: number;
        free_bytes: number;
        used_percent: number;
        free_gb: number;
    };
    categories: Record<string, { size_bytes: number; size_gb: number }>;
    policy: Policy;
}

const CATEGORIES: { key: keyof Policy; sizeKey: string; label: string }[] = [
    { key: "w_record", sizeKey: "record", label: "Bản ghi (video)" },
    { key: "w_event_face", sizeKey: "event_face", label: "Sự kiện khuôn mặt" },
    { key: "w_event_plate", sizeKey: "event_plate", label: "Sự kiện biển số" },
    { key: "w_parking_lot_event", sizeKey: "parking_lot_event", label: "Sự kiện bãi xe" },
    { key: "w_restricted_area", sizeKey: "restricted_area", label: "Vùng cấm" },
    { key: "w_event_mask", sizeKey: "event_mask", label: "Sự kiện khẩu trang" },
    { key: "w_motion_event", sizeKey: "motion_event", label: "Sự kiện chuyển động" },
];

function gb(bytes: number): string {
    return (bytes / 1024 ** 3).toFixed(2) + " GB";
}

export function StorageSettings() {
    const [status, setStatus] = useState<StatusResp | null>(null);
    const [form, setForm] = useState<Policy | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState("");

    const loadStatus = useCallback(async (withForm: boolean) => {
        try {
            const res = await fetch(`${BASE}/status`);
            if (!res.ok) throw new Error("HTTP " + res.status);
            const data = (await res.json()) as StatusResp;
            setStatus(data);
            if (withForm && data.policy) setForm(data.policy);
            setError("");
        } catch (e) {
            setError("Không tải được trạng thái: " + (e as Error).message);
        }
    }, []);

    useEffect(() => {
        void loadStatus(true);
        // Làm mới số liệu đĩa mỗi 10s (không đụng form đang chỉnh).
        const t = window.setInterval(() => void loadStatus(false), 10_000);
        return () => window.clearInterval(t);
    }, [loadStatus]);

    const weightSum = useMemo(() => {
        if (!form) return 0;
        return CATEGORIES.reduce((s, c) => s + (Number(form[c.key]) || 0), 0);
    }, [form]);

    const set = (k: keyof Policy, v: number | boolean) =>
        setForm((f) => (f ? { ...f, [k]: v } : f));

    const save = async () => {
        if (!form) return;
        setSaving(true);
        setSaved(false);
        setError("");
        try {
            const res = await fetch(BASE, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error("HTTP " + res.status);
            await loadStatus(true);
            setSaved(true);
            window.setTimeout(() => setSaved(false), 2500);
        } catch (e) {
            setError("Lưu thất bại: " + (e as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const disk = status?.disk;
    // Vị trí (% ngang) mà chỗ trống = min_free_gb: used = total - min_free.
    const thresholdPct = useMemo(() => {
        if (!disk || !form) return null;
        const totalGb = disk.total_bytes / 1024 ** 3;
        return Math.min(100, Math.max(0, ((totalGb - form.min_free_gb) / totalGb) * 100));
    }, [disk, form]);

    const maxCatBytes = useMemo(() => {
        if (!status) return 1;
        return Math.max(1, ...Object.values(status.categories).map((c) => c.size_bytes));
    }, [status]);

    const danger = disk ? disk.free_gb < (form?.min_free_gb ?? 10) : false;

    return (
        <main className="h-full overflow-y-auto bg-slate-50">
            <div className="mx-auto flex min-h-full max-w-[900px] flex-col gap-3 px-3 py-3 sm:gap-5 sm:px-6 sm:py-5">
                {/* Tiêu đề đã nằm ở thanh trên của MainLayout trên điện thoại. */}
                <header className="hidden md:block">
                    <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-950">
                        <HardDrive size={22} /> Lưu trữ & tự dọn
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Luôn giữ tối thiểu một lượng dung lượng trống; khi thiếu, tự xoá
                        dữ liệu cũ nhất theo tỷ trọng của từng loại.
                    </p>
                </header>

                {error ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
                        {error}
                    </div>
                ) : null}

                {/* Thẻ dung lượng đĩa */}
                <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
                    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                        <h2 className="text-sm font-semibold text-slate-800">Ổ đĩa</h2>
                        {disk ? (
                            <span className="text-sm text-slate-500">
                                Đã dùng {disk.used_percent}% ·{" "}
                                <span className={danger ? "font-semibold text-rose-600" : "font-semibold text-emerald-600"}>
                                    còn trống {disk.free_gb} GB
                                </span>{" "}
                                / {gb(disk.total_bytes)}
                            </span>
                        ) : (
                            <Loader2 size={16} className="animate-spin text-slate-400" />
                        )}
                    </div>
                    {disk ? (
                        <div className="relative h-6 w-full overflow-hidden rounded-md bg-slate-100">
                            <div
                                className={`h-full ${danger ? "bg-rose-500" : "bg-sky-500"}`}
                                style={{ width: `${disk.used_percent}%` }}
                            />
                            {thresholdPct != null ? (
                                <div
                                    className="absolute inset-y-0 w-0.5 bg-amber-500"
                                    style={{ left: `${thresholdPct}%` }}
                                    title="Ngưỡng bắt đầu dọn"
                                />
                            ) : null}
                        </div>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-400">
                        Vạch cam = mốc bắt đầu dọn (khi trống tụt xuống {form?.min_free_gb ?? "…"} GB).
                    </p>
                </section>

                {/* Kích thước từng loại */}
                <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
                    <h2 className="mb-3 text-sm font-semibold text-slate-800">
                        Dung lượng đang chiếm theo loại
                    </h2>
                    <div className="flex flex-col gap-2.5">
                        {CATEGORIES.map((c) => {
                            const size = status?.categories?.[c.sizeKey]?.size_bytes ?? 0;
                            return (
                                <div key={c.sizeKey} className="flex items-center gap-2 sm:gap-3">
                                    <span className="w-28 shrink-0 truncate text-xs text-slate-600 sm:w-40 sm:text-sm">{c.label}</span>
                                    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className="h-full rounded-full bg-slate-400"
                                            style={{ width: `${(size / maxCatBytes) * 100}%` }}
                                        />
                                    </div>
                                    <span className="w-16 shrink-0 text-right font-mono text-[11px] text-slate-500 sm:w-20 sm:text-xs">
                                        {gb(size)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Cấu hình */}
                {form ? (
                    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-800">Cấu hình tự dọn</h2>
                            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={form.enabled}
                                    onChange={(e) => set("enabled", e.target.checked)}
                                    className="h-4 w-4 accent-sky-500"
                                />
                                Bật tự dọn
                            </label>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                            <label className="flex flex-col gap-1 text-sm">
                                <span className="text-slate-600">Giữ trống tối thiểu (GB)</span>
                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={form.min_free_gb}
                                    onChange={(e) => set("min_free_gb", Number(e.target.value))}
                                    className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-sky-500"
                                />
                                <span className="text-xs text-slate-400">Trống tụt dưới mức này thì bắt đầu xoá.</span>
                            </label>
                            <label className="flex flex-col gap-1 text-sm">
                                <span className="text-slate-600">Dọn tới khi trống đạt (GB)</span>
                                <input
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={form.target_free_gb}
                                    onChange={(e) => set("target_free_gb", Number(e.target.value))}
                                    className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-sky-500"
                                />
                                <span className="text-xs text-slate-400">Nên lớn hơn mức tối thiểu vài GB.</span>
                            </label>
                        </div>

                        <div className="mt-5">
                            <div className="mb-2 flex items-baseline justify-between">
                                <span className="text-sm font-medium text-slate-700">
                                    Tỷ trọng giữ lại mỗi loại (%)
                                </span>
                                <span className={`text-xs ${Math.round(weightSum) === 100 ? "text-slate-400" : "text-amber-600"}`}>
                                    Tổng: {weightSum}% {Math.round(weightSum) !== 100 ? "(nên = 100)" : ""}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                {CATEGORIES.map((c) => (
                                    <label key={c.key} className="flex flex-col gap-1 text-sm">
                                        <span className="text-slate-600">{c.label}</span>
                                        <input
                                            type="number"
                                            min={0}
                                            step={1}
                                            value={form[c.key] as number}
                                            onChange={(e) => set(c.key, Number(e.target.value))}
                                            className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-sky-500"
                                        />
                                    </label>
                                ))}
                            </div>
                            <p className="mt-2 text-xs text-slate-400">
                                Loại tỷ trọng cao được giữ nhiều hơn khi phải xoá. Không cần đúng 100 —
                                hệ thống tự chuẩn hoá theo tỷ lệ.
                            </p>
                        </div>

                        <div className="mt-5 flex items-center gap-3">
                            <button
                                type="button"
                                onClick={save}
                                disabled={saving}
                                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-60"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Lưu cấu hình
                            </button>
                            {saved ? <span className="text-sm font-medium text-emerald-600">Đã lưu ✓</span> : null}
                        </div>
                    </section>
                ) : (
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <Loader2 size={16} className="animate-spin" /> Đang tải cấu hình…
                    </div>
                )}
            </div>
        </main>
    );
}
