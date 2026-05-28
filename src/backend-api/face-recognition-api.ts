import { IFaceRecognition } from "@/interface/face-recognition";
import type { FaceRecognitionEvent, RecognitionEventPage } from "@/interface/recognition-event";
import backendClient from "./backend-api";

export const faceRecognitionApi = {

    faceRecognition(data: IFaceRecognition) {
        return backendClient.post("face-recognition", data);
    },

    events(param: { page: number; size: number; camera_id?: string }) {
        return backendClient.get<RecognitionEventPage<FaceRecognitionEvent>>("face-recognition/events", { params: param });
    },


};
