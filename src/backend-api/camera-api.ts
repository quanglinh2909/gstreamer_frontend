import { ICameraCreate, IMotionGridPatch, IRecordingPatch } from "@/interface/camera";
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
    // Sửa RIÊNG lưới chuyển động. Engine COALESCE từng trường nên gửi thiếu là
    // giữ nguyên — không cần đọc rồi ghi lại cả camera.
    //
    // Vẫn đi qua backend Python như mọi lời gọi khác, NHƯNG Python chuyển tiếp
    // bằng `model_dump(exclude_none=True)` nên trường nào không có trong
    // CameraUpdateDTO là bị vứt lặng lẽ (API vẫn 200). Đã bổ sung ba trường lưới
    // vào app/dto/camera_dto.py — sửa engine mà quên chỗ đó là mất dữ liệu.
    updateMotionGrid(id: string, data: IMotionGridPatch) {
        return backendClient.put(`cameras/${id}`, data);
    },
    // Bật/tắt ghi hình ngay từ danh sách camera. Cùng đường PUT như
    // updateMotionGrid (engine COALESCE nên gửi thiếu là giữ nguyên), và
    // recordingEnabled/recordingMode đã có sẵn trong CameraUpdateDTO của Python.
    updateRecording(id: string, data: IRecordingPatch) {
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
