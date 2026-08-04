export type RecordingMode = "off" | "always" | "motion";

export interface ICameraCreate {
    name: string,
    rtsp: string,
    hardware: string,
    recordingEnabled: boolean,
    recordingMode: RecordingMode,
    motionEnabled: boolean,
    motionSensitivity: number,
    motionThreshold: number,
    preMotionSeconds: number,
    postMotionSeconds: number,
    segmentSeconds: number,
    motionKeyframeOnly: boolean,
    /** Hạn lưu theo NGÀY của riêng camera này; 0 = không giới hạn.
     *  Engine chỉ cất hộ vào cột cameras.retention_days — bộ dọn dung lượng
     *  bên Python mới là chỗ thi hành (storage_cleanup_service.py). */
    retentionDays: number

}

// TOÀN BỘ cấu hình chuyển động của một camera — lưới ô kèm các tham số đi cùng.
// Sống ở trang /ai-config chứ không ở form sửa camera: chỉnh mấy con số này mà
// không nhìn khung hình thì chỉ là đoán.
//
// KHÔNG có motionSensitivity/motionThreshold: cả hai đã bị MỨC CỦA VÙNG thay
// thế. Mức N của một vùng = "cần N×10% số ô của vùng đó cùng động", và engine
// tự đếm số ô trong từng vùng thay vì nhờ motioncells
// (RecordingTypes.hpp::MotionZone). Hai cột cũ vẫn còn trong DB/API nhưng không
// còn ai đặt — bày lên giao diện là bày một cái núm không xoay gì cả.
export interface IMotionGridPatch {
    motionGridX: number
    motionGridY: number
    /**
     * Vùng chuyển động, JSON `[{"r1","c1","r2","c2","level"}]`. Toạ độ theo Ô
     * của lưới, bao gồm cả hai đầu. level 1..10 = cần level×10% số ô CỦA CHÍNH
     * VÙNG ĐÓ cùng động. Hai vùng cùng mức vẫn là hai vùng riêng.
     */
    motionZones: string
    motionEnabled?: boolean
    /** Ghi sự kiện xuống DB hay chỉ bắn WebSocket để vẽ live. */
    motionSaveEvents?: boolean
    /** Cũng chính là `gap=` của motioncells: im lặng bấy nhiêu giây thì kết thúc sự kiện. */
    postMotionSeconds?: number
    preMotionSeconds?: number
    motionKeyframeOnly?: boolean
    recordingMode?: RecordingMode
    recordingEnabled?: boolean
}

// Bật/tắt ghi hình từ ngoài danh sách camera, không mở cả biểu mẫu sửa.
//
// PHẢI gửi CẢ HAI trường. Engine coi `recordingMode != "off"` là đã bật ghi và
// tự kéo `recordingEnabled` lên true (CameraStreamSession::normalizeRecordingFlag),
// nên chỉ hạ `recordingEnabled` xuống false mà để mode là "motion" thì camera
// vẫn ghi tiếp — tắt trên giao diện mà không tắt gì thật.
export interface IRecordingPatch {
    recordingEnabled: boolean
    recordingMode: RecordingMode
    /** Chỉ gửi khi BẬT "chỉ ghi khi có sự kiện" — lúc khác gửi kèm sẽ ghi đè
     *  giá trị người dùng đã đặt ở biểu mẫu Sửa camera. */
    preMotionSeconds?: number
    postMotionSeconds?: number
}

// Pushed over ws://<WEBSOCKET_ORIGIN_C>/camera-state whenever a camera's
// state actually changes (see CameraStateSocket.hpp:96-105).
export interface CameraStateMessage {
    id: string
    state: string
    lastError: string
    lastChangedAt: string
}

export interface ICameraResponse {
    id: string
    name: string
    rtsp: string
    status: string
    state: string
    inputRtsp: string
    outputRtsp: string
    codec: string
    hardware: string
    recordingEnabled: boolean
    recordingMode: RecordingMode
    motionEnabled: boolean
    motionSensitivity: number
    motionThreshold: number
    preMotionSeconds: number
    postMotionSeconds: number
    segmentSeconds: number
    motionKeyframeOnly: boolean
    retentionDays: number
    motionGridX: number
    motionGridY: number
    motionZones: string
    motionSaveEvents: boolean
    retryCount: number
    lastError: string
    lastChangedAt: string
}
