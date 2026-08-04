import type { LucideIcon } from "lucide-react";

// Các mảnh dùng chung cho thanh trên của MainLayout ở khổ điện thoại.
//
// Gom lại một chỗ vì 6 trang đều cần đúng ba thứ: chấm trạng thái, số đếm và
// vài nút icon. Mỗi trang tự chế thì mỗi trang một kiểu — đã bị đúng vậy ở bản
// đầu (nút đen đặc, số trần không đơn vị).

export type TopBarTone = "ok" | "warn" | "bad" | "idle";

const TONE_DOT: Record<TopBarTone, string> = {
    ok: "bg-emerald-500",
    warn: "bg-amber-400",
    bad: "bg-rose-500",
    idle: "bg-slate-300",
};

/**
 * Chấm trạng thái. Đặt TRƯỚC tiêu đề (prop `mobileStatus` của MainLayout) chứ
 * không lẫn vào cụm nút bên phải — nó là trạng thái của trang, không phải thao
 * tác. Chữ đầy đủ nằm ở title/aria-label.
 */
export function TopBarDot({ tone, label }: { tone: TopBarTone; label: string }) {
    return (
        <span
            role="status"
            title={label}
            aria-label={label}
            className={`h-2 w-2 shrink-0 rounded-full ${TONE_DOT[tone]}`}
        />
    );
}

/** Số đếm kèm đơn vị, chữ nhạt — là thông tin, không phải nút. */
export function TopBarCount({ value, unit }: { value: number; unit: string }) {
    return (
        <span className="whitespace-nowrap text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{value}</span> {unit}
        </span>
    );
}

/**
 * Nút icon. `tone="primary"` chỉ tô nhạt (blue-50) chứ không phải khối đặc —
 * thanh trên cao 44px, một khối màu đậm 32px trong đó nhìn rất nặng.
 */
export function TopBarButton({
    icon: Icon,
    label,
    onClick,
    disabled,
    tone = "ghost",
    spinning,
}: {
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    tone?: "ghost" | "primary";
    spinning?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${
                tone === "primary"
                    ? "bg-blue-50 text-[#4369ee] hover:bg-blue-100"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            }`}
        >
            <Icon size={17} aria-hidden="true" className={spinning ? "animate-spin" : undefined} />
        </button>
    );
}
