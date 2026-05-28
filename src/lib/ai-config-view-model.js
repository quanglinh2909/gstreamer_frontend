export const AI_FEATURE_IDS = ["face", "licensePlate", "restrictedZone", "tripwire"];

export const AI_SHAPE_KINDS = ["faceZone", "licensePlateZone", "restrictedZone", "tripwire"];

export const AI_FEATURE_SHAPE_KIND = {
    face: "faceZone",
    licensePlate: "licensePlateZone",
    restrictedZone: "restrictedZone",
    tripwire: "tripwire",
};

export const AI_SHAPE_FEATURE_ID = {
    faceZone: "face",
    licensePlateZone: "licensePlate",
    restrictedZone: "restrictedZone",
    tripwire: "tripwire",
};

const DEFAULT_CONFIDENCE = 70;
const DEFAULT_OVERLAP_THRESHOLD = 30;
const DEFAULT_MAX_FPS = 10;
const DEFAULT_RECOGNITION_MAX_FPS = 5;
const DEFAULT_TRACKER = /** @type {const} */ ("bytetrack");

function nowIso() {
    return new Date().toISOString();
}

function clampNumber(value, min, max) {
    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
        return min;
    }

    return Math.min(max, Math.max(min, numericValue));
}

function clampInteger(value, min, max) {
    return Math.round(clampNumber(value, min, max));
}

function clampPoint(point) {
    return {
        x: clampNumber(point?.x, 0, 1),
        y: clampNumber(point?.y, 0, 1),
    };
}

function roundPointValue(value) {
    return Number(value.toFixed(6));
}

function normalizeUiConfidence(value, fallback = DEFAULT_CONFIDENCE) {
    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
        return fallback;
    }

    const percentValue = numericValue <= 1 ? numericValue * 100 : numericValue;

    return Number(clampNumber(percentValue, 0, 100).toFixed(6));
}

function toApiConfidence(value) {
    return Number((clampNumber(value, 0, 100) / 100).toFixed(6));
}

/**
 * @param {unknown} value
 * @returns {"bytetrack" | "botsort" | "ocsort"}
 */
function normalizeTracker(value) {
    return value === "botsort" || value === "ocsort" ? value : DEFAULT_TRACKER;
}

function normalizeEditedPoint(point) {
    const clampedPoint = clampPoint(point);

    return {
        x: roundPointValue(clampedPoint.x),
        y: roundPointValue(clampedPoint.y),
    };
}

function createDefaultFeatures() {
    return {
        face: {
            enabled: false,
            detectionConfidence: DEFAULT_CONFIDENCE,
            maxFps: DEFAULT_RECOGNITION_MAX_FPS,
            verificationConfidence: DEFAULT_CONFIDENCE,
            overlapThreshold: DEFAULT_OVERLAP_THRESHOLD,
            tracker: DEFAULT_TRACKER,
        },
        licensePlate: {
            enabled: false,
            detectionConfidence: DEFAULT_CONFIDENCE,
            maxFps: DEFAULT_RECOGNITION_MAX_FPS,
            textRecognitionConfidence: DEFAULT_CONFIDENCE,
            overlapThreshold: DEFAULT_OVERLAP_THRESHOLD,
            tracker: DEFAULT_TRACKER,
        },
        restrictedZone: {
            enabled: false,
            detectionConfidence: DEFAULT_CONFIDENCE,
            maxFps: DEFAULT_RECOGNITION_MAX_FPS,
            overlapThreshold: DEFAULT_OVERLAP_THRESHOLD,
            tracker: DEFAULT_TRACKER,
        },
        tripwire: { enabled: false, detectionConfidence: DEFAULT_CONFIDENCE, maxFps: DEFAULT_MAX_FPS },
    };
}

function getDetectionConfidence(feature) {
    return clampNumber(
        feature?.detectionConfidence ?? feature?.confidence ?? DEFAULT_CONFIDENCE,
        0,
        100,
    );
}

function normalizeFeature(feature, featureId) {
    const isTrackedFeature = featureId === "face" || featureId === "licensePlate" || featureId === "restrictedZone";
    const defaultMaxFps = isTrackedFeature
        ? DEFAULT_RECOGNITION_MAX_FPS
        : DEFAULT_MAX_FPS;
    const normalizedFeature = {
        enabled: Boolean(feature?.enabled),
        detectionConfidence: getDetectionConfidence(feature),
        maxFps: clampInteger(feature?.maxFps ?? defaultMaxFps, 1, 25),
    };

    if (featureId === "face") {
        normalizedFeature.verificationConfidence = clampNumber(
            feature?.verificationConfidence ?? DEFAULT_CONFIDENCE,
            0,
            100,
        );
    }

    if (featureId === "licensePlate") {
        normalizedFeature.textRecognitionConfidence = clampNumber(
            feature?.textRecognitionConfidence ?? DEFAULT_CONFIDENCE,
            0,
            100,
        );
    }

    if (isTrackedFeature) {
        normalizedFeature.overlapThreshold = clampNumber(
            feature?.overlapThreshold ?? DEFAULT_OVERLAP_THRESHOLD,
            0,
            100,
        );
        normalizedFeature.tracker = normalizeTracker(feature?.tracker);
    }

    return normalizedFeature;
}

function getShapeKind(kind) {
    return AI_SHAPE_KINDS.includes(kind) ? kind : "restrictedZone";
}

function createShapeId(kind) {
    const randomId = globalThis.crypto?.randomUUID?.();

    if (randomId) {
        return randomId;
    }

    return `${kind}-${Date.now()}-${Math.round(Math.random() * 10000)}`;
}

export function getAiConfigDefaults(cameraId = "") {
    return {
        cameraId,
        features: createDefaultFeatures(),
        shapes: [],
        updatedAt: nowIso(),
    };
}

export function normalizeAiConfig(cameraId, config = {}) {
    const defaults = getAiConfigDefaults(cameraId);
    const rawFeatures = config.features ?? {};
    const shapes = Array.isArray(config.shapes) ? config.shapes : [];

    return {
        ...defaults,
        ...config,
        cameraId,
        features: {
            face: normalizeFeature(rawFeatures.face, "face"),
            licensePlate: normalizeFeature(rawFeatures.licensePlate, "licensePlate"),
            restrictedZone: normalizeFeature(rawFeatures.restrictedZone, "restrictedZone"),
            tripwire: normalizeFeature(rawFeatures.tripwire, "tripwire"),
        },
        shapes: shapes.map((shape, index) => normalizeAiDetectionShape(shape, cameraId, index)),
        updatedAt: config.updatedAt || defaults.updatedAt,
    };
}

export function normalizeAiDetectionShape(shape = {}, cameraId = "", index = 0) {
    const kind = getShapeKind(shape.kind);
    const points = Array.isArray(shape.points) ? shape.points.map(clampPoint) : [];

    return {
        id: shape.id || `${kind}-${index + 1}`,
        cameraId: shape.cameraId || cameraId,
        kind,
        label: shape.label || (kind === "tripwire" ? `Tripwire ${index + 1}` : `Zone ${index + 1}`),
        points,
        createdAt: shape.createdAt || nowIso(),
    };
}

function getBackendFeatureId(type) {
    if (type === "face_recognition") {
        return "face";
    }

    if (type === "plate_recognition") {
        return "licensePlate";
    }

    if (type === "restricted_area") {
        return "restrictedZone";
    }

    return null;
}

export function getAiDebugJobId(backendConfigs = [], featureId) {
    if (!Array.isArray(backendConfigs)) {
        return "";
    }

    const backendConfig = backendConfigs.find((item) => getBackendFeatureId(item?.type) === featureId);

    return String(backendConfig?.job_id ?? "").trim();
}

export function getAiDebugStreamUrl(cameraId = "", jobId = "") {
    const normalizedCameraId = String(cameraId ?? "").trim();
    const normalizedJobId = String(jobId ?? "").trim();

    if (!normalizedCameraId || !normalizedJobId) {
        return "";
    }

    return `/api/backend/ai-debug/cameras/${encodeURIComponent(normalizedCameraId)}/jobs/${encodeURIComponent(normalizedJobId)}/mjpeg`;
}

function parseSerializedPolygons(polygons) {
    if (!polygons || typeof polygons !== "string") {
        return [];
    }

    try {
        const parsedValue = JSON.parse(polygons);

        if (!Array.isArray(parsedValue)) {
            return [];
        }

        return parsedValue.filter((polygon) => Array.isArray(polygon));
    } catch {
        return [];
    }
}

function getNormalizedPointFromPixel(point, imageSize) {
    const width = getImageDimension(imageSize.width);
    const height = getImageDimension(imageSize.height);
    const maxX = Math.max(1, width - 1);
    const maxY = Math.max(1, height - 1);

    if (!Array.isArray(point) || width === 0 || height === 0) {
        return null;
    }

    return {
        x: roundPointValue(clampNumber(point[0], 0, maxX) / maxX),
        y: roundPointValue(clampNumber(point[1], 0, maxY) / maxY),
    };
}

function getShapesFromBackendConfig(item, imageSize, shapeKind, shapeLabel) {
    return parseSerializedPolygons(item?.polygons).reduce((shapes, polygon, index) => {
        const points = polygon
            .map((point) => getNormalizedPointFromPixel(point, imageSize))
            .filter(Boolean);

        if (points.length < 3) {
            return shapes;
        }

        shapes.push(normalizeAiDetectionShape({
            id: `${item?.id || shapeKind}-${index + 1}`,
            cameraId: item?.cameraId,
            kind: shapeKind,
            label: `${shapeLabel} ${index + 1}`,
            points,
            createdAt: nowIso(),
        }, item?.cameraId, index));

        return shapes;
    }, []);
}

export function getAiConfigFromBackendConfigs(cameraId, backendConfigs = [], imageSize = {}) {
    const defaults = getAiConfigDefaults(cameraId);

    if (!Array.isArray(backendConfigs)) {
        return defaults;
    }

    const nextConfig = backendConfigs.reduce((config, item) => {
        const featureId = getBackendFeatureId(item?.type);

        if (!featureId) {
            return config;
        }

        const isFace = featureId === "face";
        const isPlate = featureId === "licensePlate";
        const shapeKind = isFace ? "faceZone" : isPlate ? "licensePlateZone" : "restrictedZone";
        const shapeLabel = isFace ? "Vùng khuôn mặt" : isPlate ? "Vùng biển số" : "Vùng cấm";
        const currentFeature = config.features[featureId];
        const nextFeature = {
            ...currentFeature,
            enabled: Boolean(item.enabled),
            detectionConfidence: normalizeUiConfidence(item.primaryConf),
            overlapThreshold: normalizeUiConfidence(item.overlap_threshold, DEFAULT_OVERLAP_THRESHOLD),
            tracker: normalizeTracker(item.tracker),
            maxFps: clampInteger(item.maxFps ?? DEFAULT_RECOGNITION_MAX_FPS, 1, 25),
        };

        if (isFace) {
            nextFeature.verificationConfidence = normalizeUiConfidence(item.secondaryConf);
        } else if (isPlate) {
            nextFeature.textRecognitionConfidence = normalizeUiConfidence(item.secondaryConf);
        }

        return {
            ...config,
            features: {
                ...config.features,
                [featureId]: nextFeature,
            },
            shapes: [
                ...config.shapes.filter((shape) => shape.kind !== shapeKind),
                ...getShapesFromBackendConfig(item, imageSize, shapeKind, shapeLabel),
            ],
            updatedAt: nowIso(),
        };
    }, defaults);

    return normalizeAiConfig(cameraId, nextConfig);
}

export function mergeAiConfigShapes(config, hydratedConfig) {
    const cameraId = config?.cameraId ?? hydratedConfig?.cameraId ?? "";
    const currentConfig = normalizeAiConfig(cameraId, config ?? {});
    const nextShapes = normalizeAiConfig(cameraId, hydratedConfig ?? {}).shapes;

    return {
        ...currentConfig,
        shapes: nextShapes,
    };
}

function getImageDimension(value) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
        return 0;
    }

    return Math.round(numericValue);
}

function getPixelCoordinate(value, size) {
    const maxCoordinate = Math.max(0, size - 1);

    return Math.min(maxCoordinate, Math.max(0, Math.round(value * maxCoordinate)));
}

function formatSerializedPolygon(points) {
    return `[${points.map(([x, y]) => `[${x}, ${y}]`).join(", ")}]`;
}

export function serializeAiPolygons(shapes = [], imageSize = {}) {
    const width = getImageDimension(imageSize.width);
    const height = getImageDimension(imageSize.height);

    if (width === 0 || height === 0 || !Array.isArray(shapes)) {
        return "[]";
    }

    const polygons = shapes
        .filter((shape) => shape?.kind !== "tripwire" && Array.isArray(shape?.points) && shape.points.length >= 3)
        .map((shape) =>
            shape.points.map((point) => {
                const clampedPoint = clampPoint(point);

                return [
                    getPixelCoordinate(clampedPoint.x, width),
                    getPixelCoordinate(clampedPoint.y, height),
                ];
            }),
        );

    if (polygons.length === 0) {
        return "[]";
    }

    return `[${polygons.map(formatSerializedPolygon).join(",")}]`;
}

export function buildRecognitionPayload(config, featureId, imageSize = {}, options = {}) {
    const normalizedConfig = normalizeAiConfig(config?.cameraId ?? "", config ?? {});
    const feature = normalizedConfig.features[featureId];
    const shapeKind = featureId === "face" ? "faceZone" : "licensePlateZone";
    const secondaryConfidence = featureId === "face"
        ? feature?.verificationConfidence
        : feature?.textRecognitionConfidence;
    const shapes = normalizedConfig.shapes.filter((shape) => shape.kind === shapeKind);

    return {
        cameraId: normalizedConfig.cameraId,
        primaryConf: toApiConfidence(feature?.detectionConfidence ?? DEFAULT_CONFIDENCE),
        secondaryConf: toApiConfidence(secondaryConfidence ?? feature?.detectionConfidence ?? DEFAULT_CONFIDENCE),
        overlap_threshold: toApiConfidence(feature?.overlapThreshold ?? DEFAULT_OVERLAP_THRESHOLD),
        tracker: normalizeTracker(feature?.tracker),
        maxFps: clampInteger(options.maxFps ?? feature?.maxFps ?? DEFAULT_RECOGNITION_MAX_FPS, 1, 25),
        enabled: Boolean(feature?.enabled),
        polygons: serializeAiPolygons(shapes, imageSize),
    };
}

export function buildRestrictedAreaPayload(config, imageSize = {}, options = {}) {
    const normalizedConfig = normalizeAiConfig(config?.cameraId ?? "", config ?? {});
    const feature = normalizedConfig.features.restrictedZone;
    const shapes = normalizedConfig.shapes.filter((shape) => shape.kind === "restrictedZone");

    return {
        cameraId: normalizedConfig.cameraId,
        primaryConf: toApiConfidence(feature?.detectionConfidence ?? DEFAULT_CONFIDENCE),
        overlap_threshold: toApiConfidence(feature?.overlapThreshold ?? DEFAULT_OVERLAP_THRESHOLD),
        tracker: normalizeTracker(feature?.tracker),
        maxFps: clampInteger(options.maxFps ?? feature?.maxFps ?? DEFAULT_RECOGNITION_MAX_FPS, 1, 25),
        enabled: Boolean(feature?.enabled),
        polygons: serializeAiPolygons(shapes, imageSize),
    };
}

export function buildVehicleAiPayload(config, imageSize = {}, options = {}) {
    return buildRecognitionPayload(config, "licensePlate", imageSize, options);
}

export function buildAiDetectionShape({ cameraId, kind, label, points }) {
    const normalizedKind = getShapeKind(kind);

    return normalizeAiDetectionShape(
        {
            id: createShapeId(normalizedKind),
            cameraId,
            kind: normalizedKind,
            label,
            points,
            createdAt: nowIso(),
        },
        cameraId,
    );
}

export function updateAiFeature(config, featureId, patch) {
    const normalizedConfig = normalizeAiConfig(config.cameraId, config);
    const currentFeature = normalizedConfig.features[featureId];

    if (!currentFeature) {
        return normalizedConfig;
    }

    return normalizeAiConfig(normalizedConfig.cameraId, {
        ...normalizedConfig,
        features: {
            ...normalizedConfig.features,
            [featureId]: normalizeFeature({
                ...currentFeature,
                ...patch,
            }, featureId),
        },
        updatedAt: nowIso(),
    });
}

export function addAiDetectionShape(config, shape) {
    const normalizedConfig = normalizeAiConfig(config.cameraId, config);
    const normalizedShape = normalizeAiDetectionShape(shape, normalizedConfig.cameraId, normalizedConfig.shapes.length);
    const featureId = AI_SHAPE_FEATURE_ID[normalizedShape.kind];

    return normalizeAiConfig(normalizedConfig.cameraId, {
        ...normalizedConfig,
        features: {
            ...normalizedConfig.features,
            [featureId]: {
                ...normalizedConfig.features[featureId],
                enabled: true,
            },
        },
        shapes: [...normalizedConfig.shapes, normalizedShape],
        updatedAt: nowIso(),
    });
}

export function removeAiDetectionShape(config, shapeId) {
    const normalizedConfig = normalizeAiConfig(config.cameraId, config);

    return normalizeAiConfig(normalizedConfig.cameraId, {
        ...normalizedConfig,
        shapes: normalizedConfig.shapes.filter((shape) => shape.id !== shapeId),
        updatedAt: nowIso(),
    });
}

function getMinimumPointCount(kind) {
    return kind === "tripwire" ? 2 : 3;
}

export function removeAiDetectionShapePoint(config, shapeId, pointIndex) {
    const normalizedConfig = normalizeAiConfig(config.cameraId, config);
    const nextShapes = normalizedConfig.shapes.reduce((shapes, shape) => {
        if (shape.id !== shapeId) {
            shapes.push(shape);
            return shapes;
        }

        const nextPoints = shape.points.filter((_, index) => index !== pointIndex);

        if (nextPoints.length >= getMinimumPointCount(shape.kind)) {
            shapes.push({
                ...shape,
                points: nextPoints,
            });
        }

        return shapes;
    }, []);

    return normalizeAiConfig(normalizedConfig.cameraId, {
        ...normalizedConfig,
        shapes: nextShapes,
        updatedAt: nowIso(),
    });
}

export function moveAiDetectionShapePoint(config, shapeId, pointIndex, point) {
    const normalizedConfig = normalizeAiConfig(config.cameraId, config);

    return normalizeAiConfig(normalizedConfig.cameraId, {
        ...normalizedConfig,
        shapes: normalizedConfig.shapes.map((shape) => {
            if (shape.id !== shapeId) {
                return shape;
            }

            return {
                ...shape,
                points: shape.points.map((currentPoint, index) =>
                    index === pointIndex ? normalizeEditedPoint(point) : currentPoint,
                ),
            };
        }),
        updatedAt: nowIso(),
    });
}

export function insertAiDetectionShapePoint(config, shapeId, pointIndex, point) {
    const normalizedConfig = normalizeAiConfig(config.cameraId, config);

    return normalizeAiConfig(normalizedConfig.cameraId, {
        ...normalizedConfig,
        shapes: normalizedConfig.shapes.map((shape) => {
            if (shape.id !== shapeId || shape.kind === "tripwire") {
                return shape;
            }

            const insertAt = clampNumber(pointIndex + 1, 0, shape.points.length);
            const nextPoints = [...shape.points];
            nextPoints.splice(insertAt, 0, normalizeEditedPoint(point));

            return {
                ...shape,
                points: nextPoints,
            };
        }),
        updatedAt: nowIso(),
    });
}

function getBoundedDelta(points, delta) {
    if (points.length === 0) {
        return { x: 0, y: 0 };
    }

    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    return {
        x: clampNumber(delta?.x, -minX, 1 - maxX),
        y: clampNumber(delta?.y, -minY, 1 - maxY),
    };
}

export function moveAiDetectionShape(config, shapeId, delta) {
    const normalizedConfig = normalizeAiConfig(config.cameraId, config);

    return normalizeAiConfig(normalizedConfig.cameraId, {
        ...normalizedConfig,
        shapes: normalizedConfig.shapes.map((shape) => {
            if (shape.id !== shapeId) {
                return shape;
            }

            const boundedDelta = getBoundedDelta(shape.points, delta);

            return {
                ...shape,
                points: shape.points.map((point) => ({
                    x: roundPointValue(point.x + boundedDelta.x),
                    y: roundPointValue(point.y + boundedDelta.y),
                })),
            };
        }),
        updatedAt: nowIso(),
    });
}
