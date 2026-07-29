import type {
    IAiModelFile,
    IRestrictedArea,
    IRestrictedAreaSettings,
} from "@/interface/restricted-area";
import type { RecognitionEventPage, RestrictedAreaEvent } from "@/interface/recognition-event";
import backendClient from "./backend-api";

export const restrictedAreaApi = {
    restrictedArea(data: IRestrictedArea) {
        return backendClient.post("restricted-area", data);
    },
    events(param: { page: number; size: number; camera_id?: string }) {
        return backendClient.get<RecognitionEventPage<RestrictedAreaEvent>>("restricted-area/events", { params: param });
    },
    // Model + lọc lớp đang áp cho camera (để giao diện hiện đúng lựa chọn).
    settings(cameraId: string) {
        return backendClient.get<IRestrictedAreaSettings>("restricted-area/settings", {
            params: { cameraId },
        });
    },
    // Danh sách file model nằm ở ENGINE C++ nên đi qua proxy backend-process,
    // KHÔNG phải /api/backend (backend Python).
    async models(): Promise<IAiModelFile[]> {
        const res = await fetch("/api/backend-process/ai-models");
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? (data as IAiModelFile[]) : [];
    },
    // Các LOẠI model engine hỗ trợ (yolov8_detect, yolov8_pose, ...). Lấy động
    // từ engine để không phải hardcode — thêm loại mới trong AiCatalog là giao
    // diện tự có. `stage1` = model chính; vùng cấm chỉ dùng model stage-1.
    async modelTypes(): Promise<string[]> {
        const res = await fetch("/api/backend-process/ai-model-types");
        if (!res.ok) return [];
        const data = await res.json();
        const list = data?.stage1;
        return Array.isArray(list) ? (list as string[]) : [];
    },
};
