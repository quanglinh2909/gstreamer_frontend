import { useCallback, useEffect, useRef, useState } from "react";

// Phóng to bằng lăn chuột, lấy con trỏ làm tâm — như bản đồ.
//
// Đây là zoom SỐ ở phía trình duyệt: chỉ phóng ảnh đã nhận, không yêu cầu
// camera đổi vùng nhìn. Xem chi tiết thì nét ảnh phụ thuộc độ phân giải luồng
// đang phát, phóng quá sâu sẽ vỡ hạt — nên có trần kMaxScale.
//
// Toán học của "phóng tại con trỏ", với transform-origin đặt ở góc trên trái:
//
//     điểm trên màn hình = t + s * điểm trong ảnh
//
// Muốn điểm dưới con trỏ đứng yên khi đổi tỉ lệ s -> s', giải ra:
//
//     t' = c - (s'/s) * (c - t)        (c = toạ độ con trỏ trong khung)
//
// Không giữ đẳng thức này thì ảnh trượt đi mỗi lần lăn và người dùng phải rà
// lại vị trí sau từng nấc — cảm giác "trôi" rất khó chịu.

const kMinScale = 1;
const kMaxScale = 8;
// Mỗi nấc lăn đổi tỉ lệ bao nhiêu. 1.2 cho cảm giác bám tay mà vẫn tới nơi
// nhanh; nhỏ hơn phải lăn quá nhiều, lớn hơn thì nhảy vọt khó canh.
const kZoomStep = 1.2;

export type ZoomTransform = {
    scale: number;
    x: number;
    y: number;
};

const identity: ZoomTransform = { scale: 1, x: 0, y: 0 };

export function usePointerZoom<T extends HTMLElement>() {
    const containerRef = useRef<T>(null);
    const [transform, setTransform] = useState<ZoomTransform>(identity);
    const [isPanning, setIsPanning] = useState(false);
    // Giữ trong ref để handler chuột (đăng ký một lần) luôn đọc được giá trị
    // mới nhất mà không phải đăng ký lại mỗi lần state đổi.
    const transformRef = useRef<ZoomTransform>(identity);
    const panRef = useRef<{ pointerId: number; startX: number; startY: number } | null>(null);

    const apply = useCallback((next: ZoomTransform) => {
        transformRef.current = next;
        setTransform(next);
    }, []);

    // Ghì ảnh trong khung: không có bước này thì kéo/phóng sẽ để lộ dải trống
    // ở mép và ảnh có thể trôi hẳn ra ngoài, không tìm lại được.
    const clamp = useCallback((next: ZoomTransform, width: number, height: number) => {
        if (next.scale <= kMinScale) return identity;
        const minX = width - next.scale * width;
        const minY = height - next.scale * height;
        return {
            scale: next.scale,
            x: Math.min(0, Math.max(minX, next.x)),
            y: Math.min(0, Math.max(minY, next.y)),
        };
    }, []);

    const reset = useCallback(() => apply(identity), [apply]);

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;

        // Đăng ký thủ công với passive:false. React gắn onWheel ở dạng passive
        // nên preventDefault trong đó vô hiệu — lăn chuột sẽ cuộn cả trang
        // thay vì phóng ảnh.
        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            const rect = element.getBoundingClientRect();
            const cursorX = event.clientX - rect.left;
            const cursorY = event.clientY - rect.top;

            const current = transformRef.current;
            const factor = event.deltaY < 0 ? kZoomStep : 1 / kZoomStep;
            const scale = Math.min(kMaxScale, Math.max(kMinScale, current.scale * factor));
            if (scale === current.scale) return;

            const ratio = scale / current.scale;
            apply(
                clamp(
                    {
                        scale,
                        x: cursorX - ratio * (cursorX - current.x),
                        y: cursorY - ratio * (cursorY - current.y),
                    },
                    rect.width,
                    rect.height,
                ),
            );
        };

        element.addEventListener("wheel", onWheel, { passive: false });

        // Khung đổi kích thước (vào/ra toàn màn hình, đổi cỡ cửa sổ) thì các
        // mốc x/y tính theo cỡ cũ không còn ghì được ảnh: phóng 3x trong thẻ
        // nhỏ rồi bung toàn màn hình sẽ hở một mảng nền đen. Ghì lại theo cỡ
        // mới ngay khi có thay đổi.
        const observer = new ResizeObserver((entries) => {
            const box = entries[0]?.contentRect;
            if (!box || transformRef.current.scale <= kMinScale) return;
            apply(clamp(transformRef.current, box.width, box.height));
        });
        observer.observe(element);

        return () => {
            element.removeEventListener("wheel", onWheel);
            observer.disconnect();
        };
    }, [apply, clamp]);

    const onPointerDown = useCallback((event: React.PointerEvent<T>) => {
        if (transformRef.current.scale <= kMinScale) return;
        const element = containerRef.current;
        if (!element) return;
        element.setPointerCapture(event.pointerId);
        panRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX - transformRef.current.x,
            startY: event.clientY - transformRef.current.y,
        };
        setIsPanning(true);
    }, []);

    const onPointerMove = useCallback(
        (event: React.PointerEvent<T>) => {
            const pan = panRef.current;
            const element = containerRef.current;
            if (!pan || !element || pan.pointerId !== event.pointerId) return;
            const rect = element.getBoundingClientRect();
            apply(
                clamp(
                    {
                        scale: transformRef.current.scale,
                        x: event.clientX - pan.startX,
                        y: event.clientY - pan.startY,
                    },
                    rect.width,
                    rect.height,
                ),
            );
        },
        [apply, clamp],
    );

    const endPan = useCallback((event: React.PointerEvent<T>) => {
        const pan = panRef.current;
        if (!pan || pan.pointerId !== event.pointerId) return;
        containerRef.current?.releasePointerCapture(event.pointerId);
        panRef.current = null;
        setIsPanning(false);
    }, []);

    return {
        containerRef,
        transform,
        isZoomed: transform.scale > kMinScale,
        isPanning,
        reset,
        // Đổ thẳng vào phần tử khung nhìn.
        panHandlers: {
            onPointerDown,
            onPointerMove,
            onPointerUp: endPan,
            onPointerCancel: endPan,
        },
    };
}
