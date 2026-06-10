import { type FormEvent, useEffect } from "react";
import { ImagePlus, LoaderCircle, Save, X } from "lucide-react";
import type { Identity } from "@/interface/identity";
import type { IdentityFormMode, IdentityFormState } from "@/hooks/use-identity-manager";
import { IdentityImage } from "./identity-image";

export function IdentityFormModal({
    mode,
    identity,
    form,
    errorMessage,
    isSaving,
    onClose,
    onSubmit,
    onNameChange,
    onMacBluetoothChange,
    onImageChange,
}: {
    mode: IdentityFormMode;
    identity: Identity | null;
    form: IdentityFormState;
    errorMessage: string;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onNameChange: (name: string) => void;
    onMacBluetoothChange: (macBluetooth: string) => void;
    onImageChange: (image: File | null) => void;
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

    const imagePath = form.previewUrl || identity?.image_crop || identity?.image_full || "";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <form
                onSubmit={onSubmit}
                className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div>
                        <p className="text-sm font-semibold text-[#4369ee]">
                            {mode === "create" ? "Thêm identity" : "Sửa identity"}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-950">
                            {mode === "create" ? "Tạo hồ sơ nhận diện" : identity?.name}
                        </h2>
                    </div>
                    <button
                        type="button"
                        aria-label="Đóng biểu mẫu identity"
                        onClick={onClose}
                        disabled={isSaving}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </header>

                <div className="grid gap-5 overflow-y-auto p-5 md:grid-cols-[280px_minmax(0,1fr)]">
                    <div className="relative mx-auto aspect-[5/6] w-full max-w-[260px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        <IdentityImage
                            key={imagePath}
                            path={imagePath}
                            alt={form.name || "Ảnh identity"}
                            sizes="280px"
                        />
                    </div>

                    <div className="space-y-5">
                        {errorMessage ? (
                            <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {errorMessage}
                            </p>
                        ) : null}

                        <label className="block">
                            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                                Tên identity
                            </span>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={(event) => onNameChange(event.target.value)}
                                placeholder="Nhập tên người nhận diện"
                                className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#4369ee]"
                            />
                        </label>

                        <label className="block">
                            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                                MAC Bluetooth
                            </span>
                            <input
                                type="text"
                                value={form.macBluetooth}
                                onChange={(event) => onMacBluetoothChange(event.target.value)}
                                placeholder="VD: AA:BB:CC:DD:EE:FF"
                                className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-[#4369ee]"
                            />
                        </label>

                        <label className="block rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 transition-colors hover:border-[#4369ee]">
                            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                <ImagePlus size={18} className="text-[#4369ee]" aria-hidden="true" />
                                {mode === "create" ? "Chọn ảnh nhận diện" : "Thay ảnh (tùy chọn)"}
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                required={mode === "create" && !form.image}
                                onChange={(event) => onImageChange(event.target.files?.[0] ?? null)}
                                className="mt-3 block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-[#4369ee]"
                            />
                            <span className="mt-2 block truncate text-xs text-slate-500">
                                {form.image?.name || (mode === "create" ? "JPG hoặc PNG" : "Giữ ảnh hiện tại nếu không chọn file mới")}
                            </span>
                        </label>
                    </div>
                </div>

                <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#4369ee] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3156d4] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isSaving ? (
                            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                        ) : (
                            <Save size={16} aria-hidden="true" />
                        )}
                        {mode === "create" ? "Tạo hồ sơ" : "Lưu thay đổi"}
                    </button>
                </footer>
            </form>
        </div>
    );
}
