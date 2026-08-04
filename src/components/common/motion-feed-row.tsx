import { useEffect, useRef, useState } from "react";
import { Activity, Camera, CornerDownLeft } from "lucide-react";
import { motionEventImageUrl, thumbnailUrl } from "@/lib/recordings";
import { cn, MOTION_META } from "@/lib/event-feed-shared";
import { MotionCellsOverlay } from "./motion-cells-overlay";

// Một thẻ sự kiện CHUYỂN ĐỘNG trong bảng sự kiện (Xem trực tiếp + Xem lại).
//
// Khung hình lấy theo thứ tự ưu tiên:
//
//   1. ẢNH CỦA CHÍNH SỰ KIỆN (`eventId`) — engine chụp một khung lúc sự kiện bắt
//      đầu và lưu cùng hàng, giống hệt sự kiện nhận dạng. Đây là đường đúng: nó
//      còn dùng được cả khi camera không bật ghi và cả sau khi bản ghi đã bị dọn
//      dung lượng xoá.
//   2. thumbnail trích từ BẢN GHI tại mốc bắt đầu — đường lùi cho sự kiện
//      realtime (chưa có id vì engine bắn WebSocket trước khi ghi DB) và cho
//      những sự kiện cũ ghi bởi bản chưa có ảnh.
//
// Hỏng cả hai thì rơi về nền tối và vẫn vẽ ô — vị trí chuyển động vẫn đọc được,
// chỉ thiếu cảnh nền.

// Sự kiện VỪA XẢY RA gần như luôn 404: engine chỉ trích khung từ đoạn ghi đã
// 'complete', mà đoạn chứa mốc đó còn đang được ghi. Đo trực tiếp trên máy: cùng
// một mốc, gọi lúc này 404 — gọi lại sau khi đoạn đóng thì 200. Nên thử LẠI một
// lần thay vì kết luận "không có bản ghi" ngay.
const RETRY_MS = 90_000; // đoạn 60s + biên
const RETRY_MAX_AGE_MS = 5 * 60_000; // cũ hơn thế thì 404 là thật, không phải do sát live

function clockLabel(ms: number): string {
    if (!Number.isFinite(ms)) return "--:--:--";
    return new Date(ms).toLocaleTimeString("vi-VN", { hour12: false });
}

function durationLabel(startMs: number, endMs: number): string {
    const sec = Math.max(0, Math.round((endMs - startMs) / 1000));
    if (sec < 60) return `${sec}s`;
    return `${Math.floor(sec / 60)}m${String(sec % 60).padStart(2, "0")}s`;
}

export function MotionFeedRow({
    cameraId,
    eventId,
    cameraLabel,
    startMs,
    endMs,
    cells,
    gridX,
    gridY,
    cellCount,
    onSeek,
}: {
    cameraId: string;
    // Id hàng motion_events. Bỏ trống với sự kiện realtime — lúc đó engine chưa
    // ghi DB nên chưa có id, và thẻ rơi về thumbnail của bản ghi.
    eventId?: string;
    // Bỏ trống ở trang Xem lại: cả bảng đã là một camera, lặp tên ở từng thẻ chỉ tốn chỗ.
    cameraLabel?: string;
    startMs: number;
    endMs: number;
    cells: string;
    gridX: number;
    gridY: number;
    cellCount: number;
    onSeek?: () => void;
}) {
    const [imgError, setImgError] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const retryRef = useRef<number | null>(null);
    // Làm tròn về bó 10s để nhiều thẻ gần nhau trùng URL và dùng lại cache ảnh
    // của trình duyệt — giống cách timeline gọi thumbnail lúc rê chuột.
    const atMs = Math.round(startMs / 10_000) * 10_000;
    const Wrapper = onSeek ? "button" : "div";

    useEffect(
        () => () => {
            if (retryRef.current) window.clearTimeout(retryRef.current);
        },
        [],
    );

    // attempt 0 = ảnh của chính sự kiện (nếu có id) hoặc thumbnail;
    // attempt 1 = thumbnail thử lại sau khi đoạn ghi đã đóng.
    const useEventImage = Boolean(eventId) && attempt === 0;
    const imageSrc = useEventImage
        ? motionEventImageUrl(eventId as string)
        : `${thumbnailUrl(cameraId, atMs, 320)}${attempt ? `&r=${attempt}` : ""}`;

    const handleImgError = () => {
        // Sự kiện có id nhưng ảnh mất (bản cũ chưa có ảnh, hoặc file đã bị dọn
        // dung lượng xoá) -> thử tiếp đường thumbnail thay vì bó tay ngay.
        if (attempt === 0 && (eventId || Date.now() - startMs < RETRY_MAX_AGE_MS)) {
            const delay = eventId ? 0 : RETRY_MS;
            retryRef.current = window.setTimeout(() => setAttempt(1), delay);
            return;
        }
        setImgError(true);
    };

    return (
        <li>
            <Wrapper
                {...(onSeek
                    ? {
                          type: "button" as const,
                          onClick: onSeek,
                          title: "Nhảy tới đoạn ghi của chuyển động này",
                      }
                    : {})}
                className={cn(
                    "group block w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-800/30 text-left shadow-sm transition-colors",
                    onSeek
                        ? "hover:border-violet-600/70 hover:bg-slate-800/60"
                        : "hover:border-slate-600",
                )}
            >
                {/* KHÔNG chốt chiều cao rồi object-contain: hộp 342×160 mà ảnh
                    16:9 chỉ vẽ 284px bề ngang, lớp phủ bám hộp thì mọi ô lệch
                    29px mỗi bên (đã đo). Để `h-auto w-full` cho khung ôm ĐÚNG
                    ảnh — inset-0 khi đó trùng khít khung hình. */}
                {/* aspect-video CHỈ khi chưa có ảnh: lúc đó `h-auto` của <img>
                    cho chiều cao 0, không có nó thì thẻ sập xuống còn mỗi dòng
                    chữ. Ảnh về rồi thì bỏ, để khung ôm đúng ảnh (xem ghi chú
                    lệch hộp ở dưới). */}
                <div className={cn("relative w-full bg-slate-950", !loaded && "aspect-video")}>
                    {!imgError ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            // `r=` chỉ để đổi URL cho lần thử lại — trình duyệt
                            // đang giữ kết quả hỏng của URL cũ.
                            src={imageSrc}
                            alt={`Chuyển động lúc ${clockLabel(startMs)}`}
                            onError={handleImgError}
                            onLoad={() => setLoaded(true)}
                            // BẮT BUỘC phải lazy: mỗi ảnh là một lần engine
                            // GIẢI MÃ keyframe từ file .ts, mà đo trên camera
                            // thật được ~80 sự kiện/giờ (54 sự kiện trong 40
                            // phút) — một ngày là gần 2000 thẻ. Tải hết một
                            // lượt là ném ngần ấy job giải mã vào engine chỉ vì
                            // người dùng mở bảng sự kiện.
                            loading="lazy"
                            decoding="async"
                            className="block h-auto w-full"
                        />
                    ) : null}

                    {/* Chưa có ảnh: nói rõ đang chờ hay đã bó tay. Vẫn giữ
                        khung 16:9 để các ô rơi đúng vị trí tương đối. */}
                    {!loaded ? (
                        <span className="absolute inset-0 flex items-center justify-center px-4 text-center text-[11px] text-slate-600">
                            {imgError
                                ? "Không có bản ghi để trích khung hình"
                                : attempt > 0
                                  ? "Đang chờ đoạn ghi đóng lại…"
                                  : ""}
                        </span>
                    ) : null}

                    {/* Ô đã động — luôn vẽ, kể cả khi không lấy được khung hình */}
                    <MotionCellsOverlay cells={cells} gridX={gridX} gridY={gridY} />

                    <span
                        className={cn(
                            "absolute left-2 top-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset backdrop-blur-sm",
                            MOTION_META.badge,
                        )}
                    >
                        <Activity size={11} aria-hidden="true" />
                        {MOTION_META.label}
                    </span>

                    <span className="absolute right-2 top-2 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white/95 backdrop-blur-sm">
                        {cellCount} ô
                    </span>

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-2 pt-6">
                        <p className="truncate text-sm font-semibold text-white">
                            {clockLabel(startMs)} · {durationLabel(startMs, endMs)}
                        </p>
                        <p className="flex items-center gap-1 text-[11px] text-white/70">
                            {cameraLabel ? (
                                <>
                                    <Camera size={11} className="shrink-0" aria-hidden="true" />
                                    <span className="truncate">{cameraLabel}</span>
                                </>
                            ) : (
                                <span className="truncate">đến {clockLabel(endMs)}</span>
                            )}
                            {onSeek ? (
                                <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-violet-300 opacity-0 transition-opacity group-hover:opacity-100">
                                    <CornerDownLeft size={11} /> Xem lại
                                </span>
                            ) : null}
                        </p>
                    </div>
                </div>
            </Wrapper>
        </li>
    );
}
