# Galaxy Watch 6 Classic — Raw Sensor Probe v2 (AGP 8.13.2 + Gradle 8.13 + Kotlin 2.0.21)

Aktualizovaný projekt pre najnovšie Android Studio (`AGP 8.13.2`, `Gradle 8.13`, `Kotlin 2.0.21`, `compileSdk 35`, `targetSdk 35`) s opravenými textovými reťazcami v Kotlin súboroch.

## Rýchle spustenie (hodinky SM-R965F už máš spárované)
1. Otvor tento projekt v Android Studio (alebo prepíš súbory v existujúcom priečinku projektu).
2. V hornej lište skontroluj vybrané zariadenie `samsung SM-R965F` a klikni na zelenú šípku **Run** (`Shift + F10`).
3. Na hodinkách ťukni na **ŠTART SONDY** a potvrď povolenie pre telesné senzory.
4. Na stiahnutie CSV a JSON dát do PC spusti v PowerShell:
   ```powershell
   .\scripts\run_probe_adb.ps1
   ```
