import { useEffect, useRef, useState } from "react";
import { resolveWebSocketOrigin } from "@/lib/websocket-origin";
import { parseServerTime } from "@/lib/recordings";

// Sự kiện CHUYỂN ĐỘNG realtime, đến từ ENGINE C++ (/ws/motion-events, frontend
// gọi qua /wsc). Khác hẳn các socket sự kiện nhận dạng:
//
//   - nguồn khác: engine chứ không phải backend Python (nên origin là
//     WEBSOCKET_ORIGIN_C, xem next.config.ts);
//   - engine bắn MỌI camera trên một socket duy nhất, không có `?camera_id=`,
//     nên lọc theo camera phải làm ở đây;
//   - chỉ bắn khi sự kiện KẾT THÚC (đã biết end_at) — một khoảng thời gian,
//     không phải một thời điểm.

/**
 * Ô đang động TRONG KHUNG hiện tại (engine bắn 5 lần/giây), tách theo trong /
 * ngoài vùng đã vẽ. Khác `MotionFeedEvent`: cái đó chỉ về khi sự kiện đã KẾT
 * THÚC và đã lọc bỏ ô ngoài vùng, còn cái này là "ngay lúc này chỗ nào đang
 * động", bất kể to nhỏ hay đủ ngưỡng hay chưa.
 */
export type MotionFrame = {
    cameraId: string;
    inside: string;
    outside: string;
    gridX: number;
    gridY: number;
    atMs: number;
};

export type MotionFeedEvent = {
    key: string;
    cameraId: string;
    startMs: number;
    endMs: number;
    cells: string;
    gridX: number;
    gridY: number;
};

const MAX_EVENTS = 60;
const RECONNECT_MS = 2000;

export function useMotionEventFeed(
    origin: string,
    active: boolean,
    // Bỏ trống = nhận mọi camera (tường Live View). Truyền id = chỉ giữ camera
    // đó (trang Xem lại review một camera).
    cameraId?: string | null,
    // Camera muốn nhận KHUNG (5 gói/giây mỗi camera). Engine chỉ gửi cho socket
    // đã đăng ký — không đăng ký thì chỉ có sự kiện, chi phí gần bằng 0.
    frameCameraIds?: string[],
) {
    const [events, setEvents] = useState<MotionFeedEvent[]>([]);
    // Khung mới nhất của TỪNG camera. Không giữ lịch sử: khung cũ 200ms trước đã
    // vô nghĩa, lớp phủ chỉ vẽ cái mới nhất.
    const [frames, setFrames] = useState<Record<string, MotionFrame>>({});
    const [connected, setConnected] = useState(false);
    const seqRef = useRef(0);
    const socketRef = useRef<WebSocket | null>(null);

    // Danh sách camera dạng CHUỖI để so sánh — truyền mảng thì mỗi lần render là
    // một tham chiếu mới, effect sẽ chạy lại và đăng ký lại 60 lần/giây.
    const frameKey = (frameCameraIds ?? []).join(",");
    // Ref để effect KẾT NỐI đọc được giá trị mới nhất mà không cần frameKey
    // trong deps: có nó trong deps thì mỗi lần đổi bố cục tường là đóng/mở lại
    // socket, trong khi chỉ cần gửi một dòng đăng ký mới.
    const frameKeyRef = useRef(frameKey);

    // Dọn danh sách NGAY TRONG RENDER khi tắt/bật chip hoặc đổi camera, không
    // dùng effect: effect chạy sau khi đã vẽ nên sẽ loé lên một khung mang sự
    // kiện của camera cũ (và eslint react-hooks/set-state-in-effect chặn thẳng).
    const feedKey = `${active ? 1 : 0}|${cameraId ?? ""}`;
    const [lastKey, setLastKey] = useState(feedKey);
    if (feedKey !== lastKey) {
        setLastKey(feedKey);
        setEvents([]);
        setFrames({});
        setConnected(false);
    }

    useEffect(() => {
        if (!active) return;
        const baseUrl = resolveWebSocketOrigin(origin);
        if (!baseUrl) return;
        const url = `${baseUrl}/motion-events`;

        let closed = false;
        let socket: WebSocket | null = null;
        let timer = 0;

        const connect = () => {
            if (closed) return;
            try {
                socket = new WebSocket(url);
            } catch {
                timer = window.setTimeout(connect, RECONNECT_MS);
                return;
            }
            const opened = socket;
            socketRef.current = opened;
            opened.onopen = () => {
                if (closed) return;
                setConnected(true);
                // Đăng ký ngay khi mở: engine mặc định không gửi khung nào.
                try {
                    opened.send(frameKeyRef.current);
                } catch {
                    /* socket vừa chết */
                }
            };
            socket.onmessage = (e) => {
                if (closed) return;
                try {
                    const raw = JSON.parse(String(e.data)) as {
                        type?: string;
                        cameraId?: string;
                        startAt?: string;
                        endAt?: string;
                        cells?: string;
                        inside?: string;
                        outside?: string;
                        gridX?: number;
                        gridY?: number;
                    };
                    if (!raw || typeof raw.cameraId !== "string" || !raw.cameraId) return;
                    if (cameraId && raw.cameraId !== cameraId) return;

                    if (raw.type === "frame") {
                        const frame: MotionFrame = {
                            cameraId: raw.cameraId,
                            inside: String(raw.inside ?? ""),
                            outside: String(raw.outside ?? ""),
                            gridX: Number(raw.gridX) || 32,
                            gridY: Number(raw.gridY) || 32,
                            atMs: Date.now(),
                        };
                        setFrames((prev) => ({ ...prev, [frame.cameraId]: frame }));
                        return;
                    }

                    const startMs = parseServerTime(raw.startAt);
                    if (!Number.isFinite(startMs)) return;
                    const endMs = parseServerTime(raw.endAt);

                    const item: MotionFeedEvent = {
                        // Engine không gửi id (bản ghi DB được tạo SAU khi bắn),
                        // nên khoá tự sinh — chỉ dùng để React phân biệt hàng.
                        key: `motion-${(seqRef.current += 1)}`,
                        cameraId: raw.cameraId,
                        startMs,
                        endMs: Number.isFinite(endMs) ? endMs : startMs,
                        cells: String(raw.cells ?? ""),
                        gridX: Number(raw.gridX) || 10,
                        gridY: Number(raw.gridY) || 10,
                    };
                    setEvents((prev) => [item, ...prev].slice(0, MAX_EVENTS));
                } catch {
                    /* gói hỏng: bỏ qua */
                }
            };
            socket.onclose = () => {
                if (closed) return;
                setConnected(false);
                timer = window.setTimeout(connect, RECONNECT_MS);
            };
            socket.onerror = () => {
                try {
                    socket?.close();
                } catch {
                    /* đã đóng */
                }
            };
        };

        connect();

        return () => {
            closed = true;
            if (timer) window.clearTimeout(timer);
            if (socket) {
                socket.onclose = null;
                socket.onerror = null;
                socket.onmessage = null;
                try {
                    socket.close();
                } catch {
                    /* đã đóng */
                }
            }
        };
    }, [origin, active, cameraId]);

    // Đổi danh sách camera trong lúc socket đang mở (đổi bố cục tường, kéo thả
    // ô) thì chỉ gửi lại đăng ký, KHÔNG mở lại socket.
    useEffect(() => {
        frameKeyRef.current = frameKey;
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        try {
            socket.send(frameKey);
        } catch {
            /* socket vừa chết */
        }
    }, [frameKey]);

    return { events, frames, connected };
}
