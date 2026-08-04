import { ChevronLeft, ChevronRight } from "lucide-react";
import { getVisibleEventPages } from "@/lib/event-view-model";
import { cn } from "./event-utils";

export function EventPagination({
    currentPage,
    totalPages,
    onPageChange,
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}) {
    const visiblePages = getVisibleEventPages(currentPage, totalPages);

    if (totalPages <= 1) {
        return null;
    }

    return (
        <nav aria-label="Phân trang sự kiện" className="flex flex-wrap items-center justify-center gap-2">
            <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                aria-label="Trang trước"
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:px-3"
            >
                <ChevronLeft size={16} aria-hidden="true" />
                <span className="hidden sm:inline">Trước</span>
            </button>

            {visiblePages.map((page) =>
                typeof page === "number" ? (
                    <button
                        key={page}
                        type="button"
                        aria-current={page === currentPage ? "page" : undefined}
                        onClick={() => onPageChange(page)}
                        className={cn(
                            "flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-semibold transition-colors sm:h-10 sm:min-w-10 sm:px-3",
                            page === currentPage
                                ? "border-[#4369ee] bg-[#4369ee] text-white shadow-sm"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950",
                        )}
                    >
                        {page}
                    </button>
                ) : (
                    <span key={page} className="flex h-10 min-w-8 items-center justify-center text-slate-400">
                        ...
                    </span>
                ),
            )}

            <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(currentPage + 1)}
                aria-label="Trang sau"
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:px-3"
            >
                <span className="hidden sm:inline">Sau</span>
                <ChevronRight size={16} aria-hidden="true" />
            </button>
        </nav>
    );
}
