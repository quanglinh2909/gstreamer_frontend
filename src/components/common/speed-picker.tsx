import { cn } from "@/lib/event-feed-shared";

// Chọn tốc độ tua: x1 … x64, bấm thẳng vào nấc mình muốn.
//
// Trước đây là thanh kéo theo thang mũ 2 (vị trí 0..6 -> 2^vị-trí). Kéo thì
// phải nhắm, dễ trượt sang nấc bên cạnh, và không nhìn ra được có những nấc
// nào nếu chưa kéo thử. Bảy nút bấm hiện hết lựa chọn và đi thẳng một cú bấm.
//
// Từ x4 engine chỉ gửi keyframe nên càng nhanh càng nhẹ mạng (engine kẹp tối
// đa x64) — đó là lý do thang chỉ dừng ở 64.
const SPEEDS = [1, 2, 4, 8, 16, 32, 64] as const;

export function SpeedPicker({
    value,
    onChange,
    variant = "overlay",
    className,
}: {
    value: number;
    onChange: (rate: number) => void;
    // "overlay" = đè lên video (nền tối, chữ trắng); "toolbar" = thanh công cụ.
    variant?: "overlay" | "toolbar";
    className?: string;
}) {
    const overlay = variant === "overlay";
    return (
        <div
            role="group"
            aria-label="Tốc độ phát"
            className={cn(
                "inline-flex items-center overflow-hidden rounded-md border",
                overlay ? "border-white/25 bg-black/40" : "border-slate-700 bg-slate-900",
                className,
            )}
        >
            {SPEEDS.map((s) => {
                const on = value === s;
                return (
                    <button
                        key={s}
                        type="button"
                        onClick={() => onChange(s)}
                        aria-pressed={on}
                        title={`Tua x${s}`}
                        className={cn(
                            "px-1.5 py-0.5 font-mono text-[11px] font-semibold transition-colors",
                            on
                                ? "bg-sky-500 text-white"
                                : overlay
                                  ? "text-white/70 hover:bg-white/15 hover:text-white"
                                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
                        )}
                    >
                        x{s}
                    </button>
                );
            })}
        </div>
    );
}
