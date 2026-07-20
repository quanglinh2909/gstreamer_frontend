import type { AiConfidenceKey, AiFeatureId, AiShapeKind } from "@/interface/ai-config";

export type AiFeatureItem = {
    id: AiFeatureId;
    label: string;
    description: string;
    shapeKind: AiShapeKind;
    shapeLabel: string;
    pluralShapeLabel: string;
    drawHint: string;
    confidenceControls: Array<{
        key: AiConfidenceKey;
        label: string;
    }>;
};

export const aiFeatureItems: AiFeatureItem[] = [
    {
        id: "face",
        label: "Khuôn mặt",
        description: "Phát hiện và nhận diện khuôn mặt.",
        shapeKind: "faceZone",
        shapeLabel: "Vùng khuôn mặt",
        pluralShapeLabel: "vùng khuôn mặt",
        drawHint: "Click nhiều điểm để vẽ vùng khuôn mặt.",
        confidenceControls: [
            { key: "detectionConfidence", label: "Tỷ lệ nhận diện khuôn mặt" },
            { key: "verificationConfidence", label: "Tỷ lệ xác minh khuôn mặt" },
        ],
    },
    {
        id: "licensePlate",
        label: "Biển số",
        description: "Đọc biển số xe trong khung hình.",
        shapeKind: "licensePlateZone",
        shapeLabel: "Vùng biển số",
        pluralShapeLabel: "vùng biển số",
        drawHint: "Click nhiều điểm để vẽ vùng biển số.",
        confidenceControls: [
            { key: "detectionConfidence", label: "Tỷ lệ nhận dạng biển số" },
            { key: "textRecognitionConfidence", label: "Tỷ lệ nhận dạng text" },
        ],
    },
    {
        id: "restrictedZone",
        label: "Vùng cấm",
        description: "Cảnh báo khi có đối tượng đi vào vùng đã vẽ.",
        shapeKind: "restrictedZone",
        shapeLabel: "Vùng cấm",
        pluralShapeLabel: "vùng cấm",
        drawHint: "Click nhiều điểm để vẽ vùng cấm.",
        confidenceControls: [
            { key: "detectionConfidence", label: "Tỷ lệ nhận diện" },
        ],
    },
    {
        id: "faceMask",
        label: "Nhận diện khẩu trang",
        description: "Phát hiện người đeo / không đeo khẩu trang trong vùng đã vẽ.",
        shapeKind: "faceMaskZone",
        shapeLabel: "Vùng khẩu trang",
        pluralShapeLabel: "vùng khẩu trang",
        drawHint: "Click nhiều điểm để vẽ vùng nhận diện khẩu trang.",
        confidenceControls: [
            { key: "detectionConfidence", label: "Tỷ lệ nhận diện" },
        ],
    },
];

export function getAiFeatureItem(featureId: AiFeatureId) {
    return aiFeatureItems.find((item) => item.id === featureId) ?? aiFeatureItems[0];
}

export function getAiFeatureItemByShapeKind(shapeKind: AiShapeKind) {
    return aiFeatureItems.find((item) => item.shapeKind === shapeKind) ?? aiFeatureItems[0];
}
