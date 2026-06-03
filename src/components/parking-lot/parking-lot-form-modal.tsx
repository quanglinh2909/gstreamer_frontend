import { type FormEvent, useEffect } from "react";
import { ArrowRight, LoaderCircle, Save, ScanLine, SmilePlus, X } from "lucide-react";
import type { ParkingLot } from "@/interface/parking-lot";
import type { ICameraResponse } from "@/interface/camera";
import type {
    ParkingLotFormMode,
    ParkingLotFormState,
} from "@/hooks/use-parking-lot-manager";

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
            <select
                required
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#4369ee]"
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
            </select>
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
                className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
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

                <div className="space-y-5 p-5">
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
