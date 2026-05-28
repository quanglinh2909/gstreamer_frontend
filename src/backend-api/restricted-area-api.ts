import type { IRestrictedArea } from "@/interface/restricted-area";
import type { RecognitionEventPage, RestrictedAreaEvent } from "@/interface/recognition-event";
import backendClient from "./backend-api";

export const restrictedAreaApi = {
    restrictedArea(data: IRestrictedArea) {
        return backendClient.post("restricted-area", data);
    },
    events(param: { page: number; size: number; camera_id?: string }) {
        return backendClient.get<RecognitionEventPage<RestrictedAreaEvent>>("restricted-area/events", { params: param });
    },
};
