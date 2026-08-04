import { useCallback, useEffect, useMemo, useState } from "react";
import { cameraApi } from "@/backend-api/camera-api";
import type { ICameraResponse } from "@/interface/camera";
import { fetchMotionEvents, type MotionEvent } from "@/lib/recordings";

// Bộ máy của trang "Sự kiện chuyển động".
//
// KHÔNG dùng lại useEventManager: sự kiện chuyển động đến từ ENGINE C++ chứ
// không phải backend Python, là một KHOẢNG thời gian chứ không phải một thời
// điểm, và API của nó lọc theo khoảng chứ không phân trang. Ép chung một hook
// sẽ phải cắm if("motion") vào gần như mọi dòng của hook kia.
//
// Cái được dùng chung nằm ở chỗ khác và đúng chỗ hơn: MotionFeedRow (thẻ sự
// kiện) và MotionCellsOverlay, cùng dùng với bảng sự kiện của trang Xem lại.

export const MOTION_PAGE_SIZE = 24;

function startOfDay(value: string): number {
    const ms = new Date(`${value}T00:00:00`).getTime();
    return Number.isNaN(ms) ? NaN : ms;
}

function todayInput(): string {
    // Định dạng theo giờ ĐỊA PHƯƠNG, không dùng toISOString: cách kia đổi sang
    // UTC nên từ 07:00 trở về trước ở giờ Việt Nam sẽ ra ngày hôm trước.
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function useMotionEventManager(
    // Tab chuyển động đang mở hay không. Tắt thì KHÔNG gọi engine: mỗi lần vào
    // trang Sự kiện mà nạp sẵn cả ngày sự kiện chuyển động của một camera là
    // trả tiền cho thứ đa số lần không ai xem.
    active = true,
) {
    const [cameras, setCameras] = useState<ICameraResponse[]>([]);
    const [selectedCameraId, setSelectedCameraId] = useState("");
    const [day, setDay] = useState(todayInput);
    const [events, setEvents] = useState<MotionEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const [visibleCount, setVisibleCount] = useState(MOTION_PAGE_SIZE);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            try {
                const { data } = await cameraApi.getCameras(100, 0);
                if (cancelled) return;
                const list = Array.isArray(data) ? (data as ICameraResponse[]) : [];
                setCameras(list);
                // Engine đòi MỘT camera cho endpoint này (không có API "mọi
                // camera"), nên phải tự chọn sẵn một cái — ưu tiên camera đang
                // bật phát hiện chuyển động, vì camera tắt thì chắc chắn rỗng.
                setSelectedCameraId(
                    (current) =>
                        current || list.find((c) => c.motionEnabled)?.id || list[0]?.id || "",
                );
            } catch (error) {
                if (!cancelled) {
                    setErrorMessage(
                        error instanceof Error ? error.message : "Không tải được danh sách camera.",
                    );
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!active || !selectedCameraId) return;
        const from = startOfDay(day);
        if (!Number.isFinite(from)) return;
        const to = from + 24 * 3600 * 1000;

        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            setErrorMessage("");
            setVisibleCount(MOTION_PAGE_SIZE);
            try {
                const list = await fetchMotionEvents(selectedCameraId, from, to);
                if (cancelled) return;
                // Mới nhất lên đầu — fetchMotionEvents trả theo thứ tự tăng dần
                // (timeline cần thế), còn bảng sự kiện thì ngược lại.
                setEvents([...list].reverse());
            } catch (error) {
                if (!cancelled) {
                    setErrorMessage(
                        error instanceof Error ? error.message : "Không tải được sự kiện chuyển động.",
                    );
                    setEvents([]);
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        // setTimeout(…, 0) chứ không gọi thẳng: đặt state ĐỒNG BỘ trong thân
        // effect làm React render lại dây chuyền (react-hooks/set-state-in-effect),
        // và StrictMode chạy effect hai lần nên nó gọi API hai lượt.
        const timer = window.setTimeout(() => {
            void load();
        }, 0);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [active, selectedCameraId, day, refreshKey]);

    const visibleEvents = useMemo(
        () => events.slice(0, visibleCount),
        [events, visibleCount],
    );

    return {
        cameras,
        selectedCameraId,
        day,
        events,
        visibleEvents,
        hasMore: visibleCount < events.length,
        isLoading,
        errorMessage,
        selectCamera: setSelectedCameraId,
        selectDay: setDay,
        showMore: useCallback(() => setVisibleCount((n) => n + MOTION_PAGE_SIZE), []),
        refresh: useCallback(() => setRefreshKey((k) => k + 1), []),
    };
}

export type MotionEventManager = ReturnType<typeof useMotionEventManager>;
