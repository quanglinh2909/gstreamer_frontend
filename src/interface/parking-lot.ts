// Ngưỡng hoạt động của một cổng. Trước đây là hằng số trong TaskParkingLot;
// giờ mỗi bãi một bộ vì cổng xe máy và cổng ô tô khác nhau về khoảng cách
// giữa hai camera, tốc độ xe qua và phần cứng barrier.
export interface ParkingLotSettings {
    // Cửa sổ ghép cặp mặt ↔ biển (giây).
    time_expired: number;
    // Một biển chỉ tạo một sự kiện trong ngần này giây — chặn 2 người cùng xe.
    match_cooldown: number;
    // Độ dài xung mở barrier (giây).
    barrier_duration: number;
    // Số ký tự tối đa được phép sai so với biển đã đăng ký. 0 = khớp tuyệt đối.
    max_edit_distance: number;
    // Ngưỡng tin cậy từng ký tự OCR khi bãi đọc lại biển. 0..1.
    ocr_confidence: number;
}

export interface ParkingLot extends ParkingLotSettings {
    id: number;
    name: string;
    face_camera_id: string;
    plate_camera_id: string;
}

export interface ParkingLotPayload extends ParkingLotSettings {
    name: string;
    face_camera_id: string;
    plate_camera_id: string;
}

export interface ParkingLotPage {
    items: ParkingLot[];
    total: number;
    page: number;
    size: number;
    pages: number;
}
