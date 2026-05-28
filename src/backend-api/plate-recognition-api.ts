import { IPlateRecognition } from "@/interface/plate-recognition";
import type { PlateRecognitionEvent, RecognitionEventPage } from "@/interface/recognition-event";
import backendClient from "./backend-api";

export const plateRecognitionApi = {

    plateRecognition(data: IPlateRecognition) {
        return backendClient.post("plate-recognition", data);
    },
    events(param: { page: number; size: number; camera_id?: string }) {
        return backendClient.get<RecognitionEventPage<PlateRecognitionEvent>>("plate-recognition/events", { params: param });
    }

};
