/**
 * Chuẩn hoá origin WebSocket được cấu hình để trình duyệt luôn nối tới đúng
 * máy chủ đang phục vụ trang.
 *
 * WEBSOCKET_ORIGIN đọc ở phía server rồi truyền xuống client, nên nếu ghi
 * cứng một host (đặc biệt là 127.0.0.1) thì máy khác mở trang sẽ nối vào
 * chính máy nó và fail. Hàm này giải quyết bằng cách lấy host của trang hiện
 * tại, chỉ giữ lại phần đường dẫn từ cấu hình:
 *
 *   ""                       -> ws://<host trang>            (không path)
 *   "/ws"                    -> ws://<host trang>/ws
 *   "ws://127.0.0.1:8010/ws" -> ws://<host trang>/ws         (bỏ host loopback)
 *   "ws://example.com/ws"    -> giữ nguyên (chủ ý trỏ máy khác)
 *
 * Giao thức tự bám theo trang: https -> wss, http -> ws.
 * Lưu ý: PHẦN ĐƯỜNG DẪN vẫn phải khớp định tuyến nginx (/ws -> backend
 * Python, /wsc -> engine C++) vì đó là thứ phân biệt hai backend.
 */
export function resolveWebSocketOrigin(origin: string | null | undefined): string {
    const raw = String(origin ?? "").trim().replace(/\/+$/, "");

    // SSR: chưa có window để bám vào, trả nguyên giá trị cấu hình.
    if (typeof window === "undefined") {
        return raw;
    }

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const currentHost = window.location.host;

    if (!currentHost) {
        return raw;
    }

    const fromCurrentHost = (path: string) =>
        `${wsProtocol}//${currentHost}${path}`;

    if (!raw) {
        return fromCurrentHost("");
    }

    // Đường dẫn tương đối: "/ws"
    if (raw.startsWith("/")) {
        return fromCurrentHost(raw);
    }

    let parsed: URL;
    try {
        parsed = new URL(raw);
    } catch {
        // Không phải URL hợp lệ -> coi như một đoạn path.
        return fromCurrentHost(`/${raw}`);
    }

    const isLoopback =
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "localhost" ||
        parsed.hostname === "[::1]" ||
        parsed.hostname === "::1";

    if (isLoopback) {
        return fromCurrentHost(parsed.pathname.replace(/\/+$/, ""));
    }

    // Host thật do người cấu hình chỉ định -> tôn trọng.
    return raw;
}
