# MindShield & The Mirror — Agent Engineering Rules

This repository is structured for seamless autonomous or pair-programming execution in **Claude Code**, **OpenAI Codex**, and **Google Antigravity**.

## Core Architecture Rules (Non-Negotiable)
1. **Local-First Privacy (Zero Video Retention):** Camera frames are processed strictly on-device via MediaPipe Face Landmarker. NEVER upload raw video frames or face images to any backend or LLM API. Only numeric telemetry (Blendshape Z-scores, timestamps, latency, HRV metrics) crosses the network boundary.
2. **Unified Telemetry Contract:** All sensor tiers (Tier 1 Web/Mobile rPPG + Finger PPG, Tier 2 Wear OS Galaxy Watch, Tier 3 BLE GATT Polar H10) MUST emit the exact JSON schema defined in `backend-dsp/app/schemas.py`.
3. **Production Code Only:** No stubs, no pseudocode, no silent `except: pass`. Every service must implement input validation, structured logging, graceful hardware degradation (e.g., camera denied, low lighting, missing watch), and safe resource teardown (release camera, torch off, unregister sensors).
4. **Scientific Integrity:** Never label biometric arousal as "Lie Detection". Always classify as `autonomic_arousal` / `cognitive_load` relative to an explicit personal baseline (Z-score).
5. **No Regulatory Violations:** Do NOT add medical diagnostic claims (no disease detection, no iridology, no clinical ECG diagnosis).

## Directory Map
- `web-mirror/` — Standalone zero-build Web MVP (MediaPipe 52 Blendshapes, Front/Rear camera switch, Baseline calibration, rPPG trend, Cold Reading + Debunk Flip Mode).
- `backend-dsp/` — FastAPI + NeuroKit2 DSP synchronization & HRV engine (Dockerized).
- `android-wearos-probe/` — Kotlin starter modules for Galaxy Watch 6 raw sensor probe, Android CameraX MediaPipe analyzer, and Finger PPG torch analyzer.
- `ARCHITECTURE.md` — System design, biometric tiers, and LLM routing strategy.

## Quick Commands
- Run Web MVP locally: `cd web-mirror && python3 -m http.server 8080`
- Run DSP Backend: `cd backend-dsp && docker compose up --build`
- Validate Python syntax: `python3 -m py_compile backend-dsp/app/*.py`

## Context & Token Discipline for AI Agents
- Read ONLY the directory relevant to the active task.
- Finish one atomic task, verify tests/syntax, commit, then reset session context.
- Route heavy architecture/DSP math to Reasoning models (Opus / o3 / Gemini Pro); route UI, tests, and refactors to Fast models (Sonnet / Flash / local Qwen Coder).
