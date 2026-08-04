export type RecognitionEventTab = "plate" | "face" | "restricted" | "mask";

/**
 * Tab của TRANG Sự kiện. Chuyển động đứng ngoài `RecognitionEventTab` một cách
 * cố ý: kiểu kia lái các map API/WebSocket của backend Python, mà chuyển động
 * đến từ engine C++, không phân trang, và là một KHOẢNG thời gian chứ không
 * phải một thời điểm. Nhét chung vào là mọi map đó mọc thêm một khoá không có
 * endpoint nào phía sau.
 */
export type EventPageTab = RecognitionEventTab | "motion";

export interface RecognitionEventBase {
    id: number;
    camera_id: string;
    confidence: number;
    timestamp: number;
    image_full: string;
    image_crop: string;
}

export interface PlateRecognitionEvent extends RecognitionEventBase {
    plate_number: string;
}

export interface FaceRecognitionEvent extends RecognitionEventBase {
    name?: string | null;
}

export type RestrictedAreaEvent = RecognitionEventBase;

/** Sự kiện khẩu trang. Cùng khuôn với ba loại kia (AiEventMixin bên backend),
 *  chỉ thêm trạng thái đeo/không đeo và id của tracker. */
export interface MaskRecognitionEvent extends RecognitionEventBase {
    mask_status: "wearing_mask" | "not_wearing_mask" | "unknown";
    track_id?: number | null;
}

export type RecognitionEvent =
    | PlateRecognitionEvent
    | FaceRecognitionEvent
    | RestrictedAreaEvent
    | MaskRecognitionEvent;

export interface RecognitionEventPage<T extends RecognitionEvent = RecognitionEvent> {
    items: T[];
    total: number;
    page: number;
    size: number;
    pages: number;
}
