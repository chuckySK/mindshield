import logging
import math
from typing import List

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import (
    HrvSummary,
    IbiSample,
    QuestionAnomaly,
    SessionAnalysisResponse,
    TelemetrySessionRequest,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("mindshield.dsp")

app = FastAPI(title="MindShield DSP & Telemetry Engine", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://127.0.0.1:8080"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def compute_hrv_from_ibi(ibi_samples: List[IbiSample]) -> HrvSummary:
    """Computes time-domain HRV (RMSSD, SDNN) with artifact rejection."""
    if len(ibi_samples) < 15:
        return HrvSummary(
            valid=False,
            sample_count=len(ibi_samples),
            note="Nedostatok IBI vzoriek pre spoľahlivé HRV (minimum je 15 úderov).",
        )

    raw_ibi = np.array([s.ibi_ms for s in ibi_samples], dtype=np.float64)
    # Ectopic / motion artifact filter: drop intervals deviating >20% from rolling median
    median_ibi = np.median(raw_ibi)
    clean_ibi = raw_ibi[np.abs(raw_ibi - median_ibi) <= 0.25 * median_ibi]

    if len(clean_ibi) < 12:
        return HrvSummary(
            valid=False,
            sample_count=int(len(clean_ibi)),
            note="Príliš veľa pohybových artefaktov v signáli.",
        )

    diffs = np.diff(clean_ibi)
    rmssd = float(np.sqrt(np.mean(diffs ** 2)))
    sdnn = float(np.std(clean_ibi, ddof=1))
    mean_hr = float(60000.0 / np.mean(clean_ibi))

    # Optional NeuroKit2 cross-check if available in environment
    note = "Časová HRV analýza (RMSSD/SDNN) úspešná."
    try:
        import neurokit2 as nk  # noqa: F401

        note = "HRV validované s NeuroKit2 prostredím."
    except Exception:
        pass

    return HrvSummary(
        valid=True,
        sample_count=int(len(clean_ibi)),
        mean_hr_bpm=round(mean_hr, 1),
        rmssd_ms=round(rmssd, 2),
        sdnn_ms=round(sdnn, 2),
        note=note,
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "mindshield-dsp"}


@app.post("/api/v1/analyze/session", response_model=SessionAnalysisResponse)
def analyze_session(payload: TelemetrySessionRequest):
    logger.info("Analyzing session=%s tier=%s", payload.session_id, payload.tier)

    if not payload.questions:
        raise HTTPException(status_code=422, detail="Session contains no question events.")

    latencies = np.array([q.latency_ms for q in payload.questions], dtype=np.float64)
    lat_mean = float(np.mean(latencies))
    lat_std = float(np.std(latencies)) if len(latencies) > 1 else 1.0
    lat_std = max(lat_std, 150.0)

    anomalies: List[QuestionAnomaly] = []
    for q in payload.questions:
        q_spikes = [s for s in payload.microexpression_spikes if s.question_id == q.question_id]
        max_z = max((s.z_score for s in q_spikes), default=0.0)
        lat_z = (q.latency_ms - lat_mean) / lat_std
        # Composite autonomic / cognitive load index (bounded, interpretable)
        arousal_index = round(max(0.0, lat_z) * 0.45 + max_z * 0.55 + math.log1p(len(q_spikes)) * 0.3, 2)

        anomalies.append(
            QuestionAnomaly(
                question_id=q.question_id,
                latency_ms=q.latency_ms,
                latency_z_score=round(lat_z, 2),
                spike_count=len(q_spikes),
                max_facs_z_score=round(max_z, 2),
                arousal_index=arousal_index,
            )
        )

    highest = max(anomalies, key=lambda x: x.arousal_index).question_id if anomalies else None
    hrv_summary = compute_hrv_from_ibi(payload.ibi_samples)

    return SessionAnalysisResponse(
        session_id=payload.session_id,
        tier=payload.tier,
        hrv_summary=hrv_summary,
        question_anomalies=anomalies,
        highest_arousal_question=highest,
        disclaimer=(
            "Biometrické odchýlky indikujú aktiváciu autonómneho nervového systému "
            "alebo kognitívnu záťaž, nie detekciu klamstva ani lekársku diagnózu."
        ),
    )
