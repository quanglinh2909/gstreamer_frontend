import type { IFaceMask } from "@/interface/face-mask";
import type { MaskRecognitionEvent, RecognitionEventPage } from "@/interface/recognition-event";
import backendClient from "./backend-api";

export const faceMaskApi = {
    faceMask(data: IFaceMask) {
        return backendClient.post("face-mask", data);
    },
    events(param: { page: number; size: number; camera_id?: string }) {
        return backendClient.get<RecognitionEventPage<MaskRecognitionEvent>>("face-mask/events", {
            params: param,
        });
    },
};
