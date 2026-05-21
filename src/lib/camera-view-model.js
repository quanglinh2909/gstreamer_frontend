function asText(value) {
  return String(value ?? "").trim();
}

function lower(value) {
  return asText(value).toLowerCase();
}

function includesAny(value, keywords) {
  return keywords.some((keyword) => value.includes(keyword));
}

function getCameraHealth(camera) {
  const statusText = `${lower(camera.status)} ${lower(camera.state)}`;

  if (asText(camera.lastError)) {
    return "error";
  }

  if (includesAny(statusText, ["error", "failed", "failure", "down"])) {
    return "error";
  }

  if (includesAny(statusText, ["offline", "stopped", "inactive", "disabled"])) {
    return "offline";
  }

  if (includesAny(statusText, ["online", "running", "active", "healthy", "streaming"])) {
    return "online";
  }

  return "unknown";
}

function getCameraAvailability(camera) {
  const statusText = `${lower(camera.status)} ${lower(camera.state)}`;

  if (includesAny(statusText, ["offline", "stopped", "inactive", "disabled"])) {
    return "offline";
  }

  if (includesAny(statusText, ["online", "running", "active", "healthy", "streaming"])) {
    return "online";
  }

  return "unknown";
}

function getCameraStats(cameras = []) {
  return cameras.reduce(
    (stats, camera) => {
      const health = getCameraHealth(camera);
      const availability = getCameraAvailability(camera);

      stats.total += 1;
      if (availability === "online") stats.online += 1;
      if (availability === "offline") stats.offline += 1;
      if (health === "error") stats.error += 1;
      if (camera.recordingEnabled) stats.recording += 1;
      if (camera.motionEnabled) stats.motion += 1;

      return stats;
    },
    {
      total: 0,
      online: 0,
      offline: 0,
      error: 0,
      recording: 0,
      motion: 0,
    },
  );
}

function filterCameras(cameras = [], filters = {}) {
  const search = lower(filters.search);
  const status = filters.status || "all";
  const feature = filters.feature || "all";

  return cameras.filter((camera) => {
    const haystack = [
      camera.id,
      camera.name,
      camera.status,
      camera.state,
      camera.rtsp,
      camera.inputRtsp,
      camera.outputRtsp,
      camera.codec,
      camera.hardware,
      camera.lastError,
    ]
      .map(lower)
      .join(" ");

    const matchesSearch = !search || haystack.includes(search);
    const matchesStatus = status === "all" || getCameraHealth(camera) === status;
    const matchesFeature =
      feature === "all" ||
      (feature === "recording" && camera.recordingEnabled) ||
      (feature === "motion" && camera.motionEnabled);

    return matchesSearch && matchesStatus && matchesFeature;
  });
}

function formatCameraDate(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function numberToField(value, fallback = 0) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return String(fallback);
  }

  return String(numeric);
}

function fieldToNumber(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return numeric;
}

function getCameraFormDefaults(camera = {}) {
  return {
    name: asText(camera.name),
    rtsp: asText(camera.rtsp),
    hardware: asText(camera.hardware),
    recordingEnabled: Boolean(camera.recordingEnabled),
    recordingMode: asText(camera.recordingMode) || "off",
    motionEnabled: Boolean(camera.motionEnabled),
    motionSensitivity: numberToField(camera.motionSensitivity),
    motionThreshold: numberToField(camera.motionThreshold),
    preMotionSeconds: numberToField(camera.preMotionSeconds),
    postMotionSeconds: numberToField(camera.postMotionSeconds),
    segmentSeconds: numberToField(camera.segmentSeconds, 60),
    motionKeyframeOnly: Boolean(camera.motionKeyframeOnly),
  };
}

function buildCameraPayload(form) {
  return {
    name: asText(form.name),
    rtsp: asText(form.rtsp),
    hardware: asText(form.hardware),
    recordingEnabled: Boolean(form.recordingEnabled),
    recordingMode: asText(form.recordingMode),
    motionEnabled: Boolean(form.motionEnabled),
    motionSensitivity: fieldToNumber(form.motionSensitivity),
    motionThreshold: fieldToNumber(form.motionThreshold),
    preMotionSeconds: fieldToNumber(form.preMotionSeconds),
    postMotionSeconds: fieldToNumber(form.postMotionSeconds),
    segmentSeconds: fieldToNumber(form.segmentSeconds),
    motionKeyframeOnly: Boolean(form.motionKeyframeOnly),
  };
}

exports.buildCameraPayload = buildCameraPayload;
exports.filterCameras = filterCameras;
exports.formatCameraDate = formatCameraDate;
exports.getCameraFormDefaults = getCameraFormDefaults;
exports.getCameraHealth = getCameraHealth;
exports.getCameraStats = getCameraStats;
