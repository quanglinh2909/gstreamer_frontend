export type RecognitionEventTab = "plate" | "face" | "restricted";

export interface RecognitionEventBase {
    id: number;
    camera_id: string;
    confidence: number;
    timestamp: number;
    image_full: string;
    image_crop: string;
}

export interface PlateRecognitionEvent extends RecognitionEventBase {
    plate_number: string;
}

export interface FaceRecognitionEvent extends RecognitionEventBase {
    name?: string | null;
}

export type RestrictedAreaEvent = RecognitionEventBase;

export type RecognitionEvent = PlateRecognitionEvent | FaceRecognitionEvent | RestrictedAreaEvent;

export interface RecognitionEventPage<T extends RecognitionEvent = RecognitionEvent> {
    items: T[];
    total: number;
    page: number;
    size: number;
    pages: number;
}
