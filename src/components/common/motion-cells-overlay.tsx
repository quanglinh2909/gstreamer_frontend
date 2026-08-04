// Vẽ các Ô ĐÃ ĐỘNG của một sự kiện chuyển động đè lên khung hình.
//
// Engine gửi kèm mỗi sự kiện chuỗi "hàng:cột,hàng:cột,…" cùng cỡ lưới lúc ghi
// nhận (gridX/gridY). Vẽ theo lưới CỦA CHÍNH SỰ KIỆN chứ không theo cấu hình
// hiện hành: đổi lưới 10x10 -> 20x20 trong /ai-config xong thì mọi sự kiện cũ
// vẫn phải hiện đúng chỗ đã động thật.

export type MotionCell = { row: number; col: number };

// Bỏ ô sai định dạng hoặc nằm ngoài lưới thay vì tin chuỗi từ mạng: một ô lỗi
// mà lọt qua thì `left: NaN%` làm cả lớp phủ biến mất, không có lỗi nào báo.
export function parseMotionCells(
    raw: string | null | undefined,
    gridX: number,
    gridY: number,
): MotionCell[] {
    if (!raw) return [];
    const out: MotionCell[] = [];
    const seen = new Set<string>();
    for (const part of String(raw).split(",")) {
        const [r, c] = part.trim().split(":");
        const row = Number(r);
        const col = Number(c);
        if (!Number.isInteger(row) || !Number.isInteger(col)) continue;
        if (row < 0 || col < 0 || row >= gridY || col >= gridX) continue;
        const key = `${row}:${col}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ row, col });
    }
    return out;
}

export function MotionCellsOverlay({
    cells,
    gridX,
    gridY,
    className,
}: {
    cells: string | null | undefined;
    gridX: number;
    gridY: number;
    className?: string;
}) {
    const gx = Number(gridX) > 0 ? Number(gridX) : 10;
    const gy = Number(gridY) > 0 ? Number(gridY) : 10;
    const list = parseMotionCells(cells, gx, gy);
    if (list.length === 0) return null;

    // Một div tuyệt đối cho mỗi ô, KHÔNG dùng CSS grid: lớp phủ nằm trên một
    // khung có chiều cao do ảnh quyết định, mà grid con trong khung như vậy dễ
    // dính vòng lặp tính hàng (đã gặp ở form nhận dạng, ảnh tràn đè 132px).
    // Phần trăm thì không phụ thuộc gì vào kích thước thật.
    return (
        <div className={`pointer-events-none absolute inset-0 ${className ?? ""}`}>
            {list.map((cell) => (
                <div
                    key={`${cell.row}:${cell.col}`}
                    className="absolute border border-violet-300/70 bg-violet-500/35"
                    style={{
                        left: `${(cell.col / gx) * 100}%`,
                        top: `${(cell.row / gy) * 100}%`,
                        width: `${(1 / gx) * 100}%`,
                        height: `${(1 / gy) * 100}%`,
                    }}
                />
            ))}
        </div>
    );
}
