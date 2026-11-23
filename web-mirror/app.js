import {
  FaceLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs";

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

const QUESTIONS = [
  {
    id: "q1",
    text: "Keď prídeš do nového prostredia alebo riešiš zložitý problém, čo urobíš ako prvé?",
    options: [
      { code: "A", label: "Preberiem kontrolu a nastavím pravidlá, irituje ma chaos.", trait: "control" },
      { code: "B", label: "Pozorujem systém v tichosti a až potom urobím presný ťah.", trait: "observer" },
      { code: "C", label: "Uvoľním atmosféru a najprv nadviažem ľudský kontakt.", trait: "connector" }
    ]
  },
  {
    id: "q2",
    text: "Čo ťa dokáže najviac vnútorne vytočiť na blízkych ľuďoch?",
    options: [
      { code: "A", label: "Pretvárka, povrchnosť a klamstvo do očí.", trait: "authenticity" },
      { code: "B", label: "Neschopnosť rozhodnúť sa a prenášanie zodpovednosti na mňa.", trait: "burden" },
      { code: "C", label: "Nelojalita v momente, keď potrebujem oporu.", trait: "loyalty" }
    ]
  },
  {
    id: "q3",
    text: "Čo robíš, keď prežívaš silný vnútorný stres alebo obavu?",
    options: [
      { code: "A", label: "Uzavriem sa, rozoberiem to racionálne a vyriešim sám.", trait: "isolate" },
      { code: "B", label: "Ponorím sa do práce alebo projektov, aby som nad tým nepremýšľal.", trait: "workaholism" },
      { code: "C", label: "Potrebujem to vyrozprávať jednému človeku, ktorému verím.", trait: "confide" }
    ]
  },
  {
    id: "q4",
    text: "Ktorý vnútorný motor ťa ženie dopredu najsilnejšie?",
    options: [
      { code: "A", label: "Rozumieť veciam pod povrchom, aby ma nikto neoklamal.", trait: "vigilance" },
      { code: "B", label: "Vybudovať bezpečné a pevné zázemie pre seba a rodinu.", trait: "security" },
      { code: "C", label: "Sloboda rozhodovania bez cudzieho diktátu.", trait: "autonomy" }
    ]
  },
  {
    id: "q5",
    text: "Ktorá vec z minulosti v tebe občas vyvolá tichý nepokoj?",
    options: [
      { code: "A", label: "Použil som svoj prehľad príliš tvrdo voči druhému človeku.", trait: "power_guilt" },
      { code: "B", label: "Zanedbal som blízkeho človeka kvôli vlastným cieľom.", trait: "neglect_guilt" },
      { code: "C", label: "Veril som nesprávnym ľuďom a vyčítam si vtedajšiu naivitu.", trait: "betrayal_scar" }
    ]
  }
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
const mBaseline = document.getElementById("mBaseline");
const mZscore = document.getElementById("mZscore");
const mBpm = document.getElementById("mBpm");

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
let baselineStats = null; // { key: { mean, std } }

// Experimental forehead rPPG buffer (green channel mean over time)
const rppgCanvas = document.createElement("canvas");
const rppgCtx = rppgCanvas.getContext("2d", { willReadFrequently: true });
const rppgBuffer = []; // { t, g }
const RPPG_WINDOW_MS = 12000;

// Session record (matches backend-dsp/app/schemas.py)
let sessionData = createEmptySession();
let currentQIndex = 0;
let qDisplayedAtMs = 0;
let qTimerInterval = null;

function createEmptySession() {
  return {
    session_id: `mirror_${Date.now()}`,
    created_at_ms: Date.now(),
    tier: "tier1_web_mediapipe",
    camera_facing: facingMode,
    baseline_calibrated: false,
    questions: [],
    microexpression_spikes: [],
    rppg_estimates: []
  };
}

function log(msg) {
  const ts = new Date().toISOString().split("T")[1].slice(0, 8);
  debugLog.textContent = `[${ts}] ${msg}
` + debugLog.textContent.slice(0, 2500);
}

function showStage(id) {
  document.querySelectorAll(".stage").forEach((el) => el.classList.remove("active"));
  document.getElementById(id).classList.add("active");
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

    const constraints = {
      audio: false,
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 60, min: 30 }
      }
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    await video.play();

    const trackSettings = stream.getVideoTracks()[0].getSettings();
    log(`Kamera aktívna (${facingMode}): ${trackSettings.width}x${trackSettings.height} @ ${Math.round(trackSettings.frameRate || 30)} fps`);

    overlay.width = video.videoWidth || 640;
    overlay.height = video.videoHeight || 480;
    rppgCanvas.width = 64;
    rppgCanvas.height = 64;

    running = true;
    statusPill.textContent = `Aktívna (${facingMode === "user" ? "Predná" : "Zadná"})`;
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
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  statusPill.textContent = "Kamera vypnutá";
  statusPill.className = "pill offline";
  btnStartCam.textContent = "Spustiť kameru a MediaPipe";
}

function extractForeheadRppg(landmarks, nowMs) {
  // Forehead ROI roughly around landmark 10 (top center) and 151 (glabella)
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
  const pxCount = img.length / 4;
  for (let i = 0; i < img.length; i += 4) {
    greenSum += img[i + 1];
  }
  const gMean = greenSum / pxCount;
  rppgBuffer.push({ t: nowMs, g: gMean });

  while (rppgBuffer.length > 0 && nowMs - rppgBuffer[0].t > RPPG_WINDOW_MS) {
    rppgBuffer.shift();
  }

  // Estimate BPM via detrended zero-crossing / peak cadence every ~1s when window >= 6s
  if (rppgBuffer.length > 120 && frameCount % 30 === 0) {
    const durationSec = (rppgBuffer[rppgBuffer.length - 1].t - rppgBuffer[0].t) / 1000;
    if (durationSec >= 6) {
      const vals = rppgBuffer.map((p) => p.g);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const centered = vals.map((v) => v - mean);

      // Simple moving average smoothing (window 5)
      const smooth = [];
      for (let i = 2; i < centered.length - 2; i++) {
        smooth.push((centered[i - 2] + centered[i - 1] + centered[i] + centered[i + 1] + centered[i + 2]) / 5);
      }

      let peaks = 0;
      let lastPeakIdx = -10;
      const minGap = Math.max(8, Math.floor((smooth.length / durationSec) * 0.42)); // max ~140 bpm
      for (let i = 1; i < smooth.length - 1; i++) {
        if (smooth[i] > smooth[i - 1] && smooth[i] > smooth[i + 1] && smooth[i] > 0.05) {
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
      // Draw minimal forehead ROI + key anchor points
      const forehead = lm[151];
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        forehead.x * overlay.width - 18,
        forehead.y * overlay.height - 14,
        36,
        28
      );
      extractForeheadRppg(lm, nowPerf);
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

  // Record statistically significant microexpression spikes during active questioning
  if (baselineStats && document.getElementById("stageQuestion").classList.contains("active") && maxZ >= 2.2) {
    const lastSpike = sessionData.microexpression_spikes[sessionData.microexpression_spikes.length - 1];
    if (!lastSpike || nowEpoch - lastSpike.timestamp_ms > 250) {
      sessionData.microexpression_spikes.push({
        timestamp_ms: nowEpoch,
        question_id: QUESTIONS[currentQIndex].id,
        blendshape: maxKey,
        z_score: Number(maxZ.toFixed(2))
      });
    }
  }
}

function startCalibration() {
  sessionData = createEmptySession();
  for (const s of TRACKED_SHAPES) calSamples[s.key] = [];
  calibrating = true;
  calStartMs = Date.now();
  mBaseline.textContent = "Prebieha...";
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
  mBaseline.textContent = "Hotová";
  log("Kalibrácia dokončená. Spúšťam profilovacie otázky.");
  startQuestions();
}

function startQuestions() {
  currentQIndex = 0;
  showStage("stageQuestion");
  renderQuestion();
}

function renderQuestion() {
  const q = QUESTIONS[currentQIndex];
  document.getElementById("qStep").textContent = `OTÁZKA ${currentQIndex + 1} / ${QUESTIONS.length}`;
  document.getElementById("qText").textContent = q.text;

  const optsEl = document.getElementById("qOptions");
  optsEl.innerHTML = "";
  qDisplayedAtMs = Date.now();

  if (qTimerInterval) clearInterval(qTimerInterval);
  qTimerInterval = setInterval(() => {
    document.getElementById("qTimer").textContent = `${Date.now() - qDisplayedAtMs} ms`;
  }, 50);

  for (const opt of q.options) {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = `${opt.code}) ${opt.label}`;
    btn.addEventListener("click", () => selectAnswer(q, opt));
    optsEl.appendChild(btn);
  }
}

function selectAnswer(q, opt) {
  const answeredAtMs = Date.now();
  const latencyMs = answeredAtMs - qDisplayedAtMs;
  sessionData.questions.push({
    question_id: q.id,
    displayed_at_ms: qDisplayedAtMs,
    answered_at_ms: answeredAtMs,
    latency_ms: latencyMs,
    answer_code: opt.code,
    trait: opt.trait
  });

  log(`Odpoveď ${q.id}: ${opt.code} (${latencyMs} ms)`);
  currentQIndex++;
  if (currentQIndex < QUESTIONS.length) {
    renderQuestion();
  } else {
    clearInterval(qTimerInterval);
    buildResults();
    showStage("stageResult");
  }
}

function buildResults() {
  const traits = new Set(sessionData.questions.map((q) => q.trait));
  const avgLatency = Math.round(
    sessionData.questions.reduce((a, b) => a + b.latency_ms, 0) / sessionData.questions.length
  );
  const slowest = [...sessionData.questions].sort((a, b) => b.latency_ms - a.latency_ms)[0];

  // 1. Oracle Mode (Illusion)
  const oracleLines = [
    "<h3>Tvoja osobná veštba (Simulácia veštice)</h3>",
    "<p>Tvoja energia ukazuje na silnú vnútornú potrebu samostatnosti. Navonok pôsobíš vyrovnane a silno, ale v tichých chvíľach v sebe nesieš otázku, či dávaš svoju dôveru správnym ľuďom.</p>"
  ];
  if (traits.has("control") || traits.has("autonomy")) {
    oracleLines.push("<p>Vidím okolo teba líderskú stopu — neznesieš, keď ti niekto diktuje smer. Ľudia sa o teba opierajú, aj keď si málokedy všimnú, aký tlak to na teba kladie.</p>");
  }
  if (traits.has("betrayal_scar") || traits.has("vigilance")) {
    oracleLines.push("<p>Minulé sklamanie v dôvere v tebe vytvorilo neviditeľný štít. Analyzuješ okolie pod povrchom, lebo tvoja duša sa chráni pred ďalším zneužitím.</p>");
  }
  oracleLines.push("<p><strong>Skrytý potenciál:</strong> Riešenie tvojej aktuálnej dilemy už v sebe poznáš, len čakáš na správny moment, aby si zložil brnenie.</p>");
  document.getElementById("resultOracle").innerHTML = oracleLines.join("");

  // 2. Flip Mode (Debunk + Biometrics)
  const spikesByQ = {};
  for (const sp of sessionData.microexpression_spikes) {
    spikesByQ[sp.question_id] = (spikesByQ[sp.question_id] || 0) + 1;
  }

  const debunkLines = [
    "<h3>FLIP MODE: Čo sa v skutočnosti stalo (Žiadna mágia)</h3>",
    `<div class="debunk-card"><strong>1. Barnumov efekt a Dúhová lesť:</strong> Veta „navonok pôsobíš silno, ale v tichu pochybuješ“ sedí na viac než 90 % populácie. Veštice ju používajú v prvých 30 sekundách na vytvorenie falošnej dôvery.</div>`,
    `<div class="debunk-card"><strong>2. Recyklácia tvojich vlastných dát (Feed-back loop):</strong> Text veštby neobsahoval žiadnu novú informáciu. Len parafrázoval tvoje vlastné voľby (${[...traits].join(", ")}) do mystického jazyka.</div>`,
    `<div class="debunk-card ok"><strong>3. Kognitívna záťaž (Latencia odpovedí):</strong> Priemerný čas reakcie bol <strong>${avgLatency} ms</strong>. Najdlhšie si váhal pri otázke <strong>${slowest.question_id.toUpperCase()}</strong> (${slowest.latency_ms} ms) — v psychológii to indikuje vyššiu kognitívnu záťaž alebo citlivú tému.</div>`,
    `<div class="debunk-card ok"><strong>4. Lokálne FACS mikrovýrazy (> 2.2σ od tvojho základu):</strong> Celkovo zachytených špičiek: <strong>${sessionData.microexpression_spikes.length}</strong>. Rozloženie po otázkach: <code>${JSON.stringify(spikesByQ)}</code>. Žiadne video neopustilo tvoje zariadenie.</div>`
  ];
  document.getElementById("resultDebunk").innerHTML = debunkLines.join("");
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
  sessionData = createEmptySession();
  sessionData.tier = "tier0_text_latency_only";
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
  showStage("stageIntro");
});

initBars();
log("Systém pripravený. Spusti kameru pre 60fps FACS analýzu.");
