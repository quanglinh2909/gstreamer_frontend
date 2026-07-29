import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, LoaderCircle, Play } from "lucide-react";
import {
    guessModelType,
    modelTestApi,
    type InferenceDetection,
    type InferenceResult,
    type ModelTypes,
} from "@/backend-api/model-test-api";
import type { IAiModelFile } from "@/interface/restricted-area";

// Bảng thử model bằng ảnh: tải ảnh lên → chọn model + loại → gọi
// /inference/run (engine C++) → vẽ box/độ chính xác/điểm mốc/mask lên đúng ảnh.
// Toạ độ trả về ở KHÔNG GIAN ẢNH GỐC nên chỉ cần chia cho origWidth/Height.

const TRANSFORMS = [
    { value: "", label: "Không" },
    { value: "align_face", label: "Căn khuôn mặt (align_face)" },
    { value: "align_plate", label: "Căn biển số (align_plate)" },
];

// Màu theo classId để phân biệt các lớp; xoay vòng bảng màu.
const PALETTE = [
    "#38bdf8", "#34d399", "#fbbf24", "#f43f5e", "#a78bfa",
    "#fb923c", "#4ade80", "#f472b6", "#22d3ee", "#facc15",
];
const colorForClass = (classId: number) => PALETTE[((classId % PALETTE.length) + PALETTE.length) % PALETTE.length];

// Khung xương COCO-17 và mặt 5 điểm (giống detection-overlay).
const POSE_EDGES_17: Array<[number, number]> = [
    [0, 1], [0, 2], [1, 3], [2, 4],
    [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
    [5, 11], [6, 12], [11, 12],
    [11, 13], [13, 15], [12, 14], [14, 16],
];
const FACE_EDGES_5: Array<[number, number]> = [
    [0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [3, 4],
];
const KP_MIN_SCORE = 0.2;

function toPoints(kps: number[]): Array<{ x: number; y: number } | null> {
    let hasScores = false;
    for (let i = 2; i < kps.length; i += 3) {
        if (kps[i] > 0) { hasScores = true; break; }
    }
    const out: Array<{ x: number; y: number } | null> = [];
    for (let i = 0; i + 2 < kps.length; i += 3) {
        const s = kps[i + 2];
        out.push(!hasScores || s > KP_MIN_SCORE ? { x: kps[i], y: kps[i + 1] } : null);
    }
    return out;
}

function maskCells(hex: string, grid: number): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    for (let bit = 0; bit < grid * grid; bit++) {
        const byteIdx = bit >> 3;
        const h = hex.slice(byteIdx * 2, byteIdx * 2 + 2);
        if (h.length < 2) break;
        const byte = parseInt(h, 16);
        if (!Number.isFinite(byte)) break;
        if (byte & (1 << (bit & 7))) out.push([bit % grid, Math.floor(bit / grid)]);
    }
    return out;
}

// Lớp phủ vẽ trên ẢNH đang hiển thị. SVG viewBox theo pixel GỐC +
// preserveAspectRatio="none": vì khung ảnh giữ đúng tỉ lệ gốc nên map tuyến
// tính không méo. vector-effect="non-scaling-stroke" giữ nét 2px bất kể ảnh
// to nhỏ. Nhãn là HTML đặt theo % để chữ luôn đọc được.
function Overlay({ result }: { result: InferenceResult }) {
    const { origWidth: W, origHeight: H, detections } = result;
    if (W <= 0 || H <= 0) return null;
    return (
        <div className="pointer-events-none absolute inset-0">
            <svg
                className="absolute inset-0 h-full w-full"
                viewBox={`0 0 ${W} ${H}`}
                preserveAspectRatio="none"
                aria-hidden="true"
            >
                {detections.map((d, i) => {
                    const color = colorForClass(d.classId);
                    const bw = d.x2 - d.x1;
                    const bh = d.y2 - d.y1;
                    const pts = d.keypoints && d.keypoints.length >= 3 ? toPoints(d.keypoints) : [];
                    const edges = pts.length === 17 ? POSE_EDGES_17 : pts.length === 5 ? FACE_EDGES_5 : [];
                    const g = d.maskGrid || 32;
                    return (
                        <g key={i}>
                            {/* MASK: tô ô lưới trong bbox */}
                            {d.mask
                                ? maskCells(d.mask, g).map(([gx, gy], ci) => (
                                      <rect
                                          key={`mk-${ci}`}
                                          x={d.x1 + (gx * bw) / g}
                                          y={d.y1 + (gy * bh) / g}
                                          width={bw / g + 0.5}
                                          height={bh / g + 0.5}
                                          fill={color}
                                          opacity={0.35}
                                      />
                                  ))
                                : null}
                            {/* BOX */}
                            <rect
                                x={d.x1}
                                y={d.y1}
                                width={bw}
                                height={bh}
                                fill="none"
                                stroke={color}
                                strokeWidth={2}
                                vectorEffect="non-scaling-stroke"
                            />
                            {/* KEYPOINTS */}
                            {edges.map(([a, c], ei) => {
                                const p = pts[a];
                                const q = pts[c];
                                if (!p || !q) return null;
                                return (
                                    <line
                                        key={`e-${ei}`}
                                        x1={p.x} y1={p.y} x2={q.x} y2={q.y}
                                        stroke={color}
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                        vectorEffect="non-scaling-stroke"
                                    />
                                );
                            })}
                            {pts.map((p, pi) =>
                                p ? (
                                    <circle
                                        key={`p-${pi}`}
                                        cx={p.x} cy={p.y} r={3}
                                        fill={color}
                                        vectorEffect="non-scaling-stroke"
                                    />
                                ) : null,
                            )}
                        </g>
                    );
                })}
            </svg>
            {/* NHÃN: lớp + độ chính xác, đặt theo % để chữ không méo/mờ */}
            {detections.map((d, i) => {
                const color = colorForClass(d.classId);
                return (
                    <span
                        key={`lb-${i}`}
                        className="absolute -translate-y-full rounded-[2px] px-1 text-[11px] font-semibold leading-[15px] text-black"
                        style={{
                            left: `${(d.x1 / W) * 100}%`,
                            top: `${(d.y1 / H) * 100}%`,
                            backgroundColor: color,
                        }}
                    >
                        #{d.classId} · {(d.score * 100).toFixed(0)}%
                    </span>
                );
            })}
        </div>
    );
}

export function ModelTestView() {
    const [models, setModels] = useState<IAiModelFile[]>([]);
    const [types, setTypes] = useState<ModelTypes>({ stage1: [], stage2: [] });

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string>("");

    const [modelPath, setModelPath] = useState("");
    const [modelType, setModelType] = useState("");
    const [primaryConf, setPrimaryConf] = useState("0.25");

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [modelPath2, setModelPath2] = useState("");
    const [modelType2, setModelType2] = useState("");
    const [transformData, setTransformData] = useState("");
    const [secondaryConf, setSecondaryConf] = useState("0.3");

    const [running, setRunning] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState<InferenceResult | null>(null);
    const [elapsedMs, setElapsedMs] = useState<number | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        modelTestApi.models().then(setModels).catch(() => setModels([]));
        modelTestApi.modelTypes().then(setTypes).catch(() => undefined);
    }, []);

    // Dọn object URL cũ khi đổi ảnh / rời trang để không rò bộ nhớ.
    useEffect(() => {
        return () => {
            if (imageUrl) URL.revokeObjectURL(imageUrl);
        };
    }, [imageUrl]);

    const pickImage = useCallback((file: File | null) => {
        if (!file) return;
        setImageUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return URL.createObjectURL(file);
        });
        setImageFile(file);
        setResult(null);
        setError("");
        setElapsedMs(null);
    }, []);

    const onModelChange = useCallback(
        (path: string) => {
            setModelPath(path);
            const file = models.find((m) => m.path === path);
            if (file && types.stage1.length) {
                setModelType(guessModelType(file.fileName, types.stage1));
            }
        },
        [models, types.stage1],
    );

    const canRun = !!imageFile && !!modelPath && !!modelType && !running;

    const run = useCallback(async () => {
        if (!imageFile || !modelPath || !modelType) return;
        setRunning(true);
        setError("");
        const started = performance.now();
        try {
            const res = await modelTestApi.run({
                image: imageFile,
                modelPath,
                modelType,
                modelPath2: showAdvanced ? modelPath2 || undefined : undefined,
                modelType2: showAdvanced ? modelType2 || undefined : undefined,
                transformData: showAdvanced ? transformData : "",
                primaryConf: Number(primaryConf) || 0,
                secondaryConf: Number(secondaryConf) || 0,
            });
            setResult(res);
            setElapsedMs(Math.round(performance.now() - started));
        } catch (e) {
            setError(e instanceof Error ? e.message : "Có lỗi khi chạy inference.");
            setResult(null);
        } finally {
            setRunning(false);
        }
    }, [
        imageFile, modelPath, modelType, showAdvanced, modelPath2, modelType2,
        transformData, primaryConf, secondaryConf,
    ]);

    const detCount = result?.detections.length ?? 0;
    const scoreSummary = useMemo(() => {
        if (!result || !result.detections.length) return null;
        const scores = result.detections.map((d) => d.score);
        return { min: Math.min(...scores), max: Math.max(...scores) };
    }, [result]);

    const inputCls =
        "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#4369ee]";
    const labelCls = "mb-1 block text-xs font-semibold text-slate-600";

    return (
        <div className="flex h-full min-h-0">
            {/* CỘT ĐIỀU KHIỂN */}
            <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-r border-slate-200 p-4">
                <div>
                    <h1 className="text-base font-semibold text-slate-900">Thử model bằng ảnh</h1>
                    <p className="mt-0.5 text-xs text-slate-500">
                        Tải ảnh, chọn model rồi chạy — box và độ chính xác vẽ thẳng lên ảnh.
                    </p>
                </div>

                {/* Tải ảnh */}
                <div>
                    <span className={labelCls}>Ảnh</span>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => pickImage(e.target.files?.[0] ?? null)}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm font-medium text-slate-600 transition-colors hover:border-[#4369ee] hover:text-[#4369ee]"
                    >
                        <ImagePlus size={16} />
                        {imageFile ? "Đổi ảnh khác" : "Chọn ảnh"}
                    </button>
                    {imageFile ? (
                        <p className="mt-1 truncate text-xs text-slate-500" title={imageFile.name}>
                            {imageFile.name}
                        </p>
                    ) : null}
                </div>

                {/* Model */}
                <div>
                    <span className={labelCls}>Model (stage 1)</span>
                    <select
                        className={inputCls}
                        value={modelPath}
                        onChange={(e) => onModelChange(e.target.value)}
                    >
                        <option value="">— Chọn model —</option>
                        {models.map((m) => (
                            <option key={m.path} value={m.path}>
                                {m.fileName}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <span className={labelCls}>Loại model</span>
                    <select
                        className={inputCls}
                        value={modelType}
                        onChange={(e) => setModelType(e.target.value)}
                    >
                        <option value="">— Chọn loại —</option>
                        {types.stage1.map((t) => (
                            <option key={t} value={t}>
                                {t}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <span className={labelCls}>Ngưỡng tin cậy (primaryConf)</span>
                    <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.05}
                        className={inputCls}
                        value={primaryConf}
                        onChange={(e) => setPrimaryConf(e.target.value)}
                    />
                </div>

                {/* Nâng cao: stage 2 */}
                <div>
                    <button
                        type="button"
                        onClick={() => setShowAdvanced((v) => !v)}
                        className="text-xs font-semibold text-[#4369ee]"
                    >
                        {showAdvanced ? "− Ẩn stage 2 (nâng cao)" : "+ Stage 2 (nâng cao)"}
                    </button>
                    {showAdvanced ? (
                        <div className="mt-2 flex flex-col gap-3 rounded-lg bg-slate-50 p-3">
                            <div>
                                <span className={labelCls}>Model stage 2</span>
                                <select
                                    className={inputCls}
                                    value={modelPath2}
                                    onChange={(e) => setModelPath2(e.target.value)}
                                >
                                    <option value="">— Không —</option>
                                    {models.map((m) => (
                                        <option key={m.path} value={m.path}>
                                            {m.fileName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <span className={labelCls}>Loại stage 2</span>
                                <select
                                    className={inputCls}
                                    value={modelType2}
                                    onChange={(e) => setModelType2(e.target.value)}
                                >
                                    <option value="">— Không —</option>
                                    {types.stage2.map((t) => (
                                        <option key={t} value={t}>
                                            {t}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <span className={labelCls}>Biến đổi ảnh (transformData)</span>
                                <select
                                    className={inputCls}
                                    value={transformData}
                                    onChange={(e) => setTransformData(e.target.value)}
                                >
                                    {TRANSFORMS.map((t) => (
                                        <option key={t.value} value={t.value}>
                                            {t.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <span className={labelCls}>Ngưỡng stage 2 (secondaryConf)</span>
                                <input
                                    type="number"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    className={inputCls}
                                    value={secondaryConf}
                                    onChange={(e) => setSecondaryConf(e.target.value)}
                                />
                            </div>
                        </div>
                    ) : null}
                </div>

                <button
                    type="button"
                    onClick={run}
                    disabled={!canRun}
                    className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-[#4369ee] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#3355cc] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {running ? <LoaderCircle size={16} className="animate-spin" /> : <Play size={16} />}
                    {running ? "Đang chạy…" : "Chạy inference"}
                </button>

                {error ? (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        {error}
                    </div>
                ) : null}

                {result ? (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                        <div className="font-semibold text-slate-800">
                            {detCount} phát hiện
                            {elapsedMs !== null ? ` · ${elapsedMs}ms` : ""}
                        </div>
                        <div className="mt-0.5">
                            Ảnh gốc {result.origWidth}×{result.origHeight}
                            {scoreSummary
                                ? ` · điểm ${(scoreSummary.min * 100).toFixed(0)}–${(scoreSummary.max * 100).toFixed(0)}%`
                                : ""}
                        </div>
                    </div>
                ) : null}
            </aside>

            {/* KHUNG ẢNH + KẾT QUẢ */}
            <main className="flex min-w-0 flex-1 flex-col overflow-auto bg-slate-100 p-6">
                {imageUrl ? (
                    <div className="mx-auto flex max-w-full flex-col items-center gap-4">
                        <div className="relative inline-block max-w-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={imageUrl}
                                alt="Ảnh thử model"
                                className="block max-h-[70vh] max-w-full rounded-lg shadow-sm"
                            />
                            {result ? <Overlay result={result} /> : null}
                        </div>

                        {/* Bảng chi tiết phát hiện */}
                        {result && detCount > 0 ? (
                            <div className="w-full max-w-3xl overflow-x-auto rounded-lg border border-slate-200 bg-white">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-left text-xs text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2">#</th>
                                            <th className="px-3 py-2">Lớp</th>
                                            <th className="px-3 py-2">Độ chính xác</th>
                                            <th className="px-3 py-2">Box (x1,y1,x2,y2)</th>
                                            <th className="px-3 py-2">Điểm mốc / mask</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.detections.map((d: InferenceDetection, i) => (
                                            <tr key={i} className="border-t border-slate-100">
                                                <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                                                <td className="px-3 py-2">
                                                    <span
                                                        className="inline-block h-3 w-3 rounded-sm align-middle"
                                                        style={{ backgroundColor: colorForClass(d.classId) }}
                                                    />{" "}
                                                    #{d.classId}
                                                </td>
                                                <td className="px-3 py-2 font-medium">
                                                    {(d.score * 100).toFixed(1)}%
                                                </td>
                                                <td className="px-3 py-2 font-mono text-xs text-slate-600">
                                                    {d.x1.toFixed(0)}, {d.y1.toFixed(0)}, {d.x2.toFixed(0)}, {d.y2.toFixed(0)}
                                                </td>
                                                <td className="px-3 py-2 text-xs text-slate-500">
                                                    {d.keypoints && d.keypoints.length >= 3
                                                        ? `${d.keypoints.length / 3} điểm`
                                                        : ""}
                                                    {d.mask ? " · có mask" : ""}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : result && detCount === 0 ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
                                Không có phát hiện nào vượt ngưỡng. Thử hạ ngưỡng tin cậy.
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400">
                        <ImagePlus size={48} strokeWidth={1.5} />
                        <p className="text-sm">Chọn một ảnh để bắt đầu</p>
                    </div>
                )}
            </main>
        </div>
    );
}
