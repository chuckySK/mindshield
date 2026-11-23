import {
  FaceLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import {
  DOMAIN_META,
  NODES,
  buildContextualQuestion,
  buildDeepSynthesis,
  getTotalNodeCount,
  rankDomains,
  resolveNextNodeId
} from "./dialogue-engine.js?v=2.5";

const TRACKED_SHAPES = [
  { key: "browDownLeft", label: "Zvraštenie obočia (L)" },
  { key: "browDownRight", label: "Zvraštenie obočia (P)" },
  { key: "mouthPressLeft", label: "Zovretie pier (L)" },
  { key: "mouthPressRight", label: "Zovretie pier (P)" },
  { key: "noseSneerLeft", label: "Odpor / nos (L)" },
  { key: "mouthSmileLeft", label: "Úsmev (L)" },
  { key: "mouthSmileRight", label: "Úsmev (P)" },
  { key: "jawOpen", label: "Napätie čeľuste" }
];

// DOM elements
const appLayout = document.getElementById("appLayout");
const videoWrapper = document.getElementById("videoWrapper");
const video = document.getElementById("webcam");
const gimbalCanvas = document.getElementById("gimbalCanvas");
const gCtx = gimbalCanvas.getContext("2d");

const statusPill = document.getElementById("statusPill");
const framingPill = document.getElementById("framingPill");
const hudQuickStats = document.getElementById("hudQuickStats");
const debugLog = document.getElementById("debugLog");
const blendshapeBars = document.getElementById("blendshapeBars");

const btnStartCam = document.getElementById("btnStartCam");
const btnToggleCam = document.getElementById("btnToggleCam");
const btnAutoTrack = document.getElementById("btnAutoTrack");
const btnCalibrate = document.getElementById("btnCalibrate");
const btnSkipCam = document.getElementById("btnSkipCam");
const btnStartTest = document.getElementById("btnStartTest");
const btnRecalibrate = document.getElementById("btnRecalibrate");
const btnBackIntro = document.getElementById("btnBackIntro");
const btnNextQuestion = document.getElementById("btnNextQuestion");

const hwZoomBar = document.getElementById("hwZoomBar");
const hwZoomRange = document.getElementById("hwZoomRange");
const hwZoomVal = document.getElementById("hwZoomVal");
const telemetryDetails = document.getElementById("telemetryDetails");

const mFps = document.getElementById("mFps");
const mLight = document.getElementById("mLight");
const mBaseline = document.getElementById("mBaseline");
const mZscore = document.getElementById("mZscore");
const mBpm = document.getElementById("mBpm");

const calGuardBanner = document.getElementById("calGuardBanner");
const readyModeLabel = document.getElementById("readyModeLabel");
const readyCalLabel = document.getElementById("readyCalLabel");
const readyFramingLabel = document.getElementById("readyFramingLabel");

const qContextBridge = document.getElementById("qContextBridge");
const oracleWhisper = document.getElementById("oracleWhisper");
const oracleWhisperText = document.getElementById("oracleWhisperText");
const interludeStep = document.getElementById("interludeStep");
const interludeText = document.getElementById("interludeText");

// Runtime camera & MediaPipe state
let faceLandmarker = null;
let stream = null;
let facingMode = "user";
let running = false;
let autoTrackEnabled = true;
let rafId = null;
let lastVideoTime = -1;
let lastDetectTimestampMs = 0;
let frameCount = 0;
let lastFpsStamp = performance.now();
let lastFramePerf = performance.now();
let currentFps = 0;
let currentLightLabel = "--";

// Virtual Gimbal (Digital PTZ Auto-Framing) smoothed state
const gimbalState = {
  initialized: false,
  cx: 0.5,
  cy: 0.5,
  faceH: 0.45,
  faceW: 0.35
};

// Framing & Motion artifact detector state
let prevFaceCenter = null;
let motionCooldownUntil = 0;
let currentFraming = {
  status: "missing",
  shortText: "Mimo obrazu",
  hint: "Tvár nie je v obraze",
  arrowHint: "",
  motionArtifact: false,
  box: null
};

// Calibration state
let calibrating = false;
let calAccumulatedMs = 0;
const CAL_DURATION_MS = 10000;
const calSamples = {};
let baselineStats = null;

// Experimental forehead rPPG & Luma buffer
const rppgCanvas = document.createElement("canvas");
const rppgCtx = rppgCanvas.getContext("2d", { willReadFrequently: true });
let rppgBuffer = [];
const RPPG_WINDOW_MS = 12000;

// Session & Stage state
let activeStageId = "stageIntro";
let selectedTier = "tier1_web_mediapipe";
let maxSteps = 8;
let whisperMode = "hidden"; // "hidden" | "interlude" | "inline"
let pendingNextNodeId = null;
let pendingOracleReaction = null;

let currentStep = 0;
let currentNodeId = "n01_entry";
let qDisplayedAtMs = 0;
let qTimerInterval = null;
let visitedIds = new Set();
let domainScores = createEmptyDomainScores();
let auditTrail = [];
let sessionData = createEmptySession(maxSteps);
let qTrackStats = createEmptyQuestionTrackStats();

function createEmptyQuestionTrackStats() {
  return {
    totalFrames: 0,
    validFrames: 0,
    outOfFrameMs: 0,
    motionArtifactFrames: 0,
    suppressedSpikes: 0,
    cleanSpikes: 0
  };
}

function createEmptyDomainScores() {
  return {
    relationships: 0,
    career_finance: 0,
    health_stress: 0,
    skeptic_control: 0
  };
}

function createEmptySession(depth = maxSteps) {
  return {
    session_id: `mirror_${Date.now()}`,
    created_at_ms: Date.now(),
    tier: selectedTier,
    camera_facing: facingMode,
    baseline_calibrated: false,
    questions: [],
    microexpression_spikes: [],
    rppg_estimates: [],
    meta: {
      engine_version: "2.5.0",
      total_graph_nodes: getTotalNodeCount(),
      selected_depth: depth,
      whisper_mode: whisperMode,
      auto_framing_enabled: autoTrackEnabled,
      question_quality: {}
    }
  };
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function log(msg) {
  const ts = new Date().toISOString().split("T")[1].slice(0, 8);
  debugLog.textContent = `[${ts}] ${msg}\n` + debugLog.textContent.slice(0, 2600);
}

function syncCanvasResolution() {
  const rect = gimbalCanvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const targetW = Math.max(240, Math.round(rect.width * dpr));
  const targetH = Math.max(160, Math.round(rect.height * dpr));
  if (gimbalCanvas.width !== targetW || gimbalCanvas.height !== targetH) {
    gimbalCanvas.width = targetW;
    gimbalCanvas.height = targetH;
  }
}

function showStage(id) {
  activeStageId = id;
  document.querySelectorAll(".stage").forEach((el) => el.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  if (window.innerWidth <= 960) {
    if (
      id === "stageQuestion" ||
      id === "stageInterlude" ||
      id === "stageReady" ||
      id === "stageCalibration"
    ) {
      telemetryDetails.open = false;
    } else if (id === "stageIntro") {
      telemetryDetails.open = true;
    }
  }
  appLayout.classList.toggle("cam-off", !running);
  syncCanvasResolution();
}

function getSelectedDepth() {
  const checked = document.querySelector('input[name="sessionDepth"]:checked');
  return checked ? Number(checked.value) : 8;
}

function getSelectedWhisperMode() {
  const checked = document.querySelector('input[name="whisperMode"]:checked');
  return checked ? checked.value : "hidden";
}

function initBars() {
  blendshapeBars.innerHTML = "";
  for (const s of TRACKED_SHAPES) {
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span>${s.label}</span>
      <div class="bar-track"><div id="bar_${s.key}" class="bar-fill"></div></div>
      <span id="val_${s.key}" class="mono">0.00</span>
    `;
    blendshapeBars.appendChild(row);
  }
}

async function initMediaPipe() {
  if (faceLandmarker) return;
  log("Načítavam MediaPipe FaceLandmarker WASM...");
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );
  const modelUrl =
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

  for (const delegate of ["GPU", "CPU"]) {
    try {
      faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: modelUrl, delegate },
        outputFaceBlendshapes: true,
        runningMode: "VIDEO",
        numFaces: 1
      });
      log(`MediaPipe FaceLandmarker pripravený (${delegate} delegate).`);
      return;
    } catch (err) {
      log(`WARN: MediaPipe ${delegate} zlyhal (${err.message}).`);
      faceLandmarker = null;
    }
  }
  throw new Error("Nepodarilo sa inicializovať MediaPipe ani na GPU, ani na CPU.");
}

function setupHardwareZoomIfSupported(videoTrack) {
  try {
    const caps = typeof videoTrack.getCapabilities === "function" ? videoTrack.getCapabilities() : null;
    if (caps && caps.zoom && typeof caps.zoom.min === "number" && typeof caps.zoom.max === "number") {
      hwZoomRange.min = String(caps.zoom.min);
      hwZoomRange.max = String(Math.min(caps.zoom.max, 4));
      hwZoomRange.step = String(caps.zoom.step || 0.1);
      hwZoomRange.value = String(caps.zoom.min);
      hwZoomVal.textContent = `${Number(caps.zoom.min).toFixed(1)}x`;
      hwZoomBar.classList.remove("hidden");
      log(`Hardvérový zoom dostupný (${caps.zoom.min}x – ${caps.zoom.max}x).`);
    } else {
      hwZoomBar.classList.add("hidden");
    }
  } catch (_) {
    hwZoomBar.classList.add("hidden");
  }
}

async function startCamera() {
  try {
    stopCamera();
    statusPill.textContent = "Inicializujem...";
    statusPill.className = "pill warn";

    await initMediaPipe();

    const isFront = facingMode === "user";
    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: isFront ? 640 : 1280 },
        height: { ideal: isFront ? 480 : 720 },
        frameRate: { ideal: 60, min: 24 }
      }
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    await video.play();

    const track = stream.getVideoTracks()[0];
    setupHardwareZoomIfSupported(track);

    lastVideoTime = -1;
    lastDetectTimestampMs = 0;
    rppgBuffer = [];
    prevFaceCenter = null;
    gimbalState.initialized = false;

    const trackSettings = track.getSettings();
    log(
      `Kamera aktívna (${isFront ? "Predná zrkadlená" : "Zadná"}): ${trackSettings.width}x${trackSettings.height} @ ${Math.round(trackSettings.frameRate || 30)} fps`
    );

    rppgCanvas.width = 16;
    rppgCanvas.height = 16;

    running = true;
    appLayout.classList.remove("cam-off");
    statusPill.textContent = isFront ? "Predná (Zrkadlo)" : "Zadná kamera";
    statusPill.className = "pill online";
    btnToggleCam.disabled = false;
    btnCalibrate.disabled = false;
    btnStartCam.textContent = "Vypnúť kameru";

    syncCanvasResolution();
    refreshReadyChecklist();
    processLoop();
  } catch (err) {
    log(`CHYBA kamery/MediaPipe: ${err.message}`);
    statusPill.textContent = "Chyba kamery";
    statusPill.className = "pill offline";
  }
}

function stopCamera() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  video.srcObject = null;
  lastVideoTime = -1;
  rppgBuffer = [];
  prevFaceCenter = null;
  gimbalState.initialized = false;
  gCtx.clearRect(0, 0, gimbalCanvas.width, gimbalCanvas.height);

  appLayout.classList.add("cam-off");
  hwZoomBar.classList.add("hidden");
  videoWrapper.classList.remove("state-ok", "state-warn", "state-danger");
  statusPill.textContent = "Kamera vypnutá";
  statusPill.className = "pill offline";
  framingPill.textContent = "Tvár: --";
  framingPill.className = "pill pill-right offline";
  hudQuickStats.textContent = "0 FPS • Svetlo: --";
  mLight.textContent = "--";
  mLight.className = "";
  btnStartCam.textContent = "Spustiť kameru";
  refreshReadyChecklist();
}

function evaluateFaceFraming(landmarks, nowPerf) {
  if (!landmarks || landmarks.length === 0) {
    prevFaceCenter = null;
    return {
      status: "danger",
      shortText: "Mimo obrazu",
      hint: "Tvár nie je v zábere — namier kameru na tvár",
      arrowHint: "Hľadám tvár v zábere...",
      motionArtifact: true,
      box: null
    };
  }

  let minX = 1;
  let maxX = 0;
  let minY = 1;
  let maxY = 0;
  for (let i = 0; i < landmarks.length; i += 3) {
    const p = landmarks[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const w = maxX - minX;
  const h = maxY - minY;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  if (!gimbalState.initialized) {
    gimbalState.cx = cx;
    gimbalState.cy = cy;
    gimbalState.faceH = h;
    gimbalState.faceW = w;
    gimbalState.initialized = true;
  } else {
    const dist = Math.hypot(cx - gimbalState.cx, cy - gimbalState.cy);
    const alpha = dist > 0.08 ? 0.28 : 0.14;
    gimbalState.cx += (cx - gimbalState.cx) * alpha;
    gimbalState.cy += (cy - gimbalState.cy) * alpha;
    gimbalState.faceH += (h - gimbalState.faceH) * 0.15;
    gimbalState.faceW += (w - gimbalState.faceW) * 0.15;
  }

  let rapidMove = false;
  if (prevFaceCenter) {
    const dtSec = Math.max(0.016, (nowPerf - prevFaceCenter.t) / 1000);
    const dist = Math.hypot(cx - prevFaceCenter.x, cy - prevFaceCenter.y);
    const scaleDelta = Math.abs(h - prevFaceCenter.h) / dtSec;
    const speed = dist / dtSec;
    if (speed > 0.38 || scaleDelta > 0.48) {
      motionCooldownUntil = nowPerf + 420;
      rapidMove = true;
    }
  }
  prevFaceCenter = { x: cx, y: cy, h, t: nowPerf };
  const motionArtifact = rapidMove || nowPerf < motionCooldownUntil;

  const isFront = facingMode === "user";
  const edgeMargin = autoTrackEnabled ? 0.025 : 0.04;
  if (minX < edgeMargin || maxX > 1 - edgeMargin || minY < edgeMargin || maxY > 1 - edgeMargin) {
    let arrow = "Vycentruj tvár";
    if (minY < edgeMargin) arrow = "↓ Posuň hlavu nižšie";
    else if (maxY > 1 - edgeMargin) arrow = "↑ Posuň hlavu vyššie";
    else if (minX < edgeMargin) arrow = isFront ? "← Posuň sa doľava" : "→ Posuň kameru vľavo";
    else if (maxX > 1 - edgeMargin) arrow = isFront ? "→ Posuň sa doprava" : "← Posuň kameru vpravo";

    return {
      status: "danger",
      shortText: "Okraj záberu",
      hint: `Tvár je na okraji objektívu (${arrow})`,
      arrowHint: arrow,
      motionArtifact: true,
      box: { minX, maxX, minY, maxY, cx, cy, w, h }
    };
  }

  if (h < 0.17) {
    return {
      status: "warn",
      shortText: "Príliš ďaleko",
      hint: "Príď o kúsok bližšie ku kamere",
      arrowHint: "Príď bližšie",
      motionArtifact,
      box: { minX, maxX, minY, maxY, cx, cy, w, h }
    };
  }

  if (motionArtifact) {
    return {
      status: "warn",
      shortText: "Pohyb",
      hint: "Stabilizujem obraz po pohybe...",
      arrowHint: "Stabilizujem...",
      motionArtifact: true,
      box: { minX, maxX, minY, maxY, cx, cy, w, h }
    };
  }

  return {
    status: "ok",
    shortText: autoTrackEnabled ? "Auto-cieľ OK" : "Tvár OK",
    hint: autoTrackEnabled ? "Auto-zameranie uzamknuté na tvári" : "Celá tvár v obraze",
    arrowHint: "",
    motionArtifact: false,
    box: { minX, maxX, minY, maxY, cx, cy, w, h }
  };
}

function renderVirtualGimbalFrame(landmarks, framing) {
  syncCanvasResolution();
  const cw = gimbalCanvas.width;
  const ch = gimbalCanvas.height;
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  const isFront = facingMode === "user";

  gCtx.clearRect(0, 0, cw, ch);

  const targetAspect = cw / ch;
  const srcAspect = vw / vh;

  let sx = 0;
  let sy = 0;
  let sw = vw;
  let sh = vh;

  if (autoTrackEnabled && gimbalState.initialized && landmarks) {
    let normCropH = Math.min(1.0, Math.max(0.34, gimbalState.faceH / 0.56));
    let normCropW = normCropH * (targetAspect / srcAspect);

    if (normCropW > 1.0) {
      normCropW = 1.0;
      normCropH = Math.min(1.0, normCropW * (srcAspect / targetAspect));
    }

    let normLeft = gimbalState.cx - normCropW / 2;
    let normTop = gimbalState.cy - 0.02 - normCropH / 2;

    normLeft = Math.max(0, Math.min(1 - normCropW, normLeft));
    normTop = Math.max(0, Math.min(1 - normCropH, normTop));

    sx = normLeft * vw;
    sy = normTop * vh;
    sw = normCropW * vw;
    sh = normCropH * vh;
  } else {
    if (srcAspect > targetAspect) {
      sw = vh * targetAspect;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetAspect;
      sy = (vh - sh) / 2;
    }
  }

  gCtx.save();
  if (isFront) {
    gCtx.translate(cw, 0);
    gCtx.scale(-1, 1);
  }
  gCtx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
  gCtx.restore();

  const mapPoint = (nx, ny) => {
    const rawX = ((nx * vw - sx) / sw) * cw;
    const rawY = ((ny * vh - sy) / sh) * ch;
    return {
      x: isFront ? cw - rawX : rawX,
      y: rawY
    };
  };

  const color =
    framing.status === "ok" ? "#22c55e" : framing.status === "warn" ? "#f59e0b" : "#f43f5e";

  if (landmarks && framing.box) {
    const p1 = mapPoint(framing.box.minX, framing.box.minY);
    const p2 = mapPoint(framing.box.maxX, framing.box.maxY);
    const left = Math.min(p1.x, p2.x) - 10;
    const right = Math.max(p1.x, p2.x) + 10;
    const top = Math.min(p1.y, p2.y) - 14;
    const bottom = Math.max(p1.y, p2.y) + 10;
    const bracketLen = Math.min(22, (right - left) * 0.22);

    gCtx.save();
    gCtx.strokeStyle = color;
    gCtx.lineWidth = Math.max(2.5, cw * 0.0045);
    gCtx.beginPath();
    gCtx.moveTo(left, top + bracketLen);
    gCtx.lineTo(left, top);
    gCtx.lineTo(left + bracketLen, top);
    gCtx.moveTo(right - bracketLen, top);
    gCtx.lineTo(right, top);
    gCtx.lineTo(right, top + bracketLen);
    gCtx.moveTo(left, bottom - bracketLen);
    gCtx.lineTo(left, bottom);
    gCtx.lineTo(left + bracketLen, bottom);
    gCtx.moveTo(right - bracketLen, bottom);
    gCtx.lineTo(right, bottom);
    gCtx.lineTo(right, bottom - bracketLen);
    gCtx.stroke();

    const fh = mapPoint(landmarks[151].x, landmarks[151].y);
    gCtx.strokeStyle = framing.motionArtifact ? "#f59e0b" : "#38bdf8";
    gCtx.lineWidth = 1.5;
    gCtx.strokeRect(fh.x - 14, fh.y - 10, 28, 20);
    gCtx.restore();
  } else {
    gCtx.save();
    gCtx.strokeStyle = color;
    gCtx.lineWidth = 2.5;
    gCtx.setLineDash([6, 4]);
    gCtx.beginPath();
    gCtx.ellipse(cw / 2, ch / 2, cw * 0.22, ch * 0.38, 0, 0, Math.PI * 2);
    gCtx.stroke();
    gCtx.restore();
  }

  if (framing.arrowHint) {
    gCtx.save();
    gCtx.fillStyle = "rgba(12, 16, 23, 0.82)";
    const boxW = Math.min(cw - 24, 240);
    const boxH = 30;
    const bx = (cw - boxW) / 2;
    const by = (ch - boxH) / 2;
    gCtx.fillRect(bx, by, boxW, boxH);
    gCtx.strokeStyle = color;
    gCtx.lineWidth = 1.5;
    gCtx.strokeRect(bx, by, boxW, boxH);
    gCtx.fillStyle = "#ffffff";
    gCtx.font = "bold 13px -apple-system, sans-serif";
    gCtx.textAlign = "center";
    gCtx.textBaseline = "middle";
    gCtx.fillText(framing.arrowHint, cw / 2, ch / 2);
    gCtx.restore();
  }
}

function updateFramingUi(framing) {
  const pillClass = framing.status === "ok" ? "online" : framing.status === "warn" ? "warn" : "danger";
  framingPill.textContent = `Tvár: ${framing.shortText}`;
  framingPill.className = `pill pill-right ${pillClass}`;

  videoWrapper.classList.remove("state-ok", "state-warn", "state-danger");
  videoWrapper.classList.add(`state-${framing.status}`);

  hudQuickStats.textContent = `${currentFps} FPS • Svetlo: ${currentLightLabel}`;

  if (activeStageId === "stageReady") {
    refreshReadyChecklist();
  }
}

function extractForeheadRppgAndLight(landmarks, nowMs, allowRppgSample) {
  const pt = landmarks[151];
  if (!pt || video.videoWidth === 0) return;

  const cx = Math.floor(pt.x * video.videoWidth);
  const cy = Math.floor(pt.y * video.videoHeight);
  const box = 24;
  const sx = Math.max(0, Math.min(video.videoWidth - box, cx - box / 2));
  const sy = Math.max(0, Math.min(video.videoHeight - box, cy - box / 2));

  rppgCtx.drawImage(video, sx, sy, box, box, 0, 0, 16, 16);
  const img = rppgCtx.getImageData(0, 0, 16, 16).data;
  let greenSum = 0;
  let lumaSum = 0;
  const pxCount = img.length / 4;

  for (let i = 0; i < img.length; i += 4) {
    const r = img[i];
    const g = img[i + 1];
    const b = img[i + 2];
    greenSum += g;
    lumaSum += 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const gMean = greenSum / pxCount;
  const lumaMean = lumaSum / pxCount;

  if (frameCount % 15 === 0) {
    if (lumaMean < 65) {
      currentLightLabel = "Slabé";
      mLight.textContent = "Slabé (pridaj)";
      mLight.className = "text-danger";
    } else if (lumaMean < 105) {
      currentLightLabel = "Stredné";
      mLight.textContent = "Stredné";
      mLight.className = "text-warn";
    } else {
      currentLightLabel = "Dobré";
      mLight.textContent = "Dobré";
      mLight.className = "text-ok";
    }
  }

  if (!allowRppgSample) return;

  rppgBuffer.push({ t: nowMs, g: gMean });
  while (rppgBuffer.length > 0 && nowMs - rppgBuffer[0].t > RPPG_WINDOW_MS) {
    rppgBuffer.shift();
  }

  if (rppgBuffer.length > 100 && frameCount % 30 === 0) {
    if (lumaMean < 65) {
      mBpm.textContent = "Málo svetla";
      return;
    }
    const durationSec = (rppgBuffer[rppgBuffer.length - 1].t - rppgBuffer[0].t) / 1000;
    if (durationSec >= 6) {
      const vals = rppgBuffer.map((p) => p.g);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const centered = vals.map((v) => v - mean);

      const smooth = [];
      for (let i = 2; i < centered.length - 2; i++) {
        smooth.push(
          (centered[i - 2] + centered[i - 1] + centered[i] + centered[i + 1] + centered[i + 2]) / 5
        );
      }

      let peaks = 0;
      let lastPeakIdx = -10;
      const minGap = Math.max(6, Math.floor((smooth.length / durationSec) * 0.42));
      for (let i = 1; i < smooth.length - 1; i++) {
        if (smooth[i] > smooth[i - 1] && smooth[i] > smooth[i + 1] && smooth[i] > 0.04) {
          if (i - lastPeakIdx >= minGap) {
            peaks++;
            lastPeakIdx = i;
          }
        }
      }

      const bpm = Math.round((peaks / durationSec) * 60);
      if (bpm >= 48 && bpm <= 135) {
        mBpm.textContent = `~${bpm} BPM`;
        sessionData.rppg_estimates.push({ timestamp_ms: Date.now(), bpm });
      } else {
        mBpm.textContent = "Nízky SNR";
      }
    }
  }
}

function processLoop() {
  if (!running) return;
  const nowPerf = performance.now();
  const dtMs = Math.min(250, Math.max(0, nowPerf - lastFramePerf));
  lastFramePerf = nowPerf;
  const nowEpoch = Date.now();

  frameCount++;
  if (nowPerf - lastFpsStamp >= 1000) {
    currentFps = frameCount;
    mFps.textContent = String(currentFps);
    frameCount = 0;
    lastFpsStamp = nowPerf;
  }

  if (
    video.readyState >= 2 &&
    video.videoWidth > 0 &&
    video.currentTime !== lastVideoTime &&
    faceLandmarker
  ) {
    lastVideoTime = video.currentTime;
    const detectTs = Math.max(Math.floor(nowPerf), lastDetectTimestampMs + 1);
    lastDetectTimestampMs = detectTs;

    try {
      const result = faceLandmarker.detectForVideo(video, detectTs);
      const landmarks =
        result.faceLandmarks && result.faceLandmarks.length > 0 ? result.faceLandmarks[0] : null;

      currentFraming = evaluateFaceFraming(landmarks, nowPerf);
      renderVirtualGimbalFrame(landmarks, currentFraming);

      if (landmarks) {
        extractForeheadRppgAndLight(
          landmarks,
          nowPerf,
          currentFraming.status === "ok" && !currentFraming.motionArtifact
        );
      }

      updateFramingUi(currentFraming);

      if (activeStageId === "stageQuestion") {
        qTrackStats.totalFrames++;
        if (currentFraming.status === "ok" && !currentFraming.motionArtifact) {
          qTrackStats.validFrames++;
        } else {
          if (currentFraming.status === "danger") qTrackStats.outOfFrameMs += dtMs;
          if (currentFraming.motionArtifact) qTrackStats.motionArtifactFrames++;
        }
      }

      if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
        const categories = result.faceBlendshapes[0].categories;
        const map = Object.fromEntries(categories.map((c) => [c.categoryName, c.score]));
        handleBlendshapes(map, nowEpoch, dtMs);
      } else if (calibrating) {
        calGuardBanner.textContent = "Tvár chýba v obraze — kalibrácia pozastavená. Vráť sa pred kameru.";
        calGuardBanner.className = "guard-banner danger";
      }
    } catch (detectErr) {
      log(`WARN: Frame detect chyba: ${detectErr.message}`);
    }
  }

  rafId = requestAnimationFrame(processLoop);
}

function handleBlendshapes(map, nowEpoch, dtMs) {
  if (calibrating) {
    if (currentFraming.status === "ok" && !currentFraming.motionArtifact) {
      calAccumulatedMs += dtMs;
      calGuardBanner.textContent = "Tvár zameraná — zbieram čistý neutrálny základ...";
      calGuardBanner.className = "guard-banner ok";
      for (const s of TRACKED_SHAPES) {
        calSamples[s.key].push(map[s.key] || 0);
      }
    } else {
      calGuardBanner.textContent = `Kalibrácia pozastavená: ${currentFraming.hint}`;
      calGuardBanner.className = `guard-banner ${currentFraming.status === "warn" ? "warn" : "danger"}`;
    }

    const pct = Math.min(100, (calAccumulatedMs / CAL_DURATION_MS) * 100);
    document.getElementById("calProgress").style.width = `${pct}%`;
    document.getElementById("calCounter").textContent = `${(calAccumulatedMs / 1000).toFixed(1)} / 10.0 s`;

    if (calAccumulatedMs >= CAL_DURATION_MS) {
      finishCalibration();
    }
  }

  let maxZ = 0;
  let maxKey = null;

  for (const s of TRACKED_SHAPES) {
    const val = map[s.key] || 0;
    const bar = document.getElementById(`bar_${s.key}`);
    const valEl = document.getElementById(`val_${s.key}`);

    if (baselineStats && baselineStats[s.key]) {
      const { mean, std } = baselineStats[s.key];
      const z = (val - mean) / Math.max(std, 0.015);
      const clampedPct = Math.min(100, Math.max(0, (Math.abs(z) / 5) * 100));
      bar.style.width = `${clampedPct}%`;
      bar.classList.toggle("spike", z >= 2.2 && !currentFraming.motionArtifact);
      valEl.textContent = `${z.toFixed(1)}σ`;

      if (z > maxZ) {
        maxZ = z;
        maxKey = s.key;
      }
    } else {
      bar.style.width = `${Math.min(100, val * 100)}%`;
      bar.classList.remove("spike");
      valEl.textContent = val.toFixed(2);
    }
  }

  mZscore.textContent = `${maxZ.toFixed(2)} σ`;

  if (baselineStats && activeStageId === "stageQuestion" && maxZ >= 2.2) {
    if (currentFraming.status !== "ok" || currentFraming.motionArtifact) {
      qTrackStats.suppressedSpikes++;
    } else {
      const lastSpike = sessionData.microexpression_spikes[sessionData.microexpression_spikes.length - 1];
      if (!lastSpike || nowEpoch - lastSpike.timestamp_ms > 250) {
        qTrackStats.cleanSpikes++;
        sessionData.microexpression_spikes.push({
          timestamp_ms: nowEpoch,
          question_id: currentNodeId,
          blendshape: maxKey,
          z_score: Number(maxZ.toFixed(2))
        });
      }
    }
  }
}

function refreshReadyChecklist() {
  if (running) {
    readyModeLabel.textContent = `Kamera (${facingMode === "user" ? "Predná zrkadlo" : "Zadná"}) + Auto-Gimbal`;
    readyModeLabel.className = "text-ok";
    readyCalLabel.textContent = baselineStats ? "Hotová (Baseline aktívna)" : "Bez kalibrácie";
    readyCalLabel.className = baselineStats ? "text-ok" : "text-warn";
    readyFramingLabel.textContent = currentFraming.hint;
    readyFramingLabel.className =
      currentFraming.status === "ok"
        ? "text-ok"
        : currentFraming.status === "warn"
          ? "text-warn"
          : "text-danger";
    btnRecalibrate.classList.remove("hidden");
  } else {
    readyModeLabel.textContent = "Bez kamery (len latencia a psychológia)";
    readyModeLabel.className = "text-warn";
    readyCalLabel.textContent = "Preskočená";
    readyCalLabel.className = "";
    readyFramingLabel.textContent = "Kamera neaktívna";
    readyFramingLabel.className = "";
    btnRecalibrate.classList.add("hidden");
  }
}

function startCalibration() {
  for (const s of TRACKED_SHAPES) calSamples[s.key] = [];
  calibrating = true;
  calAccumulatedMs = 0;
  selectedTier = "tier1_web_mediapipe";
  mBaseline.textContent = "Baseline: Prebieha...";
  showStage("stageCalibration");
  log("Spustená 10s Baseline kalibrácia.");
}

function finishCalibration() {
  calibrating = false;
  baselineStats = {};
  for (const s of TRACKED_SHAPES) {
    const arr = calSamples[s.key];
    const mean = arr.reduce((a, b) => a + b, 0) / Math.max(arr.length, 1);
    const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(arr.length, 1);
    baselineStats[s.key] = { mean, std: Math.sqrt(variance) };
  }
  mBaseline.textContent = "Baseline: Hotová";
  log("Kalibrácia hotová. Čakám na ŠTART TESTU.");
  openReadyScreen();
}

function openReadyScreen() {
  refreshReadyChecklist();
  showStage("stageReady");
}

function beginTestFromReady() {
  maxSteps = getSelectedDepth();
  whisperMode = getSelectedWhisperMode();
  selectedTier = running ? "tier1_web_mediapipe" : "tier0_text_latency_only";

  sessionData = createEmptySession(maxSteps);
  sessionData.baseline_calibrated = Boolean(baselineStats && running);
  sessionData.meta.whisper_mode = whisperMode;

  visitedIds = new Set();
  domainScores = createEmptyDomainScores();
  auditTrail = [];
  currentStep = 0;
  currentNodeId = "n01_entry";
  pendingNextNodeId = null;
  pendingOracleReaction = null;

  oracleWhisper.classList.add("hidden");
  oracleWhisperText.textContent = "";
  qContextBridge.classList.add("hidden");
  qContextBridge.textContent = "";

  log(`ŠTART TESTU (${maxSteps} krokov, režim veštice: ${whisperMode}).`);
  showStage("stageQuestion");
  renderNode(currentNodeId, null);
}

function findStrongestBiometricEvent() {
  if (sessionData.microexpression_spikes.length > 0) {
    const topSpike = [...sessionData.microexpression_spikes].sort((a, b) => b.z_score - a.z_score)[0];
    const qEntry = auditTrail.find((a) => a.question_id === topSpike.question_id);
    return {
      type: "facs",
      question_id: topSpike.question_id,
      detail: `mikrovýraz (${topSpike.blendshape}, ${topSpike.z_score}σ)`,
      mysticalHint: qEntry
        ? `jemné napätie tváre pri téme „${qEntry.chosen_label.slice(0, 52)}...“`
        : "jemný zášklb v mimike tváre"
    };
  }
  const cleanQuestions = sessionData.questions.filter((q) => {
    const qual = sessionData.meta.question_quality[q.question_id];
    return !qual || qual.out_of_frame_ms <= 800;
  });
  if (cleanQuestions.length >= 3) {
    const sorted = [...cleanQuestions].sort((a, b) => b.latency_ms - a.latency_ms);
    const avg = cleanQuestions.reduce((s, q) => s + q.latency_ms, 0) / cleanQuestions.length;
    if (sorted[0].latency_ms > avg * 1.25 && sorted[0].latency_ms >= 2200) {
      const qEntry = auditTrail.find((a) => a.question_id === sorted[0].question_id);
      return {
        type: "latency",
        question_id: sorted[0].question_id,
        detail: `váhanie ${(sorted[0].latency_ms / 1000).toFixed(1)} s`,
        mysticalHint: qEntry
          ? `tiché zaváhanie pri otázke, kde si zvažoval: „${qEntry.chosen_label.slice(0, 52)}...“`
          : `dlhšie vnútorné zaváhanie (${(sorted[0].latency_ms / 1000).toFixed(1)} s)`
      };
    }
  }
  return null;
}

function renderNode(nodeId, previousReaction) {
  const node = NODES[nodeId];
  if (!node) {
    finishSession();
    return;
  }

  currentNodeId = nodeId;
  visitedIds.add(nodeId);
  currentStep++;
  qTrackStats = createEmptyQuestionTrackStats();

  document.getElementById("qStep").textContent = `KROK ${currentStep} / ${maxSteps}`;

  const domainTag = document.getElementById("qDomainTag");
  if (DOMAIN_META[node.domain]) {
    domainTag.textContent = DOMAIN_META[node.domain].label;
  } else if (node.domain === "biometric") {
    domainTag.textContent = "Biometrický signál";
  } else {
    domainTag.textContent = node.phase === "opening" ? "Vstupná kalibrácia" : "Hĺbková vrstva";
  }

  // Only show inline whisper if user explicitly selected "inline" mode
  if (whisperMode === "inline" && previousReaction) {
    oracleWhisperText.textContent = previousReaction;
    oracleWhisper.classList.remove("hidden");
  } else {
    oracleWhisper.classList.add("hidden");
  }

  // Dynamic contextual bridging from previous answer (makes dialogue feel alive, never static)
  const bioEvent = nodeId === "c04_biometric_hook" ? findStrongestBiometricEvent() : null;
  const { bridge, questionText } = buildContextualQuestion({
    node,
    auditTrail,
    domainScores,
    strongestBiometricEvent: bioEvent
  });

  if (bridge) {
    qContextBridge.textContent = bridge;
    qContextBridge.classList.remove("hidden");
  } else {
    qContextBridge.classList.add("hidden");
  }

  document.getElementById("qText").textContent = questionText;

  const optsEl = document.getElementById("qOptions");
  optsEl.innerHTML = "";
  qDisplayedAtMs = Date.now();

  if (qTimerInterval) clearInterval(qTimerInterval);
  qTimerInterval = setInterval(() => {
    document.getElementById("qTimer").textContent = `${Date.now() - qDisplayedAtMs} ms`;
  }, 50);

  for (const opt of node.options) {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = `${opt.code}) ${opt.label}`;
    btn.addEventListener("click", () => selectAnswer(node, opt, questionText));
    optsEl.appendChild(btn);
  }
}

function selectAnswer(node, opt, renderedQuestionText) {
  const answeredAtMs = Date.now();
  const latencyMs = answeredAtMs - qDisplayedAtMs;
  if (qTimerInterval) clearInterval(qTimerInterval);

  if (opt.domainBoost) {
    for (const [dom, weight] of Object.entries(opt.domainBoost)) {
      if (domainScores[dom] !== undefined) domainScores[dom] += weight;
    }
  }

  const qualityPct =
    running && qTrackStats.totalFrames > 0
      ? Math.round((qTrackStats.validFrames / qTrackStats.totalFrames) * 100)
      : null;

  sessionData.meta.question_quality[node.id] = {
    tracking_quality_pct: qualityPct,
    out_of_frame_ms: Math.round(qTrackStats.outOfFrameMs),
    suppressed_motion_spikes: qTrackStats.suppressedSpikes
  };

  sessionData.questions.push({
    question_id: node.id,
    displayed_at_ms: qDisplayedAtMs,
    answered_at_ms: answeredAtMs,
    latency_ms: latencyMs,
    answer_code: opt.code,
    trait: opt.trait
  });

  auditTrail.push({
    step: currentStep,
    phase: node.phase,
    domain: node.domain,
    question_id: node.id,
    question_text: renderedQuestionText,
    chosen_label: opt.label,
    trait: opt.trait,
    schemas: opt.schemas || [],
    contextLead: opt.contextLead || "",
    latency_ms: latencyMs,
    facs_spikes: qTrackStats.cleanSpikes,
    quality_pct: qualityPct,
    out_of_frame_ms: Math.round(qTrackStats.outOfFrameMs),
    suppressed_spikes: qTrackStats.suppressedSpikes,
    oracle_reaction: opt.oracleReaction,
    oracle_narrative: opt.oracleNarrative || "",
    technique: opt.technique,
    debunk: opt.debunkExplanation
  });

  log(`Krok ${currentStep} [${node.id}] -> ${opt.code} (${latencyMs} ms | kvalita: ${qualityPct ?? "N/A"}%)`);

  const nextId = resolveNextNodeId({
    currentOption: opt,
    visitedIds,
    domainScores,
    maxSteps,
    stepCount: currentStep,
    strongestBiometricEvent: findStrongestBiometricEvent()
  });

  if (!nextId) {
    finishSession();
    return;
  }

  // Mode "interlude": pause stopwatch and display dedicated Oracle reaction screen between questions
  if (whisperMode === "interlude" && opt.oracleReaction) {
    pendingNextNodeId = nextId;
    pendingOracleReaction = opt.oracleReaction;
    interludeStep.textContent = `PO KROKU ${currentStep} Z ${maxSteps}`;
    interludeText.textContent = `„${opt.oracleReaction}“`;
    showStage("stageInterlude");
    return;
  }

  renderNode(nextId, opt.oracleReaction);
}

function finishSession() {
  if (qTimerInterval) clearInterval(qTimerInterval);
  const { primary, secondary } = rankDomains(domainScores);
  sessionData.meta.primary_domain = primary;
  sessionData.meta.secondary_domain = secondary;
  buildResults();
  showStage("stageResult");
  document.getElementById("resultOracle").classList.remove("hidden");
  document.getElementById("resultDebunk").classList.add("hidden");
}

function buildResults() {
  const bioEvent = findStrongestBiometricEvent();
  const synthesis = buildDeepSynthesis({
    auditTrail,
    domainScores,
    sessionData,
    bioEvent
  });

  const { primary, secondary, oracleChapters, scientificStats } = synthesis;

  // =========================================================
  // TAB 1: HLBOKA VESTECKA PREDPOVED (Cisto pohlad vestice)
  // =========================================================
  const oracleHtml = `
    <div class="oracle-header-banner">
      <h3>Osobný výklad a predpoveď</h3>
      <p>Syntéza tvojej energie, rozhodovania a vnútorných odpovedí (zostavená z ${auditTrail.length} krokov rozhovoru)</p>
    </div>

    <div class="oracle-chapter">
      <h4>1. Tvoja aktuálna energia a vnútorná maska</h4>
      <p>${escapeHtml(oracleChapters.chapter1_energy)}</p>
    </div>

    <div class="oracle-chapter">
      <h4>2. Hlavný uzol: ${escapeHtml(primary.label)}</h4>
      <p>${escapeHtml(oracleChapters.chapter2_main_focus)}</p>
    </div>

    <div class="oracle-chapter">
      <h4>3. Skrytý vplyv v pozadí a ozvena minulosti</h4>
      <p>${escapeHtml(oracleChapters.chapter3_background_and_shadow)}</p>
    </div>

    <div class="oracle-chapter highlight">
      <h4>4. Moment, kedy prehovorilo tvoje vnútro</h4>
      <p>${escapeHtml(oracleChapters.chapter4_intuition_moment)}</p>
    </div>

    <div class="oracle-chapter">
      <h4>5. Výhľad na najbližšie mesiace a posolstvo</h4>
      <p>${escapeHtml(oracleChapters.chapter5_outlook)}</p>
    </div>

    <div class="flip-cta-box">
      <p><strong>Chceš vidieť, ako tento výklad vznikol bez akejkoľvek mágie?</strong><br />
      Prepni sa do vedeckej roviny a pozri si matematické váhy tém, reakčné časy, mimiku a psychologické schémy.</p>
      <button id="btnInlineSwitchToScience" class="btn danger">Prepnúť do vedeckej roviny (Pitva) →</button>
    </div>
  `;
  const resultOracleEl = document.getElementById("resultOracle");
  resultOracleEl.innerHTML = oracleHtml;
  document.getElementById("btnInlineSwitchToScience").addEventListener("click", () => {
    resultOracleEl.classList.add("hidden");
    document.getElementById("resultDebunk").classList.remove("hidden");
  });

  // =========================================================
  // TAB 2: VEDECKA ROVINA (Hlbkova psychologicka a biometricka pitva)
  // =========================================================
  const maxDomainScore = Math.max(1, ...Object.values(domainScores));
  const domainBarsHtml = Object.entries(domainScores)
    .sort((a, b) => b[1] - a[1])
    .map(([k, score]) => {
      const pct = Math.round((score / maxDomainScore) * 100);
      const isPrim = k === synthesis.primaryKey;
      return `
        <div class="domain-bar-row">
          <span>${escapeHtml(DOMAIN_META[k].label)}</span>
          <div class="domain-bar-track">
            <div class="domain-bar-fill ${isPrim ? "primary" : ""}" style="width: ${pct}%"></div>
          </div>
          <strong class="mono">${score} b.</strong>
        </div>
      `;
    })
    .join("");

  const schemasHtml =
    scientificStats.rankedSchemas.length > 0
      ? scientificStats.rankedSchemas
          .map(
            (sc) => `
            <div class="schema-card">
              <strong>${escapeHtml(sc.name)} (zachytilo sa ${sc.count}×)</strong>
              <p><em>Koreňový mechanizmus:</em> ${escapeHtml(sc.origin)}</p>
              <p><em>Obranná maska v odpovediach:</em> ${escapeHtml(sc.mask)}</p>
              <p><em>Kognitívny Reframing (praktický posun):</em> ${escapeHtml(sc.reframing)}</p>
            </div>
          `
          )
          .join("")
      : `<p class="mono">Tvoje odpovede neukázali výraznú maladaptívnu schému — prevláda pragmatický a vyrovnaný postoj.</p>`;

  const spikesByQ = {};
  for (const sp of sessionData.microexpression_spikes) {
    spikesByQ[sp.question_id] = (spikesByQ[sp.question_id] || 0) + 1;
  }

  const auditHtml = auditTrail
    .map((item) => {
      const spCount = spikesByQ[item.question_id] || 0;
      const qualBadge = item.quality_pct !== null ? ` | Sledovanie: ${item.quality_pct}%` : "";
      const spikeBadge = spCount > 0 ? ` | FACS: ${spCount}` : "";
      const motionNote =
        item.suppressed_spikes > 0
          ? ` (odfiltrované pohybové artefakty: ${item.suppressed_spikes})`
          : "";
      return `
        <div class="audit-item">
          <div class="audit-head">
            <strong>Krok ${item.step} (${item.latency_ms} ms${qualBadge}${spikeBadge})</strong>
            <span class="tech-tag">${escapeHtml(item.technique)}</span>
          </div>
          <p class="audit-choice"><strong>Otázka:</strong> ${escapeHtml(item.question_text)}</p>
          <p class="audit-choice"><strong>Tvoja voľba:</strong> ${escapeHtml(item.chosen_label)}${escapeHtml(motionNote)}</p>
          <p class="audit-oracle"><strong>Interpretácia veštice:</strong> „${escapeHtml(item.oracle_reaction)}“</p>
          <p class="audit-debunk"><strong>Vedecký rozbor triku:</strong> ${escapeHtml(item.debunk)}</p>
        </div>
      `;
    })
    .join("");

  const slowestLabel = scientificStats.slowestQ
    ? `${scientificStats.slowestQ.latency_ms} ms (${scientificStats.slowestQ.question_id})`
    : "--";
  const fastestLabel = scientificStats.fastestQ
    ? `${scientificStats.fastestQ.latency_ms} ms (${scientificStats.fastestQ.question_id})`
    : "--";

  const debunkHtml = `
    <h3>Vedecká rovina: Psychologická, behaviorálna a dátová pitva</h3>

    <div class="sci-section">
      <h4>1. Smerovanie rozhovoru a váhy tém (Ako algoritmus našiel tvoj problém)</h4>
      <p style="font-size: 0.84rem; margin: 0 0 10px 0;">
        Veštica nepotrebuje karty. Už tvoje prvé rozhodnutia pridelili oblastiam body a presmerovali rozhovor
        do vetvy <strong>${escapeHtml(primary.label)}</strong> (sekundárne: ${escapeHtml(secondary.label)}).
        Celá 5-kapitolová „veštba“ je len poskladaná mozaika tvojich vlastných volieb preložená do poetického jazyka.
      </p>
      ${domainBarsHtml}
    </div>

    <div class="sci-section">
      <h4>2. Behaviorálna a biometrická telemetria (Čas reakcie a mimika)</h4>
      <div class="stat-grid">
        <div class="stat-box">
          <span>Priemerný reakčný čas</span>
          <strong>${scientificStats.avgLatency} ms</strong>
        </div>
        <div class="stat-box">
          <span>Najdlhšie váhanie (Kognitívna záťaž)</span>
          <strong>${escapeHtml(slowestLabel)}</strong>
        </div>
        <div class="stat-box">
          <span>Najrýchlejšia intuitívna voľba</span>
          <strong>${escapeHtml(fastestLabel)}</strong>
        </div>
      </div>
      <p style="font-size: 0.83rem; margin: 6px 0 0 0; color: var(--muted);">
        Čisté FACS mikrovýrazy nad 2.2σ (po odfiltrovaní pohybov hlavy): <strong>${sessionData.microexpression_spikes.length}</strong>.
        Video bolo spracované výlučne lokálne v prehliadači.
      </p>
    </div>

    <div class="sci-section">
      <h4>3. Kognitívny a schémový profil (Schémová terapia Jeffreyho Younga)</h4>
      <p style="font-size: 0.83rem; margin: 0 0 6px 0; color: var(--muted);">
        Na základe tvojich automatických reakcií a obranných stratégií sa v odpovediach najčastejšie aktivovali tieto vzorce:
      </p>
      ${schemasHtml}
    </div>

    <div class="sci-section">
      <h4>4. Audit manipulácie krok za krokom (${auditTrail.length} krokov)</h4>
      ${auditHtml}
    </div>
  `;
  document.getElementById("resultDebunk").innerHTML = debunkHtml;
}

// Event bindings
btnStartCam.addEventListener("click", () => {
  if (running) stopCamera();
  else startCamera();
});

btnToggleCam.addEventListener("click", () => {
  facingMode = facingMode === "user" ? "environment" : "user";
  startCamera();
});

btnAutoTrack.addEventListener("click", () => {
  autoTrackEnabled = !autoTrackEnabled;
  btnAutoTrack.textContent = autoTrackEnabled ? "Auto-zameranie: ZAP" : "Auto-zameranie: VYP";
  btnAutoTrack.classList.toggle("active", autoTrackEnabled);
  gimbalState.initialized = false;
  log(`Virtual Gimbal auto-zameranie: ${autoTrackEnabled ? "ZAPNUTÉ" : "VYPNUTÉ"}`);
});

hwZoomRange.addEventListener("input", async () => {
  const z = Number(hwZoomRange.value);
  hwZoomVal.textContent = `${z.toFixed(1)}x`;
  if (!stream) return;
  const track = stream.getVideoTracks()[0];
  try {
    await track.applyConstraints({ advanced: [{ zoom: z }] });
  } catch (err) {
    log(`WARN: Hardvérový zoom nepodporovaný (${err.message})`);
  }
});

btnCalibrate.addEventListener("click", startCalibration);

btnSkipCam.addEventListener("click", () => {
  selectedTier = "tier0_text_latency_only";
  openReadyScreen();
});

btnStartTest.addEventListener("click", beginTestFromReady);
btnRecalibrate.addEventListener("click", startCalibration);
btnBackIntro.addEventListener("click", () => showStage("stageIntro"));

btnNextQuestion.addEventListener("click", () => {
  if (pendingNextNodeId) {
    const nextId = pendingNextNodeId;
    const prevReact = pendingOracleReaction;
    pendingNextNodeId = null;
    pendingOracleReaction = null;
    showStage("stageQuestion");
    renderNode(nextId, prevReact);
  } else {
    finishSession();
  }
});

document.getElementById("btnModeOracle").addEventListener("click", () => {
  document.getElementById("resultOracle").classList.remove("hidden");
  document.getElementById("resultDebunk").classList.add("hidden");
});

document.getElementById("btnModeDebunk").addEventListener("click", () => {
  document.getElementById("resultOracle").classList.add("hidden");
  document.getElementById("resultDebunk").classList.remove("hidden");
});

document.getElementById("btnExportJson").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${sessionData.session_id}.json`;
  a.click();
});

document.getElementById("btnRestart").addEventListener("click", () => {
  if (qTimerInterval) clearInterval(qTimerInterval);
  openReadyScreen();
});

window.addEventListener("resize", syncCanvasResolution);

window.addEventListener("error", (ev) => {
  log(`RUNTIME CHYBA: ${ev.message}`);
});
window.addEventListener("unhandledrejection", (ev) => {
  const reason = ev.reason && ev.reason.message ? ev.reason.message : String(ev.reason);
  log(`ASYNC CHYBA: ${reason}`);
});

initBars();
appLayout.classList.add("cam-off");
log(`The Mirror v2.5 pripravený (Konfigurovateľný tok + Kontextové otázky + Hĺbkový 5-kapitolový rozbor).`);
