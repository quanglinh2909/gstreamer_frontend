import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("ai-config page delegates layout, dashboard, and hook", () => {
    const source = readFileSync("src/pages/ai-config.tsx", "utf8");

    assert.match(source, /@\/components\/ai-config\/ai-config-dashboard/);
    assert.match(source, /@\/hooks\/use-ai-config-manager/);
    assert.match(source, /<MainLayout>/);
});

test("left menu links to the AI config page", () => {
    const source = readFileSync("src/components/leftmenu/leftmenu.tsx", "utf8");

    assert.match(source, /AI Config/);
    assert.match(source, /href:\s*"\/ai-config"/);
});

test("ai config dashboard exposes drawing surface and confidence sliders", () => {
    const dashboardSource = readFileSync("src/components/ai-config/ai-config-dashboard.tsx", "utf8");
    const canvasSource = readFileSync("src/components/ai-config/ai-detection-canvas.tsx", "utf8");
    const featureRowSource = readFileSync("src/components/ai-config/ai-feature-row.tsx", "utf8");

    assert.match(dashboardSource, /AiDetectionCanvas/);
    assert.match(dashboardSource, /AiSettingsPanel/);
    assert.match(canvasSource, /<svg/);
    assert.match(canvasSource, /onPointerDown/);
    assert.match(featureRowSource, /type="range"/);
});

test("ai config dashboard renders feature tabs and active-only settings", () => {
    const dashboardSource = readFileSync("src/components/ai-config/ai-config-dashboard.tsx", "utf8");
    const settingsSource = readFileSync("src/components/ai-config/ai-settings-panel.tsx", "utf8");
    const constantsSource = readFileSync("src/components/ai-config/ai-config-constants.ts", "utf8");

    assert.match(dashboardSource, /aiFeatureItems\.map/);
    assert.match(dashboardSource, /activeFeatureId/);
    assert.match(settingsSource, /activeFeatureItem/);
    assert.match(settingsSource, /config\.features\[activeFeatureId\]/);
    assert.match(constantsSource, /verificationConfidence/);
    assert.match(constantsSource, /textRecognitionConfidence/);
});

test("ai detection canvas supports deleting points and dragging saved shapes", () => {
    const canvasSource = readFileSync("src/components/ai-config/ai-detection-canvas.tsx", "utf8");

    assert.match(canvasSource, /onContextMenu/);
    assert.match(canvasSource, /onDraftPointRemove/);
    assert.match(canvasSource, /onDraftPointMove/);
    assert.match(canvasSource, /onDraftPointInsert/);
    assert.match(canvasSource, /onShapePointRemove/);
    assert.match(canvasSource, /onShapePointMove/);
    assert.match(canvasSource, /onShapePointInsert/);
    assert.match(canvasSource, /onShapeMove/);
    assert.match(canvasSource, /onPointerMove/);
    assert.match(canvasSource, /handlePointDragStart/);
    assert.match(canvasSource, /handleEdgeInsertStart/);
    assert.match(canvasSource, /<polygon/);
});

test("ai detection canvas uses left drag for editing points and confirms right-click shape deletion", () => {
    const canvasSource = readFileSync("src/components/ai-config/ai-detection-canvas.tsx", "utf8");
    const dashboardSource = readFileSync("src/components/ai-config/ai-config-dashboard.tsx", "utf8");

    assert.match(canvasSource, /event\.button !== 0/);
    assert.match(canvasSource, /setDeleteConfirm/);
    assert.match(canvasSource, /onShapeDeleteRequest/);
    assert.match(canvasSource, /Xóa vùng/);
    assert.match(canvasSource, /handleShapeContextMenu/);
    assert.doesNotMatch(canvasSource, /event\.button !== 2/);
    assert.match(dashboardSource, /onShapeDeleteRequest={manager\.removeShape}/);
});

test("ai config loads camera snapshots/backend AI config and exposes one upsert action", () => {
    const hookSource = readFileSync("src/hooks/use-ai-config-manager.ts", "utf8");
    const canvasSource = readFileSync("src/components/ai-config/ai-detection-canvas.tsx", "utf8");
    const settingsSource = readFileSync("src/components/ai-config/ai-settings-panel.tsx", "utf8");
    const dashboardSource = readFileSync("src/components/ai-config/ai-config-dashboard.tsx", "utf8");

    assert.match(hookSource, /cameraApi\.snapshot/);
    assert.match(hookSource, /cameraApi\.getConfigAI/);
    assert.match(hookSource, /backendConfigsByCamera/);
    assert.match(hookSource, /setBackendConfigsByCamera/);
    assert.match(hookSource, /getAiConfigFromBackendConfigs\(\s*selectedCameraId,\s*backendConfigItems\s*\)/);
    assert.match(hookSource, /mergeAiConfigShapes/);
    assert.match(hookSource, /faceRecognitionApi\.faceRecognition/);
    assert.match(hookSource, /plateRecognitionApi\.plateRecognition/);
    assert.match(hookSource, /restrictedAreaApi\.restrictedArea/);
    assert.match(hookSource, /buildRecognitionPayload/);
    assert.match(canvasSource, /snapshotUrl/);
    assert.match(canvasSource, /next\/image/);
    assert.match(canvasSource, /<Image/);
    assert.match(settingsSource, /onSaveRecognition/);
    assert.doesNotMatch(settingsSource, /onCreateVehicleAi/);
    assert.doesNotMatch(settingsSource, /onUpdateVehicleAi/);
    assert.match(dashboardSource, /onSaveRecognition={manager\.saveActiveRecognitionConfig}/);
});

test("ai config does not persist draft config to localStorage", () => {
    const hookSource = readFileSync("src/hooks/use-ai-config-manager.ts", "utf8");
    const viewModelSource = readFileSync("src/lib/ai-config-view-model.js", "utf8");

    assert.doesNotMatch(hookSource, /localStorage/);
    assert.doesNotMatch(hookSource, /getAiConfigsFromStorage/);
    assert.doesNotMatch(hookSource, /saveAiConfigsToStorage/);
    assert.doesNotMatch(viewModelSource, /AI_CONFIG_STORAGE_KEY/);
    assert.doesNotMatch(viewModelSource, /getAiConfigsFromStorage/);
    assert.doesNotMatch(viewModelSource, /saveAiConfigsToStorage/);
});

test("ai detection canvas renders only the active feature polygons", () => {
    const canvasSource = readFileSync("src/components/ai-config/ai-detection-canvas.tsx", "utf8");

    assert.match(canvasSource, /activeShapes/);
    assert.match(canvasSource, /shape\.kind === activeFeatureItem\.shapeKind/);
    assert.match(canvasSource, /activeShapes\.map/);
    assert.doesNotMatch(canvasSource, /config\?\.shapes\.map/);
});

test("ai settings panel exposes max FPS from 1 to 25", () => {
    const featureRowSource = readFileSync("src/components/ai-config/ai-feature-row.tsx", "utf8");
    const settingsSource = readFileSync("src/components/ai-config/ai-settings-panel.tsx", "utf8");

    assert.match(featureRowSource, /maxFps/);
    assert.match(featureRowSource, /min=\{1\}/);
    assert.match(featureRowSource, /max=\{25\}/);
    assert.match(settingsSource, /onMaxFpsChange/);
});

test("face and plate settings expose overlap threshold and tracker selection", () => {
    const featureRowSource = readFileSync("src/components/ai-config/ai-feature-row.tsx", "utf8");
    const settingsSource = readFileSync("src/components/ai-config/ai-settings-panel.tsx", "utf8");
    const dashboardSource = readFileSync("src/components/ai-config/ai-config-dashboard.tsx", "utf8");
    const hookSource = readFileSync("src/hooks/use-ai-config-manager.ts", "utf8");

    assert.match(featureRowSource, /overlapThreshold/);
    assert.match(featureRowSource, /feature\.overlapThreshold \?\? 30/);
    assert.match(featureRowSource, /Ngưỡng chồng lấp/);
    assert.match(featureRowSource, /type="radio"/);
    assert.match(featureRowSource, /ByteTrack/);
    assert.match(featureRowSource, /BoT-SORT/);
    assert.match(featureRowSource, /OC-SORT/);
    assert.match(featureRowSource, /ocsort/);
    assert.match(featureRowSource, /id === "face" \|\| id === "licensePlate"/);
    assert.match(settingsSource, /onOverlapThresholdChange/);
    assert.match(settingsSource, /onTrackerChange/);
    assert.match(dashboardSource, /onOverlapThresholdChange={manager\.setFeatureOverlapThreshold}/);
    assert.match(dashboardSource, /onTrackerChange={manager\.setFeatureTracker}/);
    assert.match(hookSource, /setFeatureOverlapThreshold/);
    assert.match(hookSource, /overlapThreshold/);
    assert.match(hookSource, /setFeatureTracker/);
    assert.match(hookSource, /tracker/);
});

test("restricted area shares tracked controls, persistence and debug preview", () => {
    const featureRowSource = readFileSync("src/components/ai-config/ai-feature-row.tsx", "utf8");
    const settingsSource = readFileSync("src/components/ai-config/ai-settings-panel.tsx", "utf8");
    const hookSource = readFileSync("src/hooks/use-ai-config-manager.ts", "utf8");

    assert.match(featureRowSource, /restrictedZone/);
    assert.match(featureRowSource, /isTrackedFeature/);
    assert.match(settingsSource, /restrictedZone/);
    assert.match(settingsSource, /canSave/);
    assert.match(hookSource, /restrictedAreaApi/);
    assert.match(hookSource, /activeFeatureId === "restrictedZone"/);
    assert.match(hookSource, /Đã lưu cấu hình vùng cấm/);
});

test("ai settings panel manages zones with add-zone action and active list", () => {
    const settingsSource = readFileSync("src/components/ai-config/ai-settings-panel.tsx", "utf8");
    const dashboardSource = readFileSync("src/components/ai-config/ai-config-dashboard.tsx", "utf8");
    const hookSource = readFileSync("src/hooks/use-ai-config-manager.ts", "utf8");

    assert.match(settingsSource, /Thêm vùng/);
    assert.match(settingsSource, /shapes\.map/);
    assert.match(settingsSource, /onAddZone/);
    assert.match(settingsSource, /onRemoveShape/);
    assert.doesNotMatch(settingsSource, /Công cụ vẽ/);
    assert.doesNotMatch(settingsSource, /onCompleteZone/);
    assert.doesNotMatch(settingsSource, /completeLabel/);
    assert.doesNotMatch(dashboardSource, /<AiShapeList/);
    assert.match(dashboardSource, /shapes={activeShapes}/);
    assert.match(hookSource, /addActiveZone/);
    assert.match(hookSource, /getConfigWithDraftZone/);
});

test("ai recognition settings open a debug MJPEG modal for the loaded job", () => {
    const modalPath = "src/components/ai-config/ai-debug-modal.tsx";
    const hookSource = readFileSync("src/hooks/use-ai-config-manager.ts", "utf8");
    const settingsSource = readFileSync("src/components/ai-config/ai-settings-panel.tsx", "utf8");
    const dashboardSource = readFileSync("src/components/ai-config/ai-config-dashboard.tsx", "utf8");

    assert.equal(existsSync(modalPath), true);

    const modalSource = readFileSync(modalPath, "utf8");

    assert.match(hookSource, /getAiDebugJobId/);
    assert.match(hookSource, /getAiDebugStreamUrl/);
    assert.match(hookSource, /isDebugPreviewOpen/);
    assert.match(hookSource, /openDebugPreview/);
    assert.match(settingsSource, /Xem debug/);
    assert.match(settingsSource, /onViewDebug/);
    assert.match(settingsSource, /canViewDebug/);
    assert.match(dashboardSource, /AiDebugModal/);
    assert.match(modalSource, /streamUrl/);
    assert.match(modalSource, /<img/);
    assert.match(modalSource, /Escape/);
});

test("ai debug route streams MJPEG through a dedicated backend proxy", () => {
    const streamProxyPath = "src/pages/api/backend/ai-debug/cameras/[cameraId]/jobs/[jobId]/mjpeg.ts";

    assert.equal(existsSync(streamProxyPath), true);

    const streamProxySource = readFileSync(streamProxyPath, "utf8");

    assert.match(streamProxySource, /responseLimit:\s*false/);
    assert.match(streamProxySource, /ai-debug\/cameras/);
    assert.match(streamProxySource, /upstream\.body/);
    assert.match(streamProxySource, /getReader\(\)/);
    assert.match(streamProxySource, /res\.write/);
    assert.match(streamProxySource, /AbortController/);
});
