import { create } from "zustand";

// Trạng thái mở/đóng của MENU ỨNG DỤNG (thanh icon bên trái).
//
// Phải là store toàn cục chứ không phải state trong MainLayout: nút mở nằm
// trong thanh công cụ của TỪNG TRANG (live-view, xem lại...) — đặt ở đó thì
// mới không tốn thêm một thanh ngang riêng chỉ để chứa cái nút, mà màn hình
// điện thoại thì chiều cao quý ngang chiều rộng.
interface AppMenuState {
    open: boolean;
    setOpen: (open: boolean) => void;
    toggle: () => void;
}

export const useAppMenuStore = create<AppMenuState>((set) => ({
    open: false,
    setOpen: (open) => set({ open }),
    toggle: () => set((state) => ({ open: !state.open })),
}));
