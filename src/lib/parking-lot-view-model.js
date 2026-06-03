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

export function getParkingLotFormError(form) {
    if (!asText(form?.name)) {
        return "Vui lòng nhập tên bãi xe.";
    }

    if (!asText(form?.faceCameraId)) {
        return "Vui lòng chọn camera khuôn mặt.";
    }

    if (!asText(form?.plateCameraId)) {
        return "Vui lòng chọn camera biển số.";
    }

    if (asText(form?.faceCameraId) === asText(form?.plateCameraId)) {
        return "Camera khuôn mặt và camera biển số phải khác nhau.";
    }

    return "";
}

export function buildParkingLotPayload(form) {
    return {
        name: asText(form?.name),
        face_camera_id: asText(form?.faceCameraId),
        plate_camera_id: asText(form?.plateCameraId),
    };
}

export function getVisibleParkingLotPages(currentPage, totalPages) {
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
