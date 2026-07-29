import { useEffect, useMemo, useRef, useState } from "react";
import type { OverlayBox } from "@/hooks/use-live-detections";

// Khung phát hiện ĐÃ LƯU, dùng khi XEM LẠI bản ghi. Khác `useLiveDetections`
// (websocket, khung nào biết khung đó): ở đây tải trước một CỬA SỔ quỹ đạo qua
// REST rồi tra theo con trỏ phát — vì xem lại có tua tới/lui và tua nhanh x64,
// không thể chờ dữ liệu chảy về theo thời gian thực.

type Sample = { t: number; b: number[]; s: number; k?: number[] | null };
type Track = {
    tid: number | null;
    ai_type?: string | null;
    class_id?: number | null;
    t_start: number;
    t_end: number;
    samples: Sample[];
};

// Tải trước bao nhiêu mili giây phía trước con trỏ. Nhân theo tốc độ tua: x64
// thì 60 giây nội dung trôi qua trong chưa đầy một giây thực.
const BASE_AHEAD_MS = 60_000;
const BEHIND_MS = 5_000;
// Nạp lại khi con trỏ còn cách mép cửa sổ đã tải dưới ngần này.
const REFETCH_MARGIN_MS = 15_000;
// Mẫu cách con trỏ quá xa thì coi như không có gì để vẽ (tránh khung "ma"
// đứng lại trong quãng không có phát hiện).
const MATCH_TOLERANCE_MS = 400;

export function usePlaybackDetections(
    cameraId: string | null,
    playMs: number,
    active: boolean,
    rate = 1,
) {
    const [tracks, setTracks] = useState<Track[]>([]);
    // Khoảng thời gian đang có dữ liệu trong bộ nhớ.
    const rangeRef = useRef<[number, number] | null>(null);
    const loadingRef = useRef(false);
    const cameraRef = useRef<string | null>(cameraId);

    useEffect(() => {
        cameraRef.current = cameraId;
        rangeRef.current = null;
        setTracks([]);
    }, [cameraId]);

    useEffect(() => {
        if (!active || !cameraId || !Number.isFinite(playMs)) return;
        const range = rangeRef.current;
        const ahead = BASE_AHEAD_MS * Math.max(1, Math.min(64, rate));
        // Còn dữ liệu phía trước thì thôi.
        if (
            range &&
            playMs >= range[0] &&
            playMs <= range[1] - REFETCH_MARGIN_MS
        ) {
            return;
        }
        if (loadingRef.current) return;
        loadingRef.current = true;

        const from = Math.round(playMs - BEHIND_MS);
        const to = Math.round(playMs + ahead);
        const cam = cameraId;
        const url =
            `/api/backend/detections/tracks?camera_id=${encodeURIComponent(cam)}` +
            `&from_ms=${from}&to_ms=${to}`;

        void fetch(url)
            .then((r) => (r.ok ? r.json() : []))
            .then((data: Track[]) => {
                // Đổi camera giữa chừng thì bỏ kết quả.
                if (cameraRef.current !== cam) return;
                rangeRef.current = [from, to];
                setTracks(Array.isArray(data) ? data : []);
            })
            .catch(() => {
                // Lỗi mạng: đánh dấu đã tải để khỏi dội request mỗi khung.
                if (cameraRef.current === cam) rangeRef.current = [from, to];
            })
            .finally(() => {
                loadingRef.current = false;
            });
    }, [cameraId, playMs, active, rate]);

    // Khung tại con trỏ hiện tại: mỗi track lấy mẫu gần playMs nhất.
    const boxes = useMemo<OverlayBox[]>(() => {
        if (!active || tracks.length === 0) return [];
        const out: OverlayBox[] = [];
        for (const tr of tracks) {
            if (playMs < tr.t_start - MATCH_TOLERANCE_MS) continue;
            if (playMs > tr.t_end + MATCH_TOLERANCE_MS) continue;
            // Tìm nhị phân mẫu gần nhất — track dài có hàng nghìn mẫu, quét
            // tuyến tính mỗi lần con trỏ nhích là quá phí.
            const s = tr.samples;
            let lo = 0;
            let hi = s.length - 1;
            while (lo < hi) {
                const mid = (lo + hi) >> 1;
                if (s[mid].t < playMs) lo = mid + 1;
                else hi = mid;
            }
            let best = s[lo];
            if (lo > 0 && Math.abs(s[lo - 1].t - playMs) < Math.abs(best.t - playMs)) {
                best = s[lo - 1];
            }
            if (!best || Math.abs(best.t - playMs) > MATCH_TOLERANCE_MS) continue;
            out.push({
                x1: best.b[0],
                y1: best.b[1],
                x2: best.b[2],
                y2: best.b[3],
                score: best.s,
                class_id: tr.class_id ?? undefined,
                tid: tr.tid ?? undefined,
                kps: best.k ?? undefined,
                aiType: tr.ai_type ?? undefined,
                jobId: String(tr.tid ?? "t"),
            });
        }
        return out;
    }, [tracks, playMs, active]);

    return boxes;
}
