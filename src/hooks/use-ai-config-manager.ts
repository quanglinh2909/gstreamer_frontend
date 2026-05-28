import { useCallback, useEffect, useMemo, useState } from "react";
import { cameraApi } from "@/backend-api/camera-api";
import { faceRecognitionApi } from "@/backend-api/face-recognition-api";
import { plateRecognitionApi } from "@/backend-api/plate-recognition-api";
import { restrictedAreaApi } from "@/backend-api/restricted-area-api";
import { getAiFeatureItem } from "@/components/ai-config/ai-config-constants";
import type {
    AiBackendConfig,
    AiCameraConfig,
    AiConfidenceKey,
    AiConfigMap,
    AiFeatureId,
    AiPoint,
    AiTracker,
} from "@/interface/ai-config";
import type { ICameraResponse } from "@/interface/camera";
import {
    addAiDetectionShape,
    buildRecognitionPayload,
    buildRestrictedAreaPayload,
    buildAiDetectionShape,
    getAiDebugJobId,
    getAiDebugStreamUrl,
    getAiConfigFromBackendConfigs,
    getAiConfigDefaults,
    insertAiDetectionShapePoint,
    moveAiDetectionShape,
    moveAiDetectionShapePoint,
    mergeAiConfigShapes,
    removeAiDetectionShape,
    removeAiDetectionShapePoint,
    updateAiFeature,
} from "@/lib/ai-config-view-model";

function getApiErrorMessage(error: unknown, fallbackMessage = "Unable to load cameras") {
    if (error instanceof Error) {
        return error.message;
    }

    return fallbackMessage;
}

function asCameraList(data: unknown): ICameraResponse[] {
    return Array.isArray(data) ? data : [];
}

function asBackendConfigList(data: unknown): AiBackendConfig[] {
    return Array.isArray(data) ? data as AiBackendConfig[] : [];
}

function clampDraftPoint(point: AiPoint): AiPoint {
    return {
        x: Math.min(1, Math.max(0, point.x)),
        y: Math.min(1, Math.max(0, point.y)),
    };
}

export function useAiConfigManager() {
    const [cameras, setCameras] = useState<ICameraResponse[]>([]);
    const [configs, setConfigs] = useState<AiConfigMap>({});
    const [backendConfigsByCamera, setBackendConfigsByCamera] = useState<Record<string, AiBackendConfig[]>>({});
    const [selectedCameraId, setSelectedCameraId] = useState("");
    const [activeFeatureId, setActiveFeatureId] = useState<AiFeatureId>("face");
    const [draftPoints, setDraftPoints] = useState<AiPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [snapshotUrl, setSnapshotUrl] = useState("");
    const [snapshotSize, setSnapshotSize] = useState({ width: 0, height: 0 });
    const [isSnapshotLoading, setIsSnapshotLoading] = useState(false);
    const [snapshotErrorMessage, setSnapshotErrorMessage] = useState("");
    const [isSavingRecognition, setIsSavingRecognition] = useState(false);
    const [recognitionMessage, setRecognitionMessage] = useState("");
    const [recognitionErrorMessage, setRecognitionErrorMessage] = useState("");
    const [isDebugPreviewOpen, setIsDebugPreviewOpen] = useState(false);

    const fetchCameras = useCallback(async () => {
        setIsLoading(true);
        setErrorMessage("");

        try {
            const { data } = await cameraApi.getCameras(100, 0);
            const cameraList = asCameraList(data);

            setCameras(cameraList);
            setSelectedCameraId((currentCameraId) => currentCameraId || cameraList[0]?.id || "");
        } catch (error) {
            setErrorMessage(getApiErrorMessage(error));
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void fetchCameras();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [fetchCameras]);

    useEffect(() => {
        if (!selectedCameraId) {
            return;
        }

        let isCancelled = false;

        const loadAiConfig = async () => {
            setRecognitionErrorMessage("");

            try {
                const { data } = await cameraApi.getConfigAI(selectedCameraId);

                if (isCancelled) {
                    return;
                }

                const backendConfigItems = asBackendConfigList(data);
                const nextConfig = getAiConfigFromBackendConfigs(selectedCameraId, backendConfigItems) as AiCameraConfig;

                setBackendConfigsByCamera((currentConfigs) => ({
                    ...currentConfigs,
                    [selectedCameraId]: backendConfigItems,
                }));
                setConfigs((currentConfigs) => ({
                    ...currentConfigs,
                    [selectedCameraId]: nextConfig,
                }));
            } catch (error) {
                if (isCancelled) {
                    return;
                }

                setRecognitionErrorMessage(getApiErrorMessage(error, "Không thể tải cấu hình AI."));
            }
        };

        void loadAiConfig();

        return () => {
            isCancelled = true;
        };
    }, [selectedCameraId]);

    useEffect(() => {
        if (typeof window === "undefined") {
            return;
        }

        let isCancelled = false;
        let objectUrl = "";

        const loadSnapshot = async () => {
            await new Promise((resolve) => window.setTimeout(resolve, 0));

            if (isCancelled) {
                return;
            }

            setSnapshotUrl("");
            setSnapshotSize({ width: 0, height: 0 });
            setSnapshotErrorMessage("");

            if (!selectedCameraId) {
                setIsSnapshotLoading(false);
                return;
            }

            setIsSnapshotLoading(true);

            try {
                const { data } = await cameraApi.snapshot(selectedCameraId);

                if (isCancelled) {
                    return;
                }

                const blob = data instanceof Blob ? data : new Blob([data]);
                objectUrl = URL.createObjectURL(blob);
                const image = new Image();

                image.onload = () => {
                    if (isCancelled) {
                        URL.revokeObjectURL(objectUrl);
                        return;
                    }

                    setSnapshotSize({
                        width: image.naturalWidth,
                        height: image.naturalHeight,
                    });
                    setSnapshotUrl(objectUrl);
                    setIsSnapshotLoading(false);
                };

                image.onerror = () => {
                    if (isCancelled) {
                        return;
                    }

                    URL.revokeObjectURL(objectUrl);
                    objectUrl = "";
                    setSnapshotErrorMessage("Không thể đọc ảnh snapshot của camera.");
                    setIsSnapshotLoading(false);
                };

                image.src = objectUrl;
            } catch (error) {
                if (isCancelled) {
                    return;
                }

                setSnapshotErrorMessage(getApiErrorMessage(error, "Không thể tải ảnh snapshot."));
                setIsSnapshotLoading(false);
            }
        };

        void loadSnapshot();

        return () => {
            isCancelled = true;
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [selectedCameraId]);

    useEffect(() => {
        if (!selectedCameraId || snapshotSize.width === 0 || snapshotSize.height === 0) {
            return;
        }

        const backendConfigItems = backendConfigsByCamera[selectedCameraId];

        if (!backendConfigItems) {
            return;
        }

        const hydratedConfig = getAiConfigFromBackendConfigs(
            selectedCameraId,
            backendConfigItems,
            snapshotSize,
        ) as AiCameraConfig;

        const timer = window.setTimeout(() => {
            setConfigs((currentConfigs) => {
                const currentConfig = (currentConfigs[selectedCameraId] ??
                    getAiConfigDefaults(selectedCameraId)) as AiCameraConfig;

                return {
                    ...currentConfigs,
                    [selectedCameraId]: mergeAiConfigShapes(currentConfig, hydratedConfig) as AiCameraConfig,
                };
            });
        }, 0);

        return () => window.clearTimeout(timer);
    }, [backendConfigsByCamera, selectedCameraId, snapshotSize]);

    const selectedCamera = useMemo(
        () => cameras.find((camera) => camera.id === selectedCameraId) ?? null,
        [cameras, selectedCameraId],
    );

    const selectedConfig = useMemo(() => {
        if (!selectedCameraId) {
            return null;
        }

        return (configs[selectedCameraId] ?? getAiConfigDefaults(selectedCameraId)) as AiCameraConfig;
    }, [configs, selectedCameraId]);

    const debugStreamUrl = useMemo(() => {
        const jobId = getAiDebugJobId(backendConfigsByCamera[selectedCameraId] ?? [], activeFeatureId);

        return getAiDebugStreamUrl(selectedCameraId, jobId);
    }, [activeFeatureId, backendConfigsByCamera, selectedCameraId]);

    const updateSelectedConfig = useCallback(
        (updater: (config: AiCameraConfig) => AiCameraConfig) => {
            if (!selectedCameraId) {
                return;
            }

            setConfigs((currentConfigs) => {
                const currentConfig = (currentConfigs[selectedCameraId] ??
                    getAiConfigDefaults(selectedCameraId)) as AiCameraConfig;
                const nextConfig = updater(currentConfig);

                return {
                    ...currentConfigs,
                    [selectedCameraId]: nextConfig,
                };
            });
        },
        [selectedCameraId],
    );

    const handleSelectCamera = (cameraId: string) => {
        setSelectedCameraId(cameraId);
        setDraftPoints([]);
        setIsDebugPreviewOpen(false);
        setRecognitionMessage("");
        setRecognitionErrorMessage("");
    };

    const toggleFeature = (featureId: AiFeatureId) => {
        updateSelectedConfig((config) =>
            updateAiFeature(config, featureId, {
                enabled: !config.features[featureId].enabled,
            }) as AiCameraConfig,
        );
    };

    const setFeatureConfidence = (featureId: AiFeatureId, key: AiConfidenceKey, confidence: number) => {
        updateSelectedConfig((config) =>
            updateAiFeature(config, featureId, { [key]: confidence }) as AiCameraConfig,
        );
    };

    const setFeatureMaxFps = (featureId: AiFeatureId, maxFps: number) => {
        updateSelectedConfig((config) =>
            updateAiFeature(config, featureId, { maxFps }) as AiCameraConfig,
        );
    };

    const setFeatureOverlapThreshold = (featureId: AiFeatureId, overlapThreshold: number) => {
        updateSelectedConfig((config) =>
            updateAiFeature(config, featureId, { overlapThreshold }) as AiCameraConfig,
        );
    };

    const setFeatureTracker = (featureId: AiFeatureId, tracker: AiTracker) => {
        updateSelectedConfig((config) =>
            updateAiFeature(config, featureId, { tracker }) as AiCameraConfig,
        );
    };

    const addCanvasPoint = (point: AiPoint) => {
        if (!selectedCameraId) {
            return;
        }

        const activeFeatureItem = getAiFeatureItem(activeFeatureId);

        if (activeFeatureItem.shapeKind === "tripwire") {
            const nextPoints = [...draftPoints, point];

            if (nextPoints.length >= 2) {
                const shape = buildAiDetectionShape({
                    cameraId: selectedCameraId,
                    kind: "tripwire",
                    label: `${activeFeatureItem.shapeLabel} ${(selectedConfig?.shapes.filter((item) => item.kind === "tripwire").length ?? 0) + 1}`,
                    points: nextPoints.slice(0, 2),
                });

                updateSelectedConfig((config) => addAiDetectionShape(config, shape) as AiCameraConfig);
                setDraftPoints([]);
                return;
            }

            setDraftPoints(nextPoints);
            return;
        }

        setDraftPoints((currentPoints) => [...currentPoints, point]);
    };

    const getConfigWithDraftZone = useCallback(
        (config: AiCameraConfig) => {
            if (!selectedCameraId || draftPoints.length < 3) {
                return config;
            }

            const activeFeatureItem = getAiFeatureItem(activeFeatureId);

            if (activeFeatureItem.shapeKind === "tripwire") {
                return config;
            }

            const shape = buildAiDetectionShape({
                cameraId: selectedCameraId,
                kind: activeFeatureItem.shapeKind,
                label: `${activeFeatureItem.shapeLabel} ${config.shapes.filter((item) => item.kind === activeFeatureItem.shapeKind).length + 1}`,
                points: draftPoints,
            });

            return addAiDetectionShape(config, shape) as AiCameraConfig;
        },
        [activeFeatureId, draftPoints, selectedCameraId],
    );

    const addActiveZone = () => {
        if (!selectedCameraId || draftPoints.length < 3) {
            return;
        }

        const activeFeatureItem = getAiFeatureItem(activeFeatureId);

        if (activeFeatureItem.shapeKind === "tripwire") {
            return;
        }

        updateSelectedConfig((config) => getConfigWithDraftZone(config));
        setDraftPoints([]);
    };

    const removeShape = (shapeId: string) => {
        updateSelectedConfig((config) => removeAiDetectionShape(config, shapeId) as AiCameraConfig);
    };

    const removeShapePoint = (shapeId: string, pointIndex: number) => {
        updateSelectedConfig((config) =>
            removeAiDetectionShapePoint(config, shapeId, pointIndex) as AiCameraConfig,
        );
    };

    const moveShapePoint = (shapeId: string, pointIndex: number, point: AiPoint) => {
        updateSelectedConfig((config) =>
            moveAiDetectionShapePoint(config, shapeId, pointIndex, point) as AiCameraConfig,
        );
    };

    const insertShapePoint = (shapeId: string, pointIndex: number, point: AiPoint) => {
        updateSelectedConfig((config) =>
            insertAiDetectionShapePoint(config, shapeId, pointIndex, point) as AiCameraConfig,
        );
    };

    const moveShape = (shapeId: string, delta: AiPoint) => {
        updateSelectedConfig((config) => moveAiDetectionShape(config, shapeId, delta) as AiCameraConfig);
    };

    const resetCurrentConfig = () => {
        if (!selectedCameraId) {
            return;
        }

        setConfigs((currentConfigs) => ({
            ...currentConfigs,
            [selectedCameraId]: getAiConfigDefaults(selectedCameraId) as AiCameraConfig,
        }));
        setDraftPoints([]);
    };

    const handleSelectFeature = (featureId: AiFeatureId) => {
        setActiveFeatureId(featureId);
        setDraftPoints([]);
        setIsDebugPreviewOpen(false);
    };

    const saveActiveRecognitionConfig = useCallback(
        async () => {
            if (!selectedCameraId || !selectedConfig) {
                return;
            }

            setRecognitionMessage("");
            setRecognitionErrorMessage("");

            if (
                activeFeatureId !== "face" &&
                activeFeatureId !== "licensePlate" &&
                activeFeatureId !== "restrictedZone"
            ) {
                setRecognitionErrorMessage("Chỉ hỗ trợ lưu Khuôn mặt, Biển số hoặc Vùng cấm.");
                return;
            }

            if (snapshotSize.width === 0 || snapshotSize.height === 0) {
                setRecognitionErrorMessage("Chưa có ảnh snapshot để lấy tọa độ thật.");
                return;
            }

            setIsSavingRecognition(true);

            try {
                const configForPayload = getConfigWithDraftZone(selectedConfig);

                if (activeFeatureId === "face") {
                    const payload = buildRecognitionPayload(configForPayload, activeFeatureId, snapshotSize);
                    await faceRecognitionApi.faceRecognition(payload);
                    setRecognitionMessage("Đã lưu cấu hình khuôn mặt.");
                } else if (activeFeatureId === "licensePlate") {
                    const payload = buildRecognitionPayload(configForPayload, activeFeatureId, snapshotSize);
                    await plateRecognitionApi.plateRecognition(payload);
                    setRecognitionMessage("Đã lưu cấu hình biển số.");
                } else if (activeFeatureId === "restrictedZone") {
                    const payload = buildRestrictedAreaPayload(configForPayload, snapshotSize);
                    await restrictedAreaApi.restrictedArea(payload);
                    setRecognitionMessage("Đã lưu cấu hình vùng cấm.");
                }

                if (configForPayload !== selectedConfig) {
                    setConfigs((currentConfigs) => ({
                        ...currentConfigs,
                        [selectedCameraId]: configForPayload,
                    }));
                    setDraftPoints([]);
                }
            } catch (error) {
                setRecognitionErrorMessage(getApiErrorMessage(error, "Không thể lưu cấu hình AI."));
            } finally {
                setIsSavingRecognition(false);
            }
        },
        [activeFeatureId, getConfigWithDraftZone, selectedCameraId, selectedConfig, snapshotSize],
    );

    return {
        activeFeatureId,
        addActiveZone,
        addCanvasPoint,
        cameras,
        clearDraft: () => setDraftPoints([]),
        draftPoints,
        debugStreamUrl,
        errorMessage,
        fetchCameras,
        handleSelectCamera,
        handleSelectFeature,
        saveActiveRecognitionConfig: () => void saveActiveRecognitionConfig(),
        isLoading,
        isDebugPreviewOpen,
        isSavingRecognition,
        isSnapshotLoading,
        moveShape,
        moveShapePoint,
        removeDraftPoint: (pointIndex: number) =>
            setDraftPoints((currentPoints) => currentPoints.filter((_, index) => index !== pointIndex)),
        insertDraftPoint: (pointIndex: number, point: AiPoint) =>
            setDraftPoints((currentPoints) => {
                const nextPoints = [...currentPoints];
                nextPoints.splice(pointIndex + 1, 0, clampDraftPoint(point));
                return nextPoints;
            }),
        moveDraftPoint: (pointIndex: number, point: AiPoint) =>
            setDraftPoints((currentPoints) =>
                currentPoints.map((currentPoint, index) =>
                    index === pointIndex ? clampDraftPoint(point) : currentPoint,
                ),
            ),
        removeShape,
        insertShapePoint,
        removeShapePoint,
        resetCurrentConfig,
        selectedCamera,
        selectedCameraId,
        selectedConfig,
        setFeatureConfidence,
        setFeatureMaxFps,
        setFeatureOverlapThreshold,
        setFeatureTracker,
        snapshotErrorMessage,
        snapshotSize,
        snapshotUrl,
        toggleFeature,
        recognitionErrorMessage,
        recognitionMessage,
        closeDebugPreview: () => setIsDebugPreviewOpen(false),
        openDebugPreview: () => {
            if (debugStreamUrl) {
                setIsDebugPreviewOpen(true);
            }
        },
    };
}

export type AiConfigManager = ReturnType<typeof useAiConfigManager>;
