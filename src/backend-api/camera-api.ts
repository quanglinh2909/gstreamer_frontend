import { ICameraCreate } from "@/interface/camera";
import backendClient from "./backend-api";

export const cameraApi = {
    getCameras(limit: number, offset: number) {
        return backendClient.get(`cameras?limit=${limit}&offset=${offset}`);
    },
    createCamera(data: ICameraCreate) {
        return backendClient.post("cameras", data);
    },
    updateCamera(id: string, data: ICameraCreate) {
        return backendClient.put(`cameras/${id}`, data);
    },
    deleteCamera(id: string) {
        return backendClient.delete(`cameras/${id}`);
    },
    snapshot(id: string) {
        return backendClient.get(`cameras/${id}/snapshot`, { responseType: "blob" });
    },
    getConfigAI(id: string) {
        return backendClient.get(`cameras/${id}/config-ai`);
    }


};
