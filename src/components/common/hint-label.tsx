import { type ReactNode, useState } from "react";
import { HelpCircle } from "lucide-react";

// Bong bóng mở lên trên hay xuống dưới. Mặc định "top" cho gọn mắt, nhưng ô
// ĐẦU TIÊN trong một vùng cuộn phải dùng "bottom": bong bóng nằm ngoài vùng
// cuộn sẽ bị cắt mất chứ không tràn ra ngoài được (overflow-y-auto tạo vùng
// cắt kể cả khi chưa có thanh cuộn).
export type HintPlacement = "top" | "bottom";

function classNames(...classes: Array<string | false | undefined>) {
    return classes.filter(Boolean).join(" ");
}

/** Nhãn của một ô nhập, kèm dấu "?" mở mô tả chi tiết. */
export function HintLabel({
    label,
    hint,
    placement = "top",
    labelClassName,
    className,
}: {
    label: string;
    hint: ReactNode;
    placement?: HintPlacement;
    labelClassName?: string;
    className?: string;
}) {
    // Hover để xem nhanh, bấm để ghim lại — màn hình cảm ứng không có hover
    // nên chỉ dựa vào hover thì mô tả không bao giờ đọc được.
    const [isPinned, setIsPinned] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const isOpen = isPinned || isHovered;

    return (
        // relative đặt ở CẢ hàng nhãn chứ không ở riêng nút "?": bong bóng neo
        // theo mép trái của hàng và rộng bằng đúng hàng, nên nhãn dài mấy cũng
        // không đẩy nó tràn ngang ra ngoài khung.
        //
        // items-start chứ không items-center: nhãn dài xuống 2 dòng thì dấu "?"
        // phải nằm ngang dòng ĐẦU, không trôi xuống giữa khối chữ. Nhãn một
        // dòng cao đúng bằng nút (16px) nên hai cách canh cho kết quả như nhau.
        <span className={classNames("relative flex items-start gap-1.5", className)}>
            <span className={labelClassName}>{label}</span>
            <button
                type="button"
                aria-label={`Giải thích: ${label}`}
                aria-expanded={isOpen}
                onClick={() => setIsPinned((current) => !current)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onBlur={() => setIsPinned(false)}
                className={classNames(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors",
                    isOpen ? "text-[#4369ee]" : "text-slate-400 hover:text-slate-600",
                )}
            >
                <HelpCircle size={14} aria-hidden="true" />
            </button>

            {isOpen ? (
                <span
                    role="tooltip"
                    className={classNames(
                        "absolute left-0 z-10 w-full rounded-lg border border-slate-200 bg-white p-3 text-xs font-normal normal-case leading-5 tracking-normal text-slate-600 shadow-lg",
                        placement === "top" ? "bottom-full mb-2" : "top-full mt-2",
                    )}
                >
                    {hint}
                </span>
            ) : null}
        </span>
    );
}
