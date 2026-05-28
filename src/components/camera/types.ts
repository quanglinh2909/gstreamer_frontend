import type { ICameraCreate, RecordingMode } from "@/interface/camera";

export type CameraHealth = "online" | "offline" | "error" | "unknown";
export type StatusFilter = CameraHealth | "all";
export type FeatureFilter = "all" | "recording" | "motion";
export type CameraFormMode = "create" | "edit";

export type CameraFormState = Omit<
    ICameraCreate,
    | "recordingMode"
    | "motionSensitivity"
    | "motionThreshold"
    | "preMotionSeconds"
    | "postMotionSeconds"
    | "segmentSeconds"
> & {
    recordingMode: RecordingMode;
    motionSensitivity: string;
    motionThreshold: string;
    preMotionSeconds: string;
    postMotionSeconds: string;
    segmentSeconds: string;
};

export type UpdateCameraForm = <K extends keyof CameraFormState>(
    key: K,
    value: CameraFormState[K],
) => void;
