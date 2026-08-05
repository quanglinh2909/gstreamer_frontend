import { useCallback, useMemo, useRef, useState } from "react";
import { cameraApi } from "@/backend-api/camera-api";
import type { ICameraResponse, RecordingMode } from "@/interface/camera";

const MOTION_MODE: RecordingMode = "motion";
const ALWAYS_MODE: RecordingMode = "always";

// Trạng thái dùng chung của tab "Chuyển động": bảng vẽ nằm ở cột giữa còn tham
// số + danh sách vùng ở cột phải, hai component khác nhau nên state phải ở đây.
//
// Đổi camera thì nạp lại NGAY TRONG RENDER (so id với lần trước), không dùng
// effect. Effect chạy SAU khi đã vẽ xong, nên mỗi lần đổi camera sẽ loé lên một
// khung mang dữ liệu của camera cũ — chưa kể eslint react-hooks/set-state-in-effect
// chặn thẳng. Đây là lối React tự khuyến nghị cho "chỉnh state khi prop đổi".
//
// So theo id chứ không theo cả object: sau khi lưu, danh sách camera được tải
// lại và sinh object MỚI cho cùng một camera — so object là xoá trắng đúng thứ
// người dùng vừa vẽ.

// Lưới mặc định 32×32 (cũng là cỡ lớn nhất motioncells nhận). Phải khớp với
// engine (StreamTypes.hpp) và backend Python; lệch nhau thì camera chưa cấu
// hình sẽ vẽ một đằng mà engine dò một nẻo.
export const DEFAULT_GRID = 32;
export const MAX_LEVEL = 10;
/** Cỡ lưới cho chọn. motioncells chỉ nhận 8..32. */
export const GRID_PRESETS = [8, 16, 24, 32] as const;

/**
 * Cỡ lưới để hiển thị. Hàng cũ trong DB còn giữ 10x10 (bản trước mặc định 10),
 * mà 10 không có trong danh sách chọn — thẻ <select> khi đó rơi về option ĐẦU
 * và hiện "8×8" dù state đang là 10. Tức là nó báo sai cỡ lưới thật.
 *
 * Giá trị lạ mà camera CHƯA vẽ vùng nào thì lấy luôn mặc định 32. Còn nếu đã có
 * vùng thì giữ nguyên: vùng lưu theo toạ độ Ô, đổi lưới dưới chân là dời hết
 * vùng đi chỗ khác.
 */
function pickGrid(value: number | undefined, hasZones: boolean): number {
    const n = Number(value) || 0;
    if ((GRID_PRESETS as readonly number[]).includes(n)) return n;
    return hasZones && n >= 8 && n <= 32 ? n : DEFAULT_GRID;
}

/**
 * Một VÙNG: hình chữ nhật theo toạ độ Ô, bao gồm cả hai đầu, kèm mức 1..10.
 *
 * Mức N = "cần N×10% số ô CỦA CHÍNH VÙNG NÀY cùng động". Hai vùng cùng mức vẫn
 * là hai vùng độc lập — vẽ hai ô mức 8 nghĩa là hai chỗ cần canh riêng.
 *
 * `id` chỉ sống ở phía giao diện (khoá React + chọn/xoá); JSON gửi lên engine
 * không mang nó.
 */
export type MotionZone = {
    id: string;
    r1: number;
    c1: number;
    r2: number;
    c2: number;
    level: number;
};

export function zoneCells(zone: MotionZone): number {
    return (zone.r2 - zone.r1 + 1) * (zone.c2 - zone.c1 + 1);
}

/** Số ô phải cùng động — đúng công thức engine dùng (MotionZone::needCells). */
export function zoneNeed(zone: MotionZone): number {
    const lv = Math.min(MAX_LEVEL, Math.max(1, zone.level));
    const cells = zoneCells(zone);
    return Math.max(1, Math.min(cells, Math.ceil((lv * cells) / 10)));
}

export function parseZones(raw: string | null | undefined): MotionZone[] {
    if (!raw) return [];
    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch {
        return [];
    }
    if (!Array.isArray(data)) return [];
    const out: MotionZone[] = [];
    data.forEach((item, index) => {
        if (!item || typeof item !== "object") return;
        const z = item as Record<string, unknown>;
        const nums = ["r1", "c1", "r2", "c2"].map((k) => Number(z[k]));
        if (nums.some((n) => !Number.isFinite(n))) return;
        const [r1, c1, r2, c2] = nums;
        out.push({
            id: `z${index}-${r1}-${c1}-${r2}-${c2}`,
            r1: Math.min(r1, r2),
            c1: Math.min(c1, c2),
            r2: Math.max(r1, r2),
            c2: Math.max(c1, c2),
            level: Math.min(MAX_LEVEL, Math.max(1, Number(z.level) || 1)),
        });
    });
    return out;
}

function serializeZones(zones: MotionZone[]): string {
    return JSON.stringify(
        zones.map((z) => ({ r1: z.r1, c1: z.c1, r2: z.r2, c2: z.c2, level: z.level })),
    );
}

export function toNumber(value: string, fallback: number): number {
    const n = Number(String(value).trim());
    return Number.isFinite(n) ? n : fallback;
}

export function useMotionGridEditor(camera: ICameraResponse | null, onSaved: () => void) {
    const [zones, setZones] = useState<MotionZone[]>(() => parseZones(camera?.motionZones));
    const [gridX, setGridX] = useState(() =>
        pickGrid(camera?.motionGridX, Boolean(parseZones(camera?.motionZones).length)),
    );
    const [gridY, setGridY] = useState(() =>
        pickGrid(camera?.motionGridY, Boolean(parseZones(camera?.motionZones).length)),
    );
    const [brush, setBrush] = useState(1);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    // Hình đang kéo dở (chưa nhả chuột). Giữ riêng để vẽ xem trước mà không
    // đụng vào danh sách vùng thật.
    const [draft, setDraft] = useState<{ r1: number; c1: number; r2: number; c2: number } | null>(
        null,
    );
    const dragStartRef = useRef<{ row: number; col: number } | null>(null);
    // Gương của `draft`. endDraw PHẢI đọc từ đây chứ không lồng setZones vào
    // trong updater của setDraft: reactStrictMode bật nên React gọi updater HAI
    // lần, và mỗi hình vẽ ra lại thành hai vùng (đo được: kéo 1 hình -> danh
    // sách hiện "Vùng 1" và "Vùng 2" giống hệt nhau).
    const draftRef = useRef<{ r1: number; c1: number; r2: number; c2: number } | null>(null);
    const nextIdRef = useRef(0);

    const [enabled, setEnabled] = useState(() => Boolean(camera?.motionEnabled));
    const [preSeconds, setPreSeconds] = useState(() => String(camera?.preMotionSeconds ?? 5));
    const [postSeconds, setPostSeconds] = useState(() => String(camera?.postMotionSeconds ?? 5));
    // Mặc định BẬT khi camera chưa có giá trị: giữ nguyên hành vi cũ, tắt là
    // lựa chọn có ý thức của người dùng.
    const [saveEvents, setSaveEvents] = useState(() => camera?.motionSaveEvents !== false);
    const [recordOnMotion, setRecordOnMotion] = useState(() => camera?.recordingMode === "motion");

    const [lastCameraId, setLastCameraId] = useState<string | null>(camera?.id ?? null);
    if ((camera?.id ?? null) !== lastCameraId) {
        const nextZones = parseZones(camera?.motionZones);
        setLastCameraId(camera?.id ?? null);
        setGridX(pickGrid(camera?.motionGridX, nextZones.length > 0));
        setGridY(pickGrid(camera?.motionGridY, nextZones.length > 0));
        setZones(nextZones);
        setSelectedId(null);
        setDraft(null);
        setEnabled(Boolean(camera?.motionEnabled));
        setPreSeconds(String(camera?.preMotionSeconds ?? 5));
        setPostSeconds(String(camera?.postMotionSeconds ?? 5));
        setSaveEvents(camera?.motionSaveEvents !== false);
        setRecordOnMotion(camera?.recordingMode === "motion");
        setMessage("");
        setErrorMessage("");
    }

    // Camera có đang ghi hình không — quyết định "chỉ ghi khi có chuyển động"
    // có nghĩa gì không. Bật/tắt ghi vẫn ở form Sửa camera.
    const recordingOn = Boolean(camera?.recordingEnabled) || camera?.recordingMode !== "off";

    // ── Vẽ bằng cách KÉO: nhấn ở một ô, kéo tới ô khác, nhả ra thành một vùng ──
    const startDraw = useCallback((row: number, col: number) => {
        dragStartRef.current = { row, col };
        draftRef.current = { r1: row, c1: col, r2: row, c2: col };
        setDraft(draftRef.current);
    }, []);

    const moveDraw = useCallback((row: number, col: number) => {
        const from = dragStartRef.current;
        if (!from) return;
        draftRef.current = {
            r1: Math.min(from.row, row),
            c1: Math.min(from.col, col),
            r2: Math.max(from.row, row),
            c2: Math.max(from.col, col),
        };
        setDraft(draftRef.current);
    }, []);

    const endDraw = useCallback(() => {
        if (!dragStartRef.current) return;
        dragStartRef.current = null;
        const rect = draftRef.current;
        draftRef.current = null;
        setDraft(null);
        if (!rect) return;
        const id = `new-${(nextIdRef.current += 1)}`;
        setZones((prev) => [...prev, { id, ...rect, level: brush }]);
        setSelectedId(id);
    }, [brush]);

    const removeZone = useCallback((id: string) => {
        setZones((prev) => prev.filter((z) => z.id !== id));
        setSelectedId((current) => (current === id ? null : current));
    }, []);

    const setZoneLevel = useCallback((id: string, level: number) => {
        setZones((prev) =>
            prev.map((z) =>
                z.id === id ? { ...z, level: Math.min(MAX_LEVEL, Math.max(1, level)) } : z,
            ),
        );
    }, []);

    const clearZones = useCallback(() => {
        setZones([]);
        setSelectedId(null);
    }, []);

    const fillFrame = useCallback(() => {
        const id = `new-${(nextIdRef.current += 1)}`;
        setZones([{ id, r1: 0, c1: 0, r2: gridY - 1, c2: gridX - 1, level: brush }]);
        setSelectedId(id);
    }, [gridX, gridY, brush]);

    const changeGrid = useCallback(
        (nextX: number, nextY: number) => {
            // Đổi cỡ lưới thì toạ độ ô cũ vô nghĩa — ánh xạ theo TỶ LỆ để giữ
            // lại hình đã vẽ thay vì xoá trắng công người dùng.
            setZones((prev) =>
                prev.map((z) => ({
                    ...z,
                    r1: Math.min(nextY - 1, Math.floor((z.r1 * nextY) / gridY)),
                    r2: Math.min(nextY - 1, Math.floor((z.r2 * nextY) / gridY)),
                    c1: Math.min(nextX - 1, Math.floor((z.c1 * nextX) / gridX)),
                    c2: Math.min(nextX - 1, Math.floor((z.c2 * nextX) / gridX)),
                })),
            );
            setGridX(nextX);
            setGridY(nextY);
        },
        [gridX, gridY],
    );

    const stats = useMemo(() => {
        const cells = zones.reduce((sum, z) => sum + zoneCells(z), 0);
        return { count: zones.length, cells };
    }, [zones]);

    const save = useCallback(async () => {
        if (!camera) return;
        setIsSaving(true);
        setMessage("");
        setErrorMessage("");
        try {
            await cameraApi.updateMotionGrid(camera.id, {
                motionGridX: gridX,
                motionGridY: gridY,
                motionZones: serializeZones(zones),
                motionEnabled: enabled,
                preMotionSeconds: Math.max(0, toNumber(preSeconds, 5)),
                postMotionSeconds: Math.max(0, toNumber(postSeconds, 5)),
                motionSaveEvents: saveEvents,
                // Chỉ đụng tới chế độ ghi khi camera ĐANG ghi — không thì công
                // tắc này vô nghĩa mà lại có nguy cơ bật ghi cho một camera
                // người dùng cố ý để tắt.
                ...(recordingOn
                    ? {
                          recordingEnabled: true,
                          recordingMode: recordOnMotion && enabled ? MOTION_MODE : ALWAYS_MODE,
                      }
                    : {}),
            });
            setMessage(
                !enabled
                    ? "Đã lưu · phát hiện chuyển động đang TẮT."
                    : zones.length === 0
                      ? "Đã lưu · chưa vẽ vùng nào nên sẽ không có sự kiện."
                      : `Đã lưu · ${zones.length} vùng.`,
            );
            onSaved();
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : "Không lưu được cấu hình chuyển động.",
            );
        } finally {
            setIsSaving(false);
        }
    }, [
        camera,
        gridX,
        gridY,
        zones,
        enabled,
        preSeconds,
        postSeconds,
        saveEvents,
        recordingOn,
        recordOnMotion,
        onSaved,
    ]);

    return {
        gridX,
        gridY,
        zones,
        draft,
        brush,
        setBrush,
        selectedId,
        setSelectedId,
        startDraw,
        moveDraw,
        endDraw,
        removeZone,
        setZoneLevel,
        clearZones,
        fillFrame,
        changeGrid,
        stats,
        enabled,
        setEnabled,
        preSeconds,
        setPreSeconds,
        postSeconds,
        setPostSeconds,
        saveEvents,
        setSaveEvents,
        recordOnMotion,
        setRecordOnMotion,
        recordingOn,
        isSaving,
        message,
        errorMessage,
        save,
    };
}

export type MotionGridEditor = ReturnType<typeof useMotionGridEditor>;
