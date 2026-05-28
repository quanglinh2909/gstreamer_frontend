import { ChevronLeft, ChevronRight } from "lucide-react";
import { getVisibleIdentityPages } from "@/lib/identity-view-model";
import { cn } from "./identity-utils";

export function IdentityPagination({
    currentPage,
    totalPages,
    onPageChange,
}: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}) {
    const visiblePages = getVisibleIdentityPages(currentPage, totalPages);

    if (totalPages <= 1) {
        return null;
    }

    return (
        <nav aria-label="Phân trang identity" className="flex flex-wrap items-center justify-center gap-2">
            <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => onPageChange(currentPage - 1)}
                className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
                <ChevronLeft size={16} aria-hidden="true" />
                Trước
            </button>

            {visiblePages.map((page) =>
                typeof page === "number" ? (
                    <button
                        key={page}
                        type="button"
                        aria-current={page === currentPage ? "page" : undefined}
                        onClick={() => onPageChange(page)}
                        className={cn(
                            "flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-colors",
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
                className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
                Sau
                <ChevronRight size={16} aria-hidden="true" />
            </button>
        </nav>
    );
}
