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

// Khớp với ràng buộc Field(ge=, le=) của ParkingLotSettings ở backend. Chặn ở
// đây để người dùng thấy lỗi ngay tại form thay vì nhận 422 khó hiểu.
export const PARKING_LOT_SETTING_LIMITS = [
    { key: "timeExpired", label: "Cửa sổ ghép cặp", min: 1, max: 600 },
    { key: "matchCooldown", label: "Chống trùng lượt xe", min: 0, max: 600 },
    { key: "barrierDuration", label: "Độ dài xung barrier", min: 0.1, max: 10 },
    { key: "maxEditDistance", label: "Sai số ký tự cho phép", min: 0, max: 3 },
    { key: "ocrConfidence", label: "Ngưỡng tin cậy OCR", min: 0, max: 1 },
];

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

    for (const limit of PARKING_LOT_SETTING_LIMITS) {
        const raw = form?.[limit.key];
        const value = Number(raw);

        if (asText(raw) === "" || !Number.isFinite(value)) {
            return `${limit.label}: giá trị không hợp lệ.`;
        }

        if (value < limit.min || value > limit.max) {
            return `${limit.label}: phải nằm trong khoảng ${limit.min} – ${limit.max}.`;
        }
    }

    return "";
}

function asNumber(value, fallback) {
    const numericValue = Number(value);

    return Number.isFinite(numericValue) ? numericValue : fallback;
}

function asInteger(value, fallback) {
    return Math.round(asNumber(value, fallback));
}

// Liệt kê từng khoá thay vì gán động qua PARKING_LOT_SETTING_LIMITS: file này
// là JS nên TypeScript suy kiểu trả về từ chính object literal ở đây. Gán động
// làm TS không thấy các khoá đó và ParkingLotPayload phải nới thành optional —
// tức mất luôn khả năng bắt lỗi thiếu field lúc biên dịch.
export function buildParkingLotPayload(form) {
    return {
        name: asText(form?.name),
        face_camera_id: asText(form?.faceCameraId),
        plate_camera_id: asText(form?.plateCameraId),
        time_expired: asInteger(form?.timeExpired, 30),
        match_cooldown: asInteger(form?.matchCooldown, 30),
        barrier_duration: asNumber(form?.barrierDuration, 0.5),
        max_edit_distance: asInteger(form?.maxEditDistance, 2),
        ocr_confidence: asNumber(form?.ocrConfidence, 0.3),
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
