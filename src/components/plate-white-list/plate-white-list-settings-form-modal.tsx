import { type FormEvent, useEffect } from "react";
import { LoaderCircle, Save, X } from "lucide-react";
import { AppSelect } from "@/components/common/app-select";
import { HintLabel, type HintPlacement } from "@/components/common/hint-label";
import type { ICameraResponse } from "@/interface/camera";
import type {
    PlateWhiteListSettingsFormMode,
    PlateWhiteListSettingsFormState,
} from "@/hooks/use-plate-white-list-settings-manager";

function Field({
    label,
    hint,
    hintPlacement,
    children,
}: {
    label: string;
    hint: string;
    hintPlacement?: HintPlacement;
    children: React.ReactNode;
}) {
    return (
        <label className="block">
            <HintLabel
                label={label}
                hint={hint}
                placement={hintPlacement}
                labelClassName="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
            />
            {children}
        </label>
    );
}

const INPUT_CLASS =
    "mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#4369ee]";

export function PlateWhiteListSettingsFormModal({
    mode,
    form,
    availableCameras,
    errorMessage,
    isSaving,
    onClose,
    onSubmit,
    onFieldChange,
}: {
    mode: PlateWhiteListSettingsFormMode;
    form: PlateWhiteListSettingsFormState;
    availableCameras: ICameraResponse[];
    errorMessage: string;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onFieldChange: (key: keyof PlateWhiteListSettingsFormState, value: string) => void;
}) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !isSaving) {
                onClose();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isSaving, onClose]);

    const isCreate = mode === "create";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <form
                onSubmit={onSubmit}
                className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div>
                        <p className="text-sm font-semibold text-[#4369ee]">
                            {isCreate ? "Bật barrier" : "Sửa cấu hình"}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-950">
                            {isCreate ? "Chọn camera để bật" : form.cameraId}
                        </h2>
                    </div>
                    <button
                        type="button"
                        aria-label="Đóng biểu mẫu cấu hình"
                        onClick={onClose}
                        disabled={isSaving}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </header>

                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                    {errorMessage ? (
                        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {errorMessage}
                        </p>
                    ) : null}

                    {isCreate ? (
                        <Field
                            label="Camera"
                            // Ô đầu tiên của vùng cuộn: mở lên trên sẽ bị cắt
                            // mất, nên riêng nó mở xuống dưới.
                            hintPlacement="bottom"
                            hint="Chỉ hiện camera chưa được cấu hình — mỗi camera nhiều nhất một dòng."
                        >
                            <AppSelect
                                required
                                value={form.cameraId}
                                onChange={(event) => onFieldChange("cameraId", event.target.value)}
                                wrapperClassName="mt-2"
                                className="h-11"
                            >
                                <option value="">-- Chọn camera --</option>
                                {availableCameras.map((camera) => (
                                    <option key={camera.id} value={camera.id}>
                                        {camera.name || camera.id}
                                    </option>
                                ))}
                            </AppSelect>
                        </Field>
                    ) : null}

                    <Field
                        label="Chờ giữa 2 lần mở (giây)"
                        // Ở chế độ sửa thì ô Camera bị ẩn, ô này thành ô đầu
                        // tiên của vùng cuộn nên phải mở xuống dưới.
                        hintPlacement={isCreate ? "top" : "bottom"}
                        hint="Đặt 0 nghĩa là mỗi biển chỉ mở cổng đúng MỘT lần, không mở lại. Bộ đếm này nằm trong RAM nên restart dịch vụ sẽ reset."
                    >
                        <input
                            type="number"
                            required
                            min={0}
                            max={3600}
                            value={form.preTime}
                            onChange={(event) => onFieldChange("preTime", event.target.value)}
                            className={INPUT_CLASS}
                        />
                    </Field>

                    <Field
                        label="Sai số ký tự cho phép"
                        hint="0 = biển phải khớp tuyệt đối. Để 1–3 giúp chịu lỗi OCR nhưng biển Việt Nam hay chỉ khác nhau 1–2 ký tự, nên có thể mở nhầm cho xe khác."
                    >
                        <input
                            type="number"
                            required
                            min={0}
                            max={3}
                            value={form.maxEditDistance}
                            onChange={(event) => onFieldChange("maxEditDistance", event.target.value)}
                            className={INPUT_CLASS}
                        />
                    </Field>

                    <Field
                        label="Ngưỡng tin cậy OCR (0 – 1)"
                        hint="Ký tự yếu hơn mức này bị loại khỏi chuỗi biển, làm biển ngắn đi và thường rớt ở ô dưới. Để 0 là nhận cả ký tự rác."
                    >
                        <input
                            type="number"
                            required
                            min={0}
                            max={1}
                            step={0.05}
                            value={form.ocrConfidence}
                            onChange={(event) => onFieldChange("ocrConfidence", event.target.value)}
                            className={INPUT_CLASS}
                        />
                    </Field>

                    <Field
                        label="Số ký tự tối thiểu"
                        hint="Biển đọc được ngắn hơn mức này sẽ không đem đối chiếu whitelist. Thường để dễ hơn ngưỡng lưu sự kiện trong Cấu hình AI vì đọc thiếu 1 ký tự vẫn đủ nhận ra xe đã đăng ký."
                    >
                        <input
                            type="number"
                            required
                            min={1}
                            max={12}
                            value={form.minPlateLength}
                            onChange={(event) => onFieldChange("minPlateLength", event.target.value)}
                            className={INPUT_CLASS}
                        />
                    </Field>

                    <Field
                        label="Độ dài xung barrier (giây)"
                        hint="Thời gian giữ tín hiệu mở barrier. Tuỳ phần cứng từng cổng — xung quá ngắn thì barrier không kịp nhận, quá dài thì cổng mở lâu hơn cần thiết. Độc lập với thông số cùng tên của Bãi xe: một camera có thể vừa thuộc bãi xe vừa chạy whitelist, và hai luồng đó có thể điều khiển hai barrier khác nhau."
                    >
                        <input
                            type="number"
                            required
                            min={0.1}
                            max={10}
                            step={0.1}
                            value={form.barrierDuration}
                            onChange={(event) => onFieldChange("barrierDuration", event.target.value)}
                            className={INPUT_CLASS}
                        />
                    </Field>
                </div>

                <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#4369ee] px-4 text-sm font-semibold text-white hover:bg-[#3156d4] disabled:opacity-60"
                    >
                        {isSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
                        {isCreate ? "Bật barrier" : "Lưu thay đổi"}
                    </button>
                </footer>
            </form>
        </div>
    );
}
