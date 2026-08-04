import { useCallback, useEffect, useRef, useState } from "react";
import {
    Camera as CameraIcon,
    Clock3,
    Edit3,
    Eye,
    Maximize2,
    Minimize2,
    Square,
    Trash2,
} from "lucide-react";
import { WebRtcPlayer } from "@/components/common/webrtc-player";
import type { ICameraResponse } from "@/interface/camera";
import type { RecordingToggleKind } from "./recording-toggle-modal";
import { formatCameraDate, getCameraHealth } from "@/lib/camera-view-model";
import { healthStyles, recordingModes } from "./camera-constants";
import { cn } from "./camera-utils";
import { InfoPill } from "./info-pill";
import type { CameraHealth } from "./types";

// Giá trị recordingMode là mã kỹ thuật ("always"/"motion") do backend trả về —
// tra sang đúng nhãn tiếng Việt đang dùng ở ô chọn trong biểu mẫu để hai chỗ
// không nói hai kiểu.
function recordingModeLabel(mode: string | null | undefined) {
    return recordingModes.find((item) => item.value === mode)?.label || "Đang bật";
}

export function CameraCard({
    camera,
    onEdit,
    onDelete,
    onToggleRecording,
    viewers = 0,
}: {
    camera: ICameraResponse;
    onEdit: (camera: ICameraResponse) => void;
    onDelete: (camera: ICameraResponse) => void;
    /** Mở popup xác nhận cho một trong hai công tắc ghi hình.
     *  `turnOn` = trạng thái MUỐN chuyển sang. */
    onToggleRecording: (
        camera: ICameraResponse,
        kind: RecordingToggleKind,
        turnOn: boolean,
    ) => void;
    // Số người đang xem trực tiếp camera này (toàn hệ thống). 0 = ẩn badge.
    viewers?: number;
}) {
    const health = getCameraHealth(camera) as CameraHealth;
    const style = healthStyles[health] ?? healthStyles.unknown;
    const isOnline = camera.state === "online";
    // Đọc y hệt biểu mẫu Sửa camera — xem ghi chú ở khối công tắc bên dưới.
    const recordingOn = camera.recordingEnabled || camera.recordingMode !== "off";
    // "Chỉ ghi khi có sự kiện" CHÍNH LÀ chế độ ghi 'motion' của engine — không
    // phải một cờ thứ hai. Engine chỉ vứt-rồi-giữ-lại đoạn ở chế độ đó, nên
    // thêm một cờ riêng là tạo ra hai nguồn sự thật cho cùng một hành vi.
    const eventOnly = camera.recordingMode === "motion";
    const [isLive, setIsLive] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    // Phóng to cả khối preview chứ không riêng thẻ <video>: có vậy nhãn trạng
    // thái và các nút điều khiển mới còn hiển thị khi ở toàn màn hình.
    const previewRef = useRef<HTMLDivElement>(null);

    // Người dùng thoát toàn màn hình bằng phím Esc thì không có sự kiện click
    // nào để ta biết — phải nghe sự kiện của trình duyệt, nếu không icon sẽ
    // kẹt ở trạng thái "đang toàn màn hình".
    useEffect(() => {
        const onChange = () =>
            setIsFullscreen(document.fullscreenElement === previewRef.current);
        document.addEventListener("fullscreenchange", onChange);
        return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);

    const stopLive = useCallback(() => {
        // Đang toàn màn hình mà dừng xem thì phải thoát ra, không thì người
        // dùng ở lại một màn hình trống và phải tự bấm Esc.
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => { });
        setIsLive(false);
    }, []);

    const toggleFullscreen = useCallback(() => {
        const element = previewRef.current;
        if (!element) return;
        if (document.fullscreenElement) {
            void document.exitFullscreen().catch(() => { });
        } else {
            void element.requestFullscreen().catch(() => { });
        }
    }, []);

    return (
        <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
            <div
                ref={previewRef}
                className={cn(
                    // bg-linear-* chứ KHÔNG phải bg-gradient-*: Tailwind v4 đã
                    // đổi tên và tên cũ không sinh ra CSS nào — nền trong suốt,
                    // icon/chữ trắng của trạng thái chờ chìm hẳn vào thẻ trắng.
                    "relative aspect-video overflow-hidden bg-linear-to-br",
                    // Ở toàn màn hình phải bỏ tỉ lệ 16:9 cố định, nếu không
                    // khung hình vẫn bị bó theo chiều rộng thẻ.
                    "[&:fullscreen]:aspect-auto [&:fullscreen]:h-screen [&:fullscreen]:w-screen [&:fullscreen]:rounded-none",
                    style.preview,
                )}
            >
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />

                {isLive ? (
                    // Chỉ dựng player khi người dùng bấm xem: mỗi player là một
                    // phiên WebRTC + một kết nối RTSP tới engine, mở sẵn cho cả
                    // lưới camera sẽ tốn băng thông vô ích.
                    <WebRtcPlayer cameraId={camera.id} className="absolute inset-0" />
                ) : (
                    // Cả vùng preview là một nút: bấm đâu cũng xem được, không
                    // phải nhắm đúng một nút nhỏ giữa khung.
                    <button
                        type="button"
                        onClick={() => setIsLive(true)}
                        disabled={!isOnline}
                        title={isOnline ? "Xem trực tiếp" : "Camera đang không online"}
                        className="group absolute inset-0 flex flex-col items-center justify-center gap-3 text-white transition-colors hover:bg-black/15 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                        <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur transition-transform group-enabled:group-hover:scale-105">
                            <CameraIcon size={28} strokeWidth={2.2} aria-hidden="true" />
                        </span>
                        <span className="text-sm font-semibold">
                            {isOnline ? "Xem trực tiếp" : "Không có tín hiệu"}
                        </span>
                    </button>
                )}

                {/* Nhãn nằm TRÊN player (z-20): player phủ inset-0 nên không
                    nâng lớp thì đang xem sẽ không còn thấy trạng thái/codec. */}
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                        <span className={cn("h-2 w-2 rounded-full", style.dot)} />
                        {style.label}
                    </span>
                    <span className="flex items-center gap-2">
                        {viewers > 0 ? (
                            <span
                                className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-500/25 px-2.5 py-1 text-xs font-semibold text-sky-100 backdrop-blur"
                                title={`${viewers} người đang xem trực tiếp`}
                            >
                                <Eye size={13} aria-hidden="true" />
                                {viewers}
                            </span>
                        ) : null}
                        <span className="rounded-full border border-white/10 bg-black/45 px-3 py-1 text-xs font-semibold uppercase text-white backdrop-blur">
                            {camera.codec || "Chưa rõ codec"}
                        </span>
                    </span>
                </div>

                {isLive ? (
                    <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={toggleFullscreen}
                            aria-label={isFullscreen ? "Thoát toàn màn hình" : "Xem toàn màn hình"}
                            title={isFullscreen ? "Thoát toàn màn hình (Esc)" : "Xem toàn màn hình"}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/55 text-white backdrop-blur transition-colors hover:bg-black/75"
                        >
                            {isFullscreen ? (
                                <Minimize2 size={15} aria-hidden="true" />
                            ) : (
                                <Maximize2 size={15} aria-hidden="true" />
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={stopLive}
                            title="Dừng xem trực tiếp"
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/20 bg-black/55 px-3 text-xs font-semibold text-white backdrop-blur transition-colors hover:bg-black/75"
                        >
                            <Square size={13} aria-hidden="true" />
                            Dừng
                        </button>
                    </div>
                ) : null}
            </div>

            <div className="space-y-4 p-4">
                {/* Tên + id nằm dưới khung hình, không đè lên video: chữ trắng
                    trên nền video luôn khó đọc và che mất một dải ảnh. */}
                <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-slate-900">
                        {camera.name || "Camera chưa đặt tên"}
                    </h2>
                    <p className="truncate font-mono text-xs text-slate-500">{camera.id}</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onEdit(camera)}
                        className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950"
                    >
                        <Edit3 size={15} aria-hidden="true" />
                        Sửa
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(camera)}
                        className="inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                    >
                        <Trash2 size={15} aria-hidden="true" />
                        Xóa
                    </button>
                </div>

                {/* Bỏ ô "Phần cứng": mọi camera đều auto nên nó luôn in ra cùng
                    một chữ, chiếm chỗ mà không nói thêm gì. */}
                <div className="grid grid-cols-2 gap-2">
                    <InfoPill label="Số lần thử lại" value={String(camera.retryCount ?? 0)} />
                    <InfoPill
                        label="Chuyển động"
                        value={camera.motionEnabled ? `${camera.motionSensitivity ?? 0}%` : "Tắt"}
                    />
                </div>

                {/* Ghi hình là ô DUY NHẤT bật/tắt được ngay tại đây, nên nó là
                    công tắc chứ không phải một ô chữ như hai ô trên. Đứng riêng
                    một hàng: nhét vào lưới 2 cột thì công tắc bị bóp còn ~40px
                    cạnh nhãn "GHI HÌNH" và rất dễ bấm nhầm.

                    "Đang bật" đọc theo CẢ HAI trường, giống biểu mẫu Sửa camera:
                    engine tự nâng recordingEnabled lên true khi mode khác "off"
                    (normalizeRecordingFlag), nên chỉ nhìn recordingEnabled sẽ
                    hiện "Tắt" cho một camera đang ghi thật. */}
                <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
                    <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                            Ghi hình
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                            {recordingOn ? recordingModeLabel(camera.recordingMode) : "Tắt"}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => onToggleRecording(camera, "power", !recordingOn)}
                        role="switch"
                        aria-checked={recordingOn}
                        aria-label={`Ghi hình cho ${camera.name || "camera"}`}
                        title={recordingOn ? "Tắt ghi hình" : "Bật ghi hình"}
                        className={cn(
                            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                            recordingOn ? "bg-emerald-600" : "bg-slate-300",
                        )}
                    >
                        <span
                            className={cn(
                                "absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                                recordingOn ? "translate-x-5" : "translate-x-0",
                            )}
                        />
                    </button>
                </div>

                {/* Công tắc thứ hai chỉ hiện khi camera ĐANG ghi: "chỉ ghi khi
                    có sự kiện" trên một camera không ghi gì là một cái núm
                    không điều khiển cái gì. */}
                {recordingOn ? (
                    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
                        <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
                                Chỉ ghi khi có sự kiện
                            </p>
                            <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                                {eventOnly
                                    ? `Ghi trước ${camera.preMotionSeconds ?? 0}s · sau ${camera.postMotionSeconds ?? 0}s`
                                    : "Tắt — ghi liên tục"}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => onToggleRecording(camera, "eventOnly", !eventOnly)}
                            role="switch"
                            aria-checked={eventOnly}
                            aria-label={`Chỉ ghi khi có sự kiện cho ${camera.name || "camera"}`}
                            title={eventOnly ? "Chuyển sang ghi liên tục" : "Chỉ ghi khi có sự kiện"}
                            className={cn(
                                "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                                eventOnly ? "bg-[#4369ee]" : "bg-slate-300",
                            )}
                        >
                            <span
                                className={cn(
                                    "absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                                    eventOnly ? "translate-x-5" : "translate-x-0",
                                )}
                            />
                        </button>
                    </div>
                ) : null}

                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock3 size={14} aria-hidden="true" />
                    <span className="truncate">
                        Cập nhật {formatCameraDate(camera.lastChangedAt)}
                    </span>
                </div>

                {camera.lastError ? (
                    <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                        {camera.lastError}
                    </div>
                ) : null}
            </div>
        </article>
    );
}
