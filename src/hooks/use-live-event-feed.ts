import { useEffect, useRef, useState } from "react";
import type { RecognitionEvent } from "@/interface/recognition-event";
import { getEventSocketUrl } from "@/lib/event-view-model";
import type { FeedTab } from "@/lib/event-feed-shared";

// FeedTab dùng chung với trang Xem lại — định nghĩa ở event-feed-shared.
export type { FeedTab };

// Đọc REALTIME cả BA loại sự kiện cùng lúc cho panel bên phải trang Xem trực
// tiếp. Khác `useEventManager`/`useEventSocketStore` (chỉ mở MỘT socket theo tab
// đang xem, phục vụ trang /events có phân trang): ở đây ta mở SONG SONG cả ba
// socket và gộp thành một dòng sự kiện chung, không phân trang, chỉ giữ N mục
// mới nhất. Lọc theo loại/camera làm ở phía hiển thị (tức thì, không đóng mở
// lại socket).

export type FeedEvent = {
    key: string;
    tab: FeedTab;
    event: RecognitionEvent;
    receivedAt: number;
};

const TABS: FeedTab[] = ["face", "plate", "restricted", "mask"];
const MAX_EVENTS = 80;
const RECONNECT_MS = 2000;

// active=false thì đóng hết socket (panel đang thu gọn) để khỏi giữ kết nối thừa.
export function useLiveEventFeed(origin: string, active: boolean) {
    const [events, setEvents] = useState<FeedEvent[]>([]);
    const [connected, setConnected] = useState(false);
    const seqRef = useRef(0);

    useEffect(() => {
        if (!active) {
            setEvents([]);
            setConnected(false);
            return;
        }
        let closed = false;
        const alive: WebSocket[] = [];
        const timers: number[] = [];

        const openFor = (tab: FeedTab) => {
            const url = getEventSocketUrl(origin, tab);
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
                        // Tin cậy backend nhưng vẫn chặn gói rác: cần camera_id.
                        if (!ev || typeof ev !== "object" || typeof ev.camera_id !== "string") {
                            return;
                        }
                        const key = `${tab}-${ev.id ?? "x"}-${(seqRef.current += 1)}`;
                        setEvents((prev) =>
                            [{ key, tab, event: ev, receivedAt: Date.now() }, ...prev].slice(
                                0,
                                MAX_EVENTS,
                            ),
                        );
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

        TABS.forEach(openFor);

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
    }, [origin, active]);

    return { events, connected };
}
