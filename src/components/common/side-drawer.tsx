// Cột bên hoá ngăn kéo trên điện thoại.
//
// Vấn đề: các trang Xem trực tiếp / Xem lại / Thử model dựng bố cục ba cột
// bằng chiều rộng CỐ ĐỊNH (w-72 = 288px, w-96 = 384px). Trên màn 390px thì
// riêng hai cột bên đã hơn cả màn hình, khung video bị đẩy hẳn ra ngoài —
// chụp thật ở 390px thấy trang Xem trực tiếp không còn một pixel video nào.
//
// Cách sửa dùng chung: từ md trở lên giữ nguyên cột tĩnh như cũ; dưới md thì
// cột thành lớp phủ trượt vào, và khung nội dung chiếm trọn bề ngang.
//
// CỐ Ý làm bằng CSS thuần chứ không bằng matchMedia trong JS: hook đo bề rộng
// luôn trả giá trị desktop ở lần render đầu (server không có window), nên mọi
// trang sẽ nháy bố cục desktop rồi mới nhảy về mobile.

import type { ReactNode } from "react";

function cn(...classes: Array<string | false | undefined>) {
    return classes.filter(Boolean).join(" ");
}

/**
 * Lớp CSS cho một <aside> vừa là ngăn kéo (mobile) vừa là cột (desktop).
 *
 * @param side       mép trượt vào trên mobile
 * @param open       ngăn kéo đang mở (bỏ qua từ md trở lên)
 * @param widthClass chiều rộng khi là cột, PHẢI kèm tiền tố md: —
 *                   ví dụ "md:w-72". Trên mobile luôn là 85% bề ngang.
 */
export function drawerClass(
    side: "left" | "right",
    open: boolean,
    widthClass: string,
) {
    return cn(
        "fixed inset-y-0 z-40 w-[85%] max-w-sm transition-transform duration-200 ease-out",
        // md: trả về đúng hành vi cũ — cột tĩnh, không transform, không hiệu ứng.
        "md:static md:z-auto md:max-w-none md:translate-x-0 md:transition-none",
        widthClass,
        side === "left" ? "left-0" : "right-0",
        open ? "translate-x-0" : side === "left" ? "-translate-x-full" : "translate-x-full",
    );
}

/** Nền mờ bấm để đóng. Chỉ tồn tại trên mobile. */
export function DrawerBackdrop({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    return (
        <div
            // Không unmount khi đóng mà chỉ tắt tương tác: giữ nút trong cây thì
            // hiệu ứng mờ dần chạy được cả hai chiều.
            onClick={onClose}
            aria-hidden="true"
            className={cn(
                "fixed inset-0 z-30 bg-slate-950/60 transition-opacity duration-200 md:hidden",
                open ? "opacity-100" : "pointer-events-none opacity-0",
            )}
        />
    );
}

/** Nút mở ngăn kéo, chỉ hiện trên mobile. */
export function DrawerToggle({
    label,
    onClick,
    children,
    className,
}: {
    label: string;
    onClick: () => void;
    children: ReactNode;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 md:hidden",
                className,
            )}
        >
            {children}
        </button>
    );
}
