# Architecture Blueprint: The Mirror & MindShield OS

## 1. Product Split (Funnel + Retention Engine)
1. **The Mirror (Web MVP — `web-mirror/`):** Zero-install viral debunk tool. Performs calibrated Cold Reading while tracking response latency, MediaPipe facial microexpressions (FACS Blendshapes), and experimental forehead rPPG. Then activates **Flip Mode** to reveal the psychological tricks and physiological spikes.
2. **MindShield OS (Android + Wear OS — `android-wearos-probe/` + `backend-dsp/`):** Daily retention app combining morning HRV readiness, Schema Therapy micro-cards, Cognitive Reframing exercises, and autonomic down-regulation audio.

## 2. Three-Tier Biometric Abstraction Layer
| Tier | Hardware | Use Case | Expected Accuracy |
| :--- | :--- | :--- | :--- |
| **Tier 1A** | Front/Rear Camera (60 fps) | Microexpressions (52 Blendshapes) + experimental forehead rPPG during live sessions | High for FACS; Low-Medium for rPPG (lighting/motion sensitive) |
| **Tier 1B** | Rear Camera + LED Torch | Morning 60s Finger PPG HRV check (no watch required) | High (r > 0.95 vs ECG when stationary) |
| **Tier 2** | Samsung Galaxy Watch 6 (Wear OS) | Continuous PPG/IBI + Accelerometer + Skin Temp (sleep/morning trends) | High (requires Privileged Health SDK for production Play Store; SensorManager probe for local lab) |
| **Tier 3** | BLE GATT Chest Strap (e.g. Polar H10) | Pro Stress Lab — millisecond R-R intervals + raw ECG open GATT stream | Clinical-grade |

## 3. Data Flow & Synchronization
```text
[Question Event (t_ms)] ----+
[MediaPipe FACS (60 fps)] --+--> [Sync Buffer (ms epoch)] --> [Z-Score vs 15s Baseline] --> [Compact JSON] --> [FastAPI + NeuroKit2] --> [LLM Reasoning]
[IBI / rPPG / Acc Stream] --+
```

## 4. Camera Strategy
- **Self-Profiling Mode:** Front camera (`facingMode: "user"` / `LENS_FACING_FRONT`), target 60 fps.
- **Observer / Interviewer Mode:** Rear camera (`facingMode: "environment"` / `LENS_FACING_BACK`), superior low-light optics and autofocus.
- **Constraint:** Never attempt simultaneous Front Face + Rear Torch Finger PPG on consumer Android devices due to Camera2 ISP concurrency limits and LED thermal discomfort.

## 5. LLM Model Routing (Cost & Limit Optimization)
- **Tier A (Architecture, DSP math, security audit):** Claude Opus / Sonnet Thinking, OpenAI o3 / Codex high, Gemini Pro.
- **Tier B (Feature implementation, UI, Kotlin boilerplate, unit tests):** Claude Sonnet / Haiku, Gemini Flash.
- **Tier C (Zero-cost local autocomplete & refactors on RTX 3070 Ti 8GB):** Qwen 2.5 Coder 7B Instruct (Q4_K_M / Q6_K) via Ollama / LM Studio.
