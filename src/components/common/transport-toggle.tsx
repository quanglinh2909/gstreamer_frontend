"use client";

import { useEffect, useState } from "react";
import { Radio, Zap } from "lucide-react";

import { useVideoTransport } from "@/lib/moq/transport";

// Nút đổi đường truyền video, dùng chung cho trang Xem trực tiếp và Xem lại.
//
// Hai hình dạng theo bề rộng, KHÔNG phải cho đẹp mà vì chỗ:
//   * từ sm trở lên: hai ô cạnh nhau, thấy ngay đang ở chế độ nào;
//   * dưới sm: MỘT icon. Bản có chữ ("WebRTC" rộng 64px) làm thanh công cụ
//     tràn khỏi mép phải ở 390px và chính cái nút này bị đẩy ra ngoài màn —
//     đo được right=421 trên viewport 390. Trạng thái nói bằng MÀU: xanh
//     sáng = đang chạy MoQ.
//
// KHÔNG hỗ trợ thì phải NÓI RA. Trình duyệt thiếu WebTransport (Safari/iOS,
// hoặc trang mở bằng http) sẽ có một cái nút bấm vào không xảy ra gì —
// người dùng không có cách nào biết tại sao. Bấm vào lúc đó hiện luôn lý do;
// `title` vô dụng vì trên cảm ứng không có rê chuột.
export function TransportToggle({ className = "" }: { className?: string }) {
    const { transport, setTransport, supported, reason } = useVideoTransport();
    const [why, setWhy] = useState(false);

    useEffect(() => {
        if (!why) return;
        const timer = window.setTimeout(() => setWhy(false), 8000);
        return () => window.clearTimeout(timer);
    }, [why]);

    const hint = supported
        ? "Đường truyền video (WebRTC / MoQ)"
        : "Trình duyệt này không có WebTransport — bấm để xem lý do";

    const cell =
        "inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium transition-colors";
    const on = "bg-sky-500/15 text-sky-300";
    const off = "text-slate-300 hover:bg-slate-800 hover:text-slate-100";

    const pick = (next: "webrtc" | "moq") => {
        if (next === "moq" && !supported) {
            setWhy(true);
            return;
        }
        setTransport(next);
    };

    return (
        <div className={`relative shrink-0 ${className}`}>
            {/* Khổ hẹp: chỉ một icon. */}
            <button
                type="button"
                onClick={() => pick(transport === "moq" ? "webrtc" : "moq")}
                title={hint}
                aria-label={`Đường truyền: ${transport === "moq" ? "MoQ" : "WebRTC"}, bấm để đổi`}
                className={`inline-flex h-7 w-7 items-center justify-center rounded border transition-colors sm:hidden ${
                    !supported
                        ? "border-slate-700 text-slate-500"
                        : transport === "moq"
                            ? "border-sky-500 bg-sky-500/15 text-sky-300"
                            : "border-slate-600 text-slate-300"
                }`}
            >
                {transport === "moq" ? <Zap size={14} /> : <Radio size={14} />}
            </button>

            {/* Từ sm: hai ô cạnh nhau. */}
            <div
                title={hint}
                className="hidden items-center divide-x divide-slate-700 overflow-hidden rounded border border-slate-600 sm:inline-flex"
            >
                <button
                    type="button"
                    onClick={() => pick("webrtc")}
                    aria-pressed={transport === "webrtc"}
                    className={`${cell} ${transport === "webrtc" ? on : off}`}
                >
                    <Radio size={13} aria-hidden="true" />
                    WebRTC
                </button>
                <button
                    type="button"
                    onClick={() => pick("moq")}
                    aria-pressed={transport === "moq"}
                    className={`${cell} ${
                        !supported
                            ? "text-slate-600"
                            : transport === "moq"
                                ? on
                                : off
                    }`}
                >
                    <Zap size={13} aria-hidden="true" />
                    MoQ
                </button>
            </div>

            {why ? (
                <div
                    role="status"
                    onClick={() => setWhy(false)}
                    className="absolute right-0 top-full z-50 mt-1.5 w-64 cursor-pointer rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-[11px] leading-relaxed text-slate-300 shadow-xl"
                >
                    <p className="mb-1 font-semibold text-amber-300">
                        Trình duyệt này không dùng được MoQ
                    </p>
                    <p className="mb-1 text-slate-200">{reason}.</p>
                    <p>
                        MoQ chạy trên WebTransport, hiện có trên Chrome/Edge ở
                        máy tính và Android. Cấu hình này còn dùng chứng chỉ tự
                        ký xác thực bằng mã băm — cũng là cơ chế riêng của
                        Chromium.
                    </p>
                    <p className="mt-1 text-slate-400">
                        WebRTC vẫn xem bình thường, không mất gì.
                    </p>
                </div>
            ) : null}
        </div>
    );
}
