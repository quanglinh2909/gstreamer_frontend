import { type FormEvent, useCallback, useEffect, useState } from "react";
import { cameraApi } from "@/backend-api/camera-api";
import { plateGateGroupApi } from "@/backend-api/plate-gate-group-api";
import { plateWhiteListSettingsApi } from "@/backend-api/plate-white-list-settings-api";
import type { ICameraResponse } from "@/interface/camera";
import type { PlateGateGroup } from "@/interface/plate-gate-group";
import type {
    PlateWhiteListSettings,
    PlateWhiteListSettingsPayload,
} from "@/interface/plate-white-list-settings";

export type PlateWhiteListSettingsFormMode = "create" | "edit";

export interface PlateWhiteListSettingsFormState {
    cameraId: string;
    preTime: string;
    maxEditDistance: string;
    ocrConfidence: string;
    minPlateLength: string;
    barrierDuration: string;
    /** "" = không thuộc cụm nào. Chuỗi vì <select> chỉ làm việc với chuỗi. */
    gateGroupId: string;
}

// Trùng với default của PlateWhiteListSettingsUpdate ở backend, dùng để điền
// sẵn form khi bật barrier cho một camera mới.
const DEFAULT_FORM: Omit<PlateWhiteListSettingsFormState, "cameraId"> = {
    preTime: "0",
    maxEditDistance: "0",
    ocrConfidence: "0.3",
    minPlateLength: "7",
    barrierDuration: "0.5",
    // Mặc định KHÔNG thuộc cụm nào: gộp cổng vào với cổng ra dùng hai barrier
    // khác nhau là làm xe vừa vào bị khoá ở cổng ra. Phải do người dùng chọn.
    gateGroupId: "",
};

// Khớp với ràng buộc Field(ge=..., le=...) của backend. Chặn ở đây để người
// dùng thấy lỗi ngay tại form thay vì nhận 422 khó hiểu.
const LIMITS = {
    preTime: { min: 0, max: 3600, label: "Chờ giữa 2 lần mở" },
    maxEditDistance: { min: 0, max: 3, label: "Sai số ký tự cho phép" },
    ocrConfidence: { min: 0, max: 1, label: "Ngưỡng tin cậy OCR" },
    minPlateLength: { min: 1, max: 12, label: "Số ký tự tối thiểu" },
    barrierDuration: { min: 0.1, max: 10, label: "Độ dài xung barrier" },
} as const;

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

function createForm(entry?: PlateWhiteListSettings | null): PlateWhiteListSettingsFormState {
    if (!entry) {
        return { cameraId: "", ...DEFAULT_FORM };
    }

    return {
        cameraId: entry.camera_id,
        preTime: String(entry.pre_time),
        maxEditDistance: String(entry.max_edit_distance),
        ocrConfidence: String(entry.ocr_confidence),
        minPlateLength: String(entry.min_plate_length),
        barrierDuration: String(entry.barrier_duration),
        gateGroupId: entry.gate_group_id == null ? "" : String(entry.gate_group_id),
    };
}

function getFormError(form: PlateWhiteListSettingsFormState): string {
    if (!form.cameraId.trim()) {
        return "Vui lòng chọn camera.";
    }

    for (const [key, limit] of Object.entries(LIMITS)) {
        const raw = form[key as keyof typeof LIMITS];
        const value = Number(raw);

        if (raw.trim() === "" || !Number.isFinite(value)) {
            return `${limit.label}: giá trị không hợp lệ.`;
        }

        if (value < limit.min || value > limit.max) {
            return `${limit.label}: phải nằm trong khoảng ${limit.min} – ${limit.max}.`;
        }
    }

    return "";
}

function buildPayload(form: PlateWhiteListSettingsFormState): PlateWhiteListSettingsPayload {
    return {
        pre_time: Math.round(Number(form.preTime)),
        max_edit_distance: Math.round(Number(form.maxEditDistance)),
        ocr_confidence: Number(form.ocrConfidence),
        min_plate_length: Math.round(Number(form.minPlateLength)),
        barrier_duration: Number(form.barrierDuration),
        gate_group_id: form.gateGroupId ? Number(form.gateGroupId) : null,
    };
}

export function usePlateWhiteListSettingsManager() {
    const [entries, setEntries] = useState<PlateWhiteListSettings[]>([]);
    const [cameras, setCameras] = useState<ICameraResponse[]>([]);
    // Danh sách cụm để đổ vào ô chọn và để hiện "đang dùng thời gian của cụm".
    const [groups, setGroups] = useState<PlateGateGroup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<PlateWhiteListSettingsFormMode>("create");
    const [form, setForm] = useState<PlateWhiteListSettingsFormState>(() => createForm());
    const [formErrorMessage, setFormErrorMessage] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<PlateWhiteListSettings | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteErrorMessage, setDeleteErrorMessage] = useState("");

    useEffect(() => {
        let isCancelled = false;

        const load = async () => {
            setIsLoading(true);
            setErrorMessage("");

            try {
                // Danh sách camera chỉ để hiển thị tên và đổ vào ô chọn khi
                // thêm mới; nó hỏng thì bảng cấu hình vẫn phải xem được, nên
                // bắt lỗi riêng thay vì để cả màn hình chết theo.
                const [settingsResult, camerasResult, groupsResult] = await Promise.allSettled([
                    plateWhiteListSettingsApi.list(),
                    cameraApi.getCameras(100, 0),
                    plateGateGroupApi.list(),
                ]);
                if (groupsResult.status === "fulfilled" && !isCancelled) {
                    setGroups(groupsResult.value.data ?? []);
                }

                if (isCancelled) {
                    return;
                }

                if (settingsResult.status === "rejected") {
                    throw settingsResult.reason;
                }

                setEntries(
                    Array.isArray(settingsResult.value.data) ? settingsResult.value.data : [],
                );
                setCameras(
                    camerasResult.status === "fulfilled" && Array.isArray(camerasResult.value.data)
                        ? camerasResult.value.data
                        : [],
                );
            } catch (error) {
                if (!isCancelled) {
                    setErrorMessage(getErrorMessage(error, "Không thể tải cấu hình barrier."));
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        const timer = window.setTimeout(() => {
            void load();
        }, 0);

        return () => {
            isCancelled = true;
            window.clearTimeout(timer);
        };
    }, [refreshKey]);

    const refreshEntries = useCallback(() => {
        setRefreshKey((key) => key + 1);
    }, []);

    const getCameraName = useCallback(
        (cameraId: string) => cameras.find((camera) => camera.id === cameraId)?.name ?? "",
        [cameras],
    );

    // Camera chưa có dòng cấu hình — chỉ những camera này mới được chọn khi
    // thêm mới, vì mỗi camera nhiều nhất một dòng (camera_id unique).
    const availableCameras = cameras.filter(
        (camera) => !entries.some((entry) => entry.camera_id === camera.id),
    );

    const openCreateEntry = () => {
        setFormMode("create");
        setForm(createForm());
        setFormErrorMessage("");
        setIsFormOpen(true);
    };

    const openEditEntry = (entry: PlateWhiteListSettings) => {
        setFormMode("edit");
        setForm(createForm(entry));
        setFormErrorMessage("");
        setIsFormOpen(true);
    };

    const closeForm = () => {
        if (!isSaving) {
            setIsFormOpen(false);
            setFormErrorMessage("");
        }
    };

    const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const validationError = getFormError(form);

        if (validationError) {
            setFormErrorMessage(validationError);
            return;
        }

        setIsSaving(true);
        setFormErrorMessage("");

        try {
            await plateWhiteListSettingsApi.save(form.cameraId.trim(), buildPayload(form));
            setIsFormOpen(false);
            refreshEntries();
        } catch (error) {
            setFormErrorMessage(getErrorMessage(error, "Không thể lưu cấu hình."));
        } finally {
            setIsSaving(false);
        }
    };

    const openDeleteEntry = (entry: PlateWhiteListSettings) => {
        setDeleteTarget(entry);
        setDeleteErrorMessage("");
    };

    const closeDeleteEntry = () => {
        if (!isDeleting) {
            setDeleteTarget(null);
            setDeleteErrorMessage("");
        }
    };

    const confirmDeleteEntry = async () => {
        if (!deleteTarget) {
            return;
        }

        setIsDeleting(true);
        setDeleteErrorMessage("");

        try {
            await plateWhiteListSettingsApi.delete(deleteTarget.camera_id);
            setDeleteTarget(null);
            refreshEntries();
        } catch (error) {
            setDeleteErrorMessage(getErrorMessage(error, "Không thể xóa cấu hình."));
        } finally {
            setIsDeleting(false);
        }
    };

    const setFormField = (key: keyof PlateWhiteListSettingsFormState, value: string) => {
        setForm((current) => ({ ...current, [key]: value }));
    };

    return {
        availableCameras,
        cameras,
        closeDeleteEntry,
        closeForm,
        confirmDeleteEntry,
        deleteErrorMessage,
        deleteTarget,
        entries,
        errorMessage,
        form,
        formErrorMessage,
        formMode,
        getCameraName,
        groups,
        handleFormSubmit,
        isDeleting,
        isFormOpen,
        isLoading,
        isSaving,
        openCreateEntry,
        openDeleteEntry,
        openEditEntry,
        refreshEntries,
        setFormField,
    };
}

export type PlateWhiteListSettingsManager = ReturnType<typeof usePlateWhiteListSettingsManager>;
