export type AiFeatureId = "face" | "licensePlate" | "restrictedZone" | "faceMask";

export type AiShapeKind = "faceZone" | "licensePlateZone" | "restrictedZone" | "faceMaskZone";

export type AiDrawMode = AiFeatureId;

export type AiTracker = "bytetrack" | "botsort" | "ocsort";

export type AiConfidenceKey =
    | "detectionConfidence"
    | "verificationConfidence"
    | "textRecognitionConfidence";

export interface AiPoint {
    x: number;
    y: number;
}

export interface AiFeatureConfig {
    enabled: boolean;
    detectionConfidence: number;
    maxFps: number;
    verificationConfidence?: number;
    textRecognitionConfidence?: number;
    overlapThreshold?: number;
    tracker?: AiTracker;
    countConfirm?: number;
    reAlertSeconds?: number;
    // Khẩu trang: độ dài xung mở barrier (giây) khi phát hiện người không đeo.
    barrierDuration?: number;
    // Biển số: số ký tự tối thiểu để GHI một sự kiện. Ngưỡng của nhánh mở
    // barrier nằm ở trang "Danh sách biển số trắng" → tab Cấu hình, không
    // phải ở đây.
    minPlateLength?: number;
    // Vùng cấm: model phát hiện + lọc lớp, chọn được từ giao diện.
    // modelFile = tên file .rknn; modelType = "yolov8_detect" | "rf_detect";
    // classFilter = CSV id lớp giữ lại ("" = giữ mọi lớp).
    modelFile?: string;
    modelType?: string;
    classFilter?: string;
    // Lưu khung phát hiện xuống DB để XEM LẠI vẽ được box/pose và tìm sự
    // kiện theo vùng vẽ trên hình. Mặc định TẮT (ghi liên tục mỗi khung).
    saveDetections?: boolean;
}

export type AiFeatureConfigMap = Record<AiFeatureId, AiFeatureConfig>;

export interface AiDetectionShape {
    id: string;
    cameraId: string;
    kind: AiShapeKind;
    label: string;
    points: AiPoint[];
    createdAt: string;
}

export interface AiCameraConfig {
    cameraId: string;
    features: AiFeatureConfigMap;
    shapes: AiDetectionShape[];
    updatedAt: string;
}

export type AiConfigMap = Record<string, AiCameraConfig>;

export type AiBackendConfigType = "face_recognition" | "plate_recognition" | "restricted_area" | "face_mask";

export interface AiBackendConfig {
    id?: string;
    job_id?: string | number | null;
    cameraId: string;
    enabled: boolean;
    primaryConf: number;
    secondaryConf?: number;
    overlap_threshold?: number;
    tracker?: AiTracker | string;
    maxFps: number;
    type: AiBackendConfigType | string;
    polygons: string;
}
