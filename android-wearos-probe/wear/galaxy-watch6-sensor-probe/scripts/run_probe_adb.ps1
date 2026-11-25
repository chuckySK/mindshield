#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$WatchEndpoint = "",

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

$customSdk = "C:\dev\AndroidStudio\platform-tools"
if (-not (Get-Command adb -ErrorAction SilentlyContinue) -and (Test-Path "$customSdk\adb.exe")) {
    $env:PATH = "$customSdk;$env:PATH"
}

if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
    throw "ADB not found. Check C:\dev\AndroidStudio\platform-tools\adb.exe."
}

if ($WatchEndpoint -ne "") {
    Write-Step "Connecting to Galaxy Watch 6 at $WatchEndpoint ..."
    adb connect $WatchEndpoint | Out-Null
}

$deviceLines = adb devices | Select-String -Pattern "\tdevice$"
if (-not $deviceLines) {
    throw "No active ADB device connected. Pass -WatchEndpoint 'IP:PORT' or connect in Android Studio."
}

$targetSerial = if ($WatchEndpoint -ne "") {
    $WatchEndpoint
} else {
    ($deviceLines[0].ToString().Split("`t")[0]).Trim()
}
Write-Step "Using active device: $targetSerial"

if ($ApkPath -ne "" -and (Test-Path $ApkPath)) {
    Write-Step "Installing APK: $ApkPath"
    adb -s $targetSerial install -r -g $ApkPath
} else {
    Write-Step "No local APK file at $ApkPath - using app already installed from Android Studio."
}

Write-Step "Granting runtime sensor permissions via pm grant..."
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

Write-Step "Clearing old logcat and starting SensorProbeService on watch..."
adb -s $targetSerial logcat -c
adb -s $targetSerial shell am start-foreground-service -n "$PackageName/.SensorProbeService" -a "$PackageName.ACTION_START"

Write-Host "`n--- LIVE SENSOR DATA (Press Ctrl+C after 30-60s to stop and pull CSV/JSON) ---`n" -ForegroundColor Green

try {
    adb -s $targetSerial logcat -s "Watch6SensorProbe:*"
}
finally {
    Write-Host "`n"
    Write-Step "Stopping probe service on watch..."
    adb -s $targetSerial shell am startservice -n "$PackageName/.SensorProbeService" -a "$PackageName.ACTION_STOP"
    Start-Sleep -Seconds 2

    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }
    Write-Step "Pulling sensor inventory JSON and raw CSV samples into $OutputDir ..."
    adb -s $targetSerial pull "/sdcard/Android/data/$PackageName/files/" $OutputDir
    Write-Step "Done. Files saved in $OutputDir"
}
