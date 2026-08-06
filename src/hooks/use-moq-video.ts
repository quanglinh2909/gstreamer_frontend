import { useCallback, useEffect, useRef, useState } from "react";

import {
    codecFromAnnexB,
    fetchMoqInfo,
    moqSupported,
    MoqSession,
    type MoqMode,
} from "@/lib/moq/client";

// Nhận khung qua MoQ rồi giải mã bằng WebCodecs, vẽ lên một <canvas>.
//
// Tách thành hook vì có HAI nơi cần đúng phần này mà chrome thì khác hẳn:
// trình phát trực tiếp (moq-player.tsx) và trình phát xem lại
// (playback-video.tsx, vốn đã có sẵn thanh điều khiển/seek/timeline). Nhét
// vòng giải mã vào cả hai là cách chắc chắn để chúng trôi lệch nhau.
//
// VÌ SAO CANVAS chứ không phải <video>: WebCodecs trả về VideoFrame rời rạc,
// không phải MediaStream. Muốn dùng <video> thì phải đóng gói lại thành fMP4
// và đi qua MSE — thêm một bộ mux trong JS và thêm độ trễ một đoạn, đổi lại
// chẳng được gì vì lớp phủ AI chỉ cần kích thước ảnh (canvas cũng có).

export type MoqVideoState = "connecting" | "playing" | "reconnecting" | "error";

const RETRY_DELAY_MS = 2500;
// Im lặng bao lâu thì coi là chết. Rộng tay: vào giữa một GOP dài thì không có
// khung nào trong hàng chục giây vẫn là hợp lệ.
const STALL_MS = 15000;

export function useMoqVideo({
    cameraId,
    mode = "live",
    enabled = true,
    getStartMs,
    getRate,
    onSessionId,
}: {
    cameraId: string;
    mode?: MoqMode;
    /** false = không mở kết nối nào (vd đang xem bằng WebRTC). */
    enabled?: boolean;
    /** Mốc mở phiên, đọc LÚC KẾT NỐI — nên nối lại là tiếp ở chỗ đang xem. */
    getStartMs?: () => number;
    getRate?: () => number;
    /** Id phiên bên engine, để gọi /playback/{id}/control. */
    onSessionId?: (sessionId: string) => void;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [state, setState] = useState<MoqVideoState>("connecting");
    const [errorMessage, setErrorMessage] = useState("");
    // Đổi số này là buộc mở lại phiên (dùng khi engine báo 404 cho phiên cũ).
    const [generation, setGeneration] = useState(0);

    const startRef = useRef(getStartMs);
    startRef.current = getStartMs;
    const rateRef = useRef(getRate);
    rateRef.current = getRate;
    const sessionCb = useRef(onSessionId);
    sessionCb.current = onSessionId;

    const restart = useCallback(() => setGeneration((n) => n + 1), []);

    const draw = useCallback((frame: VideoFrame) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            frame.close();
            return;
        }
        const width = frame.displayWidth;
        const height = frame.displayHeight;
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            // Lớp phủ AI nghe sự kiện này để đo lại vùng ảnh khi độ phân giải
            // luồng đổi giữa chừng — <video> bắn sẵn, canvas thì phải tự bắn.
            canvas.dispatchEvent(new Event("resize"));
        }
        const context = canvas.getContext("2d");
        if (context) context.drawImage(frame, 0, 0, width, height);
        frame.close();
    }, []);

    useEffect(() => {
        if (!cameraId || !enabled) return;

        let cancelled = false;
        let session: MoqSession | null = null;
        let decoder: VideoDecoder | null = null;
        let retryTimer = 0;
        let stallTimer = 0;
        let lastFrameAt = Date.now();

        const teardown = () => {
            window.clearInterval(stallTimer);
            stallTimer = 0;
            if (decoder && decoder.state !== "closed") {
                try {
                    decoder.close();
                } catch {
                    // đã đóng
                }
            }
            decoder = null;
            session?.closeNow();
            session = null;
        };

        const fail = (message: string, retry: boolean) => {
            if (cancelled) return;
            teardown();
            setErrorMessage(message);
            setState(retry ? "reconnecting" : "error");
            if (retry) {
                window.clearTimeout(retryTimer);
                retryTimer = window.setTimeout(() => void run(), RETRY_DELAY_MS);
            }
        };

        const run = async () => {
            if (cancelled) return;
            teardown();

            if (!moqSupported()) {
                fail(
                    "Trang này không ở secure context nên trình duyệt không có " +
                        "WebTransport. MoQ cần https hoặc localhost; mở bằng " +
                        "http://<địa-chỉ-ip> thì chỉ dùng được WebRTC.",
                    false,
                );
                return;
            }

            try {
                const info = await fetchMoqInfo();
                if (cancelled) return;
                session = await MoqSession.open(info);
                if (cancelled) return;
                const { sessionId } = await session.subscribe(mode, cameraId, {
                    atMs: startRef.current?.(),
                    rate: rateRef.current?.() ?? 1,
                });
                if (cancelled) return;
                sessionCb.current?.(sessionId);
            } catch (error) {
                fail(error instanceof Error ? error.message : String(error), true);
                return;
            }

            const active = session;
            let configured = false;
            decoder = new VideoDecoder({
                output: (frame) => {
                    lastFrameAt = Date.now();
                    if (!cancelled) {
                        setState("playing");
                        setErrorMessage("");
                    }
                    draw(frame);
                },
                error: (error) => fail(`Lỗi giải mã: ${error.message}`, true),
            });

            lastFrameAt = Date.now();
            stallTimer = window.setInterval(() => {
                if (Date.now() - lastFrameAt > STALL_MS) {
                    fail("Luồng đứng hình, đang kết nối lại...", true);
                }
            }, 3000);

            try {
                for await (const frame of active.frames()) {
                    if (cancelled || !decoder || decoder.state === "closed") break;
                    if (!configured) {
                        // Bỏ mọi thứ trước keyframe đầu tiên: P-frame tham chiếu
                        // khung chưa có chỉ ra hình vỡ cho tới IDR kế tiếp.
                        if (!frame.keyframe) continue;
                        decoder.configure({
                            // Không có `description` = bitstream Annex-B, đúng
                            // dạng engine bơm (caps byte-stream/alignment=au).
                            codec: codecFromAnnexB(frame.data),
                            optimizeForLatency: true,
                        });
                        configured = true;
                    }
                    decoder.decode(
                        new EncodedVideoChunk({
                            type: frame.keyframe ? "key" : "delta",
                            timestamp: frame.ptsUs,
                            data: frame.data,
                        }),
                    );
                }
                if (!cancelled) fail("Máy chủ MoQ đã đóng luồng", true);
            } catch (error) {
                if (!cancelled) {
                    fail(error instanceof Error ? error.message : String(error), true);
                }
            }
        };

        void run();

        // Đóng tab / tải lại trang KHÔNG chạy cleanup của effect. Phiên xem lại
        // nào bỏ quên là một PlaybackSource còn đang đọc file trong máy.
        const onPageHide = (event: PageTransitionEvent) => {
            if (!event.persisted) teardown();
        };
        window.addEventListener("pagehide", onPageHide);

        return () => {
            cancelled = true;
            window.clearTimeout(retryTimer);
            window.removeEventListener("pagehide", onPageHide);
            teardown();
        };
    }, [cameraId, mode, enabled, generation, draw]);

    return { canvasRef, state, errorMessage, restart };
}
