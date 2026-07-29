import { useEffect, useState } from "react";
import { HintLabel } from "@/components/common/hint-label";
import { restrictedAreaApi } from "@/backend-api/restricted-area-api";
import type { IAiModelFile } from "@/interface/restricted-area";

// Chọn model phát hiện + lọc lớp cho Vùng cấm. Cả DANH SÁCH FILE lẫn DANH SÁCH
// LOẠI đều lấy động từ engine C++: /ai-models trả tên file, /ai-model-types
// trả các loại engine hỗ trợ. Không hardcode loại nào — thêm kiến trúc mới
// trong AiCatalog của engine là giao diện tự có, không phải sửa ở đây.

// Nhãn đẹp cho các loại đã biết; loại lạ (engine mới thêm) hiện thẳng tên kỹ
// thuật để vẫn chọn được, không bị giấu mất.
const TYPE_LABELS: Record<string, string> = {
    yolov8_detect: "YOLOv8",
    yolov8_pose: "YOLOv8 Pose",
    yolov8_seg: "YOLOv8 Seg",
    rf_detect: "RF-DETR",
    face_recognition: "Nhận diện mặt",
};
const typeLabel = (t: string) => TYPE_LABELS[t] ?? t;

export function RestrictedModelPicker({
    modelFile,
    modelType,
    classFilter,
    onChange,
}: {
    modelFile?: string;
    modelType?: string;
    classFilter?: string;
    onChange: (patch: { modelFile?: string; modelType?: string; classFilter?: string }) => void;
}) {
    const [models, setModels] = useState<IAiModelFile[]>([]);
    const [types, setTypes] = useState<string[]>([]);

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            const [list, typeList] = await Promise.all([
                restrictedAreaApi.models(),
                restrictedAreaApi.modelTypes(),
            ]);
            if (cancelled) return;
            setModels(list);
            setTypes(typeList);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Loại đang chọn mà không có trong danh sách engine trả (bản cũ, hoặc
    // engine tạm không trả) vẫn phải hiện để không âm thầm mất lựa chọn.
    const typeOptions = types.length ? [...types] : Object.keys(TYPE_LABELS);
    if (modelType && !typeOptions.includes(modelType)) typeOptions.unshift(modelType);

    // Model đang chọn có thể chưa nằm trong danh sách (file đã bị xoá khỏi kho
    // weights) — vẫn thêm vào để không âm thầm đổi sang model khác.
    const options = models.map((m) => m.fileName);
    if (modelFile && !options.includes(modelFile)) options.unshift(modelFile);

    return (
        // Xếp DỌC: panel cấu hình bên phải hẹp (~320px), để 2 cột thì nhãn
        // "RF-DETR" xuống dòng và đè lên nút radio.
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <HintLabel
                label="Model phát hiện"
                labelClassName="text-xs font-semibold leading-4 text-slate-500"
                hint="Model dùng để phát hiện đối tượng cho vùng cấm. Danh sách lấy từ kho weights của engine. Đổi model là đổi RIÊNG cho camera này."
            />

            <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">File model</span>
                <select
                    value={modelFile ?? ""}
                    onChange={(e) => onChange({ modelFile: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800 outline-none focus:border-[#4369ee]"
                >
                    {modelFile ? null : <option value="">— mặc định —</option>}
                    {options.map((name) => (
                        <option key={name} value={name}>
                            {name}
                        </option>
                    ))}
                </select>
            </label>

            <label className="flex flex-col gap-1">
                <HintLabel
                    label="Loại model"
                    labelClassName="text-xs leading-4 text-slate-500"
                    hint="Phải khớp kiến trúc của file model: mỗi loại (YOLOv8, RF-DETR, ...) có định dạng đầu ra khác nhau. Chọn sai thì engine đọc sai kết quả nhận diện. Danh sách lấy từ engine nên luôn đủ các loại đang hỗ trợ."
                />
                {/* Dùng dropdown thay vì lưới radio: số loại lấy động từ engine,
                    panel bên phải hẹp (~320px) nên nhiều loại mà xếp radio thì
                    tràn dòng, đè lên nhau. */}
                <select
                    value={modelType ?? ""}
                    onChange={(e) => onChange({ modelType: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800 outline-none focus:border-[#4369ee]"
                >
                    {modelType ? null : <option value="">— mặc định —</option>}
                    {typeOptions.map((t) => (
                        <option key={t} value={t}>
                            {typeLabel(t)}
                        </option>
                    ))}
                </select>
            </label>

            <label className="flex flex-col gap-1">
                <HintLabel
                    label="Lọc lớp (class filter)"
                    labelClassName="text-xs leading-4 text-slate-500"
                    hint="Danh sách id lớp cần giữ, cách nhau bởi dấu phẩy. Engine loại bỏ mọi lớp không nằm trong danh sách ngay TRƯỚC bước tracking. Để trống = giữ mọi lớp. Với YOLOv8 COCO: 0 = người, 1 = xe đạp, 2 = ô tô."
                />
                <input
                    type="text"
                    value={classFilter ?? ""}
                    placeholder="vd: 0 hoặc 0,1,2"
                    onChange={(e) => onChange({ classFilter: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs text-slate-800 outline-none focus:border-[#4369ee]"
                />
            </label>
        </div>
    );
}
