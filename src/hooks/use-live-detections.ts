import { useEffect, useRef, useState } from "react";
import { resolveWebSocketOrigin } from "@/lib/websocket-origin";

// Nhận KHUNG PHÁT HIỆN realtime của một camera để vẽ đè lên video trực tiếp.
// Khác các socket sự kiện (chỉ bắn khi có sự kiện), socket này bắn mỗi khung
// hình AI xử lý — kể cả khung rỗng, vốn là tín hiệu để XOÁ khung đang vẽ.

export type DetectionBox = {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    score: number;
    class_id?: number | null;
    label?: string;
    tid?: number;
    // Pose: bộ ba (x, y, score) PHẲNG, x/y đã chuẩn hoá [0,1]. score<=0 là
    // điểm không nhìn thấy — bỏ qua khi vẽ.
    kps?: number[];
    // Mask phân vùng: lưới bit mask_grid×mask_grid (HEX) phủ ĐÚNG bbox của
    // vật. Chỉ model *_seg mới có.
    mask?: string;
    mask_grid?: number;
};

type Frame = {
    camera_id: string;
    job_id: string;
    ai_type?: string;
    seq?: number;
    ts?: number;
    width?: number;
    height?: number;
    boxes: DetectionBox[];
    // Vùng (polygon) chuẩn hoá [0,1]. Backend chỉ kèm khoá này mỗi ~1s cho đỡ
    // tốn: KHÔNG có khoá = giữ nguyên vùng cũ; có mà rỗng = job chạy toàn
    // khung, không có vùng nào.
    zones?: number[][][];
};

export type OverlayBox = DetectionBox & { aiType?: string; jobId: string };
export type OverlayZone = { points: number[][]; aiType?: string; jobId: string };

const RECONNECT_MS = 2000;
// Một camera có thể chạy nhiều job AI; mỗi job là một dòng riêng nên phải gom
// theo job rồi vẽ HỢP của các job. Job ngừng gửi quá lâu thì bỏ khung của nó
// đi, không thì khung cuối cùng nằm lại vĩnh viễn trên màn hình.
const JOB_STALE_MS = 2000;
// Nhịp vẽ tối đa. AI có thể chạy nhanh hơn mắt nhìn; gộp bớt để React không
// render lại quá dày trên tường 16 ô.
const RENDER_INTERVAL_MS = 80;

export function useLiveDetections(origin: string, cameraId: string, active: boolean) {
    const [boxes, setBoxes] = useState<OverlayBox[]>([]);
    const [zones, setZones] = useState<OverlayZone[]>([]);
    // job_id -> khung mới nhất của job đó. Giữ ở ref: dữ liệu về liên tục,
    // đẩy thẳng vào state sẽ render mỗi khung hình. `zones` GIỮ LẠI giữa các
    // khung (backend chỉ gửi lại thưa).
    const jobsRef = useRef<
        Map<string, { boxes: OverlayBox[]; zones: OverlayZone[]; at: number }>
    >(new Map());

    useEffect(() => {
        if (!active || !cameraId) {
            setBoxes([]);
            setZones([]);
            return;
        }
        const base = resolveWebSocketOrigin(origin);
        if (!base) return;
        const url = `${base}/live-detections?camera_id=${encodeURIComponent(cameraId)}`;

        let closed = false;
        let ws: WebSocket | null = null;
        let retry = 0;
        const jobs = jobsRef.current;
        jobs.clear();
        setBoxes([]);
        setZones([]);

        const connect = () => {
            if (closed) return;
            try {
                ws = new WebSocket(url);
            } catch {
                retry = window.setTimeout(connect, RECONNECT_MS);
                return;
            }
            ws.onmessage = (e) => {
                if (closed) return;
                try {
                    const f = JSON.parse(String(e.data)) as Frame;
                    if (!f || f.camera_id !== cameraId) return;
                    const prev = jobs.get(f.job_id);
                    jobs.set(f.job_id, {
                        at: Date.now(),
                        boxes: (f.boxes || []).map((b) => ({
                            ...b,
                            aiType: f.ai_type,
                            jobId: f.job_id,
                        })),
                        // Khoá `zones` vắng mặt = giữ nguyên vùng đã biết.
                        zones: f.zones
                            ? f.zones.map((points) => ({
                                  points,
                                  aiType: f.ai_type,
                                  jobId: f.job_id,
                              }))
                            : prev?.zones ?? [],
                    });
                } catch {
                    /* gói hỏng: bỏ qua */
                }
            };
            ws.onclose = () => {
                if (!closed) retry = window.setTimeout(connect, RECONNECT_MS);
            };
            ws.onerror = () => {
                try {
                    ws?.close();
                } catch {
                    /* đã đóng */
                }
            };
        };
        connect();

        // Gộp nhịp vẽ + dọn job đã im lặng.
        const timer = window.setInterval(() => {
            if (closed) return;
            const now = Date.now();
            let changed = false;
            for (const [jobId, entry] of jobs) {
                if (now - entry.at > JOB_STALE_MS) {
                    jobs.delete(jobId);
                    changed = true;
                }
            }
            const next: OverlayBox[] = [];
            const nextZones: OverlayZone[] = [];
            for (const entry of jobs.values()) {
                next.push(...entry.boxes);
                nextZones.push(...entry.zones);
            }
            setBoxes((prev) => {
                if (!changed && prev.length === 0 && next.length === 0) return prev;
                return next;
            });
            // Vùng gần như không đổi — chỉ đẩy state khi khác thật, tránh
            // render lại cả lưới 16 ô mỗi 80ms vô ích.
            setZones((prev) => {
                if (prev.length === nextZones.length &&
                    prev.every((z, i) => z.jobId === nextZones[i].jobId &&
                        z.points === nextZones[i].points)) {
                    return prev;
                }
                return nextZones;
            });
        }, RENDER_INTERVAL_MS);

        return () => {
            closed = true;
            window.clearTimeout(retry);
            window.clearInterval(timer);
            if (ws) {
                ws.onclose = null;
                ws.onerror = null;
                ws.onmessage = null;
                try {
                    ws.close();
                } catch {
                    /* đã đóng */
                }
            }
            jobs.clear();
        };
    }, [origin, cameraId, active]);

    return { boxes, zones };
}
