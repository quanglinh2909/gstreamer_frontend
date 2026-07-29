import type { AiTracker } from "./ai-config";

export interface IRestrictedArea {
    cameraId: string;
    primaryConf: number;
    overlap_threshold: number;
    tracker: AiTracker;
    maxFps: number;
    enabled: boolean;
    polygons: string;
    // Chọn được từ giao diện; bỏ trống = backend dùng mặc định.
    modelFile?: string;
    modelType?: string;
    classFilter?: string;
}

// Model + lọc lớp đang áp cho một camera (GET /restricted-area/settings).
export interface IRestrictedAreaSettings {
    modelFile: string;
    modelType: string;
    classFilter: string;
    defaults: { modelFile: string; modelType: string; classFilter: string };
}

// Một model .rknn trong kho weights (GET /ai-models của engine C++).
export interface IAiModelFile {
    fileName: string;
    path: string;
    sizeBytes: number;
}
