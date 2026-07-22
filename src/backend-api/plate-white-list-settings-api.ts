import type {
    PlateWhiteListSettings,
    PlateWhiteListSettingsPayload,
} from "@/interface/plate-white-list-settings";
import backendClient from "./backend-api";

export const plateWhiteListSettingsApi = {
    // Chỉ trả về camera ĐÃ bật whitelist/barrier.
    list() {
        return backendClient.get<PlateWhiteListSettings[]>("plate-white-list-settings");
    },

    // 404 khi camera chưa bật — không có giá trị mặc định để trả về.
    detail(cameraId: string) {
        return backendClient.get<PlateWhiteListSettings>(
            `plate-white-list-settings/${cameraId}`,
        );
    },

    // Vừa tạo vừa sửa: backend upsert theo camera_id.
    save(cameraId: string, data: PlateWhiteListSettingsPayload) {
        return backendClient.put<PlateWhiteListSettings>(
            `plate-white-list-settings/${cameraId}`,
            data,
        );
    },

    // Xóa = TẮT hẳn barrier của camera này.
    delete(cameraId: string) {
        return backendClient.delete(`plate-white-list-settings/${cameraId}`);
    },
};
