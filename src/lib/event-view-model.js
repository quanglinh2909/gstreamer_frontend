const UNKNOWN_RESULT_LABEL = "Không xác định";

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

export function getEventResultLabel(event, tab) {
    if (tab === "restricted") {
        return event?.id ? `Vùng cấm #${event.id}` : "Vùng cấm";
    }

    const value = tab === "face" ? event?.name : event?.plate_number;

    return asText(value) || UNKNOWN_RESULT_LABEL;
}

export function formatEventConfidence(confidence) {
    const numericValue = Number(confidence);

    if (!Number.isFinite(numericValue)) {
        return "--";
    }

    const percentValue = Math.min(100, Math.max(0, numericValue * 100));

    return `${Number(percentValue.toFixed(1))}%`;
}

export function formatEventTimestamp(timestamp) {
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

export function getEventImageUrl(path) {
    const imagePath = asText(path);

    if (!imagePath || imagePath.startsWith("/api/backend/")) {
        return imagePath;
    }

    if (/^(https?:|blob:|data:)/.test(imagePath)) {
        return imagePath;
    }

    return `/api/backend/${imagePath.replace(/^\/+/, "")}`;
}

export function getEventSocketUrl(origin, tab) {
    const baseUrl = asText(origin).replace(/\/+$/, "");

    if (!baseUrl) {
        return "";
    }

    const endpoint =
        tab === "plate"
            ? "plate-events"
            : tab === "restricted"
                ? "restricted-area-events"
                : "face-events";

    return `${baseUrl}/${endpoint}`;
}

export function getVisibleEventPages(currentPage, totalPages) {
    const total = Math.max(0, Math.floor(Number(totalPages) || 0));

    if (total === 0) {
        return [];
    }

    if (total <= 7) {
        return Array.from({ length: total }, (_, index) => index + 1);
    }

    const current = Math.min(total, asPositiveInteger(currentPage));
    const numberedPages = [1, current - 1, current, current + 1, total]
        .filter((page) => page >= 1 && page <= total)
        .filter((page, index, pages) => pages.indexOf(page) === index)
        .sort((left, right) => left - right);

    return numberedPages.flatMap((page, index) => {
        const previousPage = numberedPages[index - 1];

        if (!previousPage || page - previousPage <= 1) {
            return [page];
        }

        return [page < current ? "ellipsis-left" : "ellipsis-right", page];
    });
}

export function incrementEventPageTotal(page, increment = 1) {
    const size = asPositiveInteger(page?.size, 20);
    const currentTotal = Math.max(0, Math.floor(Number(page?.total) || 0));
    const count = Math.max(0, Math.floor(Number(increment) || 0));
    const total = currentTotal + count;

    return {
        ...page,
        total,
        pages: total === 0 ? 0 : Math.ceil(total / size),
    };
}

export function mergeLiveEvents(page, events, selectedCameraId = "") {
    const liveEvents = Array.isArray(events) ? events : [];

    return liveEvents.slice().reverse().reduce((currentPage, event) => {
        if (!event || (selectedCameraId && event.camera_id !== selectedCameraId)) {
            return currentPage;
        }

        const items = Array.isArray(currentPage.items) ? currentPage.items : [];
        const alreadyVisible = items.some((item) => item.id === event.id);
        const size = asPositiveInteger(currentPage.size, 20);
        const mergedPage = {
            ...currentPage,
            items: [event, ...items.filter((item) => item.id !== event.id)].slice(0, size),
        };

        return alreadyVisible ? mergedPage : incrementEventPageTotal(mergedPage);
    }, page);
}

export const mergeLiveFaceEvents = mergeLiveEvents;
