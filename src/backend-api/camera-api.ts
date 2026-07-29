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
        // Thêm mốc thời gian để MỖI lần lấy là một URL khác nhau — chặn trình
        // duyệt/proxy trả lại ảnh cũ đã cache (từng dính khung "xanh" của
        // mppvideodec bám lại trên màn hình dù engine đã trả ảnh mới).
        return backendClient.get(`cameras/${id}/snapshot?t=${Date.now()}`, {
            responseType: "blob",
        });
    },
    getConfigAI(id: string) {
        return backendClient.get(`cameras/${id}/config-ai`);
    }


};
