import { Stack } from "@mui/material";
import { Menu } from "lucide-react";
import Leftmenu from "../leftmenu/leftmenu";
import { useAppMenuStore } from "@/stores/use-app-menu-store";

export function MainLayout({
    children,
    // Thanh ngang mỏng chứa nút mở menu, CHỈ hiện trên mobile.
    //
    // Mặc định bật cho các trang thường (danh sách, biểu mẫu) vì chúng không có
    // sẵn chỗ nào để đặt nút. Các trang video (Xem trực tiếp, Xem lại) tự tắt
    // nó đi và nhét nút vào chính thanh công cụ của mình — thêm một thanh 40px
    // nữa là cắt mất chừng ấy chiều cao khung hình, thứ đang thiếu nhất.
    mobileBar = true,
    title,
    // Chỗ cho trang tự nhét vài nút vào mép phải thanh trên. Thanh này vốn chỉ
    // có nút ☰ nên còn trống gần hết — dồn được nút nào lên đây là trang bớt
    // một hàng, thứ đắt nhất trên màn hình điện thoại.
    mobileActions,
    // Đứng ngay TRƯỚC tiêu đề. Dành cho chấm trạng thái: nó nói về trang đang
    // xem nên đọc cùng tiêu đề mới đúng mạch, nhét chung với cụm nút bên phải
    // thì trông như một cái nút hỏng.
    mobileStatus,
}: {
    children: React.ReactNode;
    mobileBar?: boolean;
    title?: string;
    mobileActions?: React.ReactNode;
    mobileStatus?: React.ReactNode;
}) {
    const toggleMenu = useAppMenuStore((state) => state.toggle);

    return (
        <Stack sx={{ position: "relative" }} className="h-svh">
            <Stack
                sx={{
                    width: "100vw",
                    overflowX: "hidden",
                    padding: "0px",
                    height: "100svh",
                    ".MuiSkeleton-root": {
                        transform: "unset",
                    },
                    backgroundColor: "#FFF",
                }}
                direction={"row"}
            >
                <Leftmenu />
                <div className={`flex min-w-0 flex-1 flex-col overflow-hidden`}>
                    {mobileBar ? (
                        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-2 md:hidden">
                            <button
                                type="button"
                                onClick={toggleMenu}
                                aria-label="Mở menu"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600"
                            >
                                <Menu size={18} aria-hidden="true" />
                            </button>
                            {mobileStatus}
                            {title ? (
                                <span className="min-w-0 truncate text-sm font-semibold text-slate-900">
                                    {title}
                                </span>
                            ) : null}
                            {mobileActions ? (
                                <div className="ml-auto flex shrink-0 items-center gap-1">
                                    {mobileActions}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                    <Stack
                        sx={{
                            backgroundColor: "#FFF",
                            overflow: "hidden",
                            height: "100%",
                            flex: 1,
                            minHeight: 0,
                        }}
                        className="shadow-[0px_1px_10px_0px_#2222221A]"
                    >
                        {children}
                    </Stack>
                </div>
            </Stack>
        </Stack>
    );
}
