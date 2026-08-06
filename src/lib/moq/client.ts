// Client MoQ chạy trên WebTransport.
//
// ĐIỀU KIỆN BẮT BUỘC — đọc trước khi gỡ lỗi "sao MoQ không chạy":
//
//  1. TRANG PHẢI Ở SECURE CONTEXT. `window.WebTransport` chỉ tồn tại trên
//     https:// hoặc http://localhost. Mở giao diện bằng http://<ip-lan>:3000
//     thì API này KHÔNG có, và không có cách nào lách từ phía JS. Đó là lý do
//     WebRTC vẫn là đường mặc định: DTLS chấp nhận chứng chỉ tự ký nên nó chạy
//     được trên http trần, còn WebTransport thì không.
//  2. Chứng chỉ của máy chủ MoQ là tự ký, nên phải đưa mã băm SHA-256 của nó
//     vào `serverCertificateHashes`. Chrome chỉ chấp nhận khi chứng chỉ là
//     ECDSA P-256 và hạn dưới 14 ngày — nên nó tự xoay vòng ở phía máy chủ và
//     ta PHẢI hỏi /moq/info mỗi lần kết nối thay vì nhúng cứng mã băm.

import {
    type Bytes,
    Incomplete,
    PARAM_RATE_MILLI,
    PARAM_SESSION_ID,
    PARAM_START_MS,
    Reader,
    SUBSCRIBE_ERROR,
    SUBSCRIBE_OK,
    SERVER_SETUP,
    clientSetup,
    concat,
    readControl,
    subscribe as buildSubscribe,
    u64,
    unsubscribe as buildUnsubscribe,
    varint,
} from "./wire";

export type MoqFrame = {
    /** Mốc trình bày, micro giây — đưa thẳng vào EncodedVideoChunk. */
    ptsUs: number;
    keyframe: boolean;
    data: Bytes;
};

export type MoqInfo = {
    enabled: boolean;
    /** Địa chỉ QUIC phải nối tới. Máy chủ đã tính sẵn (xem MOQ_PUBLIC_HOST). */
    host?: string;
    port: number;
    path: string;
    fingerprint: string;
    expiresAt: string;
};

export type MoqMode = "live" | "playback";

const INFO_URL = "/api/backend/moq/info";

export function moqSupported(): boolean {
    return moqUnsupportedReason() === "";
}

/**
 * Trình duyệt/trang này thiếu CHÍNH XÁC cái gì để chạy MoQ. Chuỗi rỗng = chạy được.
 *
 * Trả về lý do thay vì một boolean: người dùng cầm điện thoại thấy nút mờ thì
 * không có cách nào biết vì sao, mà đoán hộ họ ("chắc là Safari") thì có ngày
 * đoán sai. Để chính thiết bị đó tự khai.
 */
export function moqUnsupportedReason(): string {
    if (typeof window === "undefined") return "";
    if (!window.isSecureContext) {
        return "Trang đang mở không phải https (secure context)";
    }
    if (!("WebTransport" in window)) {
        return "Trình duyệt không có WebTransport";
    }
    if (!("VideoDecoder" in window)) {
        return "Trình duyệt không có WebCodecs";
    }
    return "";
}

export async function fetchMoqInfo(signal?: AbortSignal): Promise<MoqInfo> {
    const response = await fetch(INFO_URL, { signal, cache: "no-store" });
    if (!response.ok) {
        throw new Error(`Máy chủ MoQ chưa sẵn sàng (HTTP ${response.status})`);
    }
    const info = (await response.json()) as MoqInfo;
    if (!info.enabled) throw new Error("MoQ đang tắt trên máy chủ");
    return info;
}

function hexToBytes(hex: string): Bytes {
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i += 1) {
        out[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return out;
}

export class MoqSession {
    private transport: WebTransport;
    private control!: WritableStreamDefaultWriter<Uint8Array>;
    private controlReader!: ReadableStreamDefaultReader<Uint8Array>;
    private buffer: Uint8Array = new Uint8Array(0);
    private pending = new Map<
        number,
        { resolve: (sessionId: string) => void; reject: (error: Error) => void }
    >();
    private setupDone?: { resolve: () => void; reject: (error: Error) => void };
    private nextSubscribeId = 1;
    private closed = false;

    private constructor(transport: WebTransport) {
        this.transport = transport;
    }

    static async open(info: MoqInfo): Promise<MoqSession> {
        // Địa chỉ do máy chủ quyết định (mặc định = host của chính trang này).
        // KHÔNG suy ra từ location một cách mù quáng: giao diện có thể đứng sau
        // nginx/proxy ở cổng TCP, còn QUIC thì phải nối THẲNG — proxy HTTP
        // không chuyển tiếp được UDP.
        const host = info.host || window.location.hostname;
        const url = `https://${host}:${info.port}${info.path}`;
        const transport = new WebTransport(url, {
            serverCertificateHashes: [
                { algorithm: "sha-256", value: hexToBytes(info.fingerprint) },
            ],
        });
        try {
            await transport.ready;
        } catch (error) {
            // Lỗi gốc chỉ nói "Opening handshake failed", không nói vì sao —
            // mà lý do gần như luôn là một trong hai cái dưới đây.
            throw new Error(
                `Không mở được QUIC tới ${host}:${info.port} (UDP). ` +
                    "Kiểm tra: cổng UDP này đã được mở/forward tới máy chủ chưa " +
                    "(nginx là TCP, KHÔNG chuyển tiếp được UDP), và máy chủ MoQ " +
                    `có đang chạy không. Chi tiết: ${
                        error instanceof Error ? error.message : String(error)
                    }`,
            );
        }

        const session = new MoqSession(transport);
        const stream = await transport.createBidirectionalStream();
        session.control = stream.writable.getWriter();
        session.controlReader = stream.readable.getReader();
        void session.pumpControl();

        const ready = new Promise<void>((resolve, reject) => {
            session.setupDone = { resolve, reject };
        });
        await session.control.write(clientSetup());
        await ready;
        return session;
    }

    /** Đăng ký một track. Trả id phiên bên engine (dùng cho /playback/.../control). */
    async subscribe(
        mode: MoqMode,
        cameraId: string,
        options: { atMs?: number; rate?: number } = {},
    ): Promise<{ subscribeId: number; sessionId: string }> {
        const subscribeId = this.nextSubscribeId;
        this.nextSubscribeId += 1;

        const extra = new Map<number, Uint8Array>();
        if (mode === "playback") {
            extra.set(PARAM_START_MS, u64(options.atMs ?? 0));
            extra.set(PARAM_RATE_MILLI, u64(Math.round((options.rate ?? 1) * 1000)));
        }
        const answer = new Promise<string>((resolve, reject) => {
            this.pending.set(subscribeId, { resolve, reject });
        });
        await this.control.write(
            buildSubscribe(subscribeId, subscribeId, ["vms", mode, cameraId], extra),
        );
        const sessionId = await answer;
        return { subscribeId, sessionId };
    }

    /**
     * Từng khung hình, theo đúng thứ tự.
     *
     * Đọc TUẦN TỰ hết stream này mới sang stream kế: mỗi stream một nhóm (GOP)
     * và máy phát chỉ mở nhóm sau khi đã ghi xong nhóm trước, nên đọc tuần tự
     * là đúng thứ tự trình bày mà không cần bộ sắp xếp lại.
     */
    async *frames(): AsyncGenerator<MoqFrame> {
        const streams = this.transport.incomingUnidirectionalStreams.getReader();
        try {
            while (!this.closed) {
                const { value, done } = await streams.read();
                if (done || !value) return;
                yield* this.readGroup(value as ReadableStream<Uint8Array>);
            }
        } finally {
            streams.releaseLock();
        }
    }

    private async *readGroup(stream: ReadableStream<Uint8Array>): AsyncGenerator<MoqFrame> {
        const reader = stream.getReader();
        let buffer: Uint8Array = new Uint8Array(0);
        let headerDone = false;
        try {
            for (;;) {
                const { value, done } = await reader.read();
                if (value && value.length) buffer = concat(buffer, value);

                const cursor = new Reader(buffer);
                if (!headerDone) {
                    try {
                        cursor.varint(); // kiểu = SUBGROUP_HEADER
                        cursor.varint(); // track alias
                        cursor.varint(); // group id
                        cursor.varint(); // subgroup id
                        cursor.u8(); // độ ưu tiên
                        headerDone = true;
                    } catch (error) {
                        if (!(error instanceof Incomplete)) throw error;
                        if (done) return;
                        continue;
                    }
                }

                for (;;) {
                    const start = cursor.pos;
                    try {
                        cursor.varint(); // object id
                        const payload = cursor.blob();
                        const flags = payload[0];
                        let ptsUs = 0;
                        for (let i = 1; i <= 8; i += 1) ptsUs = ptsUs * 256 + payload[i];
                        yield {
                            ptsUs,
                            keyframe: (flags & 0x01) !== 0,
                            // Sao chép: `payload` là khung nhìn vào `buffer`, mà
                            // buffer bị cắt ngay bên dưới — đưa nguyên khung nhìn
                            // cho WebCodecs là giao một vùng nhớ sắp bị ghi đè.
                            data: new Uint8Array(payload.subarray(9)),
                        };
                    } catch (error) {
                        if (!(error instanceof Incomplete)) throw error;
                        cursor.pos = start;
                        break;
                    }
                }
                buffer = buffer.subarray(cursor.pos);
                if (done) return;
            }
        } finally {
            reader.releaseLock();
        }
    }

    async close(subscribeId?: number): Promise<void> {
        if (this.closed) return;
        this.closed = true;
        try {
            if (subscribeId !== undefined) {
                await this.control.write(buildUnsubscribe(subscribeId));
            }
        } catch {
            // Kết nối đã đứt — không có gì để báo nữa.
        }
        try {
            this.transport.close();
        } catch {
            // đã đóng
        }
    }

    /** Đóng ĐỒNG BỘ, dùng trong hàm dọn dẹp của effect và pagehide. */
    closeNow(): void {
        this.closed = true;
        try {
            this.transport.close();
        } catch {
            // đã đóng
        }
    }

    private async pumpControl(): Promise<void> {
        try {
            for (;;) {
                const { value, done } = await this.controlReader.read();
                if (done) break;
                if (!value) continue;
                this.buffer = concat(this.buffer, value);
                this.drain();
            }
        } catch (error) {
            this.failAll(error instanceof Error ? error : new Error(String(error)));
        }
    }

    private drain(): void {
        const reader = new Reader(this.buffer);
        for (;;) {
            let message: { type: number; body: Reader };
            try {
                message = readControl(reader);
            } catch (error) {
                if (error instanceof Incomplete) break;
                throw error;
            }
            this.handle(message.type, message.body);
        }
        this.buffer = this.buffer.subarray(reader.pos);
    }

    private handle(type: number, body: Reader): void {
        if (type === SERVER_SETUP) {
            this.setupDone?.resolve();
            this.setupDone = undefined;
            return;
        }
        if (type === SUBSCRIBE_OK) {
            const subscribeId = body.varint();
            body.varint(); // expires
            body.u8(); // thứ tự nhóm
            body.u8(); // contentExists
            const sessionId = new TextDecoder().decode(
                body.params().get(PARAM_SESSION_ID) ?? new Uint8Array(),
            );
            this.pending.get(subscribeId)?.resolve(sessionId);
            this.pending.delete(subscribeId);
            return;
        }
        if (type === SUBSCRIBE_ERROR) {
            const subscribeId = body.varint();
            const code = body.varint();
            const reason = body.string();
            this.pending
                .get(subscribeId)
                ?.reject(new Error(reason || `MoQ từ chối (mã ${code})`));
            this.pending.delete(subscribeId);
        }
    }

    private failAll(error: Error): void {
        this.setupDone?.reject(error);
        this.setupDone = undefined;
        for (const waiter of this.pending.values()) waiter.reject(error);
        this.pending.clear();
    }
}

/** Chuỗi codec `avc1.PPCCLL` đọc từ SPS trong access unit Annex-B. */
export function codecFromAnnexB(au: Uint8Array): string {
    for (let i = 0; i + 4 < au.length; i += 1) {
        const isStart3 = au[i] === 0 && au[i + 1] === 0 && au[i + 2] === 1;
        const isStart4 =
            au[i] === 0 && au[i + 1] === 0 && au[i + 2] === 0 && au[i + 3] === 1;
        if (!isStart3 && !isStart4) continue;
        const nal = i + (isStart4 ? 4 : 3);
        if ((au[nal] & 0x1f) !== 7) continue; // 7 = SPS
        if (nal + 3 >= au.length) break;
        const hex = (value: number) => value.toString(16).padStart(2, "0");
        return `avc1.${hex(au[nal + 1])}${hex(au[nal + 2])}${hex(au[nal + 3])}`;
    }
    // Không tìm thấy SPS: đoán Baseline 3.0. Chrome vẫn đổi cấu hình theo SPS
    // thật khi giải mã, chuỗi này chỉ để qua được bước configure().
    return "avc1.42e01e";
}

export { varint };
