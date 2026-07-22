import { type FormEvent, useEffect } from "react";
import { ArrowRight, LoaderCircle, Save, ScanLine, SmilePlus, X } from "lucide-react";
import { AppSelect } from "@/components/common/app-select";
import { HintLabel } from "@/components/common/hint-label";
import type { ParkingLot } from "@/interface/parking-lot";
import type { ICameraResponse } from "@/interface/camera";
import type {
    ParkingLotFormMode,
    ParkingLotFormState,
    ParkingLotSettingKey,
} from "@/hooks/use-parking-lot-manager";

// Mô tả nằm sau dấu "?" thay vì in thẳng ra: 5 đoạn giải thích dài sẽ nhấn
// chìm chính các ô nhập. min/max khớp với ràng buộc của backend.
const SETTING_FIELDS: Array<{
    key: ParkingLotSettingKey;
    label: string;
    hint: string;
    min: number;
    max: number;
    step: number;
}> = [
    {
        key: "timeExpired",
        label: "Cửa sổ ghép cặp (giây)",
        hint: "Một khuôn mặt đã nhận diện chờ tối đa ngần này giây để biển số của chính người đó xuất hiện ở camera kia, và ngược lại. Hai camera đặt càng xa, xe đi càng chậm thì cần càng dài; để quá dài thì xe sau dễ bị ghép nhầm với người của xe trước.",
        min: 1,
        max: 600,
        step: 1,
    },
    {
        key: "matchCooldown",
        label: "Chống trùng lượt xe (giây)",
        hint: "Một biển số ở làn này chỉ tạo MỘT sự kiện trong ngần này giây. Chặn ca 2 người ngồi cùng xe: cả hai khuôn mặt đều khớp cùng một biển, không chặn thì tạo 2 dòng và mở barrier 2 lần. Đặt xấp xỉ thời gian một lượt xe rời khỏi làn.",
        min: 0,
        max: 600,
        step: 1,
    },
    {
        key: "barrierDuration",
        label: "Độ dài xung barrier (giây)",
        hint: "Thời gian giữ tín hiệu mở barrier. Tuỳ phần cứng từng cổng — xung quá ngắn thì barrier không kịp nhận, quá dài thì cổng mở lâu hơn cần thiết.",
        min: 0.1,
        max: 10,
        step: 0.1,
    },
    {
        key: "maxEditDistance",
        label: "Sai số ký tự cho phép",
        hint: "Số ký tự tối đa được phép sai giữa biển OCR đọc được và biển đã đăng ký của cư dân. 0 = khớp tuyệt đối. Biển ngắn còn bị siết thêm bởi luật an toàn của hệ thống (biển 4 ký tự luôn phải khớp tuyệt đối dù đặt bao nhiêu).",
        min: 0,
        max: 3,
        step: 1,
    },
    {
        key: "ocrConfidence",
        label: "Ngưỡng tin cậy OCR (0 – 1)",
        hint: "Bãi xe tự đọc lại biển bằng ngưỡng này, độc lập với ngưỡng của Cấu hình AI — siết ở đây không làm thay đổi dữ liệu sự kiện biển số. Ký tự yếu hơn bị LOẠI khỏi chuỗi, làm biển ngắn đi; lưu ý biển thiếu một ký tự chỉ cách biển thật đúng 1 đơn vị, nên nếu Sai số ký tự cho phép ≥ 1 thì nó vẫn có thể khớp.",
        min: 0,
        max: 1,
        step: 0.05,
    },
];

function CameraSelect({
    icon: Icon,
    label,
    value,
    cameras,
    placeholder,
    onChange,
}: {
    icon: typeof ScanLine;
    label: string;
    value: string;
    cameras: ICameraResponse[];
    placeholder: string;
    onChange: (value: string) => void;
}) {
    const isMissing = Boolean(value) && !cameras.some((camera) => String(camera.id) === String(value));

    return (
        <label className="block">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                <Icon size={14} className="text-[#4369ee]" aria-hidden="true" />
                {label}
            </span>
            <AppSelect
                required
                value={value}
                onChange={(event) => onChange(event.target.value)}
                wrapperClassName="mt-2"
                className="h-11"
            >
                <option value="" disabled>
                    {placeholder}
                </option>
                {isMissing ? <option value={value}>{value} (không còn tồn tại)</option> : null}
                {cameras.map((camera) => (
                    <option key={camera.id} value={camera.id}>
                        {camera.name || camera.id}
                    </option>
                ))}
            </AppSelect>
        </label>
    );
}

export function ParkingLotFormModal({
    mode,
    parkingLot,
    form,
    cameras,
    errorMessage,
    isSaving,
    onClose,
    onSubmit,
    onNameChange,
    onFaceCameraChange,
    onPlateCameraChange,
    onSettingChange,
}: {
    mode: ParkingLotFormMode;
    parkingLot: ParkingLot | null;
    form: ParkingLotFormState;
    cameras: ICameraResponse[];
    errorMessage: string;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onNameChange: (name: string) => void;
    onFaceCameraChange: (cameraId: string) => void;
    onPlateCameraChange: (cameraId: string) => void;
    onSettingChange: (key: ParkingLotSettingKey, value: string) => void;
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <form
                onSubmit={onSubmit}
                className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div>
                        <p className="text-sm font-semibold text-[#4369ee]">
                            {mode === "create" ? "Thêm bãi xe" : "Sửa bãi xe"}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-950">
                            {mode === "create" ? "Kết nối camera cho bãi xe" : parkingLot?.name}
                        </h2>
                    </div>
                    <button
                        type="button"
                        aria-label="Đóng biểu mẫu bãi xe"
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

                    {cameras.length === 0 ? (
                        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                            Chưa có camera nào trong hệ thống. Vui lòng thêm camera trước khi tạo bãi xe.
                        </p>
                    ) : null}

                    <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                            Tên bãi xe
                        </span>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(event) => onNameChange(event.target.value)}
                            placeholder="Ví dụ: Bãi xe tầng hầm B1"
                            className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#4369ee]"
                        />
                    </label>

                    <div className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                        <CameraSelect
                            icon={SmilePlus}
                            label="Camera khuôn mặt"
                            value={form.faceCameraId}
                            cameras={cameras}
                            placeholder="Chọn camera..."
                            onChange={onFaceCameraChange}
                        />
                        <div className="hidden h-11 items-center justify-center text-slate-300 sm:flex">
                            <ArrowRight size={18} aria-hidden="true" />
                        </div>
                        <CameraSelect
                            icon={ScanLine}
                            label="Camera biển số"
                            value={form.plateCameraId}
                            cameras={cameras}
                            placeholder="Chọn camera..."
                            onChange={onPlateCameraChange}
                        />
                    </div>

                    <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">Ngưỡng hoạt động</h3>
                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                Cổng xe máy và cổng ô tô cần giá trị khác nhau. Di chuột hoặc bấm
                                vào dấu <span className="font-semibold">?</span> để xem giải thích.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {SETTING_FIELDS.map((field, index) => (
                                // h-full + flex-1 ở phần nhãn: nhãn dài ngắn khác
                                // nhau nên có cái xuống 2 dòng, có cái 1 dòng. Ô
                                // lưới tự giãn bằng nhau, phần nhãn nuốt hết chỗ
                                // thừa và đẩy input xuống đáy — nhờ vậy các input
                                // trên cùng một hàng luôn thẳng nhau.
                                <label key={field.key} className="flex h-full flex-col">
                                    <span className="flex-1">
                                        <HintLabel
                                            label={field.label}
                                            hint={field.hint}
                                            // Hai ô đầu nằm sát mép trên vùng cuộn:
                                            // bong bóng mở lên trên sẽ bị cắt mất.
                                            placement={index < 2 ? "bottom" : "top"}
                                            labelClassName="text-xs font-semibold uppercase leading-4 tracking-[0.08em] text-slate-500"
                                        />
                                    </span>
                                    <input
                                        type="number"
                                        required
                                        min={field.min}
                                        max={field.max}
                                        step={field.step}
                                        value={form[field.key]}
                                        onChange={(event) => onSettingChange(field.key, event.target.value)}
                                        className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#4369ee]"
                                    />
                                </label>
                            ))}
                        </div>
                    </section>
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
                        {mode === "create" ? "Tạo bãi xe" : "Lưu thay đổi"}
                    </button>
                </footer>
            </form>
        </div>
    );
}
