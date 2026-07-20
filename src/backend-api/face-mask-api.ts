import type { IFaceMask } from "@/interface/face-mask";
import backendClient from "./backend-api";

export const faceMaskApi = {
    faceMask(data: IFaceMask) {
        return backendClient.post("face-mask", data);
    },
};
