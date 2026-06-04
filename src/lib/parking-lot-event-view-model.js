function asText(value) {
    return String(value ?? "").trim();
}

function asPositiveInteger(value, fallback = 1) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        return fallback;
    }

    return Math.max(1, Math.floor(numericValue));
}

export function formatParkingLotEventTimestamp(timestamp) {
    if (timestamp === null || timestamp === undefined || timestamp === "") {
        return "--";
    }

    const numericValue = Number(timestamp);

    if (!Number.isFinite(numericValue)) {
        return "--";
    }

    return new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "short",
        timeStyle: "medium",
    }).format(new Date(numericValue * 1000));
}

export function getVisibleParkingLotEventPages(currentPage, totalPages) {
    const total = Math.max(0, Math.floor(Number(totalPages) || 0));

    if (total === 0) {
        return [];
    }

    if (total <= 7) {
        return Array.from({ length: total }, (_, index) => index + 1);
    }

    const current = Math.min(total, asPositiveInteger(currentPage));
    const pages = [1, current - 1, current, current + 1, total]
        .filter((page) => page >= 1 && page <= total)
        .filter((page, index, values) => values.indexOf(page) === index)
        .sort((left, right) => left - right);

    return pages.flatMap((page, index) => {
        const previousPage = pages[index - 1];

        if (!previousPage || page - previousPage <= 1) {
            return [page];
        }

        return [page < current ? "ellipsis-left" : "ellipsis-right", page];
    });
}

export function getParkingLotEventImageUrl(path) {
    const imagePath = asText(path);

    if (!imagePath || imagePath.startsWith("/api/backend/")) {
        return imagePath;
    }

    if (/^(https?:|blob:|data:)/.test(imagePath)) {
        return imagePath;
    }

    return `/api/backend/${imagePath.replace(/^\/+/, "")}`;
}

// Exposed for symmetry with other view-models; trims free-text filter values.
export function normalizeParkingLotEventFilter(value) {
    return asText(value);
}
