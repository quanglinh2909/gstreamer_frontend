import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MousePointerClick, Search, X } from "lucide-react";
import { AI_TYPE_TO_TAB, cn, TYPE_META } from "@/lib/event-feed-shared";

// "Tìm theo vùng": kéo một hình chữ nhật lên hình, hệ thống trả về những gì
// ĐÃ ĐI QUA vùng đó trong khoảng thời gian đang xem trên timeline.
//
// Chia làm ba phần vì lớp kéo nằm TRÊN video còn kết quả nằm ở panel bên PHẢI:
//   useRegionSearch  — trạng thái + gọi API, do trang giữ để cả hai cùng thấy
//   RegionSearchLayer — lớp bắt kéo chuột đè lên video
//   RegionSearchPanel — panel phải, thay chỗ bảng sự kiện khi đang tìm
//
// Chỉ có dữ liệu nếu cấu hình AI của camera đã bật "Lưu khung phát hiện".

export type RegionHit = {
    tid: number | null;
    ai_type?: string | null;
    class_id?: number | null;
    t_start: number;
    t_end: number;
    best_score?: number | null;
    bbox: number[];
};

type Rect = { x1: number; y1: number; x2: number; y2: number };

function fmtClock(ms: number) {
    return new Date(ms).toLocaleTimeString("vi-VN");
}
function fmtDate(ms: number) {
    return new Date(ms).toLocaleDateString("vi-VN");
}
function fmtDur(ms: number) {
    const s = Math.max(0, Math.round(ms / 1000));
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}p${String(s % 60).padStart(2, "0")}`;
}
function typeLabel(aiType?: string | null) {
    const tab = aiType ? AI_TYPE_TO_TAB[aiType] : undefined;
    return tab ? TYPE_META[tab].label : aiType || "Khác";
}
function typeBadge(aiType?: string | null) {
    const tab = aiType ? AI_TYPE_TO_TAB[aiType] : undefined;
    return tab ? TYPE_META[tab].badge : "bg-slate-700/40 text-slate-300 ring-slate-600";
}

export type RegionSearchState = ReturnType<typeof useRegionSearch>;

export function useRegionSearch(cameraId: string, fromMs: number, toMs: number) {
    const [rect, setRect] = useState<Rect | null>(null);
    const [hits, setHits] = useState<RegionHit[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    // Khoảng thời gian ĐÃ tìm, chốt lại lúc bấm — timeline vẫn trôi theo thời
    // gian thực nên nếu đọc window hiện tại thì nhãn sẽ lệch với kết quả.
    const [range, setRange] = useState<[number, number] | null>(null);

    const search = useCallback(
        async (r: Rect) => {
            setLoading(true);
            setError("");
            setRect(r);
            setRange([fromMs, toMs]);
            try {
                const q = new URLSearchParams({
                    camera_id: cameraId,
                    from_ms: String(Math.round(fromMs)),
                    to_ms: String(Math.round(toMs)),
                    x1: String(Math.min(r.x1, r.x2)),
                    y1: String(Math.min(r.y1, r.y2)),
                    x2: String(Math.max(r.x1, r.x2)),
                    y2: String(Math.max(r.y1, r.y2)),
                });
                const res = await fetch(`/api/backend/detections/region-search?${q}`);
                if (!res.ok) throw new Error(`Máy chủ trả về ${res.status}`);
                const data = (await res.json()) as RegionHit[];
                setHits(Array.isArray(data) ? data : []);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Không tìm được");
                setHits([]);
            } finally {
                setLoading(false);
            }
        },
        [cameraId, fromMs, toMs],
    );

    const reset = useCallback(() => {
        setRect(null);
        setHits(null);
        setError("");
        setRange(null);
    }, []);

    return { rect, hits, loading, error, range, search, reset };
}

// ---------------------------------------------------------------- lớp kéo

export function RegionSearchLayer({
    state,
    onClose,
}: {
    state: RegionSearchState;
    onClose: () => void;
}) {
    const hostRef = useRef<HTMLDivElement>(null);
    const [drag, setDrag] = useState<Rect | null>(null);
    const { rect, search, reset } = state;

    // Hình chữ nhật ẢNH THẬT bên trong lớp phủ, tính theo pixel.
    //
    // BẮT BUỘC, không phải làm đẹp: video hiển thị `object-contain` nên có viền
    // đen trên/dưới (hoặc trái/phải), còn lớp này trải kín cả thẻ chứa (kể cả
    // phần padding). Chuẩn hoá theo thẻ chứa thì vùng gửi lên máy chủ bị lệch
    // và co giãn so với toạ độ [0,1] của khung phát hiện — tìm ra kết quả sai
    // mà nhìn thì vẫn thấy "đúng chỗ mình kéo".
    const [imgRect, setImgRect] = useState<{
        left: number; top: number; width: number; height: number;
    } | null>(null);

    const measure = useCallback(() => {
        const host = hostRef.current;
        if (!host) return;
        const hr = host.getBoundingClientRect();
        if (hr.width <= 0 || hr.height <= 0) return;
        const video = host.parentElement?.querySelector("video") as HTMLVideoElement | null;
        const vw = video?.videoWidth ?? 0;
        const vh = video?.videoHeight ?? 0;
        if (!video || vw <= 0 || vh <= 0) {
            setImgRect({ left: 0, top: 0, width: hr.width, height: hr.height });
            return;
        }
        const vr = video.getBoundingClientRect();
        const scale = Math.min(vr.width / vw, vr.height / vh);
        const w = vw * scale;
        const h = vh * scale;
        setImgRect({
            left: vr.left - hr.left + (vr.width - w) / 2,
            top: vr.top - hr.top + (vr.height - h) / 2,
            width: w,
            height: h,
        });
    }, []);

    useEffect(() => {
        measure();
        const host = hostRef.current;
        const video = host?.parentElement?.querySelector("video") as HTMLVideoElement | null;
        const ro = new ResizeObserver(measure);
        if (host) ro.observe(host);
        video?.addEventListener("loadedmetadata", measure);
        video?.addEventListener("resize", measure);
        // Video có thể chưa có metadata lúc lớp này gắn vào; đo lại vài nhịp
        // đầu cho chắc rồi thôi.
        const t = window.setInterval(measure, 500);
        const stop = window.setTimeout(() => window.clearInterval(t), 5000);
        return () => {
            ro.disconnect();
            video?.removeEventListener("loadedmetadata", measure);
            video?.removeEventListener("resize", measure);
            window.clearInterval(t);
            window.clearTimeout(stop);
        };
    }, [measure]);

    // Toạ độ chuột -> [0,1] theo KHUNG ẢNH (không phải thẻ chứa).
    const toNorm = useCallback(
        (e: React.PointerEvent) => {
            const el = hostRef.current;
            if (!el || !imgRect || imgRect.width <= 0 || imgRect.height <= 0) {
                return { x: 0, y: 0 };
            }
            const r = el.getBoundingClientRect();
            return {
                x: Math.min(1, Math.max(0, (e.clientX - r.left - imgRect.left) / imgRect.width)),
                y: Math.min(1, Math.max(0, (e.clientY - r.top - imgRect.top) / imgRect.height)),
            };
        },
        [imgRect],
    );

    const style = (r: Rect) => {
        const b = imgRect ?? { left: 0, top: 0, width: 0, height: 0 };
        return {
            left: b.left + Math.min(r.x1, r.x2) * b.width,
            top: b.top + Math.min(r.y1, r.y2) * b.height,
            width: Math.abs(r.x2 - r.x1) * b.width,
            height: Math.abs(r.y2 - r.y1) * b.height,
        };
    };

    const shown = drag ?? rect;

    return (
        <>
            {/* Lớp bắt thao tác kéo. Nằm TRÊN video nên phải tự tay chặn
                pointer, không thì cú kéo rơi xuống player. */}
            <div
                ref={hostRef}
                data-region-search=""
                onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    const p = toNorm(e);
                    setDrag({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
                    reset();
                }}
                onPointerMove={(e) => {
                    if (!drag) return;
                    const p = toNorm(e);
                    setDrag({ ...drag, x2: p.x, y2: p.y });
                }}
                onPointerUp={() => {
                    if (!drag) return;
                    const r = drag;
                    setDrag(null);
                    // Vẽ nhầm một chấm thì bỏ qua, đừng tìm cả khung hình.
                    if (Math.abs(r.x2 - r.x1) < 0.02 || Math.abs(r.y2 - r.y1) < 0.02) {
                        reset();
                        return;
                    }
                    void search(r);
                }}
                className="absolute inset-0 z-20 cursor-crosshair"
            >
                {shown ? (
                    <div
                        className="pointer-events-none absolute border-2 border-sky-400 bg-sky-400/15"
                        style={style(shown)}
                    />
                ) : null}
            </div>

            {/* Hướng dẫn */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center p-2">
                <div className="pointer-events-auto flex items-center gap-2 rounded-lg bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 shadow-lg backdrop-blur">
                    <Search size={13} className="text-sky-400" />
                    {rect ? "Kéo lại để tìm vùng khác" : "Kéo chuột để khoanh vùng cần tìm"}
                    <button
                        type="button"
                        onClick={onClose}
                        className="ml-1 rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                        aria-label="Thoát tìm theo vùng"
                    >
                        <X size={13} />
                    </button>
                </div>
            </div>
        </>
    );
}

// -------------------------------------------------------------- panel phải

export function RegionSearchPanel({
    state,
    cameraLabel,
    onPick,
    onClose,
}: {
    state: RegionSearchState;
    cameraLabel: string;
    // Bấm một kết quả -> nhảy timeline tới đó (giây).
    onPick: (timestampSec: number) => void;
    onClose: () => void;
}) {
    const { rect, hits, loading, error, range } = state;

    return (
        <aside
            /* Trên điện thoại KHÔNG phủ lên video mà nằm NGAY DƯỚI nó, chiếm
               hết phần còn lại của màn hình — xem lại camera là vừa nhìn hình
               vừa lướt sự kiện, che mất một trong hai thì hỏng cả việc. Cột
               bên phải chỉ quay lại từ md. */
            className="flex min-h-0 flex-1 flex-col border-t border-slate-800 bg-slate-900 md:w-96 md:flex-none md:shrink-0 md:border-l md:border-t-0"
        >
            <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
                <Search size={15} className="text-sky-400" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-white">Tìm theo vùng</h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Thoát tìm theo vùng"
                    className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
                >
                    <X size={15} />
                </button>
            </div>

            <div className="flex flex-col gap-1 border-b border-slate-800 px-3 py-2.5 text-xs text-slate-400">
                <p className="truncate">
                    Camera: <span className="font-medium text-slate-200">{cameraLabel}</span>
                </p>
                {range ? (
                    <p className="truncate">
                        Khoảng:{" "}
                        <span className="font-mono text-slate-200">
                            {fmtClock(range[0])} – {fmtClock(range[1])}
                        </span>
                    </p>
                ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
                {loading ? (
                    <p className="flex items-center justify-center gap-2 px-4 py-6 text-center text-xs text-slate-500">
                        <Loader2 size={14} className="animate-spin" /> Đang tìm…
                    </p>
                ) : error ? (
                    <p className="px-4 py-6 text-center text-xs text-rose-400">{error}</p>
                ) : !rect ? (
                    <p className="flex flex-col items-center gap-2 px-6 py-8 text-center text-xs text-slate-500">
                        <MousePointerClick size={26} className="text-slate-600" />
                        Kéo chuột trên hình để khoanh vùng cần tìm. Kết quả sẽ hiện ở đây,
                        mới nhất trước.
                    </p>
                ) : hits && hits.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-slate-500">
                        Không có gì đi qua vùng này trong khoảng đang xem. Nếu camera chưa
                        bật &quot;Lưu khung phát hiện&quot; thì sẽ không có dữ liệu.
                    </p>
                ) : (
                    <>
                        <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            {hits?.length} kết quả · mới nhất trước
                        </p>
                        <ul className="flex flex-col gap-2 p-3 pt-1">
                            {hits?.map((h, i) => (
                                <HitRow
                                    key={`${h.tid}-${h.t_start}-${i}`}
                                    hit={h}
                                    region={rect}
                                    onPick={() => onPick(h.t_start / 1000)}
                                />
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </aside>
    );
}

// Một kết quả. Không có ảnh lưu kèm (chỉ lưu toạ độ) nên vẽ SƠ ĐỒ khung hình:
// ô mờ = vùng đã khoanh, ô sáng = chỗ vật đi qua. Nhìn là biết ngay kết quả
// nằm đâu trong khung mà không tốn byte ảnh nào.
function HitRow({
    hit,
    region,
    onPick,
}: {
    hit: RegionHit;
    region: Rect | null;
    onPick: () => void;
}) {
    const [bx1, by1, bx2, by2] = hit.bbox;
    const pct = (v: number) => `${Math.max(0, Math.min(1, v)) * 100}%`;
    const score = hit.best_score ? `${Math.round(hit.best_score * 100)}%` : null;

    return (
        <li>
            <button
                type="button"
                onClick={onPick}
                title="Nhảy tới đoạn ghi này"
                className="group flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-800/30 p-2 text-left transition-colors hover:border-sky-600/70 hover:bg-slate-800/60"
            >
                <span className="relative block aspect-video w-24 shrink-0 overflow-hidden rounded-md bg-slate-950 ring-1 ring-inset ring-slate-800">
                    {region ? (
                        <span
                            className="absolute border border-dashed border-sky-500/60 bg-sky-500/10"
                            style={{
                                left: pct(Math.min(region.x1, region.x2)),
                                top: pct(Math.min(region.y1, region.y2)),
                                width: pct(Math.abs(region.x2 - region.x1)),
                                height: pct(Math.abs(region.y2 - region.y1)),
                            }}
                        />
                    ) : null}
                    <span
                        className="absolute border-2 border-emerald-400 bg-emerald-400/20"
                        style={{
                            left: pct(bx1),
                            top: pct(by1),
                            width: pct(bx2 - bx1),
                            height: pct(by2 - by1),
                        }}
                    />
                </span>

                <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                        <span
                            className={cn(
                                "rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
                                typeBadge(hit.ai_type),
                            )}
                        >
                            {typeLabel(hit.ai_type)}
                        </span>
                        {score ? (
                            <span className="text-[11px] text-slate-400">{score}</span>
                        ) : null}
                        {hit.tid !== null && hit.tid !== undefined ? (
                            <span className="text-[11px] text-slate-500">#{hit.tid}</span>
                        ) : null}
                    </span>
                    <span className="mt-1 block truncate font-mono text-sm text-slate-100">
                        {fmtClock(hit.t_start)}
                    </span>
                    <span className="block truncate text-[11px] text-slate-500">
                        {fmtDate(hit.t_start)} · kéo dài {fmtDur(hit.t_end - hit.t_start)}
                    </span>
                </span>

                <span className="shrink-0 text-[11px] text-sky-400 opacity-0 transition-opacity group-hover:opacity-100">
                    Xem lại
                </span>
            </button>
        </li>
    );
}
