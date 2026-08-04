import { useEffect } from "react";
import { LoaderCircle, Save, X } from "lucide-react";
import { HintLabel } from "@/components/common/hint-label";
import type { usePlateGateGroupManager } from "@/hooks/use-plate-gate-group-manager";

const INPUT_CLASS =
    "mt-2 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#4369ee]";

export function PlateGateGroupFormModal({
    manager,
}: {
    manager: ReturnType<typeof usePlateGateGroupManager>;
}) {
    const { form, formMode, isSaving, closeForm } = manager;

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !isSaving) closeForm();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isSaving, closeForm]);

    // Camera nào đang thuộc CỤM KHÁC — chọn nó là kéo nó ra khỏi cụm cũ. Phải
    // nói trước, vì đó là thay đổi ở một cụm mà người dùng không mở ra xem.
    const groupOf = new Map<string, string>();
    for (const group of manager.groups) {
        if (group.id === form.id) continue;
        for (const cameraId of group.camera_ids) groupOf.set(cameraId, group.name);
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
            <form
                onSubmit={manager.handleSubmit}
                className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                    <div>
                        <p className="text-sm font-semibold text-[#4369ee]">
                            {formMode === "create" ? "Tạo cụm cổng" : "Sửa cụm cổng"}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-950">
                            Nhiều camera, một barrier
                        </h2>
                    </div>
                    <button
                        type="button"
                        aria-label="Đóng biểu mẫu cụm"
                        onClick={closeForm}
                        disabled={isSaving}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </header>

                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                    {manager.formErrorMessage ? (
                        <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {manager.formErrorMessage}
                        </p>
                    ) : null}

                    <label className="block">
                        <HintLabel
                            label="Tên cụm"
                            placement="bottom"
                            hint="Chỉ để bạn nhận ra cụm, ví dụ “Làn A” hay “Cổng chính”. Không phân biệt hoa thường — không tạo được hai cụm cùng tên."
                            labelClassName="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
                        />
                        <input
                            type="text"
                            required
                            maxLength={64}
                            placeholder="vd: Làn A"
                            value={form.name}
                            onChange={(event) => manager.setFormField("name", event.target.value)}
                            className={INPUT_CLASS}
                        />
                    </label>

                    <label className="block">
                        <HintLabel
                            label="Chờ giữa 2 lần mở của cụm (giây)"
                            hint="Áp dụng CHUNG cho mọi camera trong cụm và THAY THẾ “Chờ giữa 2 lần mở” riêng của từng camera — không cộng dồn, không lấy số lớn nhất. Đặt 0 nghĩa là mỗi biển chỉ mở cổng đúng MỘT lần cho cả cụm. Bộ đếm nằm trong RAM nên restart dịch vụ sẽ reset."
                            labelClassName="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
                        />
                        <input
                            type="number"
                            required
                            min={0}
                            max={3600}
                            value={form.preTime}
                            onChange={(event) => manager.setFormField("preTime", event.target.value)}
                            className={INPUT_CLASS}
                        />
                    </label>

                    <div>
                        <HintLabel
                            label="Camera trong cụm"
                            hint="Chỉ liệt kê camera đã bật barrier ở tab Cấu hình — cụm không tự bật barrier cho camera nào. Chỉ gộp những camera cùng điều khiển MỘT barrier; gộp cổng vào với cổng ra dùng hai barrier khác nhau sẽ làm xe vừa vào bị khoá ở cổng ra."
                            labelClassName="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500"
                        />
                        <div className="mt-2 max-h-60 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                            {manager.assignableCameras.length === 0 ? (
                                <p className="px-2 py-3 text-sm text-slate-500">
                                    Chưa có camera nào bật barrier. Bật ở tab “Cấu hình” trước.
                                </p>
                            ) : (
                                manager.assignableCameras.map((cameraId) => {
                                    const otherGroup = groupOf.get(cameraId);
                                    return (
                                        <label
                                            key={cameraId}
                                            className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-slate-50"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={form.cameraIds.includes(cameraId)}
                                                onChange={() => manager.toggleCamera(cameraId)}
                                                className="mt-0.5 h-4 w-4 accent-[#4369ee]"
                                            />
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm text-slate-800">
                                                    {manager.getCameraName(cameraId)}
                                                </span>
                                                {otherGroup ? (
                                                    <span className="block text-xs text-amber-700">
                                                        Đang ở cụm “{otherGroup}” — chọn sẽ chuyển sang cụm này
                                                    </span>
                                                ) : null}
                                            </span>
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
                    <button
                        type="button"
                        onClick={closeForm}
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
                        {formMode === "create" ? "Tạo cụm" : "Lưu thay đổi"}
                    </button>
                </footer>
            </form>
        </div>
    );
}
