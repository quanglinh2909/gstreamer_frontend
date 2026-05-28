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

export function getPlateWhiteListFormError(form) {
    if (!asText(form?.plateNumber)) {
        return "Vui lòng nhập biển số.";
    }

    if (!asText(form?.name)) {
        return "Vui lòng nhập tên.";
    }

    return "";
}

export function buildPlateWhiteListPayload(form) {
    return {
        plate_number: asText(form?.plateNumber).toUpperCase(),
        name: asText(form?.name),
    };
}

export function getVisiblePlateWhiteListPages(currentPage, totalPages) {
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
