import { useEffect, useMemo, useState } from "react";

// Số người đang xem WebRTC, đọc từ engine C++ qua proxy backend-process.
// Engine giữ sẵn sổ phiên (mỗi tab đang xem = một phiên); ở đây chỉ hỏi định
// kỳ để hiện badge "đang xem" cạnh mỗi camera. Xem WebRtcController.hpp
// (GET /webrtc/viewers).

export interface ViewerSession {
    sessionId: string;
    cameraId: string;
    clientAddr: string; // IP trình duyệt (có thể rỗng)
    codec: string;
    mode: "live" | "playback";
    connected: boolean;
    ageMs: number;
    ageSeconds: number;
    rtpPackets: number;
}

interface ViewersResponse {
    total: number;
    live: number;
    playback: number;
    sessions: ViewerSession[];
}

interface UseLiveViewers {
    // Số người xem TRỰC TIẾP theo cameraId (không tính phiên xem lại).
    liveByCamera: Map<string, number>;
    // Toàn bộ phiên, nếu nơi gọi cần chi tiết (IP, thời lượng...).
    sessions: ViewerSession[];
    totalLive: number;
}

const EMPTY: UseLiveViewers = {
    liveByCamera: new Map(),
    sessions: [],
    totalLive: 0,
};

// pollMs=0 tắt hẳn việc hỏi (dùng khi component không hiển thị).
export function useLiveViewers(pollMs = 5000): UseLiveViewers {
    const [data, setData] = useState<ViewersResponse | null>(null);

    useEffect(() => {
        if (pollMs <= 0) return;
        let alive = true;
        const controller = new AbortController();

        const tick = async () => {
            try {
                const res = await fetch("/api/backend-process/webrtc/viewers", {
                    signal: controller.signal,
                });
                if (!res.ok) return;
                const json = (await res.json()) as ViewersResponse;
                if (alive) setData(json);
            } catch {
                // Engine tạm không trả lời (restart, mất mạng): giữ số cũ, thử
                // lại nhịp sau. Không xoá về 0 để badge khỏi nhấp nháy.
            }
        };

        tick();
        const timer = setInterval(tick, pollMs);
        return () => {
            alive = false;
            controller.abort();
            clearInterval(timer);
        };
    }, [pollMs]);

    return useMemo(() => {
        if (!data) return EMPTY;
        const liveByCamera = new Map<string, number>();
        for (const s of data.sessions) {
            if (s.mode !== "live") continue;
            liveByCamera.set(s.cameraId, (liveByCamera.get(s.cameraId) ?? 0) + 1);
        }
        return { liveByCamera, sessions: data.sessions, totalLive: data.live };
    }, [data]);
}
