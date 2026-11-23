import {
  FaceLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";
import {
  DOMAIN_META,
  NODES,
  getTotalNodeCount,
  rankDomains,
  resolveNextNodeId
} from "./dialogue-engine.js?v=2.3";

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
const btnStartTest = document.getElementById("btnStartTest");
const btnRecalibrate = document.getElementById("btnRecalibrate");
const btnBackIntro = document.getElementById("btnBackIntro");

const mFps = document.getElementById("mFps");
const mLight = document.getElementById("mLight");
const mBaseline = document.getElementById("mBaseline");
const mZscore = document.getElementById("mZscore");
const mBpm = document.getElementById("mBpm");

const calGuardBanner = document.getElementById("calGuardBanner");
const readyModeLabel = document.getElementById("readyModeLabel");
const readyCalLabel = document.getElementById("readyCalLabel");
const readyFramingLabel = document.getElementById("readyFramingLabel");

const qTrackingStrip = document.getElementById("qTrackingStrip");
const qTrackDot = document.getElementById("qTrackDot");
const qTrackText = document.getElementById("qTrackText");
const qTrackGate = document.getElementById("qTrackGate");

const oracleWhisper = document.getElementById("oracleWhisper");
const oracleWhisperText = document.getElementById("oracleWhisperText");

// Floating PiP HUD elements
const pipHud = document.getElementById("pipHud");
const pipDot = document.getElementById("pipDot");
const pipStatusText = document.getElementById("pipStatusText");
const btnPipToggle = document.getElementById("btnPipToggle");
const pipVideoBox = document.getElementById("pipVideoBox");
const pipGraphicBox = document.getElementById("pipGraphicBox");
const pipGraphicHint = document.getElementById("pipGraphicHint");
const pipCanvas = document.getElementById("pipCanvas");
const pipCtx = pipCanvas.getContext("2d");

// Runtime camera & MediaPipe state
let faceLandmarker = null;
let stream = null;
let facingMode = "user";
let running = false;
let rafId = null;
let lastVideoTime = -1;
let lastDetectTimestampMs = 0;
let frameCount = 0;
let lastFpsStamp = performance.now();
let lastFramePerf = performance.now();
let lastPipDrawPerf = 0;
let pipMinimized = false;

// Framing & Motion artifact detector state
let prevFaceCenter = null; // { x, y, h, t }
let motionCooldownUntil = 0;
let currentFraming = {
  status: "missing", // "ok" | "warn" | "danger" | "missing"
  shortText: "Mimo obrazu",
  hint: "Tvár nie je v obraze",
  motionArtifact: false,
  box: null
};

// Calibration state (pauses automatically if face leaves frame)
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

// Session & Stage state (all primitives declared BEFORE helper calls to prevent TDZ)
let activeStageId = "stageIntro";
let selectedTier = "tier1_web_mediapipe";
let maxSteps = 8;
let currentStep = 0;
let currentNodeId = "n01_entry";
let qDisplayedAtMs = 0;
let qTimerInterval = null;
let visitedIds = new Set();
let domainScores = createEmptyDomainScores();
let auditTrail = [];
let sessionData = createEmptySession(maxSteps);

// Per-question tracking quality accumulator (does not freeze stopwatch, gates FACS noise)
let qTrackStats = createEmptyQuestionTrackStats();

function createEmptyQuestionTrackStats() {
  return {
    totalFrames: 0,
    validFrames: 0,
    outOfFrameMs: 0,
    motionArtifactFrames: 0,
    suppressedSpikes: 0
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
      engine_version: "2.3.0",
      total_graph_nodes: getTotalNodeCount(),
      selected_depth: depth,
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

function showStage(id) {
  activeStageId = id;
  document.querySelectorAll(".stage").forEach((el) => el.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  updatePipVisibility();
}

function updatePipVisibility() {
  const shouldShowPip =
    running &&
    (activeStageId === "stageCalibration" ||
      activeStageId === "stageReady" ||
      activeStageId === "stageQuestion");
  pipHud.classList.toggle("hidden", !shouldShowPip);
  qTrackingStrip.classList.toggle("hidden", !(running && activeStageId === "stageQuestion"));
}

function getSelectedDepth() {
  const checked = document.querySelector('input[name="sessionDepth"]:checked');
  return checked ? Number(checked.value) : 8;
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

    lastVideoTime = -1;
    lastDetectTimestampMs = 0;
    rppgBuffer = [];
    prevFaceCenter = null;

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
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  statusPill.textContent = "Kamera vypnutá";
  statusPill.className = "pill offline";
  framingPill.textContent = "Tvár: --";
  framingPill.className = "pill pill-right offline";
  mLight.textContent = "--";
  mLight.className = "";
  btnStartCam.textContent = "Spustiť kameru a MediaPipe";
  updatePipVisibility();
  refreshReadyChecklist();
}

function evaluateFaceFraming(landmarks, nowPerf) {
  if (!landmarks || landmarks.length === 0) {
    prevFaceCenter = null;
    return {
      status: "danger",
      shortText: "Mimo obrazu",
      hint: "Tvár nie je v zábere — namier kameru na seba",
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

  // Motion velocity gate (detects phone repositioning / rapid head shift)
  let rapidMove = false;
  if (prevFaceCenter) {
    const dtSec = Math.max(0.016, (nowPerf - prevFaceCenter.t) / 1000);
    const dist = Math.hypot(cx - prevFaceCenter.x, cy - prevFaceCenter.y);
    const scaleDelta = Math.abs(h - prevFaceCenter.h) / dtSec;
    const speed = dist / dtSec;
    if (speed > 0.36 || scaleDelta > 0.45) {
      motionCooldownUntil = nowPerf + 450;
      rapidMove = true;
    }
  }
  prevFaceCenter = { x: cx, y: cy, h, t: nowPerf };
  const motionArtifact = rapidMove || nowPerf < motionCooldownUntil;

  // Margin & size checks
  const margin = 0.035;
  if (minX < margin || maxX > 1 - margin || minY < margin || maxY > 1 - margin) {
    const dir =
      minY < margin
        ? "posuň hlavu nižšie"
        : maxY > 1 - margin
          ? "posuň hlavu vyššie"
          : "vycentruj tvár do stredu";
    return {
      status: "danger",
      shortText: "Orezaná tvár",
      hint: `Časť tváre je mimo záber — ${dir}`,
      motionArtifact: true,
      box: { minX, maxX, minY, maxY, cx, cy, w, h }
    };
  }

  if (h < 0.21) {
    return {
      status: "warn",
      shortText: "Príliš ďaleko",
      hint: "Príď bližšie ku kamere pre presné mikrovýrazy",
      motionArtifact,
      box: { minX, maxX, minY, maxY, cx, cy, w, h }
    };
  }

  if (h > 0.86) {
    return {
      status: "warn",
      shortText: "Príliš blízko",
      hint: "Oddiaľ telefón, aby bola v zábere celá tvár",
      motionArtifact,
      box: { minX, maxX, minY, maxY, cx, cy, w, h }
    };
  }

  if (motionArtifact) {
    return {
      status: "warn",
      shortText: "Pohyb / úprava",
      hint: "Zaznamenaný pohyb — FACS filter krátko potlačený",
      motionArtifact: true,
      box: { minX, maxX, minY, maxY, cx, cy, w, h }
    };
  }

  return {
    status: "ok",
    shortText: "Tvár OK",
    hint: "Celá tvár v obraze — snímanie stabilné",
    motionArtifact: false,
    box: { minX, maxX, minY, maxY, cx, cy, w, h }
  };
}

function drawFramingGuide(targetCtx, width, height, status) {
  const color = status === "ok" ? "#22c55e" : status === "warn" ? "#f59e0b" : "#f43f5e";
  targetCtx.save();
  targetCtx.strokeStyle = color;
  targetCtx.lineWidth = Math.max(2, width * 0.004);
  targetCtx.setLineDash([6, 4]);
  targetCtx.beginPath();
  targetCtx.ellipse(width / 2, height / 2, width * 0.27, height * 0.37, 0, 0, Math.PI * 2);
  targetCtx.stroke();
  targetCtx.restore();
}

function updateFramingUi(framing, nowPerf) {
  const pillClass = framing.status === "ok" ? "online" : framing.status === "warn" ? "warn" : "danger";
  framingPill.textContent = `Tvár: ${framing.shortText}`;
  framingPill.className = `pill pill-right ${pillClass}`;

  // Update Floating PiP HUD
  pipHud.classList.remove("state-warn", "state-danger");
  if (framing.status === "warn") pipHud.classList.add("state-warn");
  if (framing.status === "danger") pipHud.classList.add("state-danger");

  pipDot.className = `status-dot ${framing.status}`;
  pipStatusText.textContent = framing.shortText;
  pipGraphicHint.textContent = framing.shortText;

  // Draw mini video thumbnail inside PiP (throttled to ~12 fps to save mobile CPU)
  if (!pipMinimized && !pipHud.classList.contains("hidden") && nowPerf - lastPipDrawPerf > 80) {
    lastPipDrawPerf = nowPerf;
    const pw = pipCanvas.width;
    const ph = pipCanvas.height;
    pipCtx.clearRect(0, 0, pw, ph);

    // Center-crop video into portrait PiP box
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const targetAspect = pw / ph;
    const srcAspect = vw / vh;
    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;
    if (srcAspect > targetAspect) {
      sw = vh * targetAspect;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetAspect;
      sy = (vh - sh) / 2;
    }

    pipCtx.save();
    if (facingMode === "user") {
      pipCtx.translate(pw, 0);
      pipCtx.scale(-1, 1);
    }
    pipCtx.drawImage(video, sx, sy, sw, sh, 0, 0, pw, ph);
    pipCtx.restore();

    drawFramingGuide(pipCtx, pw, ph, framing.status);
  }

  // Update inline strip during active question
  if (activeStageId === "stageQuestion" && running) {
    qTrackDot.className = `status-dot ${framing.status}`;
    qTrackText.textContent = framing.hint;
    qTrackGate.textContent = framing.motionArtifact ? "FACS filter: PAUZA" : "FACS: AKTÍVNE";
  }

  // Update ready checklist live
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

  // Gate rPPG during rapid head movement to avoid motion-induced fake heartbeats
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
    mFps.textContent = String(frameCount);
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
      ctx.clearRect(0, 0, overlay.width, overlay.height);

    const landmarks = result.faceLandmarks && result.faceLandmarks.length > 0 ? result.faceLandmarks[0] : null;
    currentFraming = evaluateFaceFraming(landmarks, nowPerf);

    drawFramingGuide(ctx, overlay.width, overlay.height, currentFraming.status);

    if (landmarks) {
      const forehead = landmarks[151];
      ctx.strokeStyle = currentFraming.motionArtifact ? "#f59e0b" : "#38bdf8";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        forehead.x * overlay.width - 18,
        forehead.y * overlay.height - 14,
        36,
        28
      );
      extractForeheadRppgAndLight(landmarks, nowPerf, currentFraming.status === "ok" && !currentFraming.motionArtifact);
    }

    updateFramingUi(currentFraming, nowPerf);

    // Track per-question quality metrics (without manipulating raw stopwatch!)
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
        calGuardBanner.textContent = "Tvár chýba v obraze — kalibrácia pozastavená. Vráť sa do oválu.";
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
      calGuardBanner.textContent = "Tvár v obraze — zbieram čistý neutrálny základ...";
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

  // Record FACS spike ONLY when face framing is clean (rejects phone-repositioning artifacts!)
  if (baselineStats && activeStageId === "stageQuestion" && maxZ >= 2.2) {
    if (currentFraming.status !== "ok" || currentFraming.motionArtifact) {
      qTrackStats.suppressedSpikes++;
    } else {
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
}

function refreshReadyChecklist() {
  if (running) {
    readyModeLabel.textContent = `Kamera (${facingMode === "user" ? "Predná" : "Zadná"}) + MediaPipe`;
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
  log("Spustená 10s Baseline kalibrácia (s ochranou polohy tváre).");
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
  log("Kalibrácia hotová. Čakám na potvrdenie ŠTART TESTU používateľom.");
  openReadyScreen();
}

function openReadyScreen() {
  refreshReadyChecklist();
  showStage("stageReady");
}

function beginTestFromReady() {
  maxSteps = getSelectedDepth();
  selectedTier = running ? "tier1_web_mediapipe" : "tier0_text_latency_only";
  sessionData = createEmptySession();
  sessionData.baseline_calibrated = Boolean(baselineStats && running);
  visitedIds = new Set();
  domainScores = createEmptyDomainScores();
  auditTrail = [];
  currentStep = 0;
  currentNodeId = "n01_entry";
  oracleWhisper.classList.add("hidden");
  oracleWhisperText.textContent = "";

  log(`ŠTART TESTU (${maxSteps} krokov, režim: ${selectedTier}). Časovač 1. otázky spustený.`);
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
  // Ignore questions where user spent >800ms repositioning phone out of frame
  const cleanQuestions = sessionData.questions.filter((q) => {
    const qual = sessionData.meta.question_quality[q.question_id];
    return !qual || qual.out_of_frame_ms <= 800;
  });
  if (cleanQuestions.length >= 3) {
    const sorted = [...cleanQuestions].sort((a, b) => b.latency_ms - a.latency_ms);
    const avg = cleanQuestions.reduce((s, q) => s + q.latency_ms, 0) / cleanQuestions.length;
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

  if (qTimerInterval) clearInterval(qTimerInterval);
  qTimerInterval = setInterval(() => {
    document.getElementById("qTimer").textContent = `${Date.now() - qDisplayedAtMs} ms`;
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
  const latencyMs = answeredAtMs - qDisplayedAtMs;

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
    question_id: node.id,
    question_text: node.text,
    chosen_label: opt.label,
    latency_ms: latencyMs,
    quality_pct: qualityPct,
    out_of_frame_ms: Math.round(qTrackStats.outOfFrameMs),
    suppressed_spikes: qTrackStats.suppressedSpikes,
    oracle_reaction: opt.oracleReaction,
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

  if (nextId) {
    renderNode(nextId, opt.oracleReaction);
  } else {
    finishSession();
  }
}

function finishSession() {
  if (qTimerInterval) clearInterval(qTimerInterval);
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
  const slowest = [...sessionData.questions].sort((a, b) => b.latency_ms - a.latency_ms)[0];
  const bioEvent = findStrongestBiometricEvent();

  const oracleHtml = [
    `<h3>Tvoja osobná veštba (Ilúzia)</h3>`,
    `<p class="oracle-quote">„Keď som spojil všetky tvoje signály, obraz sa úplne vyjasnil. Tvojím hlavným ohniskom v tomto období je <strong>${escapeHtml(primary.oracleTopic)}</strong>, pričom v pozadí do toho potichu zasahuje aj téma: ${escapeHtml(secondary.oracleTopic)}.“</p>`,
    `<p>Navonok pôsobíš vyrovnanejšie, než sa cítiš v tichých chvíľach. Máš v sebe silný vnútorný kompas, ale dlhodobo na seba berieš príliš veľa zodpovednosti a riešiš v hlave scenáre, ktoré ťa zbytočne vyčerpávajú.</p>`,
    bioEvent
      ? `<p>Navyše bolo zreteľne cítiť jemné vnútorné napätie v momente, keď sme sa priblížili k jadru problému (${escapeHtml(bioEvent.detail)}). Presne tam sa skrýva vec, ktorú už vnútorne poznáš, ale odkladáš jej vyslovenie nahlas.</p>`
      : `<p>Rytmus tvojich reakcií ukázal jasné zaváhanie presne tam, kde rozum bojuje s emóciou. Odpoveď na tvoju dilemu už v sebe dávno nosíš — zlom príde v najbližších mesiacoch v momente, keď prestaneš robiť kompromis sám proti sebe.</p>`,
    `<div class="debunk-card info"><strong>Zastav sa na 5 sekúnd:</strong> Ak si mal pri čítaní pocit, že to znie prekvapivo presne, klikni hore na červené tlačidlo <strong>FLIP MODE: Pitva trikov</strong> a pozri si presnú analýzu.</div>`
  ];
  document.getElementById("resultOracle").innerHTML = oracleHtml.join("");

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
          <p class="audit-choice"><strong>Tvoja voľba:</strong> ${escapeHtml(item.chosen_label)}${escapeHtml(motionNote)}</p>
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
      Nevytiahla to z kariet ani z energie. Už tvoje prvé kliknutie pridelilo oblasti <em>${escapeHtml(primary.label)}</em> najvyššiu váhu (skóre: <code>${JSON.stringify(domainScores)}</code>) a presmerovalo rozhovor do pripravenej vetvy z 30-uzlového scenára.
    </div>`,
    `<div class="debunk-card ok">
      <strong>2. Kognitívna záťaž a kvalita snímania:</strong><br />
      Priemerný čas odpovede: <strong>${avgLatency} ms</strong>. Najdlhšie váhanie nastalo pri kroku <code>${slowest ? slowest.question_id : "-"}</code> (<strong>${slowest ? slowest.latency_ms : 0} ms</strong>).
      Čisté FACS mikrovýrazy nad 2.2σ (po odfiltrovaní pohybov hlavy): <strong>${sessionData.microexpression_spikes.length}</strong> (<code>${JSON.stringify(spikesByQ)}</code>). Video neopustilo tvoje zariadenie.
    </div>`,
    `<div class="debunk-card info">
      <strong>3. Psychologický náznak (Schémová terapia Jeffreyho Younga):</strong><br />
      Tvoje odpovede naznačujú najčastejšie témy v oblasti: <strong>${escapeHtml(primary.schemaHint)}</strong>.
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

btnSkipCam.addEventListener("click", () => {
  selectedTier = "tier0_text_latency_only";
  openReadyScreen();
});

btnStartTest.addEventListener("click", beginTestFromReady);
btnRecalibrate.addEventListener("click", startCalibration);
btnBackIntro.addEventListener("click", () => showStage("stageIntro"));

btnPipToggle.addEventListener("click", () => {
  pipMinimized = !pipMinimized;
  pipVideoBox.classList.toggle("hidden", pipMinimized);
  pipGraphicBox.classList.toggle("hidden", !pipMinimized);
  btnPipToggle.textContent = pipMinimized ? "Vid" : "Min";
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

window.addEventListener("error", (ev) => {
  log(`RUNTIME CHYBA: ${ev.message}`);
});
window.addEventListener("unhandledrejection", (ev) => {
  const reason = ev.reason && ev.reason.message ? ev.reason.message : String(ev.reason);
  log(`ASYNC CHYBA: ${reason}`);
});

initBars();
log(`The Mirror v2.3 pripravený (${getTotalNodeCount()} uzlov + opravený štart + GPU/CPU fallback).`);
