import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Bell,
    CalendarDays,
    CheckSquare,
    Eye,
    Grid2x2,
    Grid3x3,
    LayoutGrid,
    LoaderCircle,
    Maximize2,
    Menu,
    Minimize2,
    Pause,
    Play,
    Radio,
    Search,
    Square,
    Trash2,
    Video,
    X,
} from "lucide-react";
import { SpeedPicker } from "@/components/common/speed-picker";
import {
    DrawerBackdrop,
    DrawerToggle,
    drawerClass,
} from "@/components/common/side-drawer";
import type { ICameraResponse } from "@/interface/camera";
import type { useCameraManager } from "@/hooks/use-camera-manager";
import {
    fetchMotionEvents,
    fetchSegments,
    type MotionEvent,
    type RecordingSegment,
} from "@/lib/recordings";
import { Timeline } from "@/components/recordings/timeline";
import { LiveTile } from "./live-tile";
import { DetectionFilter } from "@/components/common/detection-filter";
import { ALL_TABS, type FeedTab } from "@/lib/event-feed-shared";
import { EventFeedPanel } from "./event-feed-panel";
import { useLiveViewers } from "@/hooks/use-live-viewers";
import { useMotionEventFeed } from "@/hooks/use-motion-event-feed";
import { useAppMenuStore } from "@/stores/use-app-menu-store";
import { useIsMobile } from "@/hooks/use-is-mobile";

function cn(...classes: Array<string | false | undefined>) {
    return classes.filter(Boolean).join(" ");
}

const DEFAULT_SPAN = 6 * 3_600_000;
// Giữ ô của một KHUNG trên hình bấy nhiêu lâu. Engine bắn 5 khung/giây khi có
// động; hết động là không còn gói nào nên phải tự hết hạn.
const MOTION_FRAME_HOLD_MS = 1_200;

function startOfDay(ms: number): number {
    const x = new Date(ms);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
}
function toDateInputValue(ms: number): string {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
// Khung nhìn kết thúc ĐÚNG TẠI "bây giờ" (kiểu đầu ghi): vạch live sát mép phải.
function liveWindow(nowMs: number, span: number): [number, number] {
    return [nowMs - span, nowMs];
}

// Số ô mỗi bố cục kèm số cột — dùng cột tường minh thay vì tính căn bậc hai để
// sau này thêm bố cục lệch (1+5, 1+7) không phải sửa lại phần dựng lưới.
const layouts = [
    { count: 1, columns: 1, label: "1 ô", icon: Square },
    { count: 4, columns: 2, label: "4 ô", icon: Grid2x2 },
    { count: 9, columns: 3, label: "9 ô", icon: Grid3x3 },
    { count: 16, columns: 4, label: "16 ô", icon: LayoutGrid },
] as const;

export function LiveWall({
    manager,
    eventWsOrigin = "",
    engineWsOrigin = "",
}: {
    manager: ReturnType<typeof useCameraManager>;
    // Origin WebSocket của backend PYTHON (/ws) — nơi bắn sự kiện nhận diện.
    // Khác WEBSOCKET_ORIGIN_C (engine) mà camera-manager dùng cho trạng thái.
    eventWsOrigin?: string;
    // Origin WebSocket của ENGINE C++ (/wsc) — sự kiện CHUYỂN ĐỘNG do engine
    // phát hiện (motioncells) nên đi đường này, không qua Python.
    engineWsOrigin?: string;
}) {
    const { filteredCameras, searchText, setSearchText, isLoading, errorMessage } = manager;
    const toggleAppMenu = useAppMenuStore((state) => state.toggle);
    const isMobile = useIsMobile();
    // Bảng sự kiện: mở sẵn ở mọi khổ màn. Trên mobile nó nằm DƯỚI tường video
    // (chốt 42vh) chứ không phủ lên, nên mở sẵn không che mất hình.
    const [eventsPanelOpen, setEventsPanelOpen] = useState(true);
    // Danh sách camera bên trái. Trên điện thoại nó là ngăn kéo và mặc định
    // ĐÓNG — mở sẵn thì che mất tường video, tức là che đúng thứ người ta vào
    // trang này để xem. Từ md trở lên state này không có tác dụng gì (cột luôn
    // hiện), xem side-drawer.tsx.
    const [camListOpen, setCamListOpen] = useState(false);
    // Vẽ khung phát hiện AI đè lên các ô đang xem trực tiếp + lọc theo loại.
    // MẶC ĐỊNH TẮT: lớp phủ che mất hình, ai cần thì tự bật.
    const [showBoxes, setShowBoxes] = useState(false);
    const [boxTypes, setBoxTypes] = useState<Set<FeedTab>>(() => new Set(ALL_TABS));
    const [showZones, setShowZones] = useState(true);
    // Vẽ ô đã động lên hình. Riêng khỏi `boxTypes` vì chuyển động không phải
    // một FeedTab — engine tự dò, không đi qua AI. Mặc định BẬT như mọi loại
    // khung khác (boxTypes khởi tạo bằng ALL_TABS): bật "Khung AI" là thấy đủ
    // mọi thứ đang được vẽ, không phải đi tìm thêm một công tắc nữa.
    const [showMotionCells, setShowMotionCells] = useState(true);

    const [layoutIndex, setLayoutIndex] = useState(1); // mặc định 4 ô
    const layout = layouts[layoutIndex];
    // Mỗi ô giữ id camera (hoặc null). Giữ id chứ không giữ cả object để khi
    // trạng thái camera cập nhật qua websocket thì ô tự lấy dữ liệu mới nhất.
    const [slots, setSlotsState] = useState<Array<string | null>>(() => Array(4).fill(null));
    const [selectedSlot, setSelectedSlotState] = useState(0);

    // Cả ô đang chọn lẫn nội dung các ô đều được phản chiếu vào ref để đọc
    // được NGAY, không đợi vòng render kế tiếp. Bấm nhanh hai camera liên tiếp
    // thì React gộp state, lần bấm thứ hai vẫn thấy giá trị cũ và cả hai camera
    // rơi vào cùng một ô — lỗi này chỉ lộ ra khi bấm nhanh nên rất dễ lọt.
    const selectedSlotRef = useRef(0);
    const slotsRef = useRef<Array<string | null>>(Array(4).fill(null));

    const setSelectedSlot = useCallback((index: number) => {
        selectedSlotRef.current = index;
        setSelectedSlotState(index);
    }, []);

    const setSlots = useCallback((next: Array<string | null>) => {
        slotsRef.current = next;
        setSlotsState(next);
    }, []);

    // Ô đang xem LỚN (chỉ dùng ở khổ điện thoại). Không đổi bố cục tường và
    // không tháo các ô còn lại khỏi cây — chỉ ẩn chúng bằng CSS. Tháo ra là mỗi
    // lần phóng to/thu nhỏ lại đàm phán lại chừng ấy phiên WebRTC, đen hình vài
    // giây và tốn băng thông vô ích.
    const [maximizedSlot, setMaximizedSlot] = useState<number | null>(null);

    // Ô đang xem lớn mà mất camera (bấm tắt, đổi bố cục, kéo sang ô khác) thì
    // thoát chế độ xem lớn — nếu không màn hình chỉ còn một ô trống thui thủi
    // và không có cách nào quay lại lưới.
    useEffect(() => {
        if (maximizedSlot !== null && !slots[maximizedSlot]) setMaximizedSlot(null);
    }, [maximizedSlot, slots]);

    const wallRef = useRef<HTMLDivElement>(null);
    const [isWallFullscreen, setIsWallFullscreen] = useState(false);

    // Nguồn đang được kéo. Giữ trong state của component chứ không đọc từ
    // dataTransfer: trình duyệt chặn đọc dữ liệu trong lúc dragover (chỉ cho
    // đọc khi drop), mà ta cần biết ngay để tô sáng ô sắp thả.
    const [dragSource, setDragSource] = useState<
        { kind: "cameras"; cameraIds: string[] } | { kind: "slot"; index: number } | null
    >(null);
    const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

    // Các camera được tick bằng Ctrl+click trong danh sách. Giữ Set để kiểm tra
    // nhanh, còn THỨ TỰ khi thả thì lấy theo thứ tự hiển thị của danh sách —
    // thứ tự tick không phải thứ tự người dùng nhìn thấy.
    const [pickedIds, setPickedIds] = useState<Set<string>>(() => new Set());
    // Số người đang xem trực tiếp từng camera — hiện badge trong danh sách. Đây
    // là NGƯỜI XEM TOÀN HỆ THỐNG (mọi trình duyệt), không riêng tab này.
    const { liveByCamera } = useLiveViewers(5000);
    const pickedRef = useRef<Set<string>>(new Set());
    const setPicked = useCallback((next: Set<string>) => {
        pickedRef.current = next;
        setPickedIds(next);
    }, []);

    const togglePicked = useCallback(
        (cameraId: string) => {
            const next = new Set(pickedRef.current);
            if (next.has(cameraId)) next.delete(cameraId);
            else next.add(cameraId);
            setPicked(next);
        },
        [setPicked],
    );

    const clearPicked = useCallback(() => setPicked(new Set()), [setPicked]);

    // Mốc neo cho Shift+click, đúng như trình quản lý tệp: click thường và
    // Ctrl+click dời mốc, còn Shift+click thì GIỮ NGUYÊN mốc để kéo dải qua
    // lại được nhiều lần quanh cùng một điểm.
    const anchorRef = useRef(0);

    const handlePick = useCallback(
        (index: number, modifiers: { shift: boolean; ctrl: boolean }) => {
            const camera = filteredCameras[index];
            if (!camera) return;

            if (modifiers.shift) {
                const from = Math.min(anchorRef.current, index);
                const to = Math.max(anchorRef.current, index);
                // Chỉ lấy camera online: camera offline có chọn cũng không mở
                // được, để lọt vào dải chỉ khiến số đếm sai so với thực tế.
                const range = filteredCameras
                    .slice(from, to + 1)
                    .filter((item) => item.state === "online")
                    .map((item) => item.id);
                // Ctrl+Shift cộng dồn vào lựa chọn cũ; Shift đơn thì thay hẳn.
                setPicked(
                    modifiers.ctrl ? new Set([...pickedRef.current, ...range]) : new Set(range),
                );
                return;
            }

            if (modifiers.ctrl) {
                togglePicked(camera.id);
                anchorRef.current = index;
                return;
            }

            setPicked(new Set([camera.id]));
            anchorRef.current = index;
        },
        [filteredCameras, setPicked, togglePicked],
    );

    const endDrag = useCallback(() => {
        setDragSource(null);
        setDragOverSlot(null);
    }, []);

    useEffect(() => {
        const onChange = () =>
            setIsWallFullscreen(document.fullscreenElement === wallRef.current);
        document.addEventListener("fullscreenchange", onChange);
        return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);

    // Đổi bố cục: giữ nguyên các ô đã gán, chỉ cắt/nối phần dư. Dựng lại mảng
    // rỗng sẽ ngắt hết phiên WebRTC đang xem chỉ vì người dùng đổi cách chia
    // màn hình.
    const changeLayout = useCallback(
        (index: number) => {
            const next = layouts[index];
            setLayoutIndex(index);
            // Giữ nguyên các ô đã gán, chỉ cắt/nối phần dư.
            setSlots(
                Array.from({ length: next.count }, (_, i) => slotsRef.current[i] ?? null),
            );
            setSelectedSlot(Math.min(selectedSlotRef.current, next.count - 1));
        },
        [setSelectedSlot, setSlots],
    );

    const assignCamera = useCallback(
        (camera: ICameraResponse) => {
            const current = slotsRef.current;
            // Đã có trên tường rồi thì chỉ chuyển con trỏ chọn tới đó: mở trùng
            // một camera ở hai ô nghĩa là hai phiên WebRTC cho cùng một luồng,
            // tốn băng thông mà chẳng thêm thông tin gì.
            const existing = current.indexOf(camera.id);
            if (existing >= 0) {
                setSelectedSlot(existing);
                return;
            }
            // Tự tìm ô TRỐNG đầu tiên thay vì dùng ô đang chọn: ô đang chọn có
            // thể đang xem dở một camera khác, đè lên là mất luồng đó một cách
            // bất ngờ. Muốn đặt vào đúng một ô cụ thể thì kéo thả.
            let target = current.indexOf(null);
            // Hết ô trống thì đành thay ô đang chọn — không còn chỗ nào khác.
            if (target < 0) target = selectedSlotRef.current;
            const next = [...current];
            next[target] = camera.id;
            setSlots(next);
            setSelectedSlot(target);
        },
        [setSelectedSlot, setSlots],
    );

    // Thả một camera (từ danh sách bên trái) hoặc một ô (kéo trong lưới) vào ô
    // đích. Camera đã nằm ở ô khác thì CHUYỂN chứ không nhân bản, và nếu ô đích
    // đang có camera thì hai bên đổi chỗ — giữ nguyên tổng số luồng đang mở.
    const dropCameraAt = useCallback(
        (cameraId: string, target: number) => {
            const next = [...slotsRef.current];
            const from = next.indexOf(cameraId);
            if (from === target) {
                setSelectedSlot(target);
                return;
            }
            if (from >= 0) {
                next[from] = next[target];
            }
            next[target] = cameraId;
            setSlots(next);
            setSelectedSlot(target);
        },
        [setSelectedSlot, setSlots],
    );

    // Thả NHIỀU camera một lúc: cái đầu vào đúng ô được thả (ý định chỉ chỗ rõ
    // ràng của người dùng), phần còn lại rải vào các ô TRỐNG kế tiếp, quét vòng
    // từ ô đó — không đụng tới những ô đang xem dở.
    const dropCamerasAt = useCallback(
        (cameraIds: string[], target: number) => {
            if (cameraIds.length === 1) {
                dropCameraAt(cameraIds[0], target);
                return;
            }
            const next = [...slotsRef.current];
            // Camera đã có trên tường thì bỏ qua, không mở phiên trùng.
            const pending = cameraIds.filter((id) => !next.includes(id));
            if (pending.length === 0) {
                setSelectedSlot(target);
                return;
            }

            next[target] = pending[0];
            let placed = 1;
            for (let step = 1; step < next.length && placed < pending.length; step++) {
                const index = (target + step) % next.length;
                if (next[index] === null) next[index] = pending[placed++];
            }
            setSlots(next);
            setSelectedSlot(target);
        },
        [dropCameraAt, setSelectedSlot, setSlots],
    );

    const swapSlots = useCallback(
        (from: number, target: number) => {
            if (from === target) return;
            const next = [...slotsRef.current];
            [next[from], next[target]] = [next[target], next[from]];
            setSlots(next);
            setSelectedSlot(target);
        },
        [setSelectedSlot, setSlots],
    );

    const clearSlot = useCallback(
        (index: number) => {
            const next = [...slotsRef.current];
            next[index] = null;
            setSlots(next);
            setSelectedSlot(index);
        },
        [setSelectedSlot, setSlots],
    );

    const clearAll = useCallback(() => {
        setSlots(slotsRef.current.map(() => null));
        setSelectedSlot(0);
    }, [setSelectedSlot, setSlots]);

    const toggleWallFullscreen = useCallback(() => {
        const element = wallRef.current;
        if (!element) return;
        if (document.fullscreenElement) {
            void document.exitFullscreen().catch(() => {});
        } else {
            void element.requestFullscreen().catch(() => {});
        }
    }, []);

    const cameraById = useMemo(() => {
        const map = new Map<string, ICameraResponse>();
        for (const camera of filteredCameras) map.set(camera.id, camera);
        return map;
    }, [filteredCameras]);

    const activeCount = slots.filter(Boolean).length;

    // ─── XEM LẠI ĐỒNG BỘ (một timeline điều khiển mọi ô) ──────────────
    const [mode, setMode] = useState<"live" | "review">("live");
    const [speed, setSpeed] = useState(1);
    const [paused, setPaused] = useState(false);
    const [now, setNow] = useState(() => Date.now());
    // Con trỏ phát chung (giờ tường). Do camera THAM CHIẾU báo về.
    const [playMs, setPlayMs] = useState(() => Date.now());
    const [dayMs, setDayMs] = useState(() => startOfDay(Date.now()));
    const [window_, setWindow] = useState<[number, number]>(() =>
        liveWindow(Date.now(), DEFAULT_SPAN),
    );
    const [segments, setSegments] = useState<RecordingSegment[]>([]);
    const [motion, setMotion] = useState<MotionEvent[]>([]);
    // Một cú bấm timeline = tăng gen; MỌI ô nhận cùng seekSignal nên seek đồng loạt.
    const [seekSignal, setSeekSignal] = useState({ ms: Date.now(), gen: 0 });
    const dateInputRef = useRef<HTMLInputElement>(null);

    // Giữ value của input date khớp ngày đang chọn. Trước đây gán trong onClick
    // của nút, nhưng dưới md cú chạm đi thẳng vào input nên onClick không chạy —
    // thiếu chỗ này thì lịch bung ra tô sai ngày.
    useEffect(() => {
        if (dateInputRef.current) dateInputRef.current.value = toDateInputValue(dayMs);
    }, [dayMs]);


    // Camera THAM CHIẾU: lái timeline (nạp đoạn ghi) và làm chủ con trỏ phát.
    // Ưu tiên ô đang chọn; nếu ô đó trống thì lấy camera hoạt động đầu tiên.
    const referenceId = slots[selectedSlot] ?? slots.find(Boolean) ?? null;
    const referenceIdRef = useRef(referenceId);
    referenceIdRef.current = referenceId;
    const referenceCamera = referenceId ? cameraById.get(referenceId) ?? null : null;

    const dayStart = dayMs;
    const dayEnd = dayMs + 24 * 3_600_000;
    const isToday = useMemo(() => startOfDay(Date.now()) === dayMs, [dayMs]);

    // Đồng hồ 1s: cập nhật "bây giờ"; ở live, khung đang bám mép phải thì trượt theo.
    useEffect(() => {
        const t = window.setInterval(() => {
            const n = Date.now();
            setNow(n);
            if (mode === "live") {
                setWindow(([s, e]) =>
                    n > e && n - e < 5_000 ? [s + (n - e), e + (n - e)] : [s, e],
                );
            }
        }, 1000);
        return () => window.clearInterval(t);
    }, [mode]);

    // Nạp đoạn ghi + chuyển động cho camera THAM CHIẾU khi ở chế độ xem lại.
    const fitDoneRef = useRef<string>("");
    useEffect(() => {
        if (mode !== "review" || !referenceId) return;
        let cancelled = false;
        const fitKey = `${referenceId}:${dayStart}`;

        const load = async (fit: boolean) => {
            const [segs, evs] = await Promise.all([
                fetchSegments(referenceId, dayStart, dayEnd),
                fetchMotionEvents(referenceId, dayStart, dayEnd),
            ]);
            if (cancelled) return;
            setSegments(segs);
            setMotion(evs);
            // Co khung ôm sát vùng có ghi — chỉ MỘT LẦN cho mỗi camera+ngày.
            if (fit && segs.length > 0 && fitDoneRef.current !== fitKey) {
                fitDoneRef.current = fitKey;
                if (isToday) {
                    const end = Date.now();
                    if (end - segs[0].startMs > 60_000) setWindow([segs[0].startMs, end]);
                } else {
                    const last = segs[segs.length - 1];
                    setWindow([segs[0].startMs, Math.min(dayEnd, last.endMs)]);
                }
            }
        };
        const loadTail = async () => {
            const n = Date.now();
            const tail = await fetchSegments(referenceId, n - 3 * 60_000, n + 60_000);
            if (cancelled || tail.length === 0) return;
            setSegments((prev) => {
                const byId = new Map(prev.map((s) => [s.id, s]));
                for (const seg of tail) byId.set(seg.id, seg);
                return [...byId.values()].sort((a, b) => a.startMs - b.startMs);
            });
        };

        void load(true);
        const timer = isToday ? window.setInterval(() => void load(false), 5 * 60_000) : 0;
        const tailTimer = isToday ? window.setInterval(() => void loadTail(), 5_000) : 0;
        return () => {
            cancelled = true;
            if (timer) window.clearInterval(timer);
            if (tailTimer) window.clearInterval(tailTimer);
        };
    }, [mode, referenceId, dayStart, dayEnd, isToday]);

    const enterReview = useCallback(() => {
        if (activeCount === 0) return; // chưa có camera nào để xem lại
        const start = Date.now() - 60_000; // lùi 1 phút cho chắc có bản ghi
        setPlayMs(start);
        setSeekSignal({ ms: start, gen: 0 });
        setPaused(false);
        setSpeed(1);
        setDayMs(startOfDay(Date.now()));
        setWindow(liveWindow(Date.now(), DEFAULT_SPAN));
        fitDoneRef.current = "";
        setMode("review");
    }, [activeCount]);

    const goLiveWall = useCallback(() => {
        setMode("live");
        setDayMs(startOfDay(Date.now()));
        setWindow(liveWindow(Date.now(), DEFAULT_SPAN));
    }, []);

    // Bấm/kéo timeline: broadcast seek tới MỌI ô + dời con trỏ chung.
    const handleTimelineSeek = useCallback((wallMs: number) => {
        setPlayMs(wallMs);
        setPaused(false);
        setSeekSignal((s) => ({ ms: wallMs, gen: s.gen + 1 }));
    }, []);

    // Chỉ camera THAM CHIẾU được dời con trỏ chung: các ô khác cũng báo vị trí
    // nhưng lấy hết thì hai nguồn đá nhau, con trỏ giật.
    const handleTilePosition = useCallback((cameraId: string, wallMs: number) => {
        if (cameraId === referenceIdRef.current) setPlayMs(wallMs);
    }, []);

    const togglePausedAll = useCallback(() => setPaused((p) => !p), []);

    const pickDay = useCallback((value: string) => {
        const [y, m, d] = value.split("-").map(Number);
        if (!y || !m || !d) return;
        const day = new Date(y, m - 1, d).getTime();
        setDayMs(day);
        fitDoneRef.current = "";
        if (startOfDay(Date.now()) === day) {
            setWindow(([s0, e0]) => liveWindow(Date.now(), e0 - s0));
        } else {
            setWindow([day, day + 24 * 3_600_000]);
        }
    }, []);

    // Nghe 'change' GỐC của input date (React nuốt onChange khi chọn lại đúng ngày).
    useEffect(() => {
        const el = dateInputRef.current;
        if (!el) return;
        const onNative = () => {
            if (el.value) pickDay(el.value);
        };
        el.addEventListener("change", onNative);
        return () => el.removeEventListener("change", onNative);
    }, [pickDay, mode]);

    const playheadMs = mode === "live" ? now : playMs;

    // Ô chuyển động cho lớp phủ: MỘT socket cho cả tường rồi chia theo camera.
    // Mỗi ô tự mở một cái là 16 kết nối chở đúng cùng một luồng dữ liệu (engine
    // bắn mọi camera trên một socket, không có tham số lọc).
    const motionOverlayOn = showBoxes && showMotionCells && mode === "live";
    // Chỉ đăng ký KHUNG cho camera đang thật sự nằm trên tường: engine bắn 5
    // gói/giây cho mỗi camera đăng ký, xin cả 16 cái trong khi chỉ xem 4 là
    // ném đi 60% băng thông.
    const wallCameraIds = useMemo(
        () => slots.filter((id): id is string => Boolean(id)),
        [slots],
    );
    const frameCameras = useMemo(
        () => (motionOverlayOn ? wallCameraIds : []),
        [motionOverlayOn, wallCameraIds],
    );
    const motionOverlayFeed = useMotionEventFeed(
        engineWsOrigin,
        motionOverlayOn,
        null,
        frameCameras,
    );
    const motionByCamera = useMemo(() => {
        const map = new Map<
            string,
            { cells: string; outside: string; gridX: number; gridY: number }
        >();
        // Hết hạn theo `now` (đồng hồ 1s ở trên): hết động là engine ngừng gửi,
        // không tự hết hạn thì ô cuối cùng nằm lì trên hình mãi mãi.
        for (const frame of Object.values(motionOverlayFeed.frames)) {
            if (now - frame.atMs > MOTION_FRAME_HOLD_MS) continue;
            map.set(frame.cameraId, {
                cells: frame.inside,
                outside: frame.outside,
                gridX: frame.gridX,
                gridY: frame.gridY,
            });
        }
        return map;
    }, [motionOverlayFeed.frames, now]);

    // Mobile: xếp DỌC — tường video ở trên, bảng sự kiện ở dưới.
    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-950 text-slate-100 md:flex-row">
            <DrawerBackdrop open={camListOpen} onClose={() => setCamListOpen(false)} />
            <aside
                className={cn(
                    "flex flex-col border-r border-slate-800 bg-slate-900 md:shrink-0",
                    drawerClass("left", camListOpen, "md:w-72"),
                )}
            >
                <div className="flex items-start gap-2 border-b border-slate-800 px-4 py-3">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-sm font-semibold text-white">Xem trực tiếp</h1>
                        {/* Hai lối thao tác khác hẳn nhau nên hướng dẫn cũng phải
                            khác — chỉ dẫn "nháy đúp" trên điện thoại là chỉ sai. */}
                        <p className="mt-0.5 text-xs text-slate-400 md:hidden">
                            Chạm để mở lên tường · chạm nhiều camera liên tiếp được
                        </p>
                        <p className="mt-0.5 hidden text-xs text-slate-400 md:block">
                            Nháy đúp để xem · Ctrl/Shift+click chọn nhiều · kéo thả vào ô
                        </p>
                    </div>
                    {/* Chỉ có ở khổ điện thoại: trên desktop danh sách nằm cố
                        định, không có gì để đóng. Nền mờ vẫn đóng được nhưng khi
                        danh sách dài, chỗ trống để chạm lại nằm ngoài tầm ngón. */}
                    <button
                        type="button"
                        onClick={() => setCamListOpen(false)}
                        aria-label="Đóng danh sách camera"
                        className="-mr-1 -mt-1 shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 md:hidden"
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </div>

                <div className="border-b border-slate-800 p-3">
                    <div className="relative">
                        <Search
                            size={14}
                            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
                            aria-hidden="true"
                        />
                        <input
                            value={searchText}
                            onChange={(event) => setSearchText(event.target.value)}
                            placeholder="Tìm camera..."
                            className="h-9 w-full rounded-lg border border-slate-700 bg-slate-950 pl-8 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                        />
                    </div>
                </div>

                {/* select-none: Shift+click mà không chặn thì trình duyệt bôi
                    đen văn bản từ mục trước tới mục vừa bấm, nhìn rất rối.
                    Bấm vào khoảng trống dưới danh sách thì bỏ chọn hết, giống
                    bấm nền trong trình quản lý tệp. */}
                <div
                    onClick={(event) => {
                        // "Không trúng mục nào" chứ không so target với chính
                        // div: bấm vào phần đệm hay dòng thông báo cũng phải
                        // tính là bấm nền.
                        if (!(event.target as HTMLElement).closest("button")) clearPicked();
                    }}
                    className="min-h-0 flex-1 select-none overflow-y-auto py-1"
                >
                    {isLoading && filteredCameras.length === 0 ? (
                        <div className="flex items-center gap-2 px-4 py-3 text-xs text-slate-400">
                            <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                            Đang tải danh sách...
                        </div>
                    ) : null}

                    {errorMessage ? (
                        <p className="px-4 py-3 text-xs text-rose-400">{errorMessage}</p>
                    ) : null}

                    {!isLoading && filteredCameras.length === 0 && !errorMessage ? (
                        <p className="px-4 py-3 text-xs text-slate-500">Không có camera nào</p>
                    ) : null}

                    {filteredCameras.map((camera, index) => {
                        const isOnline = camera.state === "online";
                        const onWall = slots.includes(camera.id);
                        const picked = pickedIds.has(camera.id);
                        return (
                            <button
                                key={camera.id}
                                type="button"
                                // Chọn kiểu trình quản lý tệp: click chọn một,
                                // Ctrl+click tick/bỏ tick, Shift+click chọn cả
                                // dải từ mốc neo tới đây.
                                onClick={(event) => {
                                    // MỘT CHẠM là mở luôn trên điện thoại, và
                                    // KHÔNG đóng ngăn kéo — mở tường thường là
                                    // mở vài camera liền tay, đóng lại sau mỗi
                                    // lần chọn thì phải mở ra lại mấy lượt.
                                    // Bấm nút quay lại / chạm nền mờ để đóng.
                                    //
                                    // Chuột giữ nguyên lối cũ: bấm là TICK chọn
                                    // (có Ctrl/Shift gom nhóm), nháy đúp mới mở
                                    // — mỗi lần mở là một phiên WebRTC thật, ở
                                    // đó bấm nhầm một cái tốn ngay một luồng.
                                    if (isMobile) {
                                        assignCamera(camera);
                                        return;
                                    }
                                    handlePick(index, {
                                        shift: event.shiftKey,
                                        ctrl: event.ctrlKey || event.metaKey,
                                    });
                                }}
                                // Nháy ĐÚP mới mở: nháy đơn quá dễ chạm nhầm
                                // khi đang rà danh sách, mà mỗi lần mở là một
                                // phiên WebRTC thật.
                                onDoubleClick={(event) => {
                                    // Ctrl/Shift + nháy đúp là thao tác CHỌN,
                                    // không phải mở — nháy đúp khi đang gom
                                    // nhóm mà lại mở luôn thì rất khó chịu.
                                    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
                                    assignCamera(camera);
                                }}
                                disabled={!isOnline}
                                draggable={isOnline}
                                onDragStart={(event) => {
                                    event.dataTransfer.effectAllowed = "move";
                                    // Kéo một mục đang được tick thì kéo CẢ NHÓM
                                    // đã tick; kéo mục ngoài nhóm thì chỉ mình
                                    // nó (và không đụng tới nhóm đang tick).
                                    const group = pickedRef.current;
                                    const ids =
                                        group.has(camera.id) && group.size > 1
                                            ? filteredCameras
                                                  .filter((item) => group.has(item.id))
                                                  .map((item) => item.id)
                                            : [camera.id];
                                    // Firefox không khởi động thao tác kéo nếu
                                    // không có dữ liệu nào được đặt.
                                    event.dataTransfer.setData("text/plain", ids.join(","));
                                    setDragSource({ kind: "cameras", cameraIds: ids });
                                }}
                                onDragEnd={endDrag}
                                title={
                                    isOnline
                                        ? onWall
                                            ? "Đang xem — kéo thả để đổi sang ô khác"
                                            : "Nháy đúp để xem · Ctrl+click tick từng cái · Shift+click chọn cả dải · kéo thả vào ô mong muốn"
                                        : `Camera đang ${camera.state}`
                                }
                                className={cn(
                                    "flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors",
                                    "disabled:cursor-not-allowed disabled:opacity-40",
                                    // Rê chuột giữ nguyên mũi tên, chỉ đổi sang
                                    // bàn tay lúc đang nhấn giữ.
                                    isOnline && "active:cursor-grabbing",
                                    onWall
                                        ? "bg-emerald-500/10 text-emerald-300"
                                        : "text-slate-300 enabled:hover:bg-slate-800",
                                    // Viền trong (ring-inset) chứ không phải
                                    // border: border làm mục nhích 1px và cả
                                    // danh sách giật mỗi lần tick.
                                    picked && "ring-1 ring-inset ring-sky-400",
                                )}
                            >
                                {picked ? (
                                    <CheckSquare
                                        size={15}
                                        className="shrink-0 text-sky-300"
                                        aria-hidden="true"
                                    />
                                ) : (
                                    <Video size={15} className="shrink-0" aria-hidden="true" />
                                )}
                                <span className="min-w-0 flex-1 truncate">
                                    <span className="text-slate-500">D{index + 1}</span>{" "}
                                    {camera.name || camera.id}
                                </span>
                                {(() => {
                                    const viewers = liveByCamera.get(camera.id) ?? 0;
                                    if (viewers === 0) return null;
                                    return (
                                        <span
                                            className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300"
                                            title={`${viewers} người đang xem trực tiếp camera này`}
                                        >
                                            <Eye size={11} aria-hidden="true" />
                                            {viewers}
                                        </span>
                                    );
                                })()}
                                <span
                                    className={cn(
                                        "h-1.5 w-1.5 shrink-0 rounded-full",
                                        isOnline ? "bg-emerald-400" : "bg-slate-600",
                                    )}
                                    aria-hidden="true"
                                />
                            </button>
                        );
                    })}
                </div>

                {/* Bộ chọn SỐ Ô — chỉ mobile. Trên thanh công cụ nó bị ẩn vì
                    chiếm 128px của một thanh 390px; ở đây thì rộng rãi, lại
                    đứng cạnh danh sách camera nên đúng mạch thao tác "mở mấy
                    ô, mở camera nào". */}
                <div className="border-t border-slate-800 px-3 py-2.5 md:hidden">
                    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Số ô
                    </span>
                    <div className="flex gap-1.5">
                        {layouts.map((item, index) => (
                            <button
                                key={item.count}
                                type="button"
                                onClick={() => changeLayout(index)}
                                aria-pressed={index === layoutIndex}
                                className={cn(
                                    "h-8 flex-1 rounded-md text-xs font-semibold transition-colors",
                                    index === layoutIndex
                                        ? "bg-emerald-500/15 text-emerald-300"
                                        : "bg-slate-800/60 text-slate-400",
                                )}
                            >
                                {item.count}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="border-t border-slate-800 p-3">
                    <button
                        type="button"
                        onClick={clearAll}
                        disabled={activeCount === 0}
                        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 transition-colors enabled:hover:border-rose-500/60 enabled:hover:text-rose-300 disabled:opacity-40"
                    >
                        <Trash2 size={14} aria-hidden="true" />
                        Tắt hết ({activeCount})
                    </button>
                </div>
            </aside>

            {/* flex-none dưới md: cột này lấy ĐÚNG chiều cao lưới cần (luôn ~56vw
                bất kể bố cục, vì N cột × N hàng thì tổng chiều cao vẫn bằng một
                ô toàn màn), phần dư nhường hết cho bảng sự kiện. Để flex-1 thì
                nó ôm trọn phần chia được và chừa một mảng đen trống giữa tường
                và bảng sự kiện. min-h-0 giữ lại cho nhánh md:flex-1 — mặc định
                min-height của flex item là auto, thiếu nó thì lưới đẩy bảng sự
                kiện ra khỏi màn hình. */}
            <div ref={wallRef} className="flex min-h-0 min-w-0 flex-none flex-col bg-slate-950 md:flex-1">
                {/* KHÔNG dùng overflow-x-auto ở đây: overflow tạo VÙNG CẮT, nên
                    menu thả xuống của nút "Khung AI" bị xén ở mép thanh — nhìn
                    như bấm không ăn (z-index không cứu được, cắt là cắt). Sau
                    khi ẩn nút chuông + toàn màn hình ở khổ điện thoại thì thanh
                    dư chỗ, không cần cuộn nữa. */}
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 px-3 py-2">
                    <div className="flex shrink-0 items-center gap-1">
                        {/* Menu ỨNG DỤNG — trang này tắt thanh ngang của
                            MainLayout để khỏi tốn 44px chiều cao, nên nút mở
                            menu phải nằm ở đây. */}
                        <DrawerToggle label="Mở menu" onClick={toggleAppMenu}>
                            <Menu size={16} aria-hidden="true" />
                        </DrawerToggle>
                        {/* Danh sách camera */}
                        <DrawerToggle
                            label="Danh sách camera"
                            onClick={() => setCamListOpen(true)}
                            className="mr-1"
                        >
                            <Video size={16} aria-hidden="true" />
                        </DrawerToggle>
                        {/* Bộ chọn bố cục: ẩn trên mobile — dưới md tường luôn
                            xếp MỘT CỘT cuộn dọc nên 4 nút này chỉ còn đổi số ô
                            trống, không đáng chiếm 128px của một thanh 390px.
                            Số ô đổi được trong ngăn kéo camera. */}
                        {layouts.map((item, index) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.count}
                                    type="button"
                                    onClick={() => changeLayout(index)}
                                    title={item.label}
                                    aria-label={item.label}
                                    aria-pressed={index === layoutIndex}
                                    className={cn(
                                        "hidden h-8 w-8 items-center justify-center rounded-md transition-colors md:inline-flex",
                                        index === layoutIndex
                                            ? "bg-emerald-500/15 text-emerald-300"
                                            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                                    )}
                                >
                                    <Icon size={16} aria-hidden="true" />
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                        {/* Điều khiển XEM LẠI chung — chỉ hiện ở chế độ review */}
                        {mode === "review" ? (
                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    type="button"
                                    onClick={togglePausedAll}
                                    title={paused ? "Phát" : "Tạm dừng"}
                                    aria-label={paused ? "Phát" : "Tạm dừng"}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                                >
                                    {paused ? <Play size={16} /> : <Pause size={16} />}
                                </button>
                                {/* Tốc độ tua, chung cho mọi ô trên tường.
                                    Dưới md nó nằm ở hàng điều khiển ngay dưới
                                    tường (xem prop `controls` truyền cho
                                    Timeline) — bảy nấc x1…x64 nhồi vào thanh
                                    công cụ 390px thì đẩy nút chọn ngày ra
                                    ngoài. */}
                                {/* BỌC trong span để ẩn, KHÔNG truyền class
                                    "hidden" vào SpeedPicker: gốc nó đã có
                                    `inline-flex`, hai lớp display cùng độ ưu
                                    tiên thì cái nào đứng sau trong file CSS
                                    thắng — đo được là `hidden` thua, thanh tốc
                                    độ vẫn hiện và đẩy nút chọn ngày ra khỏi
                                    màn hình. */}
                                <span className="hidden md:inline-flex">
                                    <SpeedPicker
                                        value={speed}
                                        onChange={setSpeed}
                                        variant="toolbar"
                                    />
                                </span>
                                {/* Chọn ngày */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const el = dateInputRef.current;
                                            if (!el) return;
                                            el.value = toDateInputValue(dayMs);
                                            if (el.showPicker) el.showPicker();
                                            else el.focus();
                                        }}
                                        className="flex items-center gap-1.5 rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 transition-colors hover:border-slate-500"
                                    >
                                        <span className="font-mono">
                                            {new Date(dayMs).toLocaleDateString("vi-VN")}
                                        </span>
                                        <CalendarDays size={13} className="shrink-0 text-slate-400" />
                                    </button>
                                    <input
                                        ref={dateInputRef}
                                        type="date"
                                        defaultValue={toDateInputValue(dayMs)}
                                        max={toDateInputValue(Date.now())}
                                        // pointer-events CHỈ tắt từ md: iOS Safari
                                        // không bung lịch khi showPicker() gọi vào
                                        // input đang ẩn, nên dưới md để chính input
                                        // trong suốt (phủ đúng lên nút) nhận cú chạm.
                                        className="absolute inset-0 h-full w-full opacity-0 [color-scheme:dark] md:pointer-events-none"
                                        tabIndex={-1}
                                        aria-hidden="true"
                                    />
                                </div>
                            </div>
                        ) : null}

                        {/* Chuyển LIVE ↔ Xem lại cho CẢ tường */}
                        <div className="flex shrink-0 items-center overflow-hidden rounded-md border border-slate-700">
                            <button
                                type="button"
                                onClick={goLiveWall}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold transition-colors",
                                    mode === "live"
                                        ? "bg-emerald-500/15 text-emerald-300"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                                )}
                            >
                                <Radio size={13} />
                                {/* Chữ chỉ từ sm: hai nhãn này chiếm ~110px,
                                    bỏ đi thì cả thanh vừa một hàng 390px. */}
                                <span className="hidden sm:inline">LIVE</span>
                            </button>
                            <button
                                type="button"
                                onClick={enterReview}
                                disabled={activeCount === 0}
                                title={activeCount === 0 ? "Mở camera trước đã" : "Xem lại bản ghi"}
                                className={cn(
                                    "inline-flex items-center gap-1.5 border-l border-slate-700 px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40",
                                    mode === "review"
                                        ? "bg-sky-500/15 text-sky-300"
                                        : "text-slate-400 enabled:hover:bg-slate-800 enabled:hover:text-slate-200",
                                )}
                            >
                                <CalendarDays size={13} />
                                <span className="hidden sm:inline">Xem lại</span>
                            </button>
                        </div>

                        {/* Ẩn ở khổ hẹp: thông tin phụ, nhường chỗ cho các nút */}
                        <span className="hidden shrink-0 text-xs text-slate-500 sm:inline">
                            Đang xem {activeCount}/{layout.count}
                        </span>
                        {/* Khung AI chỉ vẽ được ở chế độ trực tiếp: xem lại là
                            đọc file bản ghi, AI không chạy trên luồng đó. */}
                        <DetectionFilter
                            compact
                            enabled={showBoxes}
                            onEnabledChange={setShowBoxes}
                            types={boxTypes}
                            onTypesChange={setBoxTypes}
                            zonesVisible={showZones}
                            onZonesVisibleChange={setShowZones}
                            motionVisible={showMotionCells}
                            onMotionVisibleChange={setShowMotionCells}
                        />
                        <button
                            type="button"
                            onClick={() => setEventsPanelOpen((v) => !v)}
                            title={eventsPanelOpen ? "Ẩn bảng sự kiện" : "Hiện bảng sự kiện"}
                            aria-label={eventsPanelOpen ? "Ẩn bảng sự kiện" : "Hiện bảng sự kiện"}
                            aria-pressed={eventsPanelOpen}
                            className={cn(
                                "hidden h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors md:inline-flex",
                                eventsPanelOpen
                                    ? "bg-emerald-500/15 text-emerald-300"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                            )}
                        >
                            <Bell size={16} />
                        </button>
                        <button
                            type="button"
                            onClick={toggleWallFullscreen}
                            title={isWallFullscreen ? "Thoát toàn màn hình (Esc)" : "Toàn màn hình"}
                            aria-label={isWallFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
                            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 md:inline-flex"
                        >
                            {isWallFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                        </button>
                    </div>
                </div>

                {/* gap-px + nền slate-800 tạo đường kẻ mảnh giữa các ô mà không
                    cần border trên từng ô (border sẽ cộng dồn thành viền đôi ở
                    chỗ hai ô kề nhau). */}
                {/* Mobile GIỮ ĐÚNG số cột của bố cục (4 ô = 2×2), chỉ khác ở
                    cách tính chiều cao hàng: desktop chia đều chiều cao còn lại,
                    còn ở đây mỗi hàng cao đúng 16:9 theo bề rộng một ô —
                    calc(100vw / số-cột * 9/16). Nhờ vậy ô không bao giờ bị bóp
                    méo hay dẹt lét, và nhiều hàng thì khung tự cuộn dọc.

                    KHÔNG dùng minmax(0, …) cho auto-rows: cận dưới 0 cho phép
                    hàng co lại, mà khung lưới có chiều cao xác định nên các hàng
                    chia đều nhau — đo được 4 ô chỉ còn 83px mỗi ô.

                    Số cột/hàng truyền qua biến CSS chứ không qua style nội
                    tuyến: style nội tuyến luôn thắng class nên md: sẽ vô hiệu,
                    còn dùng biến thì chỉ nhánh md: đọc tới nó. */}
                <div
                    className="grid min-h-0 flex-1 auto-rows-[calc(100vw/var(--wall-cols)*9/16)] gap-px overflow-y-auto bg-slate-800 [grid-template-columns:repeat(var(--wall-cols),minmax(0,1fr))] md:auto-rows-auto md:overflow-y-hidden md:[grid-template-rows:repeat(var(--wall-rows),minmax(0,1fr))]"
                    style={
                        {
                            "--wall-cols": maximizedSlot !== null ? 1 : layout.columns,
                            "--wall-rows": Math.ceil(layout.count / layout.columns),
                        } as React.CSSProperties
                    }
                >
                    {slots.map((cameraId, index) => (
                        <LiveTile
                            // Khoá theo id camera, KHÔNG theo chỉ số ô: khoá
                            // theo chỉ số thì kéo một ô sang chỗ khác sẽ khiến
                            // React tháo player ở ô cũ và dựng player mới ở ô
                            // đích — đàm phán WebRTC lại từ đầu, đen hình mấy
                            // giây chỉ vì sắp xếp lại. Khoá theo camera thì
                            // React dời sẵn node đang chạy sang vị trí mới.
                            key={cameraId ?? `empty-${index}`}
                            index={index}
                            camera={cameraId ? cameraById.get(cameraId) ?? null : null}
                            detectionOrigin={eventWsOrigin}
                            showDetections={showBoxes}
                            detectionTypes={boxTypes}
                            detectionZonesVisible={showZones}
                            motionCells={
                                showMotionCells && cameraId
                                    ? motionByCamera.get(cameraId) ?? null
                                    : null
                            }
                            review={
                                mode === "review" && cameraId
                                    ? {
                                          // startMs đọc MỘT LẦN lúc mount: ô mở ở con
                                          // trỏ chung hiện tại (ô thêm sau cũng nhập
                                          // đúng chỗ đang phát).
                                          startMs: playMs,
                                          rate: speed,
                                          paused,
                                          seekSignal,
                                          onPosition: (ms: number) =>
                                              handleTilePosition(cameraId, ms),
                                      }
                                    : undefined
                            }
                            isSelected={index === selectedSlot}
                            isDropTarget={dragSource !== null && dragOverSlot === index}
                            dropLabel={
                                dragSource?.kind === "cameras" && dragSource.cameraIds.length > 1
                                    ? `${dragSource.cameraIds.length} camera`
                                    : undefined
                            }
                            className={
                                maximizedSlot !== null && maximizedSlot !== index
                                    ? "hidden"
                                    : undefined
                            }
                            onSelect={() => {
                                setSelectedSlot(index);
                                // Chạm vào ô có camera là xem LỚN, chạm lần nữa
                                // thì thu về lưới. Chỉ ở khổ điện thoại: trên
                                // desktop cú bấm này đang là "chọn ô", thứ mà
                                // kéo-thả và timeline xem lại đều dựa vào.
                                if (isMobile && cameraId) {
                                    setMaximizedSlot((cur) =>
                                        cur === index ? null : index,
                                    );
                                }
                            }}
                            onClear={() => clearSlot(index)}
                            onDragStartTile={() => setDragSource({ kind: "slot", index })}
                            onDragEndTile={endDrag}
                            onDragOverTile={() => setDragOverSlot(index)}
                            // Chỉ xoá khi con trỏ rời đúng ô này: kéo sang ô
                            // khác thì dragleave của ô cũ có thể bắn SAU
                            // dragenter của ô mới và xoá nhầm ô đang tô sáng.
                            onDragLeaveTile={() =>
                                setDragOverSlot((current) => (current === index ? null : current))
                            }
                            onDropTile={() => {
                                if (dragSource?.kind === "cameras") {
                                    dropCamerasAt(dragSource.cameraIds, index);
                                    // Thả xong thì bỏ tick: nhóm đã lên tường
                                    // rồi, giữ lại chỉ gây thả nhầm lần sau.
                                    clearPicked();
                                } else if (dragSource?.kind === "slot") {
                                    swapSlots(dragSource.index, index);
                                }
                                endDrag();
                            }}
                        />
                    ))}
                </div>

                {/* Timeline CHUNG — chỉ ở chế độ xem lại. Hiển thị vùng ghi của
                    camera THAM CHIẾU (ô đang chọn); một cú bấm seek MỌI ô. */}
                {mode === "review" ? (
                    <div className="shrink-0 border-t border-slate-800 bg-slate-950 px-4 pb-3 pt-6">
                        {referenceId ? (
                            <Timeline
                                windowStart={window_[0]}
                                windowEnd={window_[1]}
                                nowMs={now}
                                playheadMs={playheadMs}
                                segments={segments}
                                motionEvents={motion}
                                cameraId={referenceId}
                                cameraLabel={referenceCamera?.name || referenceId}
                                isLive={false}
                                onSeek={handleTimelineSeek}
                                onWindowChange={(s, e) => setWindow([s, e])}
                                controls={
                                    <SpeedPicker
                                        value={speed}
                                        onChange={setSpeed}
                                        variant="toolbar"
                                    />
                                }
                            />
                        ) : (
                            <p className="py-6 text-center text-xs text-slate-500">
                                Chọn một ô có camera để xem timeline
                            </p>
                        )}
                    </div>
                ) : null}
            </div>

            {/* Bảng SỰ KIỆN realtime bên phải — đóng/mở bằng nút chuông. */}
            {eventsPanelOpen ? (
                <EventFeedPanel
                    origin={eventWsOrigin}
                    motionOrigin={engineWsOrigin}
                    cameras={filteredCameras}
                    wallCameraIds={slots.filter((id): id is string => Boolean(id))}
                    onClose={() => setEventsPanelOpen(false)}
                />
            ) : null}
        </div>
    );
}
