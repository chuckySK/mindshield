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
} from "./dialogue-engine.js";

// Key FACS-mapped blendshapes for microexpression arousal detection
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
const debugLog = document.getElementById("debugLog");
const blendshapeBars = document.getElementById("blendshapeBars");

const btnStartCam = document.getElementById("btnStartCam");
const btnToggleCam = document.getElementById("btnToggleCam");
const btnCalibrate = document.getElementById("btnCalibrate");
const btnSkipCam = document.getElementById("btnSkipCam");

const mFps = document.getElementById("mFps");
const mLight = document.getElementById("mLight");
const mBaseline = document.getElementById("mBaseline");
const mZscore = document.getElementById("mZscore");
const mBpm = document.getElementById("mBpm");

const oracleWhisper = document.getElementById("oracleWhisper");
const oracleWhisperText = document.getElementById("oracleWhisperText");

// Runtime state
let faceLandmarker = null;
let stream = null;
let facingMode = "user";
let running = false;
let rafId = null;
let lastVideoTime = -1;
let frameCount = 0;
let lastFpsStamp = performance.now();

// Baseline & Telemetry buffers
let calibrating = false;
let calStartMs = 0;
const CAL_DURATION_MS = 10000;
const calSamples = {};
let baselineStats = null;

// Experimental forehead rPPG & Luma buffer
const rppgCanvas = document.createElement("canvas");
const rppgCtx = rppgCanvas.getContext("2d", { willReadFrequently: true });
let rppgBuffer = [];
const RPPG_WINDOW_MS = 12000;

// Interactive Dialogue State
let sessionData = createEmptySession();
let visitedIds = new Set();
let domainScores = createEmptyDomainScores();
let auditTrail = [];
let maxSteps = 8;
let currentStep = 0;
let currentNodeId = "n01_entry";
let qDisplayedAtMs = 0;
let qTimerInterval = null;

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
    tier: "tier1_web_mediapipe",
    camera_facing: facingMode,
    baseline_calibrated: false,
    questions: [],
    microexpression_spikes: [],
    rppg_estimates: [],
    meta: {
      engine_version: "2.0.0",
      total_graph_nodes: getTotalNodeCount(),
      selected_depth: maxSteps
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

    // Front camera uses lighter 640x480 to maximize mobile FPS & reduce low-light shutter drag.
    // Rear camera uses 1280x720 for superior optics and observer-mode accuracy.
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
    rppgBuffer = [];

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
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  statusPill.textContent = "Kamera vypnutá";
  statusPill.className = "pill offline";
  mLight.textContent = "--";
  mLight.className = "";
  btnStartCam.textContent = "Spustiť kameru a MediaPipe";
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
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (result.faceLandmarks && result.faceLandmarks.length > 0) {
      const lm = result.faceLandmarks[0];
      const forehead = lm[151];
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        forehead.x * overlay.width - 18,
        forehead.y * overlay.height - 14,
        36,
        28
      );
      extractForeheadRppgAndLight(lm, nowPerf);
    }

    if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
      const categories = result.faceBlendshapes[0].categories;
      const map = Object.fromEntries(categories.map((c) => [c.categoryName, c.score]));
      handleBlendshapes(map, nowEpoch);
    }
  }

  rafId = requestAnimationFrame(processLoop);
}

function handleBlendshapes(map, nowEpoch) {
  if (calibrating) {
    const elapsed = nowEpoch - calStartMs;
    const pct = Math.min(100, (elapsed / CAL_DURATION_MS) * 100);
    document.getElementById("calProgress").style.width = `${pct}%`;
    document.getElementById("calCounter").textContent = `${(elapsed / 1000).toFixed(1)} / 10.0 s`;

    for (const s of TRACKED_SHAPES) {
      calSamples[s.key].push(map[s.key] || 0);
    }
    if (elapsed >= CAL_DURATION_MS) {
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
      bar.classList.toggle("spike", z >= 2.2);
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

  if (
    baselineStats &&
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

function resetDialogueState(tierName) {
  maxSteps = getSelectedDepth();
  sessionData = createEmptySession();
  sessionData.tier = tierName;
  sessionData.meta.selected_depth = maxSteps;
  visitedIds = new Set();
  domainScores = createEmptyDomainScores();
  auditTrail = [];
  currentStep = 0;
  currentNodeId = "n01_entry";
  oracleWhisper.classList.add("hidden");
  oracleWhisperText.textContent = "";
}

function startCalibration() {
  resetDialogueState("tier1_web_mediapipe");
  for (const s of TRACKED_SHAPES) calSamples[s.key] = [];
  calibrating = true;
  calStartMs = Date.now();
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
  sessionData.baseline_calibrated = true;
  mBaseline.textContent = "Baseline: Hotová";
  log("Kalibrácia hotová. Spúšťam adaptívny 30-uzlový graf.");
  startQuestions();
}

function startQuestions() {
  showStage("stageQuestion");
  renderNode(currentNodeId, null);
}

function findStrongestBiometricEvent() {
  // Prioritize FACS microexpression spike; fall back to clearest latency outlier
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
    oracle_reaction: opt.oracleReaction,
    technique: opt.technique,
    debunk: opt.debunkExplanation
  });

  log(`Krok ${currentStep} [${node.id}] -> ${opt.code} (${latencyMs} ms) | ${opt.technique}`);

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

  // 1. Rezim Vestec (Personalizovana synteza)
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

  // 2. FLIP MODE (Kompletna pitva manipulacie + biometria)
  const spikesByQ = {};
  for (const sp of sessionData.microexpression_spikes) {
    spikesByQ[sp.question_id] = (spikesByQ[sp.question_id] || 0) + 1;
  }

  const auditHtml = auditTrail
    .map((item) => {
      const spCount = spikesByQ[item.question_id] || 0;
      const spikeBadge = spCount > 0 ? ` | FACS špičky: ${spCount}` : "";
      return `
        <div class="audit-item">
          <div class="audit-head">
            <strong>Krok ${item.step} (${item.latency_ms} ms${spikeBadge})</strong>
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
      Nevytiahla to z kariet ani z energie. Už tvoje prvé kliknutie pridelilo oblasti <em>${escapeHtml(primary.label)}</em> najvyššiu váhu (skóre: <code>${JSON.stringify(domainScores)}</code>) a presmerovalo rozhovor do pripravenej vetvy z 30-uzlového scenára. Presne takto fungujú platené ezolinky za 2 € za minútu.
    </div>`,
    `<div class="debunk-card ok">
      <strong>2. Kognitívna záťaž a biometria:</strong><br />
      Priemerný čas odpovede: <strong>${avgLatency} ms</strong>. Najdlhšie váhanie nastalo pri kroku <code>${slowest ? slowest.question_id : "-"}</code> (<strong>${slowest ? slowest.latency_ms : 0} ms</strong>).
      Zachytené FACS mikrovýrazy nad 2.2σ: <strong>${sessionData.microexpression_spikes.length}</strong> (<code>${JSON.stringify(spikesByQ)}</code>). Video neopustilo tvoje zariadenie.
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

btnSkipCam.addEventListener("click", () => {
  resetDialogueState("tier0_text_latency_only");
  startQuestions();
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
  showStage("stageIntro");
});

initBars();
log(`The Mirror v2 pripravený (${getTotalNodeCount()} adaptívnych uzlov).`);
