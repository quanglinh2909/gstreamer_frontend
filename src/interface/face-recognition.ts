
import type { AiTracker } from "./ai-config";

export interface IFaceRecognition {
    cameraId: string;
    primaryConf: number;
    secondaryConf: number;
    overlap_threshold: number;
    tracker: AiTracker;
    maxFps: number;
    enabled: boolean;
    polygons: string;
}
