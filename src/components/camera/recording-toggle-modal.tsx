import { useState } from "react";
import { LoaderCircle, Video, VideoOff } from "lucide-react";
import type { ICameraResponse } from "@/interface/camera";
import { HintLabel } from "@/components/common/hint-label";
import { cn } from "./camera-utils";

// Xác nhận cho HAI công tắc ghi hình trên thẻ camera:
//
//   kind="power"      Ghi hình bật/tắt hẳn.
//   kind="eventOnly"  "Chỉ ghi khi có sự kiện": tắt = ghi liên tục, bật = chỉ
//                     giữ đoạn có chuyển động hoặc có sự kiện AI. Lúc BẬT thì
//                     popup còn cho sửa Ghi trước / Ghi sau.
//
// Một component cho cả hai vì phần khung, nút và luồng xác nhận giống hệt
// nhau; chỉ phần thân là khác.
//
// "Ghi trước" hỏi ngay ở đây chứ không để mặc định rồi bắt vào Sửa camera: nó
// cũng chính là ĐỘ SÂU bộ đệm đoạn-chờ của engine, để 0 là sự kiện nào cũng
// mất phần đầu — mà đó lại là phần người xem cần nhất.

export type RecordingToggleKind = "power" | "eventOnly";

export interface RecordingTogglePatch {
    turnOn: boolean;
    preSeconds: number;
    postSeconds: number;
}

// Trần 600s khớp với engine (cửa sổ dài hơn thế thì "chỉ ghi khi có sự kiện"
// thành ghi liên tục mà không ai nhận ra).
const MAX_WINDOW_SECONDS = 600;

function clamp(value: number, min: number) {
    if (!Number.isFinite(value)) return min;
    return Math.min(MAX_WINDOW_SECONDS, Math.max(min, Math.round(value)));
}

export function RecordingToggleModal({
    camera,
    kind,
    turnOn,
    errorMessage,
    isSaving,
    onClose,
    onConfirm,
}: {
    camera: ICameraResponse;
    kind: RecordingToggleKind;
    /** Trạng thái MUỐN chuyển sang. */
    turnOn: boolean;
    errorMessage: string;
    isSaving: boolean;
    onClose: () => void;
    onConfirm: (patch: RecordingTogglePatch) => void;
}) {
    // Mặc định giữ nguyên số của camera; camera chưa đặt bao giờ (0) thì lấy
    // 5/10 — đủ để thấy đối tượng đi vào khung trước khi sự kiện xảy ra.
    const [preSeconds, setPreSeconds] = useState(
        () => camera.preMotionSeconds || 5,
    );
    const [postSeconds, setPostSeconds] = useState(
        () => camera.postMotionSeconds || 10,
    );

    const isEventOnly = kind === "eventOnly";
    const title = isEventOnly
        ? turnOn
            ? "Chỉ ghi khi có sự kiện"
            : "Ghi liên tục"
        : turnOn
            ? "Bật ghi hình"
            : "Tắt ghi hình";
    const accentOn = isEventOnly ? "text-[#4369ee]" : "text-emerald-600";
    const confirmOn = isEventOnly
        ? "bg-[#4369ee] hover:bg-[#3156d4]"
        : "bg-emerald-600 hover:bg-emerald-700";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-lg bg-white shadow-2xl">
                <div className="border-b border-slate-200 px-5 py-4">
                    <p className={cn("text-sm font-semibold", turnOn ? accentOn : "text-amber-600")}>
                        {title}
                    </p>
                    <h2 className="mt-1 truncate text-lg font-semibold text-slate-950">
                        {camera.name || "Camera chưa đặt tên"}
                    </h2>
                </div>

                <div className="space-y-4 px-5 py-5">
                    {isEventOnly && turnOn ? (
                        <>
                            <p className="text-sm text-slate-600">
                                Camera chỉ giữ lại đoạn có chuyển động hoặc có sự kiện AI
                                (khuôn mặt, biển số, vùng cấm, khẩu trang). Những đoạn không
                                có gì xảy ra bị xoá ngay khi đóng.
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <HintLabel
                                        label="Ghi trước (giây)"
                                        labelClassName="text-xs font-semibold text-slate-500"
                                        className="mb-1.5"
                                        placement="bottom"
                                        hint="Giữ thêm bấy nhiêu giây TRƯỚC thời điểm phát hiện. Đây cũng là độ sâu bộ đệm của engine — để 0 thì sự kiện nào cũng mất phần đầu."
                                    />
                                    <input
                                        type="number"
                                        min={0}
                                        max={MAX_WINDOW_SECONDS}
                                        value={preSeconds}
                                        onChange={(event) => setPreSeconds(Number(event.target.value))}
                                        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 focus:border-[#4369ee] focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <HintLabel
                                        label="Ghi sau (giây)"
                                        labelClassName="text-xs font-semibold text-slate-500"
                                        className="mb-1.5"
                                        placement="bottom"
                                        hint="Tiếp tục giữ bấy nhiêu giây SAU sự kiện. Cũng là khoảng im lặng để coi một đợt chuyển động là đã kết thúc."
                                    />
                                    <input
                                        type="number"
                                        min={1}
                                        max={MAX_WINDOW_SECONDS}
                                        value={postSeconds}
                                        onChange={(event) => setPostSeconds(Number(event.target.value))}
                                        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-900 focus:border-[#4369ee] focus:outline-none"
                                    />
                                </div>
                            </div>
                        </>
                    ) : null}

                    {isEventOnly && !turnOn ? (
                        <p className="text-sm text-slate-600">
                            Camera sẽ ghi liên tục 24/7, giữ lại mọi đoạn. Tốn ổ đĩa nhất
                            nhưng không bao giờ bỏ sót.
                        </p>
                    ) : null}

                    {!isEventOnly ? (
                        <p className="text-sm text-slate-600">
                            {turnOn
                                ? "Camera bắt đầu ghi lại. Sau đó có thể bật thêm “Chỉ ghi khi có sự kiện” để tiết kiệm ổ đĩa."
                                : "Camera sẽ ngừng ghi đoạn mới ngay lập tức. Các bản ghi đã lưu vẫn còn nguyên và xem lại được."}
                        </p>
                    ) : null}

                    {/* Nói TRƯỚC chứ không để người dùng tự phát hiện: đổi cấu
                        hình ghi làm engine dựng lại pipeline của camera, nên
                        luồng xem trực tiếp đang mở sẽ chớp một nhịp. */}
                    <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
                        Engine sẽ dựng lại luồng của camera này, hình trực tiếp có thể gián
                        đoạn vài giây.
                    </p>

                    {errorMessage ? (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {errorMessage}
                        </div>
                    ) : null}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                    >
                        Hủy
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            onConfirm({
                                turnOn,
                                preSeconds: clamp(preSeconds, 0),
                                postSeconds: clamp(postSeconds, 1),
                            })
                        }
                        disabled={isSaving}
                        className={cn(
                            "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                            turnOn ? confirmOn : "bg-amber-600 hover:bg-amber-700",
                        )}
                    >
                        {isSaving ? (
                            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                        ) : turnOn ? (
                            <Video size={16} aria-hidden="true" />
                        ) : (
                            <VideoOff size={16} aria-hidden="true" />
                        )}
                        {isEventOnly ? (turnOn ? "Bật" : "Ghi liên tục") : turnOn ? "Bật ghi hình" : "Tắt ghi hình"}
                    </button>
                </div>
            </div>
        </div>
    );
}
