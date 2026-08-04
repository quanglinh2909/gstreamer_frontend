import type { FormEvent } from "react";
import { AlertTriangle, LoaderCircle, Save, X } from "lucide-react";
import { TextField } from "@/components/common/text-field";
import { ToggleField } from "./toggle-field";
import type { CameraFormMode, CameraFormState, UpdateCameraForm } from "./types";

export function CameraFormModal({
    mode,
    form,
    errorMessage,
    isSaving,
    onClose,
    onSubmit,
    onChange,
}: {
    mode: CameraFormMode;
    form: CameraFormState;
    errorMessage: string;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onChange: UpdateCameraForm;
}) {
    // Engine coi "công tắc ghi hình bật" và "chế độ != off" là MỘT (xem
    // effectiveRecordingMode trong RecordingTypes.hpp: mode=off mà
    // recordingEnabled=true thì nó tự nâng thành always). Trước đây biểu mẫu cho
    // đặt hai thứ mâu thuẫn nhau — chọn "Tắt" mà camera vẫn ghi đầy ổ. Giờ chỉ
    // còn công tắc, và luôn gửi hai trường khớp nhau.
    const recordingOn = form.recordingEnabled || form.recordingMode !== "off";
    const recordOnMotion = form.recordingMode === "motion";

    const setRecordingOn = (value: boolean) => {
        onChange("recordingEnabled", value);
        onChange("recordingMode", value ? (recordOnMotion ? "motion" : "always") : "off");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
            <form
                onSubmit={onSubmit}
                className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
            >
                <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div>
                        <p className="text-sm font-semibold text-[#4369ee]">
                            {mode === "create" ? "Thêm camera" : "Sửa camera"}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-950">
                            Cấu hình camera
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-950"
                        aria-label="Đóng"
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </div>

                <div className="space-y-5 overflow-y-auto px-5 py-5">
                    {errorMessage ? (
                        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                            <span>{errorMessage}</span>
                        </div>
                    ) : null}

                    {/* Không còn ô "Phần cứng giải mã": luôn gửi "auto" và để
                        engine tự dò (motionDecoderCandidates thử lần lượt
                        mppvideodec → vaapi → nvdec → v4l2 → phần mềm). Bắt người
                        dùng gõ tên plugin GStreamer là chỗ dễ gõ sai nhất mà
                        chẳng được gì. */}
                    <div className="grid gap-4">
                        <TextField
                            label="Tên camera"
                            value={form.name}
                            required
                            onChange={(value) => onChange("name", value)}
                        />
                        <TextField
                            label="RTSP"
                            value={form.rtsp}
                            required
                            onChange={(value) => onChange("rtsp", value)}
                        />
                    </div>

                    <div className="space-y-3">
                        <ToggleField
                            label="Ghi hình"
                            description="Lưu video của camera này xuống ổ đĩa."
                            checked={recordingOn}
                            onChange={setRecordingOn}
                        />

                        {recordingOn ? (
                            <div className="space-y-3 border-l-2 border-slate-200 pl-3">
                                <TextField
                                    label="Độ dài mỗi đoạn (giây)"
                                    type="number"
                                    value={form.segmentSeconds}
                                    onChange={(value) => onChange("segmentSeconds", value)}
                                />
                            </div>
                        ) : null}

                        {/* CỐ Ý nằm NGOÀI khối "recordingOn": hạn lưu vẫn phải
                            có hiệu lực khi camera đã tắt ghi hình. Dữ liệu cũ
                            của nó đang nằm trên ổ, và bộ dọn chỉ đọc DB nên
                            không cần luồng nào đang chạy mới xoá được. Giấu ô
                            này đi khi tắt ghi là khoá mất đúng cái núm người
                            dùng cần lúc đó. */}
                        <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                            <TextField
                                label="Số ngày lưu trữ (0 = không giới hạn)"
                                type="number"
                                value={form.retentionDays}
                                onChange={(value) => onChange("retentionDays", value)}
                            />
                            <p className="mt-1.5 text-xs leading-5 text-slate-500">
                                Quá số ngày này, bản ghi và sự kiện của camera bị xoá kể cả khi ổ
                                còn nhiều chỗ trống. Vẫn chạy khi camera đã tắt ghi hình hoặc mất
                                kết nối. Ổ sắp đầy thì phần dọn theo tỷ trọng ở{" "}
                                <span className="font-semibold text-slate-700">Cài đặt → Lưu trữ</span>{" "}
                                vẫn xoá tiếp cả dữ liệu còn trong hạn.
                            </p>
                        </div>

                        {/* Chuyển động KHÔNG còn ở đây. Chỉnh ngưỡng/độ nhạy mà
                            không nhìn thấy khung hình thì chỉ là đoán, nên toàn
                            bộ phần đó chuyển sang tab "Chuyển động" của trang
                            Cấu hình AI — chỗ đó có sẵn ảnh và lưới ô để vẽ. */}
                        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                            Phát hiện chuyển động cấu hình ở{" "}
                            <span className="font-semibold text-slate-700">
                                Cấu hình AI → Chuyển động
                            </span>
                            : ở đó vẽ được vùng cần canh ngay trên khung hình thật.
                        </p>
                    </div>
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
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#4369ee] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3156d4] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? (
                            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                        ) : (
                            <Save size={16} aria-hidden="true" />
                        )}
                        {mode === "create" ? "Tạo camera" : "Lưu thay đổi"}
                    </button>
                </div>
            </form>
        </div>
    );
}
