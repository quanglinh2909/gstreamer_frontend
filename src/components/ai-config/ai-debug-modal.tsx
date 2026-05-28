import { useEffect } from "react";
import { MonitorPlay, X } from "lucide-react";

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

    if (!isOpen || !streamUrl) {
        return null;
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label={`Video debug ${featureLabel}`}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-5"
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={streamUrl}
                        alt={`Luồng debug ${featureLabel}`}
                        className="max-h-[76vh] w-full rounded-lg object-contain"
                    />
                </div>
            </section>
        </div>
    );
}
