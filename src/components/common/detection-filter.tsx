import { useEffect, useRef, useState } from "react";
import { ChevronDown, ScanLine } from "lucide-react";
import { ALL_TABS, cn, MOTION_META, TYPE_META, type FeedTab } from "@/lib/event-feed-shared";

// Nút "Khung AI" dạng CHIA ĐÔI: nửa trái bật/tắt lớp phủ, nửa phải mở menu
// chọn LOẠI khung muốn vẽ (mặt / biển số / vùng cấm / khẩu trang). Tách đôi để
// bật-tắt nhanh vẫn là một cú bấm, còn lọc loại thì nằm gọn trong menu.
//
// Dùng chung cho tường Live View (compact, chỉ icon) và trang Xem lại (có chữ).
export function DetectionFilter({
    enabled,
    onEnabledChange,
    types,
    onTypesChange,
    zonesVisible,
    onZonesVisibleChange,
    motionVisible,
    onMotionVisibleChange,
    disabled = false,
    disabledHint,
    compact = false,
}: {
    enabled: boolean;
    onEnabledChange: (next: boolean) => void;
    types: Set<FeedTab>;
    onTypesChange: (next: Set<FeedTab>) => void;
    zonesVisible: boolean;
    onZonesVisibleChange: (next: boolean) => void;
    // Chuyển động là chip RIÊNG, không phải một FeedTab (xem MOTION_META): nó
    // do engine dò chứ không phải AI, và không có ai_type để lọc chung. Bỏ hai
    // prop này thì chip không hiện — trang Xem lại chưa dùng tới.
    motionVisible?: boolean;
    onMotionVisibleChange?: (next: boolean) => void;
    disabled?: boolean;
    disabledHint?: string;
    compact?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    // Bấm ra ngoài / Esc thì đóng menu.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    useEffect(() => {
        if (disabled) setOpen(false);
    }, [disabled]);

    const toggleType = (tab: FeedTab) => {
        const next = new Set(types);
        if (next.has(tab)) next.delete(tab);
        else next.add(tab);
        onTypesChange(next);
    };

    // Bật lớp phủ mà không chọn loại nào thì chẳng vẽ gì — nói rõ ra thay vì
    // để người dùng tưởng hỏng.
    const noneSelected = enabled && types.size === 0;
    const activeLook = enabled && !disabled;
    const title = disabled
        ? disabledHint || "Không khả dụng"
        : enabled
            ? "Ẩn khung nhận diện"
            : "Hiện khung nhận diện";

    return (
        <div ref={rootRef} className="relative flex items-center">
            <div
                className={cn(
                    "flex items-stretch overflow-hidden rounded-md border transition-colors",
                    disabled
                        ? "border-slate-800 text-slate-600"
                        : activeLook
                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                            : "border-slate-600 text-slate-300 hover:border-slate-500 hover:text-slate-100",
                )}
            >
                <button
                    type="button"
                    onClick={() => onEnabledChange(!enabled)}
                    disabled={disabled}
                    title={title}
                    aria-pressed={enabled}
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2 text-xs font-medium",
                        compact ? "h-8" : "py-1",
                        disabled ? "cursor-not-allowed" : "",
                    )}
                >
                    <ScanLine size={14} />
                    {compact ? null : "Khung AI"}
                </button>
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    disabled={disabled}
                    title="Chọn loại khung hiển thị"
                    aria-haspopup="menu"
                    aria-expanded={open}
                    className={cn(
                        "inline-flex items-center border-l px-1",
                        compact ? "h-8" : "",
                        disabled
                            ? "cursor-not-allowed border-slate-800"
                            : activeLook
                                ? "border-emerald-500/50 hover:bg-emerald-500/20"
                                : "border-slate-700 hover:bg-slate-800",
                    )}
                >
                    <ChevronDown size={13} />
                </button>
            </div>

            {open ? (
                <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-lg border border-slate-700 bg-slate-900 p-2.5 shadow-xl"
                >
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Loại khung hiển thị
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {ALL_TABS.map((tab) => {
                            const on = types.has(tab);
                            return (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => toggleType(tab)}
                                    className={cn(
                                        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                                        on
                                            ? TYPE_META[tab].chip
                                            : "border-slate-700 text-slate-500 hover:text-slate-300",
                                    )}
                                >
                                    {TYPE_META[tab].label}
                                </button>
                            );
                        })}
                        {onMotionVisibleChange ? (
                            <button
                                type="button"
                                onClick={() => onMotionVisibleChange(!motionVisible)}
                                title="Ô đang động — tím là trong vùng đã vẽ, đỏ là ngoài vùng"
                                className={cn(
                                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                                    motionVisible
                                        ? MOTION_META.chip
                                        : "border-slate-700 text-slate-500 hover:text-slate-300",
                                )}
                            >
                                {MOTION_META.label}
                            </button>
                        ) : null}
                    </div>
                    {onMotionVisibleChange && motionVisible ? (
                        <div className="mt-2 space-y-1 text-[11px] leading-4 text-slate-500">
                            <p className="flex items-center gap-1.5">
                                <span
                                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                                    style={{ backgroundColor: "#a78bfa66", border: "1px solid #a78bfa" }}
                                />
                                Động TRONG vùng đã vẽ
                            </p>
                            <p className="flex items-center gap-1.5">
                                <span
                                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                                    style={{ backgroundColor: "#f8717155", border: "1px solid #f87171" }}
                                />
                                Động ngoài mọi vùng
                            </p>
                            <p>Vẽ mọi chuyển động, to nhỏ đều hiện — không đợi đủ ngưỡng sinh sự kiện.</p>
                        </div>
                    ) : null}
                    <div className="mt-2.5 flex items-center gap-3 border-t border-slate-800 pt-2 text-[11px]">
                        <button
                            type="button"
                            onClick={() => onTypesChange(new Set(ALL_TABS))}
                            className="text-slate-400 transition-colors hover:text-slate-200"
                        >
                            Chọn tất cả
                        </button>
                        <button
                            type="button"
                            onClick={() => onTypesChange(new Set())}
                            className="text-slate-400 transition-colors hover:text-slate-200"
                        >
                            Bỏ chọn hết
                        </button>
                    </div>

                    {/* Vùng giám sát cấu hình trong AI Config. Job chạy toàn
                        khung thì không có vùng nào để vẽ. */}
                    <label className="mt-2 flex cursor-pointer items-center gap-2 border-t border-slate-800 pt-2 text-xs text-slate-300">
                        <input
                            type="checkbox"
                            checked={zonesVisible}
                            onChange={(e) => onZonesVisibleChange(e.target.checked)}
                            className="h-3.5 w-3.5 accent-sky-500"
                        />
                        Hiện vùng giám sát
                    </label>
                    {noneSelected ? (
                        <p className="mt-2 text-[11px] text-amber-400">
                            Chưa chọn loại nào — sẽ không vẽ khung nào cả.
                        </p>
                    ) : null}
                    {!enabled ? (
                        <p className="mt-2 text-[11px] text-slate-500">
                            Lớp phủ đang tắt — bấm nút bên trái để bật.
                        </p>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
