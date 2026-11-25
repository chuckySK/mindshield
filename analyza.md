#  ako meria HRV konkurencia a stres, a ako to spraviť vo vlastnom projekte

Analýza je **statická**. APK som nespúšťal. Vychádzal som z reťazcov a odkazov v DEX bajtkóde a z exportovaných symbolov natívnych knižníc. Väčšina Kotlin kódu je obfuskovaná (`o/xyz`). Body označené **(odvodené)** nie sú priamo pozorované.

## 1. Architektúra

```
[Hodinky Wear OS]  -- surové PPG -->  [Telefón]  -- RR + kontext -->  [Welltory cloud]
     ^  /wear_message_path               |  /phone_message_path              |
     |  config, boiler (skóre)           v                                   v
     +---------------------------- natívna libcameraheartratemonitor.so    "boiler"
                                   (PPG -> RR, kvalita)                    (stres, energia,
                                                                            zdravie) cez Firestore
```

- **Hodinky RR nepočítajú.** Posielajú telefónu surové PPG. Telefónna služba `IncomingRequestPhoneService` (Wear Data Layer, `WearableListenerService`) prijme `DataMap` s položkou `measurement`. Tá sa deserializuje na:
  `WearOSMeasurement(startTime, endTime, isSilent, ppg: List<Long>, isManualMeasurement, isStartFromPhone)`.
  `ppg` je plochý zoznam dvojíc *(hodnota, časová pečiatka)*. Kód nepárny počet prvkov orezáva („PPG data has odd size, trimming last element“). Dvojice sa posielajú do natívneho `pushChannel(value, channel, timestamp)`.
- **Na telefóne** `WearOSHeartRateManager` vytvorí natívny `createRRRecognizer(...)` alebo „cloud“ variant. Výsledkom sú RR intervaly, priemerný tep, `qualityPercent` a `signalQuality`.
- **Stres, energiu a zdravie („boiler“) počíta server** **(odvodené)**: natívne `StressAdapter.stress/rmssd/sdnn` nikto v Jave nevolá. Výsledok sa číta z Firestore (`last_boiler`) a posiela späť na hodinky ako `WearOSBoiler(stress, health, energy, recommendation, boiler)` pre dlaždicu alebo komplikáciu.
- **Galaxy Watch (Tizen, staré modely)** používajú Samsung Accessory SDK (`MessageConsumer extends SAAgentV2`). Hodinky tam priamo vysielajú údery (`beatPublisher`).

### Správy hodinky ↔ telefón (kľúč `action`)

| action / kľúč | význam |
|---|---|
| `measurement` | výsledok merania (PPG) z hodiniek |
| `authorize_silent_measurement` | hodinky sa pýtajú, či môžu spraviť **automatické tiché** meranie |
| odpoveď `allowed`, `reason`, `next_auto_measurement_time` | `reason` ∈ `no_user`, `free_limit`, `frequency_limit` |
| `config_last_update` → `update_config` | synchronizácia `WearOSConfig(lastUpdateTime, isAutoMeasurementsEnabled, nextManualMeasurementTime, isLongMeasurementEnabled)` |
| `start`, `maybe_new_workout` | spustenie merania, detekcia tréningu |
| `permission_info` / `granted`, `check_permission` / `silent` | stav povolení senzorov na hodinkách |
| `wt_analytics`, `device_model_name`, `wear_os_version`… | telemetria |

Capability (na nájdenie uzla) sa volá `wear_app_welltory`.

### Pravidlá automatických meraní (pozorované)

- `auto_measurements_hour_limit` (vzdialený config) určuje minimálny odstup: `now - last_time_measurement < limit * 3600000 ms` → `frequency_limit`.
- Tiché meranie sa zahodí (`WearOS_AutoMeasurement_Cancelled`), keď je kvalita z knižnice **< 0.6**. Manuálne meranie prejde cez kontrolu „dyf“ (`measurement_quality`, `quality_type`).
- Cieľový počet úderov `camera_beats_count` je predvolene **100**, voliteľne **300 RR** („dlhé meranie“, `Settings_Measurement_300RR`). Pri prvom meraní cez Wear OS sa úspech kontroluje po **60 úderoch**.
- Nastavenia „health monitoring time“ sú 1 / 2 / 4 / 6 / 12 / 24 h.

## 2. Algoritmus PPG → RR → HRV (natívne symboly)

`libcameraheartratemonitor.so`, C++ s Eigen a KissFFT:

1. `apply_iir_filter`, `welltory::dsp::PassFilter`: pásmový IIR filter.
2. `rr_recognizer::choose_channel`: výber najlepšieho kanála (R/G/B/IR, `ChannelCollector::get_peak_quality`).
3. `peak_transform` → `find_peaks` + `_select_by_peak_distance`: rovnaký princíp ako `scipy.signal.find_peaks(distance=...)`.
4. `cubic_spline`: spresnenie polohy úderu pod rozlíšenie vzorkovania.
5. `rr_recognizer::rr_intervals`, `IntervalFilterAdapter.filterInterval`: filter artefaktov (`RRHelper::findMedian`, `MathHelper::rr_diff`).
6. Metriky: `RMSSD`, `SDNN`, `StressIndex::{getMO, getMEDSD, getNN50, process}` (Baevského index napätia: Mo / AMo / rozpätie), `welltory::technical_quality`, `rr_variance_measure`.

`libwelltorycore.so` obsahuje dennú analytiku z tepu: `circadianModel`, `getHRPattern`, `getMaxRecovery`, `ewmaFull`, LOWESS a čistenie outlierov. `libwelltorycorecommon.so` skladá minútový kontext (tep, kroky, energia, spánok) a obsahuje KDE z knižnice mlpack. Ranné skóre bez HRV (`NoHrvMorningCalculation`) sa opiera o **ranný pokojový tep** voči osobnej norme (`MorningHeartRateNorm(warnLow…)`).

## 3. Odpovede na tvoje otázky

**Dá sa HRV zisťovať priebežne z PPG v hodinkách?** Áno, ale iba v pokoji. Pri pohybe PPG nedáva spoľahlivé RR. Welltory preto meria v epizódach (~100 úderov ≈ 1,5 min) a nemeria nepretržite. Odporúčanie:

- Epizóda 60–120 s, spustená iba vtedy, keď **akcelerometer** ukazuje pokoj (napr. rozptyl |a| < prah počas 30 s).
- Na Galaxy Watch 4+ použi **Samsung Health Sensor SDK**: `PPG_GREEN` (25 Hz, surový signál) alebo priamo `HEART_RATE` s poľom **IBI** (RR už spočítané v hodinkách). Na ostatných Wear OS hodinkách Health Services surové PPG ani IBI nedávajú. Dá sa skúsiť `SensorManager` s vendor senzormi, ale každý výrobca to rieši inak.
- Dáta pošli cez `MessageClient` (malé dávky) alebo `ChannelClient` (dlhšie záznamy). Výpočet sprav na telefóne ([hrv_pipeline.py](hrv_pipeline.py) alebo jeho Kotlin port), alebo priamo na hodinkách, kde je to lacné (RMSSD z 100 RR je triviálny výpočet).
- Kvalitu kontroluj (prah 0.6, podiel zahodených RR < 20 %) a zlé merania nezapočítavaj.

**Identifikácia stresu počas dňa:** porovnávaj s osobnou baseline, nie s populačnými normami. `PersonalBaseline.stress_score()` počíta z-skóre ln(RMSSD) a tepu voči ranným meraniam za posledných 30 dní. Denné merania majú inú fyziológiu než ranné, preto si veď **dve baseline** (ranná a denná pokojová), prípadne normalizuj podľa dennej doby (to robí Welltory `circadianModel`).

**Automatické meranie po zobudení alebo prvom nasadení** (aby boli podmienky porovnateľné):

1. Spúšťač: koniec spánku (Health Services `PassiveMonitoringClient` / Samsung sleep) **alebo** prechod off-body → on-body (`Sensor.TYPE_LOW_LATENCY_OFFBODY_DETECT`) v okne napr. 4:00–11:00, raz za deň.
2. Počkaj 2–3 minúty po nasadení, kým sa ustáli kontakt senzora a tep.
3. Podmienky: sed alebo ľah, pokoj podľa akcelerometra, rovnaká ruka, bez kávy a pohybu pred meraním (môže pripomenúť notifikácia „posaď sa a dýchaj normálne“).
4. Meraj 2 min alebo 100–120 RR. Pri kvalite < 0.6 jeden opakovaný pokus o 5 min.
5. Ulož s kontextom (čas od zobudenia, poloha tela, kvalita). Do baseline daj iba ranné merania, ktoré prešli kontrolou kvality.

Praktický tip: ešte stabilnejšia „ranná“ HRV je **nočná** HRV, teda priemer RMSSD v posledných ~3 hodinách hlbokého spánku. Pohyb je vtedy minimálny a podmienky sú najrovnakejšie.

## 4. Čo nebolo možné overiť

- Kód aplikácie pre hodinky (Wear OS) **nie je v tejto APK**, je to samostatný balík. Nevidno preto, aký senzor a vzorkovanie hodinky používajú. Konštanta `100.0` pri vytváraní recognizera môže byť vzorkovacia frekvencia aj niečo iné **(neoverené)**.
- Presný vzorec serverového stresu („boiler“) nie je v aplikácii.
- Podrobná logika natívnych funkcií (koeficienty filtrov, prahy) by vyžadovala disassembler (Ghidra). Nie je nainštalovaný a pre tvoj projekt ho nepotrebuješ, publikované metódy stačia.

## 5. Právna a etická poznámka

APK s označením „PREMIUM“ je upravená (crack, obsahuje ochranu „protected_by_np“). Analyzovať ju kvôli pochopeniu princípov je v poriadku. Do svojho projektu však **nepreberaj ich natívne knižnice, kód ani serverové API**: je to autorsky chránené a modifikované APK môže obsahovať aj škodlivý kód. Postačujú štandardné metódy (Task Force 1996 pre RMSSD a SDNN, Baevsky SI), ktoré používa aj Welltory. Implementoval som ich od nuly v [hrv_pipeline.py](hrv_pipeline.py). HRV a stres nie sú medicínska diagnostika.
