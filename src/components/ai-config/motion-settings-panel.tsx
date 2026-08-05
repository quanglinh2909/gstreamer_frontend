import { CheckCircle2, LoaderCircle, Save, Trash2 } from "lucide-react";
import { HintLabel } from "@/components/common/hint-label";
import { cn } from "./ai-config-utils";
import { LEVEL_DOT } from "./motion-grid-panel";
import { zoneCells, zoneNeed, type MotionGridEditor } from "./use-motion-grid-editor";

// CỘT PHẢI của tab "Chuyển động" — dựng theo đúng khuôn của AiFeatureRow (bảng
// cấu hình Biển số/Khuôn mặt): tiêu đề + mô tả bên trái, công tắc bên phải, và
// tham số LUÔN hiện ở dưới. Giấu tham số cho tới khi bật là bắt người dùng bật
// lên mới biết có gì để chỉnh.
//
// Mấy tham số này trước nằm trong form Sửa camera. Chỗ đó sai: chỉnh ngưỡng mà
// không nhìn thấy khung hình thì chỉ là đoán.
//
// KHÔNG có "Độ nhạy" lẫn "Ngưỡng": cả hai đã bị MỨC CỦA VÙNG thay thế. Mức N =
// "cần N×10% số ô của vùng cùng động"; danh sách vùng ở dưới quy ngay ra SỐ Ô,
// vì cùng một mức đặt trên vùng to hay vùng nhỏ cho ra hai con số khác hẳn.

// Mô tả nằm sau dấu "?" chứ không in thẳng: ba công tắc × vài dòng giải thích
// là cả bảng thành một trang chữ, mà thứ người dùng vào đây để làm là gạt công
// tắc và vẽ vùng.
function SwitchRow({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description: React.ReactNode;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <div className="flex items-start justify-between gap-3">
            <HintLabel
                label={label}
                labelClassName="text-xs font-semibold text-slate-800"
                className="min-w-0 flex-1"
                hint={description}
            />
            <button
                type="button"
                onClick={() => onChange(!checked)}
                aria-pressed={checked}
                aria-label={label}
                className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                    checked ? "bg-[#4369ee]" : "bg-slate-300",
                )}
            >
                <span
                    className={cn(
                        "absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                        checked ? "translate-x-5" : "translate-x-0",
                    )}
                />
            </button>
        </div>
    );
}

function NumberRow({
    label,
    hint,
    help,
    value,
    onChange,
}: {
    label: string;
    /** Ghi chú ngắn hiện luôn bên phải nhãn. */
    hint?: string;
    /** Giải thích dài, nằm sau dấu "?". */
    help?: React.ReactNode;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <div>
            <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold text-slate-500">
                {help ? (
                    <HintLabel label={label} hint={help} />
                ) : (
                    <span>{label}</span>
                )}
                {hint ? <span className="text-slate-900">{hint}</span> : null}
            </div>
            <input
                type="number"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-[#4369ee] focus:outline-none"
            />
        </div>
    );
}

export function MotionSettingsPanel({ editor }: { editor: MotionGridEditor }) {
    const { stats, zones } = editor;

    return (
        <aside className="flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-950">Chuyển động</h2>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                <section className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <HintLabel
                                    label="Phát hiện chuyển động"
                                    labelClassName="text-sm font-semibold text-slate-950"
                                    placement="bottom"
                                    hint="Tắt là engine không dựng bộ dò nào cho camera này — không tốn CPU, cũng không có sự kiện. Mức của từng vùng quyết định cần bao nhiêu ô cùng động mới tính là có chuyển động."
                                />
                                {editor.enabled ? (
                                    <CheckCircle2
                                        size={15}
                                        className="text-emerald-600"
                                        aria-hidden="true"
                                    />
                                ) : null}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => editor.setEnabled(!editor.enabled)}
                            aria-pressed={editor.enabled}
                            aria-label="Bật/tắt phát hiện chuyển động"
                            className={cn(
                                "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                                editor.enabled ? "bg-[#4369ee]" : "bg-slate-300",
                            )}
                        >
                            <span
                                className={cn(
                                    "absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                                    editor.enabled ? "translate-x-5" : "translate-x-0",
                                )}
                            />
                        </button>
                    </div>

                    {/* Tham số LUÔN hiện, y như bảng Biển số. Chỉ mờ đi khi tắt
                        để thấy rõ chúng chưa có tác dụng. */}
                    <div
                        className={cn(
                            "mt-4 space-y-4 transition-opacity",
                            editor.enabled ? "" : "opacity-50",
                        )}
                    >
                        <NumberRow
                            label="Ghi trước (giây)"
                            help="Giữ thêm bấy nhiêu giây TRƯỚC lúc phát hiện. Đây cũng là độ sâu bộ đệm đoạn ghi của camera — các AI khác bật 'chỉ ghi khi có sự kiện' cũng không giữ được xa hơn mốc này."
                            value={editor.preSeconds}
                            onChange={editor.setPreSeconds}
                        />
                        <NumberRow
                            label="Ghi sau (giây)"
                            hint="khép sự kiện"
                            help="Im lặng bấy nhiêu giây thì sự kiện coi như kết thúc, và đoạn ghi vẫn được giữ tới hết khoảng đó."
                            value={editor.postSeconds}
                            onChange={editor.setPostSeconds}
                        />

                        <SwitchRow
                            label="Chỉ ghi khi có chuyển động"
                            description={
                                editor.recordingOn
                                    ? "Đoạn nào không có chuyển động sẽ bị xoá, giữ lại cả khoảng ghi trước. Tốn ít ổ đĩa hơn, CPU thì như nhau."
                                    : "Camera đang không ghi hình nên công tắc này chưa có tác dụng — bật ghi ở trang Camera."
                            }
                            checked={editor.recordOnMotion}
                            onChange={editor.setRecordOnMotion}
                        />
                        <SwitchRow
                            label="Lưu sự kiện chuyển động"
                            description={
                                editor.saveEvents
                                    ? "Ghi vào lịch sử để xem lại và tìm kiếm."
                                    : "Chỉ vẽ lên video đang xem, KHÔNG ghi lịch sử — giống nhận diện khẩu trang. Cảnh nhiều cây cối sinh hàng nghìn sự kiện/ngày mà chẳng ai xem lại."
                            }
                            checked={editor.saveEvents}
                            onChange={editor.setSaveEvents}
                        />
                    </div>
                </section>

                {/* Danh sách VÙNG — cùng khuôn với danh sách vùng của các AI
                    khác: một hàng cho mỗi vùng, nhãn bên trái, nút xoá đỏ bên
                    phải. Mỗi hình chữ nhật là một vùng ĐỘC LẬP kể cả khi trùng
                    mức, và số ô cần động phụ thuộc độ lớn của chính vùng đó nên
                    phải hiện ra thành số. */}
                <section>
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-slate-950">
                            {stats.count} vùng chuyển động
                        </h3>
                        {zones.length > 0 ? (
                            <button
                                type="button"
                                onClick={editor.clearZones}
                                className="text-xs font-semibold text-slate-500 transition-colors hover:text-rose-600"
                            >
                                Xoá hết
                            </button>
                        ) : null}
                    </div>

                    <div className="space-y-2">
                        {zones.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-slate-300 px-3 py-5 text-center text-sm text-slate-500">
                                Nhấn giữ và kéo trên ảnh để vẽ vùng chuyển động.
                            </p>
                        ) : null}

                        {zones.map((z, index) => (
                            <div
                                key={z.id}
                                onMouseEnter={() => editor.setSelectedId(z.id)}
                                onMouseLeave={() => editor.setSelectedId(null)}
                                className="rounded-lg border border-slate-200 px-3 py-2"
                            >
                                <div className="flex items-center gap-2">
                                    <span
                                        className="inline-block h-3 w-3 shrink-0 rounded-sm"
                                        style={{ backgroundColor: LEVEL_DOT[z.level] }}
                                    />
                                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                                        Vùng {index + 1}
                                    </span>
                                    <span className="shrink-0 text-xs text-slate-500">
                                        {zoneCells(z)} ô · cần {zoneNeed(z)}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => editor.removeZone(z.id)}
                                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-rose-600 transition-colors hover:bg-rose-50"
                                        aria-label={`Xoá vùng ${index + 1}`}
                                    >
                                        <Trash2 size={15} aria-hidden="true" />
                                    </button>
                                </div>
                                <div className="mt-1 flex items-center gap-2">
                                    <span className="shrink-0 text-[11px] font-semibold text-slate-500">
                                        Mức {z.level}
                                    </span>
                                    <input
                                        type="range"
                                        min={1}
                                        max={10}
                                        value={z.level}
                                        onChange={(event) =>
                                            editor.setZoneLevel(z.id, Number(event.target.value))
                                        }
                                        className="h-2 min-w-0 flex-1 cursor-pointer accent-[#4369ee]"
                                    />
                                    <span className="shrink-0 text-[11px] text-slate-500">
                                        {z.level * 10}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {zones.length > 0 ? (
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                            Engine dùng ĐÚNG MỘT bộ dò cho cả camera rồi tự xét từng vùng — thêm
                            vùng không tốn thêm CPU.
                        </p>
                    ) : null}
                </section>

                {editor.message ? (
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                        {editor.message}
                    </p>
                ) : null}
                {editor.errorMessage ? (
                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                        {editor.errorMessage}
                    </p>
                ) : null}
            </div>

            {/* sticky: cột này CAO BẰNG hàng lưới, mà hàng lưới do danh sách 16
                camera bên trái quyết định — đo được bảng cao 1219px trong khung
                nhìn 1000px, nút Lưu rơi xuống y=1262, phải cuộn cả trang mới
                thấy. Dính đáy thì luôn với tới được. */}
            <div className="sticky bottom-0 border-t border-slate-200 bg-white p-4">
                <button
                    type="button"
                    onClick={() => void editor.save()}
                    disabled={editor.isSaving}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#4369ee] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#3156d4] disabled:opacity-60"
                >
                    {editor.isSaving ? (
                        <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                    ) : (
                        <Save size={16} aria-hidden="true" />
                    )}
                    Lưu cấu hình chuyển động
                </button>
            </div>
        </aside>
    );
}
