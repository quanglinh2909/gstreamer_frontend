export type AiFeatureId = "face" | "licensePlate" | "restrictedZone" | "tripwire";

export type AiShapeKind = "faceZone" | "licensePlateZone" | "restrictedZone" | "tripwire";

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

export type AiBackendConfigType = "face_recognition" | "plate_recognition" | "restricted_area";

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
