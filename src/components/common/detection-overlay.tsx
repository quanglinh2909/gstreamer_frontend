import { useCallback, useEffect, useRef, useState } from "react";
import type { OverlayBox, OverlayZone } from "@/hooks/use-live-detections";
import { AI_TYPE_TO_TAB, type FeedTab } from "@/lib/event-feed-shared";

// Lớp phủ khung phát hiện lên video trực tiếp.
//
// Hai chuyện phải làm đúng, không thì khung lệch khỏi vật thể:
//
// 1. **Vùng ẢNH THẬT trong thẻ video.** Toạ độ về là [0,1] theo khung hình AI
//    nhận được. Với `object-fill` ảnh giãn khít thẻ nên [0,1] map thẳng ra
//    100% thẻ. Với `object-contain` thì có viền đen (letterbox): phải tính lại
//    hình chữ nhật ảnh thật từ tỉ lệ video so với tỉ lệ thẻ, rồi mới đặt khung
//    trong đó.
// 2. **Bám theo phóng to/kéo ảnh.** Thẻ video bị áp `transform` của
//    usePointerZoom; lớp phủ phải nhận ĐÚNG transform đó, không thì phóng to
//    lên là khung đứng im còn ảnh chạy.

const AI_TYPE_COLOR: Record<string, string> = {
    face_recognition: "#34d399", // xanh lá — khớp màu badge "Khuôn mặt"
    plate_recognition: "#38bdf8", // xanh dương — "Biển số"
    restricted_area: "#f43f5e", // đỏ — "Vùng cấm"
    face_mask: "#fbbf24", // hổ phách — "Khẩu trang"
};
const DEFAULT_COLOR = "#38bdf8";

function colorOf(box: OverlayBox): string {
    return (box.aiType && AI_TYPE_COLOR[box.aiType]) || DEFAULT_COLOR;
}
function zoneColorOf(zone: OverlayZone): string {
    return (zone.aiType && AI_TYPE_COLOR[zone.aiType]) || DEFAULT_COLOR;
}

// Khung xương COCO 17 điểm (chuẩn của các model pose YOLO/RTMPose).
const POSE_EDGES_17: Array<[number, number]> = [
    [0, 1], [0, 2], [1, 3], [2, 4],           // đầu
    [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],  // tay
    [5, 11], [6, 12], [11, 12],               // thân
    [11, 13], [13, 15], [12, 14], [14, 16],   // chân
];
// Model mặt 5 điểm mốc, thứ tự [mắt trái, mắt phải, mũi, khoé miệng trái,
// khoé miệng phải]. Nối lại thành lưới mặt cho dễ nhìn — 5 chấm rời rạc trên
// khuôn mặt nhỏ gần như không thấy gì.
const FACE_EDGES_5: Array<[number, number]> = [
    [0, 1],           // đường mắt
    [0, 2], [1, 2],   // mắt -> mũi
    [2, 3], [2, 4],   // mũi -> khoé miệng
    [3, 4],           // đường miệng
];
const KP_MIN_SCORE = 0.2;

// Lưới bit HEX -> danh sách ô bật. Mask phủ đúng bbox nên toạ độ ô là tỉ lệ
// TRONG bbox, đổi sang toạ độ khung khi vẽ.
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

// kps phẳng -> mảng điểm; điểm không nhìn thấy trả null để cạnh nối vào nó bị bỏ.
//
// CẢNH BÁO đã trả giá: model mặt 5 điểm mốc (yolov8_pose_face) KHÔNG xuất độ
// tin cậy cho từng điểm — kênh thứ ba luôn đúng bằng 0, dù x/y hoàn toàn đúng.
// Chỉ model pose thân người COCO-17 mới trả số thật (0.38..0.99). Lọc thẳng
// theo ngưỡng là NUỐT SẠCH điểm mốc mặt, khung xanh vẫn hiện mà không có chấm
// nào. Nên: cả bộ đều 0 = model không báo -> vẽ hết; có số thật mới lọc.
function toPoints(kps: number[]): Array<{ x: number; y: number } | null> {
    let hasScores = false;
    for (let i = 2; i < kps.length; i += 3) {
        if (kps[i] > 0) {
            hasScores = true;
            break;
        }
    }
    const out: Array<{ x: number; y: number } | null> = [];
    for (let i = 0; i + 2 < kps.length; i += 3) {
        const s = kps[i + 2];
        out.push(!hasScores || s > KP_MIN_SCORE ? { x: kps[i], y: kps[i + 1] } : null);
    }
    return out;
}

// Ô chuyển động của sự kiện GẦN NHẤT trên camera này. Không đi qua AI: engine
// tự dò bằng motioncells rồi bắn qua /ws/motion-events, nên không có aiType,
// không có độ tin cậy, và chỉ về khi sự kiện ĐÃ KẾT THÚC — tức luôn trễ vài
// giây so với hình đang chạy. Vẽ mờ hơn khung AI để không ai nhầm là realtime.
export type MotionOverlayCells = {
    /** Ô đang động NẰM TRONG một vùng đã vẽ. */
    cells: string;
    /** Ô đang động nằm NGOÀI mọi vùng — vẽ đỏ. Bỏ trống khi vẽ lại sự kiện cũ. */
    outside?: string;
    gridX: number;
    gridY: number;
};

const MOTION_COLOR = "#a78bfa"; // tím — cùng màu chip "Chuyển động"
// Đỏ cho chuyển động NGOÀI vùng: vẫn hiện để biết chỗ đó có động, nhưng khác
// màu để không nhầm với chỗ thật sự đang được canh.
const MOTION_OUTSIDE_COLOR = "#f87171";

function motionCellList(raw: string, gridX: number, gridY: number): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    for (const part of String(raw || "").split(",")) {
        const [r, c] = part.trim().split(":");
        const row = Number(r);
        const col = Number(c);
        if (!Number.isInteger(row) || !Number.isInteger(col)) continue;
        if (row < 0 || col < 0 || row >= gridY || col >= gridX) continue;
        out.push([row, col]);
    }
    return out;
}

export function DetectionOverlay({
    boxes,
    zones = [],
    motion,
    videoRef,
    fit,
    transform,
    transition,
    showLabels = true,
    showZones = true,
    types,
}: {
    boxes: OverlayBox[];
    motion?: MotionOverlayCells | null;
    // Vùng giám sát (polygon) của cấu hình AI — chỉ những job có cấu hình vùng
    // mới có; job chạy toàn khung thì rỗng.
    zones?: OverlayZone[];
    showZones?: boolean;
    // Chấp nhận cả <canvas>: trình phát MoQ giải mã bằng WebCodecs nên vẽ
    // lên canvas chứ không có thẻ <video> nào. Chỉ cần kích thước NGUỒN của
    // ảnh, mà canvas cũng có (width/height).
    videoRef: React.RefObject<HTMLVideoElement | HTMLCanvasElement | null>;
    fit: "fill" | "contain";
    transform: string;
    transition: string;
    showLabels?: boolean;
    // Chỉ vẽ khung của các loại này (undefined = vẽ hết). Lọc ở phía HIỂN THỊ
    // nên đổi lựa chọn là thấy ngay, không phải đóng/mở lại socket.
    types?: Set<FeedTab>;
}) {
    const hostRef = useRef<HTMLDivElement>(null);
    // Hình chữ nhật ẢNH THẬT bên trong thẻ video, tính theo pixel của lớp phủ.
    const [rect, setRect] = useState<{
        left: number;
        top: number;
        width: number;
        height: number;
    } | null>(null);

    const measure = useCallback(() => {
        const host = hostRef.current;
        const video = videoRef.current;
        if (!host) return;
        const cw = host.clientWidth;
        const ch = host.clientHeight;
        if (cw <= 0 || ch <= 0) return;
        // object-fill: ảnh giãn khít thẻ, không có viền.
        if (fit === "fill") {
            setRect({ left: 0, top: 0, width: cw, height: ch });
            return;
        }
        const vw = video ? ("videoWidth" in video ? video.videoWidth : video.width) : 0;
        const vh = video ? ("videoHeight" in video ? video.videoHeight : video.height) : 0;
        if (vw <= 0 || vh <= 0) {
            // Chưa biết kích thước video (chưa có metadata) — tạm coi khít thẻ.
            setRect({ left: 0, top: 0, width: cw, height: ch });
            return;
        }
        const scale = Math.min(cw / vw, ch / vh);
        const w = vw * scale;
        const h = vh * scale;
        setRect({ left: (cw - w) / 2, top: (ch - h) / 2, width: w, height: h });
    }, [fit, videoRef]);

    useEffect(() => {
        measure();
        const host = hostRef.current;
        const video = videoRef.current;
        const ro = new ResizeObserver(measure);
        if (host) ro.observe(host);
        // `resize` của thẻ video bắn khi độ phân giải luồng đổi giữa chừng
        // (camera đổi profile) — không nghe thì khung lệch cho tới lần đổi
        // kích thước cửa sổ kế tiếp.
        video?.addEventListener("loadedmetadata", measure);
        video?.addEventListener("resize", measure);
        return () => {
            ro.disconnect();
            video?.removeEventListener("loadedmetadata", measure);
            video?.removeEventListener("resize", measure);
        };
    }, [measure, videoRef]);

    // Khung không biết thuộc loại nào (ai_type lạ/thiếu) thì VẪN vẽ — thà thừa
    // còn hơn giấu mất một phát hiện có thật.
    const passes = (aiType?: string) => {
        if (!types) return true;
        const tab = aiType ? AI_TYPE_TO_TAB[aiType] : undefined;
        return tab ? types.has(tab) : true;
    };
    const visible = boxes.filter((b) => passes(b.aiType));
    // Vùng theo cùng bộ lọc loại: tắt "Vùng cấm" thì vùng của job vùng cấm
    // cũng biến mất chứ không trơ lại một mình.
    const visibleZones = showZones ? zones.filter((z) => passes(z.aiType)) : [];
    const hasPose = visible.some((b) => b.kps && b.kps.length >= 3);
    const hasMask = visible.some((b) => !!b.mask);

    const motionOk = Boolean(motion && motion.gridX > 0 && motion.gridY > 0);
    const motionCells = motionOk
        ? motionCellList(motion!.cells, motion!.gridX, motion!.gridY)
        : [];
    const motionOutside = motionOk
        ? motionCellList(motion!.outside ?? "", motion!.gridX, motion!.gridY)
        : [];

    if (
        !rect ||
        (visible.length === 0 &&
            visibleZones.length === 0 &&
            motionCells.length === 0 &&
            motionOutside.length === 0)
    ) {
        // Vẫn phải render phần tử để ResizeObserver có chỗ đo.
        return <div ref={hostRef} className="pointer-events-none absolute inset-0" />;
    }

    return (
        <div
            ref={hostRef}
            className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
            style={{ transformOrigin: "0 0", transform, transition }}
        >
            <div
                className="absolute"
                style={{
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                }}
            >
                {/* VÙNG + KHUNG XƯƠNG dùng chung một lớp SVG, vẽ TRƯỚC nên nằm
                    dưới các khung phát hiện.

                    viewBox theo PIXEL (không phải 0..1): với 0..1 +
                    preserveAspectRatio="none" thì mọi hình tròn bị kéo thành
                    bầu dục và nét viền méo theo tỉ lệ khung. Dùng pixel thì
                    1 đơn vị = 1 px, chấm khớp tròn đều, nét đúng bề rộng. */}
                {visibleZones.length > 0 || hasPose || hasMask ? (
                    <svg
                        className="absolute inset-0 h-full w-full"
                        viewBox={`0 0 ${rect.width} ${rect.height}`}
                        preserveAspectRatio="none"
                        aria-hidden="true"
                        data-detection-overlay=""
                    >
                        {visibleZones.map((z, i) => {
                            const color = zoneColorOf(z);
                            return (
                                <polygon
                                    key={`z-${z.jobId}-${i}`}
                                    points={z.points
                                        .map((p) => `${p[0] * rect.width},${p[1] * rect.height}`)
                                        .join(" ")}
                                    fill={color}
                                    fillOpacity={0.12}
                                    stroke={color}
                                    strokeWidth={2}
                                    strokeDasharray="6 4"
                                />
                            );
                        })}

                        {/* MASK phân vùng: tô các ô lưới thuộc về vật. Vẽ
                            trước khung xương để xương nổi lên trên. */}
                        {visible.map((b, bi) => {
                            if (!b.mask) return null;
                            const g = b.mask_grid || 32;
                            const color = colorOf(b);
                            const bw = (b.x2 - b.x1) * rect.width;
                            const bh = (b.y2 - b.y1) * rect.height;
                            const cw = bw / g;
                            const ch = bh / g;
                            return (
                                <g key={`m-${b.jobId}-${b.tid ?? bi}-${bi}`} opacity={0.4}>
                                    {maskCells(b.mask, g).map(([gx, gy], ci) => (
                                        <rect
                                            key={ci}
                                            x={b.x1 * rect.width + gx * cw}
                                            y={b.y1 * rect.height + gy * ch}
                                            // +0.5px để các ô liền nhau không hở kẻ chỉ
                                            width={cw + 0.5}
                                            height={ch + 0.5}
                                            fill={color}
                                        />
                                    ))}
                                </g>
                            );
                        })}

                        {visible.map((b, bi) => {
                            if (!b.kps || b.kps.length < 3) return null;
                            const color = colorOf(b);
                            const pts = toPoints(b.kps);
                            const edges =
                                pts.length === 17
                                    ? POSE_EDGES_17
                                    : pts.length === 5
                                      ? FACE_EDGES_5
                                      : [];
                            return (
                                <g key={`k-${b.jobId}-${b.tid ?? bi}-${bi}`}>
                                    {edges.map(([a, c], ei) => {
                                        const p = pts[a];
                                        const q = pts[c];
                                        if (!p || !q) return null;
                                        return (
                                            <line
                                                key={ei}
                                                x1={p.x * rect.width}
                                                y1={p.y * rect.height}
                                                x2={q.x * rect.width}
                                                y2={q.y * rect.height}
                                                stroke={color}
                                                strokeWidth={2}
                                                strokeLinecap="round"
                                                opacity={0.95}
                                            />
                                        );
                                    })}
                                    {pts.map((p, pi) =>
                                        p ? (
                                            <circle
                                                key={pi}
                                                cx={p.x * rect.width}
                                                cy={p.y * rect.height}
                                                r={3}
                                                fill={color}
                                                stroke="rgba(0,0,0,0.55)"
                                                strokeWidth={1}
                                            />
                                        ) : null,
                                    )}
                                </g>
                            );
                        })}
                    </svg>
                ) : null}

                {/* Ô CHUYỂN ĐỘNG — vẽ dưới cùng, đè lên hình nhưng nằm dưới
                    khung AI. Toạ độ là tỉ lệ của CẢ khung nên dùng % thẳng.
                    Ngoài vùng vẽ TRƯỚC để ô trong vùng nổi lên trên nếu trùng. */}
                {motionOutside.map(([row, col]) => (
                    <div
                        key={`mx-${row}:${col}`}
                        className="absolute"
                        style={{
                            left: `${(col / motion!.gridX) * 100}%`,
                            top: `${(row / motion!.gridY) * 100}%`,
                            width: `${(1 / motion!.gridX) * 100}%`,
                            height: `${(1 / motion!.gridY) * 100}%`,
                            backgroundColor: `${MOTION_OUTSIDE_COLOR}33`,
                            border: `1px solid ${MOTION_OUTSIDE_COLOR}a0`,
                        }}
                    />
                ))}
                {motionCells.map(([row, col]) => (
                    <div
                        key={`mo-${row}:${col}`}
                        className="absolute"
                        style={{
                            left: `${(col / motion!.gridX) * 100}%`,
                            top: `${(row / motion!.gridY) * 100}%`,
                            width: `${(1 / motion!.gridX) * 100}%`,
                            height: `${(1 / motion!.gridY) * 100}%`,
                            backgroundColor: `${MOTION_COLOR}40`,
                            border: `1px solid ${MOTION_COLOR}b0`,
                        }}
                    />
                ))}

                {visible.map((b, i) => {
                    const color = colorOf(b);
                    const label = b.label || "";
                    const tid = b.tid !== undefined ? `#${b.tid}` : "";
                    const text = [label, tid].filter(Boolean).join(" ");
                    return (
                        <div
                            key={`${b.jobId}-${b.tid ?? i}-${i}`}
                            className="absolute rounded-[2px]"
                            style={{
                                left: `${b.x1 * 100}%`,
                                top: `${b.y1 * 100}%`,
                                width: `${(b.x2 - b.x1) * 100}%`,
                                height: `${(b.y2 - b.y1) * 100}%`,
                                border: `2px solid ${color}`,
                                // Viền tối mảnh phía ngoài để khung nổi trên
                                // nền sáng (tường trắng, trời chói).
                                boxShadow: "0 0 0 1px rgba(0,0,0,0.55)",
                            }}
                        >
                            {showLabels && text ? (
                                <span
                                    className="absolute left-0 max-w-full truncate rounded-[2px] px-1 text-[10px] font-semibold leading-[14px] text-black"
                                    style={{ bottom: "100%", backgroundColor: color }}
                                >
                                    {text}
                                </span>
                            ) : null}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
