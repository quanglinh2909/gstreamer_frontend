import { useEffect } from "react";
import { Eraser, ImageOff, LoaderCircle, Square } from "lucide-react";
import type { ICameraResponse } from "@/interface/camera";
import { cn } from "./ai-config-utils";
import {
    GRID_PRESETS,
    zoneNeed,
    type MotionGridEditor,
    type MotionZone,
} from "./use-motion-grid-editor";

// BẢNG VẼ vùng chuyển động (cột giữa). Tham số + danh sách vùng ở cột phải —
// xem motion-settings-panel.tsx; state chung ở use-motion-grid-editor.ts.
//
// Vẽ như vùng nhận diện của các AI khác: NHẤN GIỮ rồi KÉO ra một hình chữ nhật.
// Mỗi hình là MỘT VÙNG ĐỘC LẬP, kể cả khi hai hình cùng mức — vẽ hai ô mức 8 là
// hai chỗ cần canh riêng, không phải một vùng gộp 2 ô.
//
// Mức 1..10 = phần trăm số ô CỦA CHÍNH VÙNG ĐÓ phải cùng động:
//   mức 1  = 10%   (vùng 10 ô -> 1 ô là đủ)
//   mức 2  = 20%   (vùng 10 ô -> 2 ô; vùng 20 ô -> 4 ô)
//   mức 10 = 100%  (phải động cả vùng)

const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

// Xanh dương = dễ kích hoạt (ít ô cũng tính), đỏ = khó (phải động gần cả vùng).
export const LEVEL_DOT: Record<number, string> = {
    1: "#3b82f6",
    2: "#0ea5e9",
    3: "#06b6d4",
    4: "#14b8a6",
    5: "#22c55e",
    6: "#84cc16",
    7: "#eab308",
    8: "#f97316",
    9: "#ef4444",
    10: "#be123c",
};

const LEVEL_SWATCH: Record<number, string> = {
    1: "bg-blue-500",
    2: "bg-sky-500",
    3: "bg-cyan-500",
    4: "bg-teal-500",
    5: "bg-green-500",
    6: "bg-lime-500",
    7: "bg-yellow-500",
    8: "bg-orange-500",
    9: "bg-red-500",
    10: "bg-rose-700",
};



/** Vị trí hình chữ nhật theo % khung — lưới nào cũng đúng vì đều là tỉ lệ. */
function rectStyle(
    z: { r1: number; c1: number; r2: number; c2: number },
    gridX: number,
    gridY: number,
) {
    return {
        left: `${(z.c1 / gridX) * 100}%`,
        top: `${(z.r1 / gridY) * 100}%`,
        width: `${((z.c2 - z.c1 + 1) / gridX) * 100}%`,
        height: `${((z.r2 - z.r1 + 1) / gridY) * 100}%`,
    };
}

export function MotionGridPanel({
    camera,
    editor,
    snapshotUrl,
    isSnapshotLoading,
    snapshotErrorMessage,
}: {
    camera: ICameraResponse | null;
    editor: MotionGridEditor;
    snapshotUrl: string;
    isSnapshotLoading: boolean;
    snapshotErrorMessage: string;
}) {
    const { gridX, gridY, zones, draft, brush, selectedId, endDraw } = editor;

    // Nhả chuột NGOÀI khung vẫn phải chốt hình đang kéo — nếu không, con trỏ
    // quay lại lưới là hình cũ tiếp tục co giãn theo chuột dù đã nhả từ lâu.
    useEffect(() => {
        const stop = () => endDraw();
        window.addEventListener("pointerup", stop);
        return () => window.removeEventListener("pointerup", stop);
    }, [endDraw]);

    if (!camera) {
        return (
            <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500">
                Chọn một camera để cấu hình vùng chuyển động.
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-slate-900">{camera.name}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Chọn mức rồi <span className="font-semibold">nhấn giữ và kéo</span> trên
                        khung hình để vẽ một vùng. Mỗi hình là một vùng riêng.
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={editor.clearZones}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        <Eraser size={14} aria-hidden="true" />
                        Xoá hết vùng
                    </button>
                    <button
                        type="button"
                        onClick={editor.fillFrame}
                        title="Thay mọi vùng bằng một vùng phủ kín khung hình"
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                        <Square size={14} aria-hidden="true" />
                        Cả khung
                    </button>
                </div>
            </div>

            {/* Khung hình + lưới. aspect-video vì snapshot luôn 16:9. */}
            <div className="relative aspect-video w-full select-none overflow-hidden rounded-lg border border-slate-200 bg-slate-900">
                {snapshotUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={snapshotUrl}
                        alt={`Khung hình ${camera.name}`}
                        className="absolute inset-0 h-full w-full object-contain"
                        draggable={false}
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
                        {isSnapshotLoading ? (
                            <LoaderCircle size={26} className="animate-spin" aria-hidden="true" />
                        ) : (
                            <ImageOff size={26} aria-hidden="true" />
                        )}
                        <span className="text-xs">
                            {isSnapshotLoading
                                ? "Đang lấy khung hình..."
                                : snapshotErrorMessage || "Chưa có khung hình"}
                        </span>
                    </div>
                )}

                {/* Vùng ĐÃ VẼ — nằm dưới lớp bắt chuột nên không chắn thao tác. */}
                {zones.map((zone: MotionZone, index: number) => (
                    <div
                        key={zone.id}
                        className={cn(
                            "pointer-events-none absolute border-2",
                            selectedId === zone.id ? "ring-2 ring-white/70" : "",
                        )}
                        style={{
                            ...rectStyle(zone, gridX, gridY),
                            borderColor: LEVEL_DOT[zone.level],
                            backgroundColor: `${LEVEL_DOT[zone.level]}40`,
                        }}
                    >
                        {/* TÊN vùng + mức. Chỉ hiện mỗi con số mức thì nhìn vào
                            ảnh không biết hình nào ứng với dòng nào ở danh sách
                            bên phải. Số thứ tự khớp đúng với "Vùng N" ở đó. */}
                        <span
                            className="absolute left-0 top-0 whitespace-nowrap rounded-br px-1 text-[10px] font-bold leading-4 text-white"
                            style={{ backgroundColor: LEVEL_DOT[zone.level] }}
                        >
                            Vùng {index + 1} · mức {zone.level}
                        </span>
                    </div>
                ))}

                {/* Hình đang kéo dở */}
                {draft ? (
                    <div
                        className="pointer-events-none absolute border-2 border-dashed border-white/90 bg-white/20"
                        style={rectStyle(draft, gridX, gridY)}
                    />
                ) : null}

                {/* Lớp bắt chuột: một ô lưới = một nút, để biết CHÍNH XÁC con trỏ
                    đang ở ô nào mà không phải tự quy đổi pixel -> ô (khung có
                    object-contain nên ảnh có viền, quy đổi tay là lệch). */}
                <div
                    className="absolute inset-0 grid"
                    style={{
                        gridTemplateColumns: `repeat(${gridX}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${gridY}, minmax(0, 1fr))`,
                    }}
                >
                    {Array.from({ length: gridX * gridY }, (_, index) => {
                        const row = Math.floor(index / gridX);
                        const col = index % gridX;
                        return (
                            <button
                                key={index}
                                type="button"
                                title={`Hàng ${row}, cột ${col}`}
                                onPointerDown={(event) => {
                                    event.preventDefault();
                                    editor.startDraw(row, col);
                                }}
                                onPointerEnter={() => editor.moveDraw(row, col)}
                                className="border border-white/10"
                            />
                        );
                    })}
                </div>
            </div>

            {/* Bảng mức + cỡ lưới */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Mức
                </span>
                {LEVELS.map((level) => (
                    <button
                        key={level}
                        type="button"
                        onClick={() => editor.setBrush(level)}
                        title={`Mức ${level} — cần ${level * 10}% số ô của vùng cùng động`}
                        className={cn(
                            "h-8 w-8 rounded-md border text-xs font-bold transition-all",
                            LEVEL_SWATCH[level],
                            level >= 6 ? "text-slate-900" : "text-white",
                            brush === level
                                ? "scale-110 border-slate-900 ring-2 ring-slate-900/20"
                                : "border-slate-200",
                        )}
                    >
                        {level}
                    </button>
                ))}

                <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
                    Lưới
                    <select
                        value={`${gridX}x${gridY}`}
                        onChange={(event) => {
                            const [x, y] = event.target.value.split("x").map(Number);
                            editor.changeGrid(x, y);
                        }}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800"
                    >
                        {/* Cỡ đang dùng mà không có trong danh sách (hàng DB cũ
                            để 10) thì thêm hẳn vào — nếu không <select> rơi về
                            option đầu và hiện SAI cỡ lưới thật. */}
                        {[
                            ...new Set<number>([...GRID_PRESETS, gridX]),
                        ]
                            .sort((a, b) => a - b)
                            .map((size) => (
                                <option key={size} value={`${size}x${size}`}>
                                    {size}×{size}
                                </option>
                            ))}
                    </select>
                </span>
            </div>

            {draft ? (
                <p className="mt-2 text-xs text-slate-500">
                    Đang vẽ {(draft.r2 - draft.r1 + 1) * (draft.c2 - draft.c1 + 1)} ô — nhả chuột để
                    tạo vùng mức {brush} (cần{" "}
                    {zoneNeed({ id: "", ...draft, level: brush })} ô động).
                </p>
            ) : null}
        </div>
    );
}
