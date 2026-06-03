import type { ICameraResponse } from "@/interface/camera";

export function cn(...classes: Array<string | false | undefined>) {
    return classes.filter(Boolean).join(" ");
}

export function getCameraLabel(cameras: ICameraResponse[], cameraId: string) {
    const camera = cameras.find((item) => String(item.id) === String(cameraId));

    return camera?.name || cameraId || "Không xác định";
}
