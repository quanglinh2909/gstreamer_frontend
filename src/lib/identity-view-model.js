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

export function getIdentityFormError(form, mode) {
    if (!asText(form?.name)) {
        return "Vui lòng nhập tên.";
    }

    if (mode === "create" && !form?.image) {
        return "Vui lòng chọn ảnh.";
    }

    return "";
}

export function buildIdentityFormData(form) {
    const payload = new FormData();

    payload.append("name", asText(form?.name));
    payload.append("mac_bluetooth", asText(form?.macBluetooth));

    if (form?.image) {
        payload.append("image", form.image);
    }

    return payload;
}

export function getIdentityImageUrl(path) {
    const imagePath = asText(path);

    if (!imagePath || imagePath.startsWith("/api/backend/")) {
        return imagePath;
    }

    if (/^(https?:|blob:|data:)/.test(imagePath)) {
        return imagePath;
    }

    return `/api/backend/${imagePath.replace(/^\/+/, "")}`;
}

export function getVisibleIdentityPages(currentPage, totalPages) {
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
