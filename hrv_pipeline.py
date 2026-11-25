"""
Vlastná (clean-room) implementácia PPG -> RR -> HRV -> stres.

Postup zodpovedá architektúre zistenej vo Welltory 4.30.70
(IIR filter -> transformácia špičiek -> find_peaks s minimálnou vzdialenosťou
-> spresnenie vrcholu -> RR -> filter artefaktov -> RMSSD / SDNN /
Baevsky stress index + technická kvalita), ale kód je napísaný od nuly podľa
publikovaných metód, nič z Welltory nie je skopírované.

Závislosti: numpy, scipy
    pip install numpy scipy
"""
from __future__ import annotations

from dataclasses import dataclass
import numpy as np
from scipy.signal import butter, sosfiltfilt, find_peaks


# ---------------------------------------------------------------- 1. PPG -> RR
def bandpass(ppg: np.ndarray, fs: float, lo: float = 0.5, hi: float = 4.0) -> np.ndarray:
    """Obojsmerný (zero-phase) Butterworth pásmový filter: 30-240 bpm."""
    sos = butter(3, [lo, hi], btype="band", fs=fs, output="sos")
    return sosfiltfilt(sos, ppg - np.mean(ppg))


def detect_beats(ppg: np.ndarray, fs: float, invert: bool = False) -> np.ndarray:
    """Vráti časy úderov v sekundách s presnosťou pod jednu vzorku.

    invert=True pre PPG, kde systolický vrchol je minimom surového signálu
    (záleží od senzora/SDK, over na reálnych dátach).
    """
    x = bandpass(-ppg if invert else ppg, fs)
    # minimálny odstup 0.33 s (~180 bpm), adaptívna prominencia
    peaks, _ = find_peaks(x, distance=max(1, int(0.33 * fs)),
                          prominence=0.3 * np.std(x))
    beats = []
    for k in peaks:
        if 0 < k < len(x) - 1:
            # parabolická interpolácia vrcholu (dôležité pri nízkom fs, napr. 25 Hz)
            y0, y1, y2 = x[k - 1], x[k], x[k + 1]
            den = y0 - 2 * y1 + y2
            off = 0.5 * (y0 - y2) / den if den != 0 else 0.0
            beats.append((k + float(np.clip(off, -1, 1))) / fs)
    return np.asarray(beats)


def rr_from_beats(beats_s: np.ndarray) -> np.ndarray:
    return np.diff(beats_s) * 1000.0  # ms


# ------------------------------------------------- 2. filter artefaktov (RR)
def clean_rr(rr_ms: np.ndarray, rel_tol: float = 0.2) -> tuple[np.ndarray, float]:
    """Odstráni fyziologicky nemožné a ektopické intervaly.

    Kritérium: 300-2000 ms a odchýlka od kĺzavého mediánu (5 úderov) < rel_tol.
    Vráti (čisté RR, podiel zahodených).
    """
    rr = np.asarray(rr_ms, dtype=float)
    if len(rr) == 0:
        return rr, 1.0
    ok = (rr > 300) & (rr < 2000)
    med = np.array([np.median(rr[max(0, i - 2):i + 3]) for i in range(len(rr))])
    ok &= np.abs(rr - med) / med < rel_tol
    return rr[ok], float(1.0 - ok.mean())


# ------------------------------------------------------------ 3. metriky HRV
@dataclass
class HrvResult:
    n: int
    mean_hr: float
    rmssd: float
    ln_rmssd: float
    sdnn: float
    pnn50: float
    baevsky_si: float
    quality: float  # 0..1, technická kvalita merania


def rmssd(rr: np.ndarray) -> float:
    return float(np.sqrt(np.mean(np.diff(rr) ** 2)))


def sdnn(rr: np.ndarray) -> float:
    return float(np.std(rr, ddof=1))


def pnn50(rr: np.ndarray) -> float:
    return float(np.mean(np.abs(np.diff(rr)) > 50) * 100)


def baevsky_stress_index(rr_ms: np.ndarray, bin_ms: float = 50.0) -> float:
    """Baevského index napätia: SI = AMo / (2 * Mo * MxDMn).

    Mo    = modálna hodnota RR [s] (stred najčastejšieho 50 ms binu)
    AMo   = % intervalov v modálnom bine
    MxDMn = rozpätie max-min [s]
    Orientačne: pokoj ~50-150, stres > 150. Často sa zobrazuje sqrt(SI).
    """
    rr = np.asarray(rr_ms)
    edges = np.arange(rr.min() // bin_ms * bin_ms, rr.max() + bin_ms, bin_ms)
    hist, edges = np.histogram(rr, bins=edges)
    i = int(np.argmax(hist))
    mo = (edges[i] + bin_ms / 2) / 1000.0
    amo = hist[i] / len(rr) * 100.0
    mxdmn = max((rr.max() - rr.min()) / 1000.0, 1e-3)
    return float(amo / (2 * mo * mxdmn))


def technical_quality(rejected_ratio: float, n_beats: int, target_beats: int) -> float:
    """Kvalita = podiel prijatých úderov x úplnosť merania."""
    return float(max(0.0, 1 - 2 * rejected_ratio) * min(1.0, n_beats / target_beats))


def analyze_rr(rr: np.ndarray, rejected_ratio: float = 0.0,
               target_beats: int = 100) -> HrvResult:
    rr = np.asarray(rr, dtype=float)
    if len(rr) < 20:
        nan = float("nan")
        return HrvResult(len(rr), nan, nan, nan, nan, nan, nan, 0.0)
    r = rmssd(rr)
    return HrvResult(
        n=len(rr),
        mean_hr=float(60000 / np.mean(rr)),
        rmssd=r,
        ln_rmssd=float(np.log(r)),
        sdnn=sdnn(rr),
        pnn50=pnn50(rr),
        baevsky_si=baevsky_stress_index(rr),
        quality=technical_quality(rejected_ratio, len(rr), target_beats),
    )


def analyze_ppg(ppg: np.ndarray, fs: float, target_beats: int = 100,
                invert: bool = False) -> HrvResult:
    beats = detect_beats(np.asarray(ppg, dtype=float), fs, invert=invert)
    rr, rej = clean_rr(rr_from_beats(beats))
    return analyze_rr(rr, rej, target_beats)


# ------------------------------------------ 4. osobná baseline a stres 0-100
class PersonalBaseline:
    """Kĺzavá baseline z ranných meraní (posledných `window` dní).

    Stres je relatívny k tebe: z-skóre ln(RMSSD) (nižšie = vyšší stres)
    kombinované so z-skóre tepu.
    """

    def __init__(self, window: int = 30, min_quality: float = 0.6):
        self.window = window
        self.min_quality = min_quality  # 0.6 = prah, ktorý Welltory používa pri auto meraní
        self.ln_rmssd: list[float] = []
        self.hr: list[float] = []

    def add_morning(self, res: HrvResult) -> bool:
        if res.quality < self.min_quality or np.isnan(res.ln_rmssd):
            return False
        self.ln_rmssd = (self.ln_rmssd + [res.ln_rmssd])[-self.window:]
        self.hr = (self.hr + [res.mean_hr])[-self.window:]
        return True

    def ready(self) -> bool:
        return len(self.ln_rmssd) >= 5

    def stress_score(self, res: HrvResult) -> float:
        """0 = výrazne uvoľnený, 50 = tvoja norma, 100 = výrazný stres."""
        def z(v: float, arr: list[float]) -> float:
            sd = float(np.std(arr, ddof=1)) or 1e-6
            return (v - float(np.mean(arr))) / sd
        zs = -0.7 * z(res.ln_rmssd, self.ln_rmssd) + 0.3 * z(res.mean_hr, self.hr)
        return float(np.clip(50 + 20 * zs, 0, 100))


if __name__ == "__main__":
    # Syntetický test: 25 Hz PPG, ~70 bpm s respiračnou arytmiou.
    rng = np.random.default_rng(0)
    fs, dur = 25.0, 120
    t = np.arange(0, dur, 1 / fs)
    inst_hr = 70 + 4 * np.sin(2 * np.pi * 0.25 * t)
    phase = 2 * np.pi * np.cumsum(inst_hr / 60) / fs
    ppg = np.sin(phase) + 0.3 * np.sin(2 * phase) + 0.1 * rng.standard_normal(len(t))
    print(analyze_ppg(ppg, fs, target_beats=120))
