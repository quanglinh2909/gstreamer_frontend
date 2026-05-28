import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCameraPayload,
  filterCameras,
  getCameraFormDefaults,
  getCameraStats,
} from "../src/lib/camera-view-model.js";

const cameras = [
  {
    id: "1",
    name: "Front Gate",
    status: "online",
    state: "running",
    recordingEnabled: true,
    motionEnabled: true,
    lastError: "",
  },
  {
    id: "2",
    name: "Warehouse",
    status: "offline",
    state: "stopped",
    recordingEnabled: false,
    motionEnabled: false,
    lastError: "",
  },
  {
    id: "3",
    name: "Lobby",
    status: "online",
    state: "running",
    recordingEnabled: true,
    motionEnabled: false,
    lastError: "connection timeout",
  },
];

test("getCameraStats counts status and enabled features", () => {
  assert.deepEqual(getCameraStats(cameras), {
    total: 3,
    online: 2,
    offline: 1,
    error: 1,
    recording: 2,
    motion: 1,
  });
});

test("filterCameras filters by text and status", () => {
  assert.deepEqual(
    filterCameras(cameras, { search: "ware", status: "offline" }).map(
      (camera) => camera.id,
    ),
    ["2"],
  );

  assert.deepEqual(
    filterCameras(cameras, { search: "front", status: "all" }).map(
      (camera) => camera.id,
    ),
    ["1"],
  );
});

test("filterCameras filters by enabled camera features", () => {
  assert.deepEqual(
    filterCameras(cameras, { feature: "recording" }).map((camera) => camera.id),
    ["1", "3"],
  );

  assert.deepEqual(
    filterCameras(cameras, { feature: "motion" }).map((camera) => camera.id),
    ["1"],
  );
});

test("getCameraFormDefaults maps a camera into editable form values", () => {
  assert.deepEqual(
    getCameraFormDefaults({
      name: "Front Gate",
      rtsp: "rtsp://camera/front",
      hardware: "nvidia",
      recordingEnabled: true,
      recordingMode: "always",
      motionEnabled: true,
      motionSensitivity: 74,
      motionThreshold: 21,
      preMotionSeconds: 4,
      postMotionSeconds: 9,
      segmentSeconds: 60,
      motionKeyframeOnly: true,
    }),
    {
      name: "Front Gate",
      rtsp: "rtsp://camera/front",
      hardware: "nvidia",
      recordingEnabled: true,
      recordingMode: "always",
      motionEnabled: true,
      motionSensitivity: "74",
      motionThreshold: "21",
      preMotionSeconds: "4",
      postMotionSeconds: "9",
      segmentSeconds: "60",
      motionKeyframeOnly: true,
    },
  );
});

test("buildCameraPayload trims text and converts number fields", () => {
  assert.deepEqual(
    buildCameraPayload({
      name: "  Lobby  ",
      rtsp: "  rtsp://camera/lobby  ",
      hardware: "  vaapi  ",
      recordingEnabled: true,
      recordingMode: "  motion  ",
      motionEnabled: false,
      motionSensitivity: "65",
      motionThreshold: "",
      preMotionSeconds: "3",
      postMotionSeconds: "bad",
      segmentSeconds: "120",
      motionKeyframeOnly: false,
    }),
    {
      name: "Lobby",
      rtsp: "rtsp://camera/lobby",
      hardware: "vaapi",
      recordingEnabled: true,
      recordingMode: "motion",
      motionEnabled: false,
      motionSensitivity: 65,
      motionThreshold: 0,
      preMotionSeconds: 3,
      postMotionSeconds: 0,
      segmentSeconds: 120,
      motionKeyframeOnly: false,
    },
  );
});

test("getCameraFormDefaults defaults recordingMode to off when missing or blank", () => {
  assert.equal(getCameraFormDefaults().recordingMode, "off");
  assert.equal(getCameraFormDefaults({ recordingMode: "" }).recordingMode, "off");
  assert.equal(getCameraFormDefaults({ recordingMode: "   " }).recordingMode, "off");
  assert.equal(getCameraFormDefaults({ recordingMode: "continuous" }).recordingMode, "off");
  assert.equal(
    getCameraFormDefaults({ recordingMode: "motion" }).recordingMode,
    "motion",
  );
});

test("getCameraFormDefaults defaults hardware to auto when missing or blank", () => {
  assert.equal(getCameraFormDefaults().hardware, "auto");
  assert.equal(getCameraFormDefaults({ hardware: "" }).hardware, "auto");
  assert.equal(getCameraFormDefaults({ hardware: "   " }).hardware, "auto");
  assert.equal(getCameraFormDefaults({ hardware: "nvidia" }).hardware, "nvidia");
});
