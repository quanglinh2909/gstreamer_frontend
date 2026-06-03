import { type FormEvent } from "react";
import { Car, Check, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import type { IdentityManager } from "@/hooks/use-identity-manager";

export function IdentityPlatesPanel({ manager }: { manager: IdentityManager }) {
    const {
        plates,
        isPlatesLoading,
        platesErrorMessage,
        newPlateNumber,
        isAddingPlate,
        editingPlateId,
        editingPlateNumber,
        isSavingPlate,
        deletingPlateId,
        setNewPlateNumber,
        addPlate,
        startEditPlate,
        cancelEditPlate,
        setEditingPlateNumber,
        saveEditPlate,
        deletePlate,
    } = manager;

    const isBusy = isAddingPlate || isSavingPlate || deletingPlateId !== null;

    const handleAddSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void addPlate();
    };

    const handleEditSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void saveEditPlate();
    };

    return (
        <div className="flex h-full min-h-0 flex-col bg-white">
            <div className="space-y-3 border-b border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <Car size={17} className="text-[#4369ee]" aria-hidden="true" />
                            Phương tiện
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-500">Biển số gắn với hồ sơ này</p>
                    </div>
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-50 px-2 text-xs font-semibold text-[#4369ee]">
                        {plates.length}
                    </span>
                </div>

                <form onSubmit={handleAddSubmit} className="flex gap-2">
                    <input
                        type="text"
                        value={newPlateNumber}
                        onChange={(event) => setNewPlateNumber(event.target.value)}
                        placeholder="Nhập biển số..."
                        disabled={isAddingPlate}
                        className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium uppercase tracking-wide text-slate-900 outline-none transition-colors placeholder:font-normal placeholder:tracking-normal focus:border-[#4369ee] focus:bg-white disabled:opacity-60"
                    />
                    <button
                        type="submit"
                        disabled={isAddingPlate || !newPlateNumber.trim()}
                        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-[#4369ee] px-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#3156d4] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isAddingPlate ? (
                            <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                        ) : (
                            <Plus size={16} aria-hidden="true" />
                        )}
                        Thêm
                    </button>
                </form>

                {platesErrorMessage ? (
                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                        {platesErrorMessage}
                    </p>
                ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {isPlatesLoading ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                        <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
                        Đang tải phương tiện...
                    </div>
                ) : plates.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-10 text-center text-slate-500">
                        <Car size={28} className="text-slate-400" aria-hidden="true" />
                        <p className="text-sm font-medium text-slate-600">Chưa có phương tiện nào</p>
                        <p className="text-xs text-slate-400">Nhập biển số phía trên để thêm mới.</p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {plates.map((plate) => {
                            const isEditing = editingPlateId === plate.id;
                            const isDeleting = deletingPlateId === plate.id;

                            if (isEditing) {
                                return (
                                    <li key={plate.id}>
                                        <form
                                            onSubmit={handleEditSubmit}
                                            className="flex items-center gap-2 rounded-lg border border-[#4369ee] bg-blue-50/40 p-2"
                                        >
                                            <input
                                                type="text"
                                                autoFocus
                                                value={editingPlateNumber}
                                                onChange={(event) => setEditingPlateNumber(event.target.value)}
                                                disabled={isSavingPlate}
                                                className="h-9 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2.5 text-sm uppercase text-slate-900 outline-none focus:border-[#4369ee] disabled:opacity-60"
                                            />
                                            <button
                                                type="submit"
                                                disabled={isSavingPlate || !editingPlateNumber.trim()}
                                                aria-label="Lưu phương tiện"
                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#4369ee] text-white transition-colors hover:bg-[#3156d4] disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {isSavingPlate ? (
                                                    <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                                                ) : (
                                                    <Check size={16} aria-hidden="true" />
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={cancelEditPlate}
                                                disabled={isSavingPlate}
                                                aria-label="Hủy chỉnh sửa"
                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60"
                                            >
                                                <X size={16} aria-hidden="true" />
                                            </button>
                                        </form>
                                    </li>
                                );
                            }

                            return (
                                <li
                                    key={plate.id}
                                    className="group flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2 pl-2.5 transition-colors hover:border-blue-200 hover:bg-blue-50/30"
                                >
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-[#4369ee]">
                                        <Car size={15} aria-hidden="true" />
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-sm font-semibold uppercase tracking-wide text-slate-900">
                                        {plate.plate_number}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => startEditPlate(plate)}
                                        disabled={isBusy}
                                        aria-label={`Sửa phương tiện ${plate.plate_number}`}
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
                                    >
                                        <Pencil size={15} aria-hidden="true" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => void deletePlate(plate.id)}
                                        disabled={isBusy}
                                        aria-label={`Xóa phương tiện ${plate.plate_number}`}
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-rose-200 bg-white text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-50"
                                    >
                                        {isDeleting ? (
                                            <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
                                        ) : (
                                            <Trash2 size={15} aria-hidden="true" />
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
