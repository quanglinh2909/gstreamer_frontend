import type { IAiModelFile } from "@/interface/restricted-area";

// Kết quả một-lần từ engine C++ (POST /inference/run). Toạ độ box/keypoint nằm
// trong KHÔNG GIAN ẢNH GỐC (pixel), theo origWidth×origHeight — frontend chỉ
// việc chia cho kích thước gốc để ra tỉ lệ rồi vẽ lên ảnh đang hiển thị.
export interface InferenceDetection {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    score: number;
    classId: number;
    // Phẳng [x,y,score, x,y,score, ...] — pose 17 điểm hoặc mặt 5 điểm.
    keypoints: number[];
    // Mask phân vùng (yolov8_seg): lưới bit HEX trong bbox.
    maskGrid?: number;
    mask?: string;
    embedding?: number[];
}

export interface InferenceResult {
    origWidth: number;
    origHeight: number;
    detections: InferenceDetection[];
}

export interface ModelTypes {
    stage1: string[];
    stage2: string[];
}

export interface RunParams {
    image: File;
    modelPath: string;
    modelType: string;
    modelPath2?: string;
    modelType2?: string;
    transformData?: string;
    primaryConf: number;
    secondaryConf: number;
}

// Mọi endpoint dưới đây ở ENGINE C++ (cổng 8009) nên đi qua proxy
// "/api/backend-process" — KHÔNG phải "/api/backend" (backend Python).
export const modelTestApi = {
    async models(): Promise<IAiModelFile[]> {
        const res = await fetch("/api/backend-process/ai-models");
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? (data as IAiModelFile[]) : [];
    },

    async modelTypes(): Promise<ModelTypes> {
        const res = await fetch("/api/backend-process/ai-model-types");
        if (!res.ok) return { stage1: [], stage2: [] };
        const data = await res.json();
        return {
            stage1: Array.isArray(data?.stage1) ? data.stage1 : [],
            stage2: Array.isArray(data?.stage2) ? data.stage2 : [],
        };
    },

    async run(p: RunParams): Promise<InferenceResult> {
        const fd = new FormData();
        fd.append("image", p.image);
        fd.append("modelPath", p.modelPath);
        fd.append("modelType", p.modelType);
        if (p.modelPath2) fd.append("modelPath2", p.modelPath2);
        if (p.modelType2) fd.append("modelType2", p.modelType2);
        fd.append("transformData", p.transformData ?? "");
        fd.append("primaryConf", String(p.primaryConf));
        fd.append("secondaryConf", String(p.secondaryConf));
        const res = await fetch("/api/backend-process/inference/run", {
            method: "POST",
            body: fd,
        });
        if (!res.ok) {
            const detail = await res.text().catch(() => "");
            throw new Error(detail || `Inference thất bại (HTTP ${res.status})`);
        }
        return res.json();
    },
};

// Đoán loại model theo tên file để chọn sẵn — người dùng vẫn đổi tay được.
export function guessModelType(fileName: string, allowed: string[]): string {
    const n = fileName.toLowerCase();
    const pick = (t: string) => (allowed.includes(t) ? t : "");
    if (n.includes("pose")) return pick("yolov8_pose") || allowed[0] || "";
    if (n.includes("seg")) return pick("yolov8_seg") || allowed[0] || "";
    if (n.includes("adaface") || n.includes("arcface") || n.includes("face_recognition"))
        return pick("face_recognition") || allowed[0] || "";
    if (n.includes("rf") || n.includes("detr")) return pick("rf_detect") || allowed[0] || "";
    return pick("yolov8_detect") || allowed[0] || "";
}
