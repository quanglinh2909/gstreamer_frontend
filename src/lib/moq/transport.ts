"use client";

import { useCallback, useEffect, useState } from "react";

import { moqSupported, moqUnsupportedReason } from "./client";

// Chọn đường truyền video: WebRTC (mặc định) hay MoQ.
//
// Lưu ở localStorage chứ không phải state của một trang: người dùng đổi ở
// trang Xem trực tiếp thì sang trang Xem lại phải giữ nguyên lựa chọn. Kèm một
// sự kiện window để mọi component đang mở cùng đổi ngay — `storage` chỉ bắn
// sang TAB KHÁC, không bắn trong chính tab vừa ghi.
//
// MẶC ĐỊNH LÀ WEBRTC và cố ý như vậy: MoQ đòi secure context (https hoặc
// localhost), mà máy này thường được mở bằng http://<ip-lan>. Đặt MoQ làm mặc
// định là màn đen cho phần lớn người dùng.

export type VideoTransport = "webrtc" | "moq";

const KEY = "vms.videoTransport";
const EVENT = "vms:video-transport";

export function readTransport(): VideoTransport {
    if (typeof window === "undefined") return "webrtc";
    return window.localStorage.getItem(KEY) === "moq" ? "moq" : "webrtc";
}

export function useVideoTransport() {
    // Khởi tạo "webrtc" chứ không đọc localStorage ngay: server render không
    // có localStorage, đọc lệch nhau là hydration mismatch.
    const [transport, setTransportState] = useState<VideoTransport>("webrtc");
    const [supported, setSupported] = useState(true);
    const [reason, setReason] = useState("");

    useEffect(() => {
        setSupported(moqSupported());
        setReason(moqUnsupportedReason());
        setTransportState(readTransport());
        const onChange = () => setTransportState(readTransport());
        window.addEventListener(EVENT, onChange);
        window.addEventListener("storage", onChange);
        return () => {
            window.removeEventListener(EVENT, onChange);
            window.removeEventListener("storage", onChange);
        };
    }, []);

    const setTransport = useCallback((next: VideoTransport) => {
        window.localStorage.setItem(KEY, next);
        window.dispatchEvent(new Event(EVENT));
    }, []);

    // MoQ không dùng được thì trả về webrtc bất kể người dùng đã chọn gì —
    // giữ nguyên lựa chọn trong localStorage để lần sau mở bằng https lại đúng.
    return {
        transport: supported ? transport : ("webrtc" as VideoTransport),
        setTransport,
        supported,
        /** Thiếu chính xác cái gì — hiện cho người dùng thay vì để họ đoán. */
        reason,
        /** Người dùng đã chọn MoQ nhưng trang không hỗ trợ. */
        blocked: transport === "moq" && !supported,
    };
}
