package sk.mindshield.wear.probe

import android.app.Service
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.IBinder
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

/**
 * Galaxy Watch 6 Lab Probe Service.
 * Enumerates all exposed Wear OS & Samsung vendor sensors and streams raw readings
 * with unified epoch millisecond timestamps.
 */
class SensorProbeService : Service(), SensorEventListener {

    companion object {
        private const val TAG = "MindShieldWearProbe"
        // Common Samsung BioActive vendor prefixes observed on One UI Watch
        private val INTERESTING_KEYWORDS = listOf("ppg", "heart", "ecg", "temp", "spo2", "bio")
    }

    private lateinit var sensorManager: SensorManager
    private val activeSensors = mutableListOf<Sensor>()

    override fun onCreate() {
        super.onCreate()
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        logAllAvailableSensors()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        registerTargetSensors()
        return START_STICKY
    }

    private fun logAllAvailableSensors() {
        val allSensors = sensorManager.getSensorList(Sensor.TYPE_ALL)
        val report = JSONArray()
        allSensors.forEach { s ->
            val obj = JSONObject().apply {
                put("name", s.name)
                put("vendor", s.vendor)
                put("type", s.type)
                put("stringType", s.stringType)
                put("minDelayUs", s.minDelay)
                put("maxDelayUs", s.maxDelay)
            }
            report.put(obj)
            val lower = "${s.name} ${s.stringType}".lowercase()
            if (INTERESTING_KEYWORDS.any { lower.contains(it) }) {
                Log.i(TAG, "BIO_SENSOR_FOUND: $obj")
            }
        }
        Log.i(TAG, "Total sensors enumerated: ${allSensors.size}")
    }

    private fun registerTargetSensors() {
        unregisterAllSafe()

        // 1. Standard Heart Rate + Accelerometer (for motion artifact rejection)
        val targets = mutableListOf<Sensor>()
        sensorManager.getDefaultSensor(Sensor.TYPE_HEART_RATE)?.let { targets.add(it) }
        sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)?.let { targets.add(it) }

        // 2. Vendor raw PPG / Skin Temp probe (availability depends on One UI firmware & permissions)
        sensorManager.getSensorList(Sensor.TYPE_ALL).forEach { s ->
            val st = (s.stringType ?: "").lowercase()
            if (st.contains("ppg") || st.contains("skin_temp")) {
                targets.add(s)
            }
        }

        targets.distinctBy { it.type }.forEach { sensor ->
            val ok = sensorManager.registerListener(this, sensor, SensorManager.SENSOR_DELAY_FASTEST)
            if (ok) {
                activeSensors.add(sensor)
                Log.i(TAG, "Registered sensor: ${sensor.name} (type=${sensor.type})")
            } else {
                Log.w(TAG, "Failed to register sensor (privileged lock likely): ${sensor.name}")
            }
        }
    }

    override fun onSensorChanged(event: SensorEvent) {
        val epochMs = System.currentTimeMillis()
        val valuesCsv = event.values.joinToString(",") { "%.3f".format(it) }
        Log.d(TAG, "SAMPLE|t=$epochMs|type=${event.sensor.type}|acc=${event.accuracy}|v=$valuesCsv")
        // Production step: batch into 500ms RingBuffer and transmit via Wear DataLayer MessageClient
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        Log.d(TAG, "Accuracy changed: ${sensor?.name} -> $accuracy")
    }

    private fun unregisterAllSafe() {
        try {
            sensorManager.unregisterListener(this)
            activeSensors.clear()
        } catch (e: Exception) {
            Log.e(TAG, "Error unregistering sensors", e)
        }
    }

    override fun onDestroy() {
        unregisterAllSafe()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
