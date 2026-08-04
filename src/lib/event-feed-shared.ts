import type { RecognitionEvent, RecognitionEventTab } from "@/interface/recognition-event";
import { getEventResultLabel } from "@/lib/event-view-model";

// Loại sự kiện cho các bảng feed realtime (Xem trực tiếp + Xem lại).
//
// Từng là `RecognitionEventTab | "mask"`: hồi đó khẩu trang không có bảng DB
// nên nó chỉ tồn tại ở các bảng realtime này. Giờ nó có bảng event_mask và
// nằm hẳn trong RecognitionEventTab, nên hai kiểu trùng nhau — giữ tên riêng
// vì các bảng feed vẫn có thể mọc thêm loại không phải "nhận diện".
export type FeedTab = RecognitionEventTab;

export const ALL_TABS: FeedTab[] = ["face", "plate", "restricted", "mask"];

// `ai_type` của backend (cột `type` trong cấu hình AI, xem TypeConfigAiEnum)
// -> loại sự kiện của giao diện. Dùng để bộ lọc khung AI trên video trực tiếp
// xài chung nhãn/màu với bảng sự kiện.
export const AI_TYPE_TO_TAB: Record<string, FeedTab> = {
    face_recognition: "face",
    plate_recognition: "plate",
    restricted_area: "restricted",
    face_mask: "mask",
};

// "Chuyển động" CỐ Ý không phải một FeedTab: nó không đi qua backend Python,
// không có bảng nhận dạng, không có ảnh/độ tin cậy, và là một KHOẢNG thời gian
// chứ không phải một thời điểm. Nhét vào FeedTab thì `getEventSocketUrl` (có
// nhánh mặc định về face-events) sẽ lặng lẽ mở nhầm socket, còn DetectionFilter
// mọc thêm một loại khung mà AI không hề vẽ. Giữ riêng, gắn ở chỗ nào cần.
export const MOTION_META = {
    label: "Chuyển động",
    chip: "border-violet-500 bg-violet-500/15 text-violet-300",
    badge: "bg-violet-500/15 text-violet-300 ring-violet-500/40",
};

export function cn(...classes: Array<string | false | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export const TYPE_META: Record<FeedTab, { label: string; chip: string; badge: string }> = {
    face: {
        label: "Khuôn mặt",
        chip: "border-emerald-500 bg-emerald-500/15 text-emerald-300",
        badge: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40",
    },
    plate: {
        label: "Biển số",
        chip: "border-sky-500 bg-sky-500/15 text-sky-300",
        badge: "bg-sky-500/15 text-sky-300 ring-sky-500/40",
    },
    restricted: {
        label: "Vùng cấm",
        chip: "border-rose-500 bg-rose-500/15 text-rose-300",
        badge: "bg-rose-500/15 text-rose-300 ring-rose-500/40",
    },
    mask: {
        label: "Khẩu trang",
        chip: "border-amber-500 bg-amber-500/15 text-amber-300",
        badge: "bg-amber-500/15 text-amber-300 ring-amber-500/40",
    },
};

// Nhãn cho sự kiện: khẩu trang lấy từ mask_status (không có name/plate_number
// như face/plate).
export function feedLabel(tab: FeedTab, event: RecognitionEvent): string {
    if (tab !== "mask") return getEventResultLabel(event, tab);
    const status = (event as { mask_status?: string }).mask_status;
    if (status === "wearing_mask") return "Có khẩu trang";
    if (status === "not_wearing_mask") return "Không khẩu trang";
    return "Khẩu trang";
}

// Khung phát hiện chuẩn hoá [0,1] theo ảnh full (backend gửi kèm sự kiện).
export type BoxRect = { x1: number; y1: number; x2: number; y2: number };

export function getBox(event: RecognitionEvent): BoxRect | undefined {
    const b = (event as { box?: BoxRect }).box;
    if (!b || typeof b.x1 !== "number") return undefined;
    return b;
}

export function boxPosStyle(b: BoxRect) {
    return {
        left: `${b.x1 * 100}%`,
        top: `${b.y1 * 100}%`,
        width: `${(b.x2 - b.x1) * 100}%`,
        height: `${(b.y2 - b.y1) * 100}%`,
    };
}

// Màu khung theo loại: khẩu trang đỏ/xanh theo trạng thái; các loại khác theo
// màu badge của loại để nhất quán.
export function boxColorClass(tab: FeedTab, event: RecognitionEvent): string {
    if (tab === "mask") {
        const s = (event as { mask_status?: string }).mask_status;
        if (s === "not_wearing_mask") return "border-rose-500";
        if (s === "wearing_mask") return "border-emerald-400";
        return "border-amber-400";
    }
    if (tab === "face") return "border-emerald-400";
    if (tab === "plate") return "border-sky-400";
    if (tab === "restricted") return "border-rose-500";
    return "border-sky-400";
}
