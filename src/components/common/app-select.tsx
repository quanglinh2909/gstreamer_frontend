import type { ReactNode, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

function classNames(...classes: Array<string | false | undefined>) {
    return classes.filter(Boolean).join(" ");
}

// Mũi tên mặc định của <select> do trình duyệt/hệ điều hành vẽ nên mỗi máy một
// kiểu và không ăn nhập với bộ icon lucide dùng khắp giao diện. Cách chữa quen
// thuộc là tắt appearance rồi tự vẽ ChevronDown đè lên — select-field.tsx đã
// làm vậy từ trước, component này gom lại để mọi select cỡ lớn dùng chung.
//
// pointer-events-none trên icon là bắt buộc: thiếu nó thì bấm trúng mũi tên sẽ
// không mở được danh sách.
const BASE_CLASS =
    "w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-9 text-sm text-slate-900 outline-none transition-colors focus:border-[#4369ee] disabled:cursor-default disabled:opacity-60";

export function AppSelect({
    children,
    className,
    wrapperClassName,
    ...selectProps
}: SelectHTMLAttributes<HTMLSelectElement> & {
    children: ReactNode;
    wrapperClassName?: string;
}) {
    return (
        <div className={classNames("relative", wrapperClassName)}>
            <select {...selectProps} className={classNames(BASE_CLASS, className)}>
                {children}
            </select>
            <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
            />
        </div>
    );
}
