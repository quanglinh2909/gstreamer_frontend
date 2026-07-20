
import type { AiTracker } from "./ai-config";

export interface IPlateRecognition {
    cameraId: string;
    primaryConf: number;
    secondaryConf: number;
    overlap_threshold: number;
    tracker: AiTracker;
    maxFps: number;
    enabled: boolean;
    polygons: string;
    // buildRecognitionPayload (JS) luôn kèm pre_time cho biển số ở runtime;
    // optional để khớp kiểu suy luận từ helper JS. Backend cũng có default.
    pre_time?: number;
}
