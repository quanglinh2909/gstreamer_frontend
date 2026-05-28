import type { AiTracker } from "./ai-config";

export interface IRestrictedArea {
    cameraId: string;
    primaryConf: number;
    overlap_threshold: number;
    tracker: AiTracker;
    maxFps: number;
    enabled: boolean;
    polygons: string;
}
