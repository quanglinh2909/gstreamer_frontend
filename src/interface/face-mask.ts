import type { AiTracker } from "./ai-config";

export interface IFaceMask {
    cameraId: string;
    primaryConf: number;
    overlap_threshold: number;
    tracker: AiTracker;
    maxFps: number;
    enabled: boolean;
    polygons: string;
    count_confirm: number;
    re_alert_seconds: number;
}
