import { type FormEvent, useCallback, useEffect, useState } from "react";
import { cameraApi } from "@/backend-api/camera-api";
import { plateGateGroupApi } from "@/backend-api/plate-gate-group-api";
import { plateWhiteListSettingsApi } from "@/backend-api/plate-white-list-settings-api";
import type { ICameraResponse } from "@/interface/camera";
import type { PlateGateGroup } from "@/interface/plate-gate-group";
import type { PlateWhiteListSettings } from "@/interface/plate-white-list-settings";

export type PlateGateGroupFormMode = "create" | "edit";

export interface PlateGateGroupFormState {
    id: number | null;
    name: string;
    preTime: string;
    cameraIds: string[];
}

const EMPTY_FORM: PlateGateGroupFormState = {
    id: null,
    name: "",
    // Mặc định 30s chứ không phải 0: 0 nghĩa là "cả cụm chỉ mở đúng một lần
    // cho mỗi biển" — gần như chắc chắn không phải điều người ta muốn khi vừa
    // tạo một cụm cho làn xe chạy hằng ngày.
    preTime: "30",
    cameraIds: [],
};

function getErrorMessage(error: unknown, fallback: string) {
    return error instanceof Error ? error.message : fallback;
}

export function usePlateGateGroupManager() {
    const [groups, setGroups] = useState<PlateGateGroup[]>([]);
    const [settings, setSettings] = useState<PlateWhiteListSettings[]>([]);
    const [cameras, setCameras] = useState<ICameraResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formMode, setFormMode] = useState<PlateGateGroupFormMode>("create");
    const [form, setForm] = useState<PlateGateGroupFormState>(EMPTY_FORM);
    const [formErrorMessage, setFormErrorMessage] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<PlateGateGroup | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteErrorMessage, setDeleteErrorMessage] = useState("");

    useEffect(() => {
        let isCancelled = false;

        const load = async () => {
            setIsLoading(true);
            setErrorMessage("");

            // Ba nguồn độc lập: danh sách cụm, danh sách camera ĐÃ bật
            // whitelist (chỉ những camera này mới gán vào cụm được), và tên
            // camera. Tên camera hỏng thì vẫn phải xem được cụm, nên
            // allSettled chứ không all.
            const [groupsResult, settingsResult, camerasResult] = await Promise.allSettled([
                plateGateGroupApi.list(),
                plateWhiteListSettingsApi.list(),
                cameraApi.getCameras(100, 0),
            ]);

            if (isCancelled) return;

            if (groupsResult.status === "fulfilled") {
                setGroups(groupsResult.value.data ?? []);
            } else {
                setErrorMessage(getErrorMessage(groupsResult.reason, "Không tải được danh sách cụm."));
            }
            if (settingsResult.status === "fulfilled") {
                setSettings(settingsResult.value.data ?? []);
            }
            if (camerasResult.status === "fulfilled") {
                setCameras(camerasResult.value.data ?? []);
            }
            setIsLoading(false);
        };

        void load();

        return () => {
            isCancelled = true;
        };
    }, [refreshKey]);

    const refresh = useCallback(() => setRefreshKey((key) => key + 1), []);

    const getCameraName = useCallback(
        (cameraId: string) =>
            cameras.find((camera) => camera.id === cameraId)?.name || cameraId,
        [cameras],
    );

    const openCreate = () => {
        setFormMode("create");
        setForm(EMPTY_FORM);
        setFormErrorMessage("");
        setIsFormOpen(true);
    };

    const openEdit = (group: PlateGateGroup) => {
        setFormMode("edit");
        setForm({
            id: group.id,
            name: group.name,
            preTime: String(group.pre_time),
            cameraIds: [...group.camera_ids],
        });
        setFormErrorMessage("");
        setIsFormOpen(true);
    };

    const closeForm = () => {
        if (isSaving) return;
        setIsFormOpen(false);
        setFormErrorMessage("");
    };

    const setFormField = <K extends keyof PlateGateGroupFormState>(
        key: K,
        value: PlateGateGroupFormState[K],
    ) => setForm((current) => ({ ...current, [key]: value }));

    const toggleCamera = (cameraId: string) =>
        setForm((current) => ({
            ...current,
            cameraIds: current.cameraIds.includes(cameraId)
                ? current.cameraIds.filter((id) => id !== cameraId)
                : [...current.cameraIds, cameraId],
        }));

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setFormErrorMessage("");

        const name = form.name.trim().replace(/\s+/g, " ");
        if (!name) {
            setFormErrorMessage("Tên cụm không được để trống.");
            return;
        }
        const preTime = Number(form.preTime);
        if (!Number.isFinite(preTime) || preTime < 0 || preTime > 3600) {
            setFormErrorMessage("Thời gian chờ phải nằm trong khoảng 0 – 3600 giây.");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                name,
                pre_time: Math.round(preTime),
                camera_ids: form.cameraIds,
            };
            if (formMode === "create") {
                await plateGateGroupApi.create(payload);
            } else if (form.id != null) {
                await plateGateGroupApi.update(form.id, payload);
            }
            setIsFormOpen(false);
            refresh();
        } catch (error) {
            setFormErrorMessage(getErrorMessage(error, "Lưu cụm thất bại."));
        } finally {
            setIsSaving(false);
        }
    };

    const openDelete = (group: PlateGateGroup) => {
        setDeleteTarget(group);
        setDeleteErrorMessage("");
    };

    const closeDelete = () => {
        if (isDeleting) return;
        setDeleteTarget(null);
        setDeleteErrorMessage("");
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        setDeleteErrorMessage("");
        try {
            await plateGateGroupApi.delete(deleteTarget.id);
            setDeleteTarget(null);
            refresh();
        } catch (error) {
            setDeleteErrorMessage(getErrorMessage(error, "Xoá cụm thất bại."));
        } finally {
            setIsDeleting(false);
        }
    };

    return {
        groups,
        // Chỉ camera đã bật whitelist mới gán vào cụm được: cụm không được
        // phép bật barrier cho một camera nào cả.
        assignableCameras: settings.map((entry) => entry.camera_id),
        settings,
        isLoading,
        errorMessage,
        refresh,
        getCameraName,
        isFormOpen,
        formMode,
        form,
        formErrorMessage,
        isSaving,
        openCreate,
        openEdit,
        closeForm,
        setFormField,
        toggleCamera,
        handleSubmit,
        deleteTarget,
        isDeleting,
        deleteErrorMessage,
        openDelete,
        closeDelete,
        confirmDelete,
    };
}
