from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class QuestionEvent(BaseModel):
    question_id: str
    displayed_at_ms: int = Field(..., gt=0)
    answered_at_ms: int = Field(..., gt=0)
    latency_ms: int = Field(..., ge=0)
    answer_code: str
    trait: Optional[str] = None


class MicroexpressionSpike(BaseModel):
    timestamp_ms: int = Field(..., gt=0)
    question_id: str
    blendshape: str
    z_score: float = Field(..., ge=0.0)


class IbiSample(BaseModel):
    timestamp_ms: int = Field(..., gt=0)
    ibi_ms: float = Field(..., ge=250.0, le=2000.0, description="Inter-beat interval in ms")


class RppgEstimate(BaseModel):
    timestamp_ms: int = Field(..., gt=0)
    bpm: float = Field(..., ge=35.0, le=220.0)


class TelemetrySessionRequest(BaseModel):
    session_id: str
    created_at_ms: int
    tier: Literal[
        "tier0_text_latency_only",
        "tier1_web_mediapipe",
        "tier1_finger_ppg",
        "tier2_wearos_watch",
        "tier3_ble_chest_strap",
    ]
    baseline_calibrated: bool = False
    questions: List[QuestionEvent] = Field(default_factory=list)
    microexpression_spikes: List[MicroexpressionSpike] = Field(default_factory=list)
    ibi_samples: List[IbiSample] = Field(default_factory=list)
    rppg_estimates: List[RppgEstimate] = Field(default_factory=list)


class HrvSummary(BaseModel):
    valid: bool
    sample_count: int
    mean_hr_bpm: Optional[float] = None
    rmssd_ms: Optional[float] = None
    sdnn_ms: Optional[float] = None
    note: str


class QuestionAnomaly(BaseModel):
    question_id: str
    latency_ms: int
    latency_z_score: float
    spike_count: int
    max_facs_z_score: float
    arousal_index: float


class SessionAnalysisResponse(BaseModel):
    session_id: str
    tier: str
    hrv_summary: HrvSummary
    question_anomalies: List[QuestionAnomaly]
    highest_arousal_question: Optional[str]
    disclaimer: str
