package sk.mindshield.watchprobe

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat

class MainActivity : ComponentActivity() {

    private lateinit var statusView: TextView
    private lateinit var btnStart: Button
    private lateinit var btnStop: Button

    private val statusReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val msg = intent?.getStringExtra(SensorProbeService.EXTRA_STATUS_TEXT) ?: return
            statusView.text = msg
        }
    }

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { grants ->
        val bodyOk = grants[Manifest.permission.BODY_SENSORS] == true
        if (bodyOk) {
            startProbeService()
        } else {
            statusView.text = "Chýba povolenie BODY_SENSORS.\nPovoľ v nastaveniach alebo cez ADB pm grant."
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val scroll = ScrollView(this).apply {
            setBackgroundColor(Color.BLACK)
            isFillViewport = true
        }

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(36, 44, 36, 56)
        }

        val title = TextView(this).apply {
            text = "WATCH 6 SENSOR PROBE"
            setTextColor(Color.parseColor("#38BDF8"))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            gravity = Gravity.CENTER
        }

        btnStart = Button(this).apply {
            text = "ŠTART SONDY"
            setOnClickListener { ensurePermissionsAndStart() }
        }

        btnStop = Button(this).apply {
            text = "STOP SONDY"
            setOnClickListener { stopProbeService() }
        }

        statusView = TextView(this).apply {
            text = "Pripravené.\nNasaď hodinky na zápästie a stlač ŠTART."
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
            setPadding(0, 14, 0, 14)
        }

        container.addView(title)
        container.addView(btnStart)
        container.addView(btnStop)
        container.addView(statusView)
        scroll.addView(container)

        setContentView(scroll)
    }

    override fun onStart() {
        super.onStart()
        val filter = IntentFilter(SensorProbeService.ACTION_STATUS_BROADCAST)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(statusReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(statusReceiver, filter)
        }
    }

    override fun onStop() {
        try {
            unregisterReceiver(statusReceiver)
        } catch (_: Exception) {
        }
        super.onStop()
    }

    private fun ensurePermissionsAndStart() {
        val needed = mutableListOf(
            Manifest.permission.BODY_SENSORS,
            Manifest.permission.ACTIVITY_RECOGNITION
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            needed.add(Manifest.permission.BODY_SENSORS_BACKGROUND)
            needed.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val missing = needed.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (missing.isEmpty()) {
            startProbeService()
        } else {
            permissionLauncher.launch(missing.toTypedArray())
        }
    }

    private fun startProbeService() {
        statusView.text = "Spúšťam sondu senzorov..."
        val intent = Intent(this, SensorProbeService::class.java).apply {
            action = SensorProbeService.ACTION_START
        }
        ContextCompat.startForegroundService(this, intent)
    }

    private fun stopProbeService() {
        val intent = Intent(this, SensorProbeService::class.java).apply {
            action = SensorProbeService.ACTION_STOP
        }
        startService(intent)
    }
}
