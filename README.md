# MindShield & The Mirror — Portable Dev Workspace

Pripravené priamo na import do **Claude Code**, **OpenAI Codex** alebo **Google Antigravity**.

## Rýchly štart (Webová verzia — The Mirror)
```bash
cd web-mirror
python3 -m http.server 8080
```
Otvor `http://localhost:8080` v Chrome / Edge (alebo cez HTTPS na mobile).
- Obsahuje lokálny **MediaPipe Face Landmarker** (52 FACS Blendshapes).
- Prepínač **Predná / Zadná kamera**.
- 10-sekundová **Baseline kalibrácia** + výpočet Z-score špičiek.
- Experimentálny **rPPG** odhad tepu zo zeleného kanála čela.
- Režim **Veštec** + **FLIP MODE (Debunk)** + export jednotného JSON pre Python backend.

## Rýchly štart (Python DSP Backend — NeuroKit2)
```bash
cd backend-dsp
docker compose up --build
```
Swagger API dokumentácia: `http://localhost:8000/docs`

## Android / Wear OS (Galaxy Watch 6 sonda + CameraX)
Zdrojové Kotlin moduly sú v `android-wearos-probe/`:
1. `wear/SensorProbeService.kt` — výpis všetkých systémových a Samsung vendor senzorov cez ADB logcat.
2. `mobile/FaceMicroexpressionAnalyzer.kt` — CameraX + MediaPipe GPU analyzer (predná aj zadná kamera).
3. `mobile/FingerPpgAnalyzer.kt` — ranné HRV cez prst na zadnej kamere s LED bleskom (bez hodiniek).
