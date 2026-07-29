// Truy vấn recording + ánh xạ thời-gian-tường ↔ vị-trí-phát cho timeline.
//
// Mọi endpoint recording nằm ở ENGINE C++ (cổng 8009) nên đi qua proxy
// "/api/backend-process" — KHÔNG phải "/api/backend" (backend Python).

const BASE = "/api/backend-process";

export interface RecordingSegment {
    id: string;
    cameraId: string;
    startAt: string;
    endAt: string;
    durationMs: number;
    hasMotion: boolean;
    motionEventId: string | null;
    status: string; // "complete" | "recording"
    // Được điền sau khi parse (epoch ms) để khỏi parse lại nhiều lần khi vẽ.
    startMs: number;
    endMs: number;
}

export interface MotionEvent {
    id: string;
    cameraId: string;
    startAt: string;
    endAt: string | null;
    maxScore: number;
    startMs: number;
    endMs: number;
}

// Postgres trả timestamptz kiểu "2026-07-23 03:39:54.12+00": đổi ' '→'T' và bù
// ":00" cho offset "+00" để Date của trình duyệt parse chắc chắn.
export function parseServerTime(value: string | null | undefined): number {
    if (!value) return NaN;
    let s = value.trim();
    if (s.length > 10 && s[10] === " ") s = s.slice(0, 10) + "T" + s.slice(11);
    const m = s.match(/([+-]\d{2})$/);
    if (m) s += ":00";
    const ms = Date.parse(s);
    return Number.isNaN(ms) ? NaN : ms;
}

// URL ảnh xem trước (một khung JPEG) tại mốc `atMs`. Engine giải mã keyframe
// gần nhất trước mốc. Client nên làm tròn atMs về bó ~10s trước khi gọi để các
// lần rê chuột gần nhau trùng URL (tái dùng cache trình duyệt + blob).
export function thumbnailUrl(cameraId: string, atMs: number, width = 160): string {
    return `${BASE}/cameras/${encodeURIComponent(cameraId)}/thumbnail?at=${Math.round(
        atMs,
    )}&w=${width}`;
}

function withRange(url: string, fromMs: number, toMs: number): string {
    // KHÔNG encodeURIComponent mốc thời gian: nó đổi ':' -> '%3A', mà rewrite
    // của Next chuyển tiếp nguyên chuỗi còn engine không giải mã lại -> Postgres
    // nhận "%3A" và báo lỗi timestamp. Dấu ':' vốn hợp lệ trong phần query.
    const from = new Date(fromMs).toISOString();
    const to = new Date(toMs).toISOString();
    return `${url}?from=${from}&to=${to}`;
}

export async function fetchSegments(
    cameraId: string,
    fromMs: number,
    toMs: number,
): Promise<RecordingSegment[]> {
    const res = await fetch(
        withRange(`${BASE}/cameras/${encodeURIComponent(cameraId)}/recordings`, fromMs, toMs),
    );
    if (!res.ok) return [];
    const raw = (await res.json()) as RecordingSegment[];
    return (Array.isArray(raw) ? raw : [])
        .map((s) => ({
            ...s,
            startMs: parseServerTime(s.startAt),
            endMs: parseServerTime(s.endAt),
        }))
        .filter((s) => Number.isFinite(s.startMs) && Number.isFinite(s.endMs))
        .sort((a, b) => a.startMs - b.startMs);
}

// Đoạn ghi CHỨA mốc giờ này, hoặc null nếu lúc đó camera không ghi.
//
// Phải là "chứa", không phải "có đoạn nào kết thúc sau mốc này": các đoạn ghi
// có KHE HỞ giữa chúng (camera mất mạng, hết dung lượng, mới bật ghi…). Kiểm
// tra kiểu lỏng lẻo kia cho qua cả những cú bấm rơi đúng vào khe hở, và người
// dùng bị nhảy tới một chỗ không có gì để xem.
export function segmentCovering(
    segments: RecordingSegment[],
    wallMs: number,
): RecordingSegment | null {
    for (const s of segments) {
        if (s.startMs <= wallMs && wallMs <= s.endMs) return s;
    }
    return null;
}

export async function fetchMotionEvents(
    cameraId: string,
    fromMs: number,
    toMs: number,
): Promise<MotionEvent[]> {
    const res = await fetch(
        withRange(`${BASE}/cameras/${encodeURIComponent(cameraId)}/motion-events`, fromMs, toMs),
    );
    if (!res.ok) return [];
    const raw = (await res.json()) as MotionEvent[];
    return (Array.isArray(raw) ? raw : [])
        .map((e) => ({
            ...e,
            startMs: parseServerTime(e.startAt),
            // Sự kiện chưa kết thúc (end_at null) coi như kéo tới hiện tại.
            endMs: e.endAt ? parseServerTime(e.endAt) : Date.now(),
        }))
        .filter((e) => Number.isFinite(e.startMs))
        .sort((a, b) => a.startMs - b.startMs);
}
