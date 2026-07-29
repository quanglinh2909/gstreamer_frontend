import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RecognitionEvent, RecognitionEventTab } from "@/interface/recognition-event";
import { getEventSocketUrl } from "@/lib/event-view-model";
import type { FeedTab } from "@/lib/event-feed-shared";
import { faceRecognitionApi } from "@/backend-api/face-recognition-api";
import { plateRecognitionApi } from "@/backend-api/plate-recognition-api";
import { restrictedAreaApi } from "@/backend-api/restricted-area-api";

// Dòng sự kiện của MỘT camera cho trang Xem lại: gộp REALTIME (websocket, lọc
// theo camera ngay ở backend) với LỊCH SỬ (REST phân trang, cuộn xuống tải
// thêm). Khác `useLiveEventFeed` của tường Live View — cái đó chỉ realtime, mở
// mọi camera rồi lọc phía hiển thị; ở đây socket đã ràng buộc `?camera_id=` nên
// chỉ nhận đúng camera đang xem lại.

export type FeedEvent = {
    key: string;
    tab: FeedTab;
    event: RecognitionEvent;
};

const SOCKET_TABS: FeedTab[] = ["face", "plate", "restricted", "mask"];
// Chỉ 3 loại này có bảng DB để phân trang lịch sử. Khẩu trang (mask) KHÔNG lưu
// DB (ảnh đi inline base64 qua ws) nên chỉ xuất hiện từ realtime trở đi.
const HISTORY_TABS: RecognitionEventTab[] = ["face", "plate", "restricted"];
const HISTORY_PAGE_SIZE = 15;
const MAX_LIVE = 60;
const RECONNECT_MS = 2000;

const historyApi = {
    face: faceRecognitionApi,
    plate: plateRecognitionApi,
    restricted: restrictedAreaApi,
} as const;

type PageState = { next: number; pages: number };
const initialPages = (): Record<RecognitionEventTab, PageState> => ({
    // pages=1 để lần tải ĐẦU (next=1<=1) chạy cho mọi loại; số trang thật cập
    // nhật sau phản hồi.
    face: { next: 1, pages: 1 },
    plate: { next: 1, pages: 1 },
    restricted: { next: 1, pages: 1 },
});

export function useCameraEventFeed(origin: string, cameraId: string | null, active: boolean) {
    // Realtime đẩy vào đầu; lịch sử nối vào cuối. Tách hai danh sách rồi gộp +
    // khử trùng ở useMemo (một sự kiện realtime về sau có thể lặp lại trong
    // trang lịch sử — giữ bản realtime).
    const [live, setLive] = useState<FeedEvent[]>([]);
    const [history, setHistory] = useState<FeedEvent[]>([]);
    const [connected, setConnected] = useState(false);
    const [loadingInitial, setLoadingInitial] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);

    const seqRef = useRef(0);
    const pagesRef = useRef<Record<RecognitionEventTab, PageState>>(initialPages());
    const loadingRef = useRef(false);
    // Bảo vệ chống áp kết quả cũ khi đã đổi camera giữa chừng.
    const cameraIdRef = useRef<string | null>(cameraId);

    // ---- LỊCH SỬ: tải trang kế của mỗi loại còn dữ liệu ----
    const fetchMore = useCallback(async () => {
        const cam = cameraId;
        if (!cam || !active || loadingRef.current) return;
        const ps = pagesRef.current;
        const todo = HISTORY_TABS.filter((t) => ps[t].next <= ps[t].pages);
        if (todo.length === 0) return;

        const isInitial = HISTORY_TABS.every((t) => ps[t].next === 1);
        loadingRef.current = true;
        if (isInitial) setLoadingInitial(true);
        else setLoadingMore(true);

        try {
            const results = await Promise.all(
                todo.map(async (t) => {
                    try {
                        const res = await historyApi[t].events({
                            page: ps[t].next,
                            size: HISTORY_PAGE_SIZE,
                            camera_id: cam,
                        });
                        return { t, data: res.data };
                    } catch {
                        return { t, data: null };
                    }
                }),
            );

            // Camera đã đổi trong lúc chờ mạng -> bỏ kết quả này.
            if (cameraIdRef.current !== cam) return;

            const add: FeedEvent[] = [];
            for (const { t, data } of results) {
                if (!data) {
                    // Lỗi mạng: coi như loại này hết trang để không kẹt "còn nữa".
                    ps[t].pages = ps[t].next - 1;
                    continue;
                }
                ps[t].pages = Number(data.pages) || 0;
                ps[t].next = ps[t].next + 1;
                for (const ev of data.items ?? []) {
                    add.push({ key: `${t}-${ev.id}`, tab: t, event: ev });
                }
            }
            if (add.length > 0) setHistory((prev) => [...prev, ...add]);
            setHasMore(HISTORY_TABS.some((t) => ps[t].next <= ps[t].pages));
        } finally {
            loadingRef.current = false;
            setLoadingInitial(false);
            setLoadingMore(false);
        }
    }, [cameraId, active]);

    // Đổi camera (hoặc mở panel): dọn sạch, nạp lại trang đầu.
    useEffect(() => {
        cameraIdRef.current = cameraId;
        setLive([]);
        setHistory([]);
        pagesRef.current = initialPages();
        setHasMore(false);
        if (active && cameraId) void fetchMore();
    }, [cameraId, active, fetchMore]);

    // ---- REALTIME: 4 socket ràng buộc theo camera ----
    useEffect(() => {
        if (!active || !cameraId) {
            setConnected(false);
            return;
        }
        let closed = false;
        const alive: WebSocket[] = [];
        const timers: number[] = [];

        const openFor = (tab: FeedTab) => {
            const url = getEventSocketUrl(origin, tab, cameraId);
            if (!url) return;

            const connect = () => {
                if (closed) return;
                let ws: WebSocket;
                try {
                    ws = new WebSocket(url);
                } catch {
                    timers.push(window.setTimeout(connect, RECONNECT_MS));
                    return;
                }
                alive.push(ws);
                ws.onopen = () => {
                    if (!closed) setConnected(true);
                };
                ws.onmessage = (e) => {
                    if (closed) return;
                    try {
                        const ev = JSON.parse(String(e.data)) as RecognitionEvent;
                        if (!ev || typeof ev !== "object" || typeof ev.camera_id !== "string") {
                            return;
                        }
                        // Backend đã lọc theo camera, nhưng chốt lại cho chắc.
                        if (ev.camera_id !== cameraId) return;
                        const key = `${tab}-${ev.id ?? (seqRef.current += 1)}`;
                        setLive((prev) => {
                            if (prev.some((p) => p.key === key)) return prev;
                            return [{ key, tab, event: ev }, ...prev].slice(0, MAX_LIVE);
                        });
                    } catch {
                        /* gói hỏng: bỏ qua */
                    }
                };
                ws.onclose = () => {
                    if (closed) return;
                    timers.push(window.setTimeout(connect, RECONNECT_MS));
                };
                ws.onerror = () => {
                    try {
                        ws.close();
                    } catch {
                        /* đã đóng */
                    }
                };
            };
            connect();
        };

        SOCKET_TABS.forEach(openFor);

        return () => {
            closed = true;
            timers.forEach((t) => window.clearTimeout(t));
            alive.forEach((ws) => {
                ws.onclose = null;
                ws.onerror = null;
                ws.onmessage = null;
                try {
                    ws.close();
                } catch {
                    /* đã đóng */
                }
            });
        };
    }, [origin, cameraId, active]);

    // Gộp realtime + lịch sử, khử trùng theo `tab-id`, sắp xếp mới -> cũ.
    const events = useMemo(() => {
        const seen = new Set<string>();
        const out: FeedEvent[] = [];
        for (const e of live) {
            if (seen.has(e.key)) continue;
            seen.add(e.key);
            out.push(e);
        }
        for (const e of history) {
            if (seen.has(e.key)) continue;
            seen.add(e.key);
            out.push(e);
        }
        out.sort((a, b) => Number(b.event.timestamp) - Number(a.event.timestamp));
        return out;
    }, [live, history]);

    return { events, connected, hasMore, loadingInitial, loadingMore, loadMore: fetchMore };
}
