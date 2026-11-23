import {
  FaceLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import {
  DOMAIN_META,
  NODES,
  TEST_PRESETS,
  getTotalNodeCount,
  rankDomains,
  resolveNextNodeId
} from "./dialogue-engine.js";

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

// Framing & stability constants
const CAL_DURATION_MS = 10000;
const FACE_LOSS_GRACE_MS = 280;
const REPOSITION_SETTLE_MS = 450;
const RPPG_WINDOW_MS = 12000;

// DOM elements
const video = document.getElementById("webcam");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");
const statusPill = document.getElementById("statusPill");
const framingPill = document.getElementById("framingPill");
const debugLog = document.getElementById("debugLog");
const blendshapeBars = document.getElementById("blendshapeBars");

const btnStartCam = document.getElementById("btnStartCam");
const btnToggleCam = document.getElementById("btnToggleCam");
const btnCalibrate = document.getElementById("btnCalibrate");
const btnSkipCam = document.getElementById("btnSkipCam");
const btnCancelCal = document.getElementById("btnCancelCal");
const btnStartTest = document.getElementById("btnStartTest");
const btnRecalibrate = document.getElementById("btnRecalibrate");

const mFps = document.getElementById("mFps");
const mLight = document.getElementById("mLight");
const mBaseline = document.getElementById("mBaseline");
const mZscore = document.getElementById("mZscore");
const mBpm = document.getElementById("mBpm");

const calFramingWarn = document.getElementById("calFramingWarn");
const readyCalBadge = document.getElementById("readyCalBadge");
const readyFaceBadge = document.getElementById("readyFaceBadge");
const presetList = document.getElementById("presetList");
const chkPauseOnReposition = document.getElementById("chkPauseOnReposition");

const qFramingBanner = document.getElementById("qFramingBanner");
const oracleWhisper = document.getElementById("oracleWhisper");
const oracleWhisperText = document.getElementById("oracleWhisperText");

// Floating PiP HUD elements
const pipHud = document.getElementById("pipHud");
const pipLabel = document.getElementById("pipLabel");
const btnPipMode = document.getElementById("btnPipMode");
const pipCanvas = document.getElementById("pipCanvas");
const pipCtx = pipCanvas.getContext("2d");

// Runtime vision state
let faceLandmarker = null;
let stream = null;
let facingMode = "user";
let running = false;
let rafId = null;
let lastVideoTime = -1;
let frameCount = 0;
let lastFpsStamp = performance.now();
let pipCompact = false;

// Framing & Repositioning state
let framingStatus = {
  code: "offline", // offline | ok | edge | too_close | too_far | missing
  label: "Kamera vypnutá",
  cssClass: "state-offline",
  bbox: null
};
let lastFaceSeenAtMs = 0;
let settleUntilMs = 0;
let wasOutOfFrame = false;

// Calibration state (accumulates ONLY valid in-frame milliseconds)
let calibrating = false;
let calValidMs = 0;
let calLastTickMs = 0;
const calSamples = {};
let baselineStats = null;

// Experimental forehead rPPG & Luma buffer
const rppgCanvas = document.createElement("canvas");
const rppgCtx = rppgCanvas.getContext("2d", { willReadFrequently: true });
let rppgBuffer = [];

// Interactive Dialogue State
let activePresetId = "quick_mirror";
let sessionData = createEmptySession();
let visitedIds = new Set();
let domainScores = createEmptyDomainScores();
let auditTrail = [];
let maxSteps = 8;
let currentStep = 0;
let currentNodeId = "n01_entry";
let qDisplayedAtMs = 0;
let qLastTimerTickMs = 0;
let qRepositionMs = 0;
let qTimerInterval = null;
let currentTier = "tier1_web_mediapipe";

function createEmptyDomainScores() {
  return {
    relationships: 0,
    career_finance: 0,
    health_stress: 0,
    skeptic_control: 0
  };
}

function createEmptySession() {
  return {
    session_id: `mirror_${Date.now()}`,
    created_at_ms: Date.now(),
    tier: currentTier,
    camera_facing: facingMode,
    baseline_calibrated: Boolean(baselineStats),
    questions: [],
    microexpression_spikes: [],
    rppg_estimates: [],
    meta: {
      engine_version: "3.0.0",
      total_graph_nodes: getTotalNodeCount(),
      preset_id: activePresetId,
      selected_depth: maxSteps,
      pause_on_reposition: chkPauseOnReposition ? chkPauseOnReposition.checked : true
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

function showStage(id) {
  document.querySelectorAll(".stage").forEach((el) => el.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  updatePipVisibility();
}

function updatePipVisibility() {
  const inTestOrReady =
    document.getElementById("stageReady").classList.contains("active") ||
    document.getElementById("stageQuestion").classList.contains("active") ||
    document.getElementById("stageCalibration").classList.contains("active");

  if (running && inTestOrReady) {
    pipHud.classList.remove("hidden");
  } else {
    pipHud.classList.add("hidden");
  }
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

function initPresets() {
  presetList.innerHTML = "";
  const presets = Object.values(TEST_PRESETS);
  presets.forEach((p, idx) => {
    const label = document.createElement("label");
    label.className = "radio-card";
    label.innerHTML = `
      <input type="radio" name="testPreset" value="${escapeHtml(p.id)}" ${idx === 0 ? "checked" : ""} />
      <div>
        <strong>${escapeHtml(p.title)}</strong>
        <span>${escapeHtml(p.description)}</span>
      </div>
    `;
    presetList.appendChild(label);
  });
}

function getSelectedPreset() {
  const checked = document.querySelector('input[name="testPreset"]:checked');
  const id = checked ? checked.value : "quick_mirror";
  return TEST_PRESETS[id] || TEST_PRESETS.quick_mirror;
}

function setFramingStatus(code, label, cssClass, bbox = null) {
  framingStatus = { code, label, cssClass, bbox };

  framingPill.textContent = `Záber: ${label}`;
  framingPill.className = "pill framing-pill " + (
    code === "ok" ? "online" : code === "missing" ? "danger" : code === "offline" ? "offline" : "warn"
  );

  pipHud.classList.remove("state-offline", "state-ok", "state-warn", "state-missing");
  pipHud.classList.add(cssClass);
  pipLabel.textContent = label;

  if (document.getElementById("stageReady").classList.contains("active")) {
    if (!running) {
      readyFaceBadge.textContent = "Režim bez kamery";
      readyFaceBadge.className = "mono";
    } else if (code === "ok") {
      readyFaceBadge.textContent = "Poloha tváre: OK (pripravené na štart)";
      readyFaceBadge.className = "mono text-ok";
    } else {
      readyFaceBadge.textContent = `Poloha tváre: ${label}`;
      readyFaceBadge.className = "mono text-warn";
    }
  }
}

function evaluateFaceFraming(landmarks, nowEpoch) {
  if (!landmarks || landmarks.length === 0) {
    if (nowEpoch - lastFaceSeenAtMs > FACE_LOSS_GRACE_MS) {
      wasOutOfFrame = true;
      setFramingStatus("missing", "Tvár mimo záberu", "state-missing", null);
    }
    return;
  }

  lastFaceSeenAtMs = nowEpoch;
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (let i = 0; i < landmarks.length; i++) {
    const p = landmarks[i];
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const bbox = { minX, minY, maxX, maxY, width, height };

  const inBounds = minX >= 0.03 && maxX <= 0.97 && minY >= 0.03 && maxY <= 0.97;
  if (!inBounds) {
    wasOutOfFrame = true;
    setFramingStatus("edge", "Posuň tvár do stredu", "state-warn", bbox);
    return;
  }
  if (width > 0.80 || height > 0.90) {
    wasOutOfFrame = true;
    setFramingStatus("too_close", "Príliš blízko", "state-warn", bbox);
    return;
  }
  if (width < 0.14) {
    wasOutOfFrame = true;
    setFramingStatus("too_far", "Príliš ďaleko", "state-warn", bbox);
    return;
  }

  if (wasOutOfFrame) {
    wasOutOfFrame = false;
    settleUntilMs = nowEpoch + REPOSITION_SETTLE_MS;
  }
  setFramingStatus("ok", "Tvár OK", "state-ok", bbox);
}

function isRepositioningNow(nowEpoch) {
  if (!running) return false;
  return framingStatus.code !== "ok" || nowEpoch < settleUntilMs;
}

async function initMediaPipe() {
  if (faceLandmarker) return;
  log("Načítavam MediaPipe FaceLandmarker WASM...");
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
  );
  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU"
    },
    outputFaceBlendshapes: true,
    runningMode: "VIDEO",
    numFaces: 1
  });
  log("MediaPipe FaceLandmarker pripravený (GPU delegate).");
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

    // Mirror preview for intuitive self-framing on front camera
    video.classList.toggle("mirrored", isFront);
    overlay.classList.toggle("mirrored", isFront);

    lastVideoTime = -1;
    rppgBuffer = [];
    lastFaceSeenAtMs = Date.now();

    const trackSettings = stream.getVideoTracks()[0].getSettings();
    log(
      `Kamera aktívna (${isFront ? "Predná 480p" : "Zadná 720p"}): ${trackSettings.width}x${trackSettings.height} @ ${Math.round(trackSettings.frameRate || 30)} fps`
    );

    overlay.width = video.videoWidth || 640;
    overlay.height = video.videoHeight || 480;
    rppgCanvas.width = 16;
    rppgCanvas.height = 16;

    running = true;
    statusPill.textContent = `Aktívna (${isFront ? "Predná" : "Zadná"})`;
    statusPill.className = "pill online";
    btnToggleCam.disabled = false;
    btnCalibrate.disabled = false;
    btnStartCam.textContent = "Zastaviť kameru";
    updatePipVisibility();

    processLoop();
  } catch (err) {
    log(`CHYBA kamery/MediaPipe: ${err.message}`);
    statusPill.textContent = "Chyba kamery";
    statusPill.className = "pill offline";
    setFramingStatus("offline", "Kamera vypnutá", "state-offline", null);
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
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  statusPill.textContent = "Kamera vypnutá";
  statusPill.className = "pill offline";
  setFramingStatus("offline", "Kamera vypnutá", "state-offline", null);
  mLight.textContent = "--";
  mLight.className = "";
  btnStartCam.textContent = "Spustiť kameru a MediaPipe";
  updatePipVisibility();
}

function drawOverlays(landmarks) {
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  // Subtle target framing guide on main canvas
  ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 6]);
  ctx.strokeRect(
    overlay.width * 0.14,
    overlay.height * 0.08,
    overlay.width * 0.72,
    overlay.height * 0.84
  );
  ctx.setLineDash([]);

  const boxColor =
    framingStatus.code === "ok" ? "#22c55e" : framingStatus.code === "missing" ? "#f43f5e" : "#f59e0b";

  if (framingStatus.bbox) {
    const b = framingStatus.bbox;
    ctx.strokeStyle = boxColor;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(
      b.minX * overlay.width,
      b.minY * overlay.height,
      b.width * overlay.width,
      b.height * overlay.height
    );
  }

  if (landmarks && landmarks.length > 151) {
    const forehead = landmarks[151];
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      forehead.x * overlay.width - 18,
      forehead.y * overlay.height - 14,
      36,
      28
    );
  }

  // Draw floating PiP mini-window (only when visible and not compact)
  if (!pipHud.classList.contains("hidden") && !pipCompact && video.readyState >= 2) {
    const pw = pipCanvas.width;
    const ph = pipCanvas.height;
    const isFront = facingMode === "user";

    pipCtx.save();
    pipCtx.clearRect(0, 0, pw, ph);
    if (isFront) {
      pipCtx.translate(pw, 0);
      pipCtx.scale(-1, 1);
    }
    pipCtx.drawImage(video, 0, 0, pw, ph);

    // Oval center guide
    pipCtx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    pipCtx.lineWidth = 1;
    pipCtx.beginPath();
    pipCtx.ellipse(pw / 2, ph / 2, pw * 0.28, ph * 0.38, 0, 0, Math.PI * 2);
    pipCtx.stroke();

    // Detected face box
    if (framingStatus.bbox) {
      const b = framingStatus.bbox;
      pipCtx.strokeStyle = boxColor;
      pipCtx.lineWidth = 2;
      pipCtx.strokeRect(b.minX * pw, b.minY * ph, b.width * pw, b.height * ph);
    }
    pipCtx.restore();
  }
}

function extractForeheadRppgAndLight(landmarks, nowMs) {
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
      mLight.textContent = "Slabé (pridaj)";
      mLight.className = "text-danger";
    } else if (lumaMean < 105) {
      mLight.textContent = "Stredné";
      mLight.className = "text-warn";
    } else {
      mLight.textContent = "Dobré";
      mLight.className = "text-ok";
    }
  }

  if (framingStatus.code !== "ok") return;

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
  const nowEpoch = Date.now();

  frameCount++;
  if (nowPerf - lastFpsStamp >= 1000) {
    mFps.textContent = String(frameCount);
    frameCount = 0;
    lastFpsStamp = nowPerf;
  }

  if (video.currentTime !== lastVideoTime && faceLandmarker) {
    lastVideoTime = video.currentTime;
    const result = faceLandmarker.detectForVideo(video, nowPerf);
    const lm = result.faceLandmarks && result.faceLandmarks.length > 0 ? result.faceLandmarks[0] : null;

    evaluateFaceFraming(lm, nowEpoch);
    drawOverlays(lm);

    if (lm) {
      extractForeheadRppgAndLight(lm, nowPerf);
    }

    if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
      const categories = result.faceBlendshapes[0].categories;
      const map = Object.fromEntries(categories.map((c) => [c.categoryName, c.score]));
      handleBlendshapes(map, nowEpoch);
    } else if (calibrating) {
      calFramingWarn.classList.remove("hidden");
      calLastTickMs = nowEpoch;
    }
  }

  rafId = requestAnimationFrame(processLoop);
}

function handleBlendshapes(map, nowEpoch) {
  const stableFrame = framingStatus.code === "ok" && nowEpoch >= settleUntilMs;

  if (calibrating) {
    const dt = Math.min(250, Math.max(0, nowEpoch - calLastTickMs));
    calLastTickMs = nowEpoch;

    if (stableFrame) {
      calFramingWarn.classList.add("hidden");
      calValidMs += dt;
      for (const s of TRACKED_SHAPES) {
        calSamples[s.key].push(map[s.key] || 0);
      }
    } else {
      calFramingWarn.classList.remove("hidden");
    }

    const pct = Math.min(100, (calValidMs / CAL_DURATION_MS) * 100);
    document.getElementById("calProgress").style.width = `${pct}%`;
    document.getElementById("calCounter").textContent = `${(calValidMs / 1000).toFixed(1)} / 10.0 s`;

    if (calValidMs >= CAL_DURATION_MS) {
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
      bar.classList.toggle("spike", stableFrame && z >= 2.2);
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

  // Gate FACS spike capture: ignore spikes during out-of-frame / 450ms settle window
  if (
    baselineStats &&
    stableFrame &&
    document.getElementById("stageQuestion").classList.contains("active") &&
    maxZ >= 2.2
  ) {
    const lastSpike = sessionData.microexpression_spikes[sessionData.microexpression_spikes.length - 1];
    if (!lastSpike || nowEpoch - lastSpike.timestamp_ms > 250) {
      sessionData.microexpression_spikes.push({
        timestamp_ms: nowEpoch,
        question_id: currentNodeId,
        blendshape: maxKey,
        z_score: Number(maxZ.toFixed(2))
      });
    }
  }
}

function startCalibration() {
  currentTier = "tier1_web_mediapipe";
  for (const s of TRACKED_SHAPES) calSamples[s.key] = [];
  calibrating = true;
  calValidMs = 0;
  calLastTickMs = Date.now();
  mBaseline.textContent = "Baseline: Prebieha...";
  calFramingWarn.classList.add("hidden");
  showStage("stageCalibration");
  log("Spustená 10s Baseline kalibrácia (zber len pri stabilnom zábere tváre).");
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
  log("Kalibrácia dokončená. Čakám na výber testu a manuálny ŠTART.");
  openReadyStage(true);
}

function openReadyStage(withCamera) {
  currentTier = withCamera && running ? "tier1_web_mediapipe" : "tier0_text_latency_only";
  if (withCamera && baselineStats) {
    readyCalBadge.textContent = "Baseline kalibrácia: HOTOVÁ";
    btnRecalibrate.classList.remove("hidden");
  } else {
    readyCalBadge.textContent = "Režim bez kamery (latencia + psychológia)";
    btnRecalibrate.classList.add("hidden");
  }
  showStage("stageReady");
  setFramingStatus(framingStatus.code, framingStatus.label, framingStatus.cssClass, framingStatus.bbox);
}

function startSelectedTest() {
  const preset = getSelectedPreset();
  activePresetId = preset.id;
  maxSteps = preset.maxSteps;
  sessionData = createEmptySession();
  sessionData.tier = running && baselineStats ? "tier1_web_mediapipe" : "tier0_text_latency_only";
  sessionData.baseline_calibrated = Boolean(baselineStats && running);
  sessionData.meta.preset_id = preset.id;
  sessionData.meta.selected_depth = preset.maxSteps;
  sessionData.meta.pause_on_reposition = chkPauseOnReposition.checked;

  visitedIds = new Set();
  domainScores = { ...preset.initialDomainScores };
  auditTrail = [];
  currentStep = 0;
  currentNodeId = preset.startNodeId;
  oracleWhisper.classList.add("hidden");
  oracleWhisperText.textContent = "";

  log(`ŠTART testu "${preset.title}" (${preset.maxSteps} krokov, štart=${preset.startNodeId}).`);
  showStage("stageQuestion");
  renderNode(currentNodeId, null);
}

function findStrongestBiometricEvent() {
  if (sessionData.microexpression_spikes.length > 0) {
    const topSpike = [...sessionData.microexpression_spikes].sort((a, b) => b.z_score - a.z_score)[0];
    return {
      type: "facs",
      question_id: topSpike.question_id,
      detail: `mikrovýraz (${topSpike.blendshape}, ${topSpike.z_score}σ)`
    };
  }
  if (sessionData.questions.length >= 3) {
    const sorted = [...sessionData.questions].sort((a, b) => b.latency_ms - a.latency_ms);
    const avg = sessionData.questions.reduce((s, q) => s + q.latency_ms, 0) / sessionData.questions.length;
    if (sorted[0].latency_ms > avg * 1.25 && sorted[0].latency_ms >= 2200) {
      return {
        type: "latency",
        question_id: sorted[0].question_id,
        detail: `váhanie ${sorted[0].latency_ms} ms`
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

  document.getElementById("qStep").textContent = `KROK ${currentStep} / ${maxSteps}`;

  const domainTag = document.getElementById("qDomainTag");
  if (DOMAIN_META[node.domain]) {
    domainTag.textContent = DOMAIN_META[node.domain].label;
  } else if (node.domain === "biometric") {
    domainTag.textContent = "Biometrický signál";
  } else {
    domainTag.textContent = node.phase === "opening" ? "Vstupná kalibrácia" : "Hĺbková vrstva";
  }

  if (previousReaction) {
    oracleWhisperText.textContent = previousReaction;
    oracleWhisper.classList.remove("hidden");
  } else {
    oracleWhisper.classList.add("hidden");
  }

  let questionText = node.text;
  if (nodeId === "c04_biometric_hook") {
    const bio = findStrongestBiometricEvent();
    const { primary } = rankDomains(domainScores);
    const topic = DOMAIN_META[primary].oracleTopic;
    if (bio) {
      questionText = `Zastav sa na sekundu. Pred chvíľou pri téme (${topic}) som zachytil miernu odchýlku v tvojej reakcii (${bio.detail}). Dotklo sa to niečoho, čo pred okolím radšej skrývaš?`;
    }
  }

  document.getElementById("qText").textContent = questionText;

  const optsEl = document.getElementById("qOptions");
  optsEl.innerHTML = "";

  qDisplayedAtMs = Date.now();
  qLastTimerTickMs = qDisplayedAtMs;
  qRepositionMs = 0;

  if (qTimerInterval) clearInterval(qTimerInterval);
  qTimerInterval = setInterval(() => {
    const now = Date.now();
    const dt = now - qLastTimerTickMs;
    qLastTimerTickMs = now;

    const pauseEnabled = chkPauseOnReposition.checked;
    const reposNow = isRepositioningNow(now);

    if (reposNow) {
      qRepositionMs += dt;
    }

    qFramingBanner.classList.toggle("hidden", !(running && reposNow));

    const rawElapsed = now - qDisplayedAtMs;
    const cleanElapsed = pauseEnabled ? Math.max(0, Math.round(rawElapsed - qRepositionMs)) : rawElapsed;

    const qTimerEl = document.getElementById("qTimer");
    if (running && reposNow && pauseEnabled) {
      qTimerEl.textContent = `${cleanElapsed} ms (pozastavené)`;
      qTimerEl.className = "mono text-warn";
    } else {
      qTimerEl.textContent = `${cleanElapsed} ms`;
      qTimerEl.className = "mono";
    }
  }, 50);

  for (const opt of node.options) {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = `${opt.code}) ${opt.label}`;
    btn.addEventListener("click", () => selectAnswer(node, opt));
    optsEl.appendChild(btn);
  }
}

function selectAnswer(node, opt) {
  const answeredAtMs = Date.now();
  const rawLatencyMs = answeredAtMs - qDisplayedAtMs;
  const repoMs = Math.round(qRepositionMs);
  const pauseEnabled = chkPauseOnReposition.checked;
  const effectiveLatencyMs = pauseEnabled ? Math.max(0, rawLatencyMs - repoMs) : rawLatencyMs;

  if (opt.domainBoost) {
    for (const [dom, weight] of Object.entries(opt.domainBoost)) {
      if (domainScores[dom] !== undefined) domainScores[dom] += weight;
    }
  }

  sessionData.questions.push({
    question_id: node.id,
    displayed_at_ms: qDisplayedAtMs,
    answered_at_ms: answeredAtMs,
    latency_ms: effectiveLatencyMs,
    raw_latency_ms: rawLatencyMs,
    reposition_ms: repoMs,
    answer_code: opt.code,
    trait: opt.trait
  });

  auditTrail.push({
    step: currentStep,
    question_id: node.id,
    question_text: node.text,
    chosen_label: opt.label,
    latency_ms: effectiveLatencyMs,
    reposition_ms: repoMs,
    oracle_reaction: opt.oracleReaction,
    technique: opt.technique,
    debunk: opt.debunkExplanation
  });

  log(
    `Krok ${currentStep} [${node.id}] -> ${opt.code} (čistý ${effectiveLatencyMs} ms, úprava polohy ${repoMs} ms)`
  );

  const nextId = resolveNextNodeId({
    currentOption: opt,
    visitedIds,
    domainScores,
    maxSteps,
    stepCount: currentStep,
    strongestBiometricEvent: findStrongestBiometricEvent()
  });

  if (nextId) {
    renderNode(nextId, opt.oracleReaction);
  } else {
    finishSession();
  }
}

function finishSession() {
  if (qTimerInterval) clearInterval(qTimerInterval);
  qFramingBanner.classList.add("hidden");
  const { primary, secondary } = rankDomains(domainScores);
  sessionData.meta.primary_domain = primary;
  sessionData.meta.secondary_domain = secondary;
  buildResults(primary, secondary);
  showStage("stageResult");
  document.getElementById("resultOracle").classList.remove("hidden");
  document.getElementById("resultDebunk").classList.add("hidden");
}

function buildResults(primaryKey, secondaryKey) {
  const primary = DOMAIN_META[primaryKey];
  const secondary = DOMAIN_META[secondaryKey];
  const avgLatency = Math.round(
    sessionData.questions.reduce((a, b) => a + b.latency_ms, 0) / Math.max(sessionData.questions.length, 1)
  );
  const totalRepoMs = sessionData.questions.reduce((a, b) => a + (b.reposition_ms || 0), 0);
  const slowest = [...sessionData.questions].sort((a, b) => b.latency_ms - a.latency_ms)[0];
  const bioEvent = findStrongestBiometricEvent();

  const oracleHtml = [
    `<h3>Tvoja osobná veštba (Ilúzia)</h3>`,
    `<p class="oracle-quote">„Keď som spojil všetky tvoje signály, obraz sa úplne vyjasnil. Tvojím hlavným ohniskom v tomto období je <strong>${escapeHtml(primary.oracleTopic)}</strong>, pričom v pozadí do toho potichu zasahuje aj téma: ${escapeHtml(secondary.oracleTopic)}.“</p>`,
    `<p>Navonok pôsobíš vyrovnanejšie, než sa cítiš v tichých chvíľach. Máš v sebe silný vnútorný kompas, ale dlhodobo na seba berieš príliš veľa zodpovednosti a riešiš v hlave scenáre, ktoré ťa zbytočne vyčerpávajú.</p>`,
    bioEvent
      ? `<p>Navyše bolo zreteľne cítiť jemné vnútorné napätie v momente, keď sme sa priblížili k jadru problému (${escapeHtml(bioEvent.detail)}). Presne tam sa skrýva vec, ktorú už vnútorne poznáš, ale odkladáš jej vyslovenie nahlas.</p>`
      : `<p>Rytmus tvojich reakcií ukázal jasné zaváhanie presne tam, kde rozum bojuje s emóciou. Odpoveď na tvoju dilemu už v sebe dávno nosíš — zlom príde v najbližších mesiacoch v momente, keď prestaneš robiť kompromis sám proti sebe.</p>`,
    `<div class="debunk-card info"><strong>Zastav sa na 5 sekúnd:</strong> Ak si mal pri čítaní pocit, že to znie prekvapivo presne, klikni hore na červené tlačidlo <strong>FLIP MODE: Pitva trikov</strong> a pozri si, ako ľahko ťa práve naprogramoval obyčajný strom podmienok.</div>`
  ];
  document.getElementById("resultOracle").innerHTML = oracleHtml.join("");

  const spikesByQ = {};
  for (const sp of sessionData.microexpression_spikes) {
    spikesByQ[sp.question_id] = (spikesByQ[sp.question_id] || 0) + 1;
  }

  const auditHtml = auditTrail
    .map((item) => {
      const spCount = spikesByQ[item.question_id] || 0;
      const spikeBadge = spCount > 0 ? ` | FACS špičky: ${spCount}` : "";
      const repoBadge = item.reposition_ms > 200 ? ` | mimo záber: ${item.reposition_ms} ms` : "";
      return `
        <div class="audit-item">
          <div class="audit-head">
            <strong>Krok ${item.step} (čistý čas ${item.latency_ms} ms${repoBadge}${spikeBadge})</strong>
            <span class="tech-tag">${escapeHtml(item.technique)}</span>
          </div>
          <p class="audit-choice"><strong>Tvoja voľba:</strong> ${escapeHtml(item.chosen_label)}</p>
          <p class="audit-oracle"><strong>Čo povedala „veštica“:</strong> „${escapeHtml(item.oracle_reaction)}“</p>
          <p class="audit-debunk"><strong>Ako fungoval trik:</strong> ${escapeHtml(item.debunk)}</p>
        </div>
      `;
    })
    .join("");

  const debunkHtml = [
    `<h3>FLIP MODE: Vedecká pitva celého rozhovoru (Žiadna mágia)</h3>`,
    `<div class="debunk-card">
      <strong>1. Ako „vedela“, že riešiš ${escapeHtml(primary.label.toLowerCase())}?</strong><br />
      Nevytiahla to z kariet ani z energie. Tvoje kliknutia pridelili oblasti <em>${escapeHtml(primary.label)}</em> najvyššiu váhu (skóre: <code>${JSON.stringify(domainScores)}</code>) a presmerovali rozhovor do pripravenej vetvy z 30-uzlového scenára.
    </div>`,
    `<div class="debunk-card ok">
      <strong>2. Čistá kognitívna záťaž a biometria:</strong><br />
      Priemerný čistý čas odpovede: <strong>${avgLatency} ms</strong> (odfiltrovaný čas úpravy polohy: <strong>${totalRepoMs} ms</strong>).
      Najdlhšie váhanie nastalo pri kroku <code>${slowest ? slowest.question_id : "-"}</code> (<strong>${slowest ? slowest.latency_ms : 0} ms</strong>).
      Zachytené FACS mikrovýrazy nad 2.2σ (iba pri stabilnej tvári): <strong>${sessionData.microexpression_spikes.length}</strong> (<code>${JSON.stringify(spikesByQ)}</code>). Video neopustilo tvoje zariadenie.
    </div>`,
    `<div class="debunk-card info">
      <strong>3. Psychologický náznak (Schémová terapia Jeffreyho Younga):</strong><br />
      Tvoje odpovede naznačujú najčastejšie témy v oblasti: <strong>${escapeHtml(primary.schemaHint)}</strong>. Namiesto veštice sa s týmito vzorcami pracuje vedecky cez kognitívny reframing a pomenovanie vlastných hraníc.
    </div>`,
    `<h4 style="margin: 16px 0 6px 0;">Krok za krokom — každá technika použitá proti tebe:</h4>`,
    auditHtml
  ];
  document.getElementById("resultDebunk").innerHTML = debunkHtml.join("");
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

btnCalibrate.addEventListener("click", startCalibration);

btnCancelCal.addEventListener("click", () => {
  calibrating = false;
  mBaseline.textContent = baselineStats ? "Baseline: Hotová" : "Baseline: Neaktívna";
  showStage("stageIntro");
});

btnSkipCam.addEventListener("click", () => {
  openReadyStage(false);
});

btnStartTest.addEventListener("click", startSelectedTest);

btnRecalibrate.addEventListener("click", () => {
  if (running) startCalibration();
  else showStage("stageIntro");
});

btnPipMode.addEventListener("click", () => {
  pipCompact = !pipCompact;
  pipHud.classList.toggle("compact", pipCompact);
  btnPipMode.textContent = pipCompact ? "Obraz" : "Mini";
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
  openReadyStage(running && Boolean(baselineStats));
});

document.getElementById("btnBackIntro").addEventListener("click", () => {
  if (qTimerInterval) clearInterval(qTimerInterval);
  showStage("stageIntro");
});

initBars();
initPresets();
log(`The Mirror v3 pripravený (${getTotalNodeCount()} uzlov, Pre-Start obrazovka + PiP Face-Lock HUD).`);
