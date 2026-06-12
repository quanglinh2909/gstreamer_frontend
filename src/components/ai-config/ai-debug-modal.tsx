import { useEffect } from "react";
import { MonitorPlay, X } from "lucide-react";

// A 1x1 transparent GIF. Pointing the <img> at this on close forces the
// browser to drop the live MJPEG connection. Just removing the element from
// the DOM does NOT abort a multipart/x-mixed-replace stream — the browser
// keeps the socket open until a full page reload — which left the Python
// backend decoding/encoding overlay frames (and re-arming the C++ encoder)
// for a viewer that was already gone. Swapping src to a data URI aborts it.
const BLANK_PIXEL =
    "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

export function AiDebugModal({
    featureLabel,
    isOpen,
    onClose,
    streamUrl,
}: {
    featureLabel: string;
    isOpen: boolean;
    onClose: () => void;
    streamUrl: string;
}) {
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    // Keep the element mounted whenever a stream is configured and only TOGGLE
    // the src by `isOpen`. The <img> must stay in the DOM through the close so
    // the src→blank swap can actually abort the connection; unmounting it
    // first (the old `return null`) skipped that and leaked the stream.
    if (!streamUrl) {
        return null;
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Video debug ${featureLabel}`}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-5"
            style={{ display: isOpen ? "flex" : "none" }}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <section className="flex w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-950 shadow-2xl">
                <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4 text-white">
                    <div className="flex items-center gap-2">
                        <MonitorPlay size={18} aria-hidden="true" className="text-[#7693fa]" />
                        <div>
                            <h2 className="text-sm font-semibold">Xem debug {featureLabel}</h2>
                            <p className="text-xs text-slate-400">MJPEG realtime</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Đóng xem debug"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                    >
                        <X size={18} aria-hidden="true" />
                    </button>
                </header>

                <div className="flex min-h-[320px] items-center justify-center bg-black p-3">
                    {/* MJPEG must stay a direct image request so frames can stream continuously. */}
                    {/* When closed, src points at a blank pixel so the browser drops the stream. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={isOpen ? streamUrl : BLANK_PIXEL}
                        alt={`Luồng debug ${featureLabel}`}
                        className="max-h-[76vh] w-full rounded-lg object-contain"
                    />
                </div>
            </section>
        </div>
    );
}
