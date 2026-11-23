# MindShield & The Mirror (v2.3) — Complete Portable Workspace

Kompletný repozitár pripravený priamo pre **GitHub Desktop**, **GitHub Pages**, **Claude Code**, **OpenAI Codex** a **Google Antigravity**.

## Obsah repozitára
- `.gitattributes` — zjednotenie koncov riadkov (`LF` pre web/kód, `CRLF` pre Windows `.ps1`/`.bat`) bez varovaní v GitHub Desktop.
- `.gitignore` — ochrana tajných kľúčov, `.env` a lokálnych build súborov vo verejnom repozitári.
- `.github/workflows/deploy-pages.yml` — automatické publikovanie priečinka `web-mirror/` na GitHub Pages pri každom pushi do vetvy `main`.
- `web-mirror/` — **The Mirror v2.3** (30-uzlový adaptívny graf, prípravná obrazovka so ŠTART tlačidlom, plávajúce mini okno tváre, detekcia orezania a pohybu, GPU/CPU fallback MediaPipe).
- `backend-dsp/` — FastAPI + NeuroKit2 DSP backend pre HRV analýzu a synchronizáciu biometrie.
- `android-wearos-probe/` — Kotlin moduly pre Galaxy Watch 6 sondu, CameraX MediaPipe a Finger PPG.

## Nasadenie cez GitHub Desktop na GitHub Pages
1. V GitHub Desktop zvoľ **File -> Add local repository** a vyber tento koreňový priečinok (`mindshield-mirror-workspace-v2.3`).
2. Klikni na **Publish repository** (odškrtni *Keep this code private*, pre bezplatný GitHub Pages musí byť repozitár verejný).
3. Na GitHube otvor **Settings -> Pages** a v časti **Source** vyber **GitHub Actions**.
4. Po dokončení workflow v záložke **Actions** otvor vygenerovanú `https://...github.io/...` adresu v Chrome na mobile.

## Lokálne spustenie na PC
```bash
cd web-mirror
python3 -m http.server 8080
```
