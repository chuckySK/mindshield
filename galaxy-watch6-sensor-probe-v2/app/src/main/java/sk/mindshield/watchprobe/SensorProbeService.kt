package sk.mindshield.watchprobe

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedWriter
import java.io.File
import java.io.FileWriter
import java.util.Locale
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

/**
 * Foreground Wear OS diagnostic probe for Samsung Galaxy Watch 6 Classic.
 * Enumerates all system & Samsung vendor sensors, tests listener registration,
 * streams samples to Logcat and writes raw CSV telemetry to app external files dir.
 */
class SensorProbeService : Service(), SensorEventListener {

    companion object {
        const val TAG = "Watch6SensorProbe"
        const val ACTION_START = "sk.mindshield.watchprobe.ACTION_START"
        const val ACTION_STOP = "sk.mindshield.watchprobe.ACTION_STOP"
        const val ACTION_STATUS_BROADCAST = "sk.mindshield.watchprobe.STATUS_UPDATE"
        const val EXTRA_STATUS_TEXT = "status_text"

        private const val CHANNEL_ID = "watch6_probe_channel"
        private const val NOTIF_ID = 6006

        private val TARGET_KEYWORDS = listOf(
            "ppg", "heart", "ecg", "temp", "spo2", "bio", "wrist", "bia", "galvanic"
        )
    }

    private lateinit var sensorManager: SensorManager
    private var wakeLock: PowerManager.WakeLock? = null
    private val registeredSensors = mutableListOf<Sensor>()
    private val sampleCounts = ConcurrentHashMap<Int, AtomicLong>()
    private val lastValuesMap = ConcurrentHashMap<Int, String>()

    private var csvWriter: BufferedWriter? = null
    private var activeCsvFile: File? = null
    private var isProbing = false
    private var lastUiBroadcastMs = 0L

    override fun onCreate() {
        super.onCreate()
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            Log.i(TAG, "Received ACTION_STOP. Stopping probe cleanly.")
            stopProbe()
            stopSelf()
            return START_NOT_STICKY
        }

        if (!isProbing) {
            startForegroundSafe()
            acquireWakeLockSafe()
            startProbe()
        }
        return START_STICKY
    }

    private fun startForegroundSafe() {
        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Watch6 Sensor Probe")
            .setContentText("Snímam surové PPG a teplotné senzory...")
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            ServiceCompat.startForeground(
                this,
                NOTIF_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH
            )
        } else {
            startForeground(NOTIF_ID, notification)
        }
    }

    private fun acquireWakeLockSafe() {
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "$TAG::ProbeWakeLock").apply {
                setReferenceCounted(false)
                acquire(30 * 60 * 1000L)
            }
        } catch (e: Exception) {
            Log.w(TAG, "WakeLock acquire failed: ${e.message}")
        }
    }

    private fun releaseWakeLockSafe() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
            wakeLock = null
        } catch (e: Exception) {
            Log.w(TAG, "WakeLock release error: ${e.message}")
        }
    }

    private fun startProbe() {
        unregisterAllSafe()
        sampleCounts.clear()
        lastValuesMap.clear()

        val hasBodySensors = ContextCompat.checkSelfPermission(
            this, android.Manifest.permission.BODY_SENSORS
        ) == PackageManager.PERMISSION_GRANTED
        Log.i(TAG, "PERMISSION_CHECK | BODY_SENSORS=$hasBodySensors")

        val allSensors = sensorManager.getSensorList(Sensor.TYPE_ALL)
        val inventoryArray = JSONArray()
        val candidateSensors = mutableListOf<Sensor>()

        for (s in allSensors) {
            val st = s.stringType ?: ""
            val lower = "${s.name} $st".lowercase(Locale.ROOT)
            val isBioCandidate = TARGET_KEYWORDS.any { lower.contains(it) } ||
                s.type == Sensor.TYPE_HEART_RATE ||
                s.type == Sensor.TYPE_HEART_BEAT ||
                s.type >= 65536

            val item = JSONObject().apply {
                put("type", s.type)
                put("name", s.name)
                put("vendor", s.vendor)
                put("stringType", st)
                put("minDelayUs", s.minDelay)
                put("maxDelayUs", s.maxDelay)
                put("wakeUp", s.isWakeUpSensor)
                put("bioCandidate", isBioCandidate)
            }
            inventoryArray.put(item)

            if (isBioCandidate) {
                Log.i(TAG, "BIO_SENSOR_CANDIDATE | $item")
                candidateSensors.add(s)
            }
        }

        // Always include Accelerometer for motion-artifact correlation
        sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)?.let { acc ->
            if (candidateSensors.none { it.type == acc.type }) {
                candidateSensors.add(acc)
            }
        }

        openCsvLogFile()

        val statusSummary = StringBuilder()
        statusSummary.append("Celkom senzorov: ${allSensors.size}\n")

        for (sensor in candidateSensors.distinctBy { "${it.type}_${it.name}" }) {
            val samplingUs = if (sensor.type == Sensor.TYPE_ACCELEROMETER) {
                20_000
            } else {
                SensorManager.SENSOR_DELAY_FASTEST
            }

            val ok = try {
                sensorManager.registerListener(this, sensor, samplingUs)
            } catch (se: SecurityException) {
                Log.e(TAG, "SECURITY_LOCK | type=${sensor.type} name=${sensor.name} err=${se.message}")
                false
            } catch (e: Exception) {
                Log.e(TAG, "REGISTER_ERR | type=${sensor.type} name=${sensor.name} err=${e.message}")
                false
            }

            if (ok) {
                registeredSensors.add(sensor)
                sampleCounts[sensor.type] = AtomicLong(0L)
                Log.i(TAG, "REGISTERED_OK | type=${sensor.type} | name=${sensor.name} | st=${sensor.stringType}")
                statusSummary.append("[OK] ${sensor.name} (${sensor.type})\n")
            } else {
                Log.w(TAG, "REGISTERED_FAIL | type=${sensor.type} | name=${sensor.name} | st=${sensor.stringType}")
                statusSummary.append("[LOCK] ${sensor.name} (${sensor.type})\n")
            }
        }

        saveInventoryJson(inventoryArray)
        isProbing = true
        broadcastStatus(statusSummary.toString())
    }

    private fun openCsvLogFile() {
        try {
            val baseDir = getExternalFilesDir(null) ?: filesDir
            val ts = System.currentTimeMillis()
            activeCsvFile = File(baseDir, "watch6_raw_samples_$ts.csv")
            csvWriter = BufferedWriter(FileWriter(activeCsvFile, true)).apply {
                write("epoch_ms,sensor_elapsed_ns,sensor_type,sensor_name,accuracy,values\n")
                flush()
            }
            Log.i(TAG, "CSV_LOG_OPENED | path=${activeCsvFile?.absolutePath}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to open CSV log file: ${e.message}")
        }
    }

    private fun saveInventoryJson(array: JSONArray) {
        try {
            val baseDir = getExternalFilesDir(null) ?: filesDir
            val invFile = File(baseDir, "watch6_sensor_inventory.json")
            val root = JSONObject().apply {
                put("device_model", Build.MODEL)
                put("device_manufacturer", Build.MANUFACTURER)
                put("android_sdk", Build.VERSION.SDK_INT)
                put("captured_at_ms", System.currentTimeMillis())
                put("registered_count", registeredSensors.size)
                put("sensors", array)
            }
            invFile.writeText(root.toString(2))
            Log.i(TAG, "INVENTORY_SAVED | path=${invFile.absolutePath}")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to save inventory JSON: ${e.message}")
        }
    }

    override fun onSensorChanged(event: SensorEvent) {
        val nowMs = System.currentTimeMillis()
        val type = event.sensor.type
        val count = sampleCounts[type]?.incrementAndGet() ?: 1L
        val valuesJoined = event.values.joinToString(";") {
            String.format(Locale.US, "%.4f", it)
        }
        lastValuesMap[type] = valuesJoined

        try {
            val safeName = event.sensor.name.replace("\"", "'")
            csvWriter?.write("$nowMs,${event.timestamp},$type,\"$safeName\",${event.accuracy},\"$valuesJoined\"\n")
            if (count % 50L == 0L) {
                csvWriter?.flush()
            }
        } catch (_: Exception) {
        }

        if (type != Sensor.TYPE_ACCELEROMETER || count % 25L == 0L) {
            Log.d(TAG, "SAMPLE|t=$nowMs|type=$type|name=${event.sensor.name}|n=$count|v=$valuesJoined")
        }

        if (nowMs - lastUiBroadcastMs >= 1000L) {
            lastUiBroadcastMs = nowMs
            broadcastLiveStats()
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        Log.d(TAG, "ACCURACY | name=${sensor?.name} | acc=$accuracy")
    }

    private fun broadcastLiveStats() {
        val sb = StringBuilder()
        sb.append("AKTÍVNE SNÍMANIE (${registeredSensors.size} senzorov)\n")
        for (s in registeredSensors) {
            val c = sampleCounts[s.type]?.get() ?: 0L
            val v = lastValuesMap[s.type] ?: "--"
            sb.append("${s.name} [${s.type}]: ${c}x -> $v\n")
        }
        broadcastStatus(sb.toString())
    }

    private fun broadcastStatus(text: String) {
        val intent = Intent(ACTION_STATUS_BROADCAST).apply {
            setPackage(packageName)
            putExtra(EXTRA_STATUS_TEXT, text)
        }
        sendBroadcast(intent)
    }

    private fun unregisterAllSafe() {
        try {
            sensorManager.unregisterListener(this)
            registeredSensors.clear()
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering sensors: ${e.message}")
        }
    }

    private fun stopProbe() {
        isProbing = false
        unregisterAllSafe()
        try {
            csvWriter?.flush()
            csvWriter?.close()
            csvWriter = null
            Log.i(TAG, "CSV_LOG_CLOSED | path=${activeCsvFile?.absolutePath}")
        } catch (_: Exception) {
        }
        releaseWakeLockSafe()
        broadcastStatus("Snímanie zastavené.\nCSV uložené v:\n${activeCsvFile?.name ?: "N/A"}")
    }

    override fun onDestroy() {
        stopProbe()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Watch6 Sensor Probe",
                NotificationManager.IMPORTANCE_LOW
            )
            val nm = getSystemService(NotificationManager::class.java)
            nm?.createNotificationChannel(channel)
        }
    }
}
