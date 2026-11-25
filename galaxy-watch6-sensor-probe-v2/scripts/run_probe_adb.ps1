#Requires -Version 5.1
<#
.SYNOPSIS
    Automatizovany ADB skript pre Galaxy Watch 6 Classic (SM-R965F):
    1. Pripadne pripoji hodinky cez Wireless ADB (ak uz nie su pripojene v Android Studio)
    2. Nainstaluje APK (ak je zadana cesta)
    3. Udeli vsetky senzorove povolenia cez pm grant
    4. Spusti sondu na pozadi a zobrazuje zive BIO_SENSOR a SAMPLE logy
    5. Po ukonceni (Ctrl+C) stiahne CSV a JSON data do PC
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$WatchEndpoint = "", # Nepovinne, ak su uz hodinky pripojene v Android Studio

    [Parameter(Mandatory = $false)]
    [string]$ApkPath = ".\app\build\outputs\apk\debug\app-debug.apk",

    [Parameter(Mandatory = $false)]
    [string]$OutputDir = ".\watch6_captured_data"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$PackageName = "sk.mindshield.watchprobe"

function Write-Step([string]$Msg) {
    $ts = Get-Date -Format "HH:mm:ss"
    Write-Host "[$ts] $Msg" -ForegroundColor Cyan
}

# Automaticke doplnenie C:\dev\AndroidStudio\platform-tools ak nie je v PATH
$customSdk = "C:\dev\AndroidStudio\platform-tools"
if (-not (Get-Command adb -ErrorAction SilentlyContinue) -and (Test-Path "$customSdk\adb.exe")) {
    $env:PATH = "$customSdk;$env:PATH"
}

if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
    throw "ADB nie je najdene. Skontroluj C:\dev\AndroidStudio\platform-tools\adb.exe."
}

if ($WatchEndpoint -ne "") {
    Write-Step "Pripajam sa k Galaxy Watch 6 na $WatchEndpoint ..."
    adb connect $WatchEndpoint | Out-Null
}

# Zisti aktivne pripojene zariadenie (napr. SM-R965F cez Wi-Fi ADB)
$deviceLines = adb devices | Select-String -Pattern "\tdevice$"
if (-not $deviceLines) {
    throw "Ziadne ADB zariadenie nie je pripojene. Zadaj -WatchEndpoint 'IP:PORT' alebo pripoj hodinky v Android Studio."
}

$targetSerial = if ($WatchEndpoint -ne "") {
    $WatchEndpoint
} else {
    ($deviceLines[0].ToString().Split("`t")[0]).Trim()
}
Write-Step "Pouzivam aktivne zariadenie: $targetSerial"

if ($ApkPath -ne "" -and (Test-Path $ApkPath)) {
    Write-Step "Instalujem APK: $ApkPath"
    adb -s $targetSerial install -r -g $ApkPath
} else {
    Write-Step "APK cesta nezadana alebo neexistuje — pouzijem aplikaciu nainstalovanu z Android Studia."
}

Write-Step "Udelujem Runtime senzorove povolenia cez pm grant..."
$perms = @(
    "android.permission.BODY_SENSORS",
    "android.permission.BODY_SENSORS_BACKGROUND",
    "android.permission.ACTIVITY_RECOGNITION",
    "android.permission.POST_NOTIFICATIONS",
    "com.samsung.android.hardware.sensormanager.permission.READ_ADDITIONAL_HEALTH_DATA"
)
foreach ($p in $perms) {
    try {
        adb -s $targetSerial shell pm grant $PackageName $p 2>$null
    } catch {
    }
}

Write-Step "Cistim stary logcat a spustam SensorProbeService na hodinkach..."
adb -s $targetSerial logcat -c
adb -s $targetSerial shell am start-foreground-service -n "$PackageName/.SensorProbeService" -a "$PackageName.ACTION_START"

Write-Host "`n--- ZIVE DATA ZO SENZOROV (Ukonci stlacenim Ctrl+C pre stiahnutie CSV/JSON) ---`n" -ForegroundColor Green

try {
    adb -s $targetSerial logcat -s "Watch6SensorProbe:*"
}
finally {
    Write-Host "`n"
    Write-Step "Zastavujem sondu na hodinkach..."
    adb -s $targetSerial shell am startservice -n "$PackageName/.SensorProbeService" -a "$PackageName.ACTION_STOP"
    Start-Sleep -Seconds 2

    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }
    Write-Step "Stahujem zoznam senzorov a surove CSV vzorky do $OutputDir ..."
    adb -s $targetSerial pull "/sdcard/Android/data/$PackageName/files/" $OutputDir
    Write-Step "Hotovo. Subory mas ulozene v $OutputDir"
}
