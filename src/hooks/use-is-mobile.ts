import { useEffect, useState } from "react";

// Ngưỡng PHẢI trùng với breakpoint `md` của Tailwind (768px): bố cục do CSS
// quyết định, hook này chỉ dùng cho những thứ CSS không làm được — ví dụ "bảng
// sự kiện mặc định mở hay đóng". Lệch ngưỡng là có dải bề rộng mà JS tưởng
// mobile còn CSS tưởng desktop.
const MOBILE_QUERY = "(max-width: 767px)";

/**
 * `true` = màn hẹp, `false` = màn rộng, `null` = CHƯA BIẾT.
 *
 * Trả null ở lần render đầu là cố ý: server không có `window`, mà đoán bừa rồi
 * render khác lúc hydrate sẽ thành lỗi hydration mismatch của React. Nơi gọi
 * phải xử lý null bằng cách "chưa làm gì cả" chứ đừng coi như false.
 */
export function useIsMobile(): boolean | null {
    const [isMobile, setIsMobile] = useState<boolean | null>(null);

    useEffect(() => {
        const media = window.matchMedia(MOBILE_QUERY);
        const sync = () => setIsMobile(media.matches);
        sync();
        media.addEventListener("change", sync);
        return () => media.removeEventListener("change", sync);
    }, []);

    return isMobile;
}
