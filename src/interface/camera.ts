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
    motionKeyframeOnly: boolean

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
    retryCount: number
    lastError: string
    lastChangedAt: string
}
