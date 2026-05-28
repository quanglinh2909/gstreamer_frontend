import { type FormEvent, useEffect } from "react";
import { LoaderCircle, Save, X } from "lucide-react";
import type { PlateWhiteListEntry } from "@/interface/plate-white-list";
import type {
    PlateWhiteListFormMode,
    PlateWhiteListFormState,
} from "@/hooks/use-plate-white-list-manager";

export function PlateWhiteListFormModal({
    mode,
    entry,
    form,
    errorMessage,
    isSaving,
    onClose,
    onSubmit,
    onPlateNumberChange,
    onNameChange,
}: {
    mode: PlateWhiteListFormMode;
    entry: PlateWhiteListEntry | null;
    form: PlateWhiteListFormState;
    errorMessage: string;
    isSaving: boolean;
    onClose: () => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    onPlateNumberChange: (plateNumber: string) => void;
    onNameChange: (name: string) => void;
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
                            {mode === "create" ? "Thêm biển số" : "Sửa biển số"}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-950">
                            {mode === "create" ? "Tạo biển số trắng" : entry?.plate_number}
                        </h2>
                    </div>
                    <button
                        type="button"
                        aria-label="Đóng biểu mẫu biển số"
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

                    <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Biển số</span>
                        <input
                            type="text"
                            required
                            value={form.plateNumber}
                            onChange={(event) => onPlateNumberChange(event.target.value)}
                            placeholder="Ví dụ: 51A-12345"
                            className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm uppercase tracking-wide text-slate-900 outline-none focus:border-[#4369ee]"
                        />
                    </label>

                    <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Tên</span>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(event) => onNameChange(event.target.value)}
                            placeholder="Nhập tên chủ xe hoặc ghi chú"
                            className="mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#4369ee]"
                        />
                    </label>
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
                        {mode === "create" ? "Tạo biển số" : "Lưu thay đổi"}
                    </button>
                </footer>
            </form>
        </div>
    );
}
