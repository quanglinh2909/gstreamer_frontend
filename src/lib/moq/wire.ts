// Mã hoá/giải mã khung dây MoQ — bản đối xứng của app/moq/wire.py bên Python.
//
// Sửa một bên mà quên bên kia là hỏng lặng lẽ (SUBSCRIBE trôi qua nhưng đọc
// sai tham số), nên hai file cố ý giữ cùng thứ tự trường và cùng tên hằng số.

export const CLIENT_SETUP = 0x40;
export const SERVER_SETUP = 0x41;
export const SUBSCRIBE = 0x03;
export const SUBSCRIBE_OK = 0x04;
export const SUBSCRIBE_ERROR = 0x05;
export const UNSUBSCRIBE = 0x0a;

export const SUBGROUP_HEADER = 0x04;

// Phải khớp wire.VERSION bên Python.
export const VERSION = 0xff00000b;

export const PARAM_START_MS = 0x1000;
export const PARAM_RATE_MILLI = 0x1001;
export const PARAM_SESSION_ID = 0x1002;

export const FLAG_KEYFRAME = 0x01;

// Mảng byte có ArrayBuffer riêng. Cần nói rõ vì `subarray()` giữ nguyên kiểu
// bộ đệm nguồn (có thể là SharedArrayBuffer), mà WebCodecs/WebTransport chỉ
// nhận ArrayBuffer thường — TypeScript 5.7 trở đi bắt đúng chỗ này.
export type Bytes = Uint8Array<ArrayBuffer>;

/** Chưa đủ byte để đọc trọn vẹn — gọi lại khi có thêm dữ liệu. */
export class Incomplete extends Error {}

export class Reader {
    pos = 0;

    constructor(public data: Uint8Array) {}

    get remaining(): number {
        return this.data.length - this.pos;
    }

    take(n: number): Uint8Array {
        if (this.remaining < n) throw new Incomplete();
        const out = this.data.subarray(this.pos, this.pos + n);
        this.pos += n;
        return out;
    }

    varint(): number {
        if (this.remaining < 1) throw new Incomplete();
        const first = this.data[this.pos];
        const length = 1 << (first >> 6);
        if (this.remaining < length) throw new Incomplete();
        // Number thay vì BigInt: varint 8 byte chỉ dùng cho mốc epoch-ms
        // (~1,8e12) và độ dài — đều nằm gọn dưới 2^53 nên không mất chính xác.
        let value = first & 0x3f;
        for (let i = 1; i < length; i += 1) {
            value = value * 256 + this.data[this.pos + i];
        }
        this.pos += length;
        return value;
    }

    u8(): number {
        return this.take(1)[0];
    }

    blob(): Uint8Array {
        return this.take(this.varint());
    }

    string(): string {
        return new TextDecoder().decode(this.blob());
    }

    params(): Map<number, Uint8Array> {
        const out = new Map<number, Uint8Array>();
        const count = this.varint();
        for (let i = 0; i < count; i += 1) {
            const key = this.varint();
            out.set(key, this.blob());
        }
        return out;
    }
}

export function varint(value: number): Bytes {
    if (value < 0x40) return new Uint8Array([value]);
    if (value < 0x4000) {
        return new Uint8Array([(value >> 8) | 0x40, value & 0xff]);
    }
    if (value < 0x40000000) {
        return new Uint8Array([
            (value >>> 24) | 0x80,
            (value >>> 16) & 0xff,
            (value >>> 8) & 0xff,
            value & 0xff,
        ]);
    }
    // Nhánh 8 byte: TÁCH đôi 32 bit thay vì dịch bit thẳng. Toán tử dịch của
    // JS ép về 32 bit, nên `value >>> 32` trả về chính nó và mốc epoch-ms
    // (~1,8e12) sẽ bị mã hoá sai lặng lẽ. BigInt thì không dùng được: dự án
    // đang nhắm ES2017.
    const out = new Uint8Array(8);
    writeU64(out, Math.floor(value));
    out[0] |= 0xc0;
    return out;
}

function writeU64(out: Uint8Array, value: number): void {
    const high = Math.floor(value / 4294967296);
    const low = value - high * 4294967296;
    out[0] = (high >>> 24) & 0xff;
    out[1] = (high >>> 16) & 0xff;
    out[2] = (high >>> 8) & 0xff;
    out[3] = high & 0xff;
    out[4] = (low >>> 24) & 0xff;
    out[5] = (low >>> 16) & 0xff;
    out[6] = (low >>> 8) & 0xff;
    out[7] = low & 0xff;
}

export function concat(...parts: Uint8Array[]): Bytes {
    const total = parts.reduce((sum, p) => sum + p.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
}

export function blob(data: Uint8Array): Bytes {
    return concat(varint(data.length), data);
}

export function string(text: string): Bytes {
    return blob(new TextEncoder().encode(text));
}

export function tuple(parts: string[]): Bytes {
    return concat(varint(parts.length), ...parts.map(string));
}

export function params(items: Map<number, Uint8Array>): Bytes {
    const chunks: Uint8Array[] = [varint(items.size)];
    for (const [key, value] of items) chunks.push(varint(key), blob(value));
    return concat(...chunks);
}

export function control(type: number, payload: Uint8Array): Bytes {
    return concat(varint(type), varint(payload.length), payload);
}

/** Đọc trọn một bản tin control. Ném Incomplete và TRẢ con trỏ về chỗ cũ. */
export function readControl(reader: Reader): { type: number; body: Reader } {
    const start = reader.pos;
    try {
        const type = reader.varint();
        const length = reader.varint();
        return { type, body: new Reader(reader.take(length)) };
    } catch (error) {
        reader.pos = start;
        throw error;
    }
}

export function clientSetup(): Bytes {
    return control(CLIENT_SETUP, concat(varint(1), varint(VERSION), varint(0)));
}

export function subscribe(
    subscribeId: number,
    trackAlias: number,
    namespace: string[],
    extra: Map<number, Uint8Array>,
): Bytes {
    const body = concat(
        varint(subscribeId),
        varint(trackAlias),
        tuple(namespace),
        string("video"),
        new Uint8Array([0x80, 0x01]), // độ ưu tiên, thứ tự nhóm tăng dần
        varint(2), // filter: nhóm mới nhất trở đi
        params(extra),
    );
    return control(SUBSCRIBE, body);
}

export function unsubscribe(subscribeId: number): Bytes {
    return control(UNSUBSCRIBE, varint(subscribeId));
}

/** Số 8 byte big-endian — dùng cho tham số mốc thời gian epoch-ms. */
export function u64(value: number): Bytes {
    const out = new Uint8Array(8);
    writeU64(out, Math.floor(value));
    return out;
}
