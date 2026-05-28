import assert from "node:assert/strict";
import test from "node:test";
import {
    addAiDetectionShape,
    buildRecognitionPayload,
    buildRestrictedAreaPayload,
    buildVehicleAiPayload,
    buildAiDetectionShape,
    getAiConfigFromBackendConfigs,
    getAiConfigDefaults,
    insertAiDetectionShapePoint,
    moveAiDetectionShape,
    moveAiDetectionShapePoint,
    normalizeAiConfig,
    removeAiDetectionShape,
    removeAiDetectionShapePoint,
    serializeAiPolygons,
} from "../src/lib/ai-config-view-model.js";

test("creates disabled AI defaults for a camera", () => {
    const config = getAiConfigDefaults("camera-1");

    assert.equal(config.cameraId, "camera-1");
    assert.equal(config.features.face.enabled, false);
    assert.equal(config.features.licensePlate.enabled, false);
    assert.equal(config.features.restrictedZone.enabled, false);
    assert.equal(config.features.tripwire.enabled, false);
    assert.equal(config.features.face.detectionConfidence, 70);
    assert.equal(config.features.face.verificationConfidence, 70);
    assert.equal(config.features.face.maxFps, 5);
    assert.equal(config.features.face.overlapThreshold, 30);
    assert.equal(config.features.face.tracker, "bytetrack");
    assert.equal(config.features.licensePlate.detectionConfidence, 70);
    assert.equal(config.features.licensePlate.textRecognitionConfidence, 70);
    assert.equal(config.features.licensePlate.maxFps, 5);
    assert.equal(config.features.licensePlate.overlapThreshold, 30);
    assert.equal(config.features.licensePlate.tracker, "bytetrack");
    assert.equal(config.features.restrictedZone.detectionConfidence, 70);
    assert.equal(config.features.restrictedZone.maxFps, 5);
    assert.equal(config.features.restrictedZone.overlapThreshold, 30);
    assert.equal(config.features.restrictedZone.tracker, "bytetrack");
    assert.equal(config.features.tripwire.detectionConfidence, 70);
    assert.equal(config.features.tripwire.maxFps, 10);
    assert.deepEqual(config.shapes, []);
});

test("normalizes configs and clamps frontend-only data per camera", () => {
    const config = {
        cameraId: "camera-1",
        features: {
            face: { enabled: true, confidence: 160, verificationConfidence: 82, overlapThreshold: -4, tracker: "botsort" },
            licensePlate: { enabled: true, detectionConfidence: 45, textRecognitionConfidence: 140, maxFps: 99, overlapThreshold: 130, tracker: "ocsort" },
            tripwire: { enabled: true, confidence: -10 },
        },
        shapes: [
            {
                id: "shape-1",
                kind: "faceZone",
                label: "Face zone 1",
                points: [{ x: 2, y: -1 }],
            },
        ],
    };

    const configs = { "camera-1": normalizeAiConfig("camera-1", config) };

    assert.equal(configs["camera-1"].features.face.enabled, true);
    assert.equal(configs["camera-1"].features.face.detectionConfidence, 100);
    assert.equal(configs["camera-1"].features.face.verificationConfidence, 82);
    assert.equal(configs["camera-1"].features.face.overlapThreshold, 0);
    assert.equal(configs["camera-1"].features.face.tracker, "botsort");
    assert.equal(configs["camera-1"].features.licensePlate.detectionConfidence, 45);
    assert.equal(configs["camera-1"].features.licensePlate.textRecognitionConfidence, 100);
    assert.equal(configs["camera-1"].features.licensePlate.maxFps, 25);
    assert.equal(configs["camera-1"].features.licensePlate.overlapThreshold, 100);
    assert.equal(configs["camera-1"].features.licensePlate.tracker, "ocsort");
    assert.equal(configs["camera-1"].features.tripwire.detectionConfidence, 0);
    assert.equal(configs["camera-1"].shapes[0].kind, "faceZone");
    assert.deepEqual(configs["camera-1"].shapes[0].points, [{ x: 1, y: 0 }]);
});

test("hydrates face and plate configs from backend config-ai response", () => {
    const config = getAiConfigFromBackendConfigs("camera-1", [
        {
            cameraId: "camera-1",
            enabled: true,
            primaryConf: 0.25,
            secondaryConf: 0.35,
            overlap_threshold: 0.4,
            tracker: "botsort",
            maxFps: 5,
            type: "face_recognition",
            polygons: "[[[0, 0], [959, 0], [959, 539]]]",
        },
        {
            cameraId: "camera-1",
            enabled: false,
            primaryConf: 0.7,
            secondaryConf: 0.8,
            overlap_threshold: 0.65,
            tracker: "ocsort",
            maxFps: 26,
            type: "plate_recognition",
            polygons: "[[[100, 100], [500, 100], [500, 299]]]",
        },
        {
            cameraId: "camera-1",
            enabled: true,
            primaryConf: 0.55,
            overlap_threshold: 0.3,
            tracker: "ocsort",
            maxFps: 5,
            type: "restricted_area",
            polygons: "[[[20, 20], [80, 20], [80, 80]]]",
        },
    ], { width: 960, height: 540 });

    assert.equal(config.features.face.enabled, true);
    assert.equal(config.features.face.detectionConfidence, 25);
    assert.equal(config.features.face.verificationConfidence, 35);
    assert.equal(config.features.face.overlapThreshold, 40);
    assert.equal(config.features.face.tracker, "botsort");
    assert.equal(config.features.face.maxFps, 5);
    assert.equal(config.features.licensePlate.enabled, false);
    assert.equal(config.features.licensePlate.detectionConfidence, 70);
    assert.equal(config.features.licensePlate.textRecognitionConfidence, 80);
    assert.equal(config.features.licensePlate.overlapThreshold, 65);
    assert.equal(config.features.licensePlate.tracker, "ocsort");
    assert.equal(config.features.licensePlate.maxFps, 25);
    assert.equal(config.features.restrictedZone.enabled, true);
    assert.equal(config.features.restrictedZone.detectionConfidence, 55);
    assert.equal(config.features.restrictedZone.overlapThreshold, 30);
    assert.equal(config.features.restrictedZone.tracker, "ocsort");
    assert.equal(config.features.restrictedZone.maxFps, 5);
    assert.equal(config.shapes.length, 3);
    assert.equal(config.shapes[0].kind, "faceZone");
    assert.equal(config.shapes[1].kind, "licensePlateZone");
    assert.equal(config.shapes[2].kind, "restrictedZone");
    assert.deepEqual(config.shapes[1].points, [
        { x: 0.104275, y: 0.185529 },
        { x: 0.521376, y: 0.185529 },
        { x: 0.521376, y: 0.554731 },
    ]);
});

test("merges delayed polygon hydration without replacing edited recognition settings", async () => {
    const viewModel = await import("../src/lib/ai-config-view-model.js");
    const backendConfigs = [
        {
            cameraId: "camera-1",
            enabled: true,
            primaryConf: 0.25,
            secondaryConf: 0.35,
            overlap_threshold: 0.4,
            tracker: "bytetrack",
            maxFps: 5,
            type: "face_recognition",
            polygons: "[[[0, 0], [959, 0], [959, 539]]]",
        },
    ];

    assert.equal(typeof viewModel.mergeAiConfigShapes, "function");

    const loadedBeforeSnapshot = viewModel.getAiConfigFromBackendConfigs("camera-1", backendConfigs);
    const editedBeforeSnapshot = viewModel.updateAiFeature(loadedBeforeSnapshot, "face", {
        overlapThreshold: 82,
        tracker: "botsort",
        maxFps: 8,
    });
    const hydratedAfterSnapshot = viewModel.getAiConfigFromBackendConfigs(
        "camera-1",
        backendConfigs,
        { width: 960, height: 540 },
    );
    const merged = viewModel.mergeAiConfigShapes(editedBeforeSnapshot, hydratedAfterSnapshot);

    assert.equal(merged.features.face.overlapThreshold, 82);
    assert.equal(merged.features.face.tracker, "botsort");
    assert.equal(merged.features.face.maxFps, 8);
    assert.equal(merged.shapes.length, 1);
    assert.equal(merged.shapes[0].kind, "faceZone");
});

test("resolves active recognition debug jobs and builds encoded MJPEG proxy URLs", async () => {
    const viewModel = await import("../src/lib/ai-config-view-model.js");
    const backendConfigs = [
        { type: "face_recognition", job_id: "face-job" },
        { type: "plate_recognition", job_id: 42 },
        { type: "restricted_area", job_id: "restricted-job" },
    ];

    assert.equal(typeof viewModel.getAiDebugJobId, "function");
    assert.equal(typeof viewModel.getAiDebugStreamUrl, "function");
    assert.equal(viewModel.getAiDebugJobId(backendConfigs, "face"), "face-job");
    assert.equal(viewModel.getAiDebugJobId(backendConfigs, "licensePlate"), "42");
    assert.equal(viewModel.getAiDebugJobId(backendConfigs, "restrictedZone"), "restricted-job");
    assert.equal(
        viewModel.getAiDebugStreamUrl("camera/one", "job 42"),
        "/api/backend/ai-debug/cameras/camera%2Fone/jobs/job%2042/mjpeg",
    );
    assert.equal(viewModel.getAiDebugStreamUrl("camera-1", ""), "");
});

test("builds, adds, and removes detection shapes", () => {
    const config = getAiConfigDefaults("camera-1");
    const shape = buildAiDetectionShape({
        cameraId: "camera-1",
        kind: "tripwire",
        label: "Door line",
        points: [
            { x: 0.2, y: 0.4 },
            { x: 0.8, y: 0.4 },
        ],
    });

    const withShape = addAiDetectionShape(config, shape);
    const withoutShape = removeAiDetectionShape(withShape, shape.id);

    assert.equal(withShape.shapes.length, 1);
    assert.equal(withShape.shapes[0].kind, "tripwire");
    assert.equal(withShape.features.tripwire.enabled, true);
    assert.equal(withoutShape.shapes.length, 0);
});

test("adds AI-specific detection zones and enables the owning feature", () => {
    const config = getAiConfigDefaults("camera-1");
    const shape = buildAiDetectionShape({
        cameraId: "camera-1",
        kind: "licensePlateZone",
        label: "Plate zone",
        points: [
            { x: 0.1, y: 0.2 },
            { x: 0.5, y: 0.2 },
            { x: 0.5, y: 0.6 },
        ],
    });

    const withShape = addAiDetectionShape(config, shape);

    assert.equal(withShape.features.licensePlate.enabled, true);
    assert.equal(withShape.shapes[0].kind, "licensePlateZone");
});

test("moves shapes without distorting points and removes invalid shapes after point deletion", () => {
    const config = getAiConfigDefaults("camera-1");
    const shape = buildAiDetectionShape({
        cameraId: "camera-1",
        kind: "restrictedZone",
        label: "Restricted zone",
        points: [
            { x: 0.1, y: 0.2 },
            { x: 0.5, y: 0.2 },
            { x: 0.5, y: 0.6 },
        ],
    });

    const withShape = addAiDetectionShape(config, shape);
    const moved = moveAiDetectionShape(withShape, shape.id, { x: 0.2, y: 0.1 });
    const withoutEnoughPoints = removeAiDetectionShapePoint(moved, shape.id, 1);

    assert.deepEqual(moved.shapes[0].points, [
        { x: 0.3, y: 0.3 },
        { x: 0.7, y: 0.3 },
        { x: 0.7, y: 0.7 },
    ]);
    assert.equal(withoutEnoughPoints.shapes.length, 0);
});

test("moves and inserts individual polygon points", () => {
    const config = getAiConfigDefaults("camera-1");
    const shape = buildAiDetectionShape({
        cameraId: "camera-1",
        kind: "faceZone",
        label: "Face zone",
        points: [
            { x: 0.1, y: 0.2 },
            { x: 0.5, y: 0.2 },
            { x: 0.5, y: 0.6 },
        ],
    });

    const withShape = addAiDetectionShape(config, shape);
    const movedPoint = moveAiDetectionShapePoint(withShape, shape.id, 1, { x: 1.2, y: -0.2 });
    const insertedPoint = insertAiDetectionShapePoint(movedPoint, shape.id, 1, { x: 0.3, y: 0.4 });

    assert.deepEqual(movedPoint.shapes[0].points, [
        { x: 0.1, y: 0.2 },
        { x: 1, y: 0 },
        { x: 0.5, y: 0.6 },
    ]);
    assert.deepEqual(insertedPoint.shapes[0].points, [
        { x: 0.1, y: 0.2 },
        { x: 1, y: 0 },
        { x: 0.3, y: 0.4 },
        { x: 0.5, y: 0.6 },
    ]);
});

test("serializes polygon zones to real snapshot coordinates", () => {
    const shapes = [
        {
            kind: "licensePlateZone",
            points: [
                { x: 614 / 1919, y: 197 / 1079 },
                { x: 1473 / 1919, y: 201 / 1079 },
                { x: 1909 / 1919, y: 539 / 1079 },
            ],
        },
        {
            kind: "restrictedZone",
            points: [
                { x: 1, y: 1 },
                { x: 0, y: 1 },
                { x: 0, y: 0 },
            ],
        },
        {
            kind: "tripwire",
            points: [
                { x: 0.2, y: 0.3 },
                { x: 0.8, y: 0.3 },
            ],
        },
    ];

    assert.equal(
        serializeAiPolygons(shapes, { width: 1920, height: 1080 }),
        "[[[614, 197], [1473, 201], [1909, 539]],[[1919, 1079], [0, 1079], [0, 0]]]",
    );
});

test("serializes empty or incomplete polygon zones as an empty array string", () => {
    assert.equal(serializeAiPolygons([], { width: 1920, height: 1080 }), "[]");
    assert.equal(
        serializeAiPolygons([{ kind: "licensePlateZone", points: [{ x: 0.5, y: 0.5 }] }], {
            width: 1920,
            height: 1080,
        }),
        "[]",
    );
    assert.equal(
        serializeAiPolygons([{ kind: "licensePlateZone", points: [{ x: 0.5, y: 0.5 }] }], {
            width: 0,
            height: 1080,
        }),
        "[]",
    );
});

test("builds face and plate recognition payloads with active API polygons", () => {
    const config = getAiConfigDefaults("camera-1");
    const licensePlateShape = buildAiDetectionShape({
        cameraId: "camera-1",
        kind: "licensePlateZone",
        label: "Vehicle zone",
        points: [
            { x: 0.1, y: 0.2 },
            { x: 0.5, y: 0.2 },
            { x: 0.5, y: 0.6 },
        ],
    });
    const faceShape = buildAiDetectionShape({
        cameraId: "camera-1",
        kind: "faceZone",
        label: "Face zone",
        points: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
        ],
    });
    const restrictedShape = buildAiDetectionShape({
        cameraId: "camera-1",
        kind: "restrictedZone",
        label: "Restricted zone",
        points: [
            { x: 0.2, y: 0.3 },
            { x: 0.6, y: 0.3 },
            { x: 0.6, y: 0.7 },
        ],
    });
    const withShape = addAiDetectionShape(
        addAiDetectionShape(addAiDetectionShape(config, licensePlateShape), faceShape),
        restrictedShape,
    );
    const tuned = normalizeAiConfig("camera-1", {
        ...withShape,
        features: {
            ...withShape.features,
            face: {
                ...withShape.features.face,
                enabled: true,
                detectionConfidence: 25,
                verificationConfidence: 35,
                overlapThreshold: 45,
                tracker: "botsort",
                maxFps: 5,
            },
            licensePlate: {
                ...withShape.features.licensePlate,
                detectionConfidence: 70,
                textRecognitionConfidence: 80,
                overlapThreshold: 60,
                tracker: "ocsort",
                maxFps: 12,
            },
            restrictedZone: {
                ...withShape.features.restrictedZone,
                enabled: true,
                detectionConfidence: 42,
                overlapThreshold: 30,
                tracker: "ocsort",
                maxFps: 5,
            },
        },
    });

    const facePayload = buildRecognitionPayload(tuned, "face", { width: 1000, height: 500 });
    const platePayload = buildRecognitionPayload(tuned, "licensePlate", { width: 1000, height: 500 });
    const restrictedPayload = buildRestrictedAreaPayload(tuned, { width: 1000, height: 500 });
    const legacyPlatePayload = buildVehicleAiPayload(tuned, { width: 1000, height: 500 });

    assert.deepEqual(facePayload, {
        cameraId: "camera-1",
        primaryConf: 0.25,
        secondaryConf: 0.35,
        overlap_threshold: 0.45,
        tracker: "botsort",
        maxFps: 5,
        enabled: true,
        polygons: "[[[0, 0], [999, 0], [999, 499]]]",
    });
    assert.deepEqual(platePayload, {
        cameraId: "camera-1",
        primaryConf: 0.7,
        secondaryConf: 0.8,
        overlap_threshold: 0.6,
        tracker: "ocsort",
        maxFps: 12,
        enabled: true,
        polygons: "[[[100, 100], [500, 100], [500, 299]]]",
    });
    assert.deepEqual(restrictedPayload, {
        cameraId: "camera-1",
        primaryConf: 0.42,
        overlap_threshold: 0.3,
        tracker: "ocsort",
        maxFps: 5,
        enabled: true,
        polygons: "[[[200, 150], [599, 150], [599, 349]]]",
    });
    assert.deepEqual(legacyPlatePayload, platePayload);
});
