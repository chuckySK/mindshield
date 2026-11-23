package sk.mindshield.mobile.biometrics

import android.util.Log
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy

/**
 * Tier 1B Morning HRV Analyzer (No Smartwatch Required).
 * Uses Rear Camera + LED Torch with finger placed gently over the lens for 60s.
 * Validates finger coverage via Red-channel dominance before emitting optical PPG samples.
 */
class FingerPpgAnalyzer(
    private val onPpgSample: (epochMs: Long, redMean: Double, validCoverage: Boolean) -> Unit
) : ImageAnalysis.Analyzer {

    companion object {
        private const val TAG = "MindShieldFingerPPG"
        private const val MIN_RED_THRESHOLD = 160.0
    }

    override fun analyze(imageProxy: ImageProxy) {
        try {
            val bitmap = imageProxy.toBitmap()
            val w = bitmap.width
            val h = bitmap.height
            // Sample central 30% ROI to minimize edge light leakage
            val startX = (w * 0.35).toInt()
            val endX = (w * 0.65).toInt()
            val startY = (h * 0.35).toInt()
            val endY = (h * 0.65).toInt()

            var redSum = 0L
            var greenSum = 0L
            var count = 0

            for (y in startY until endY step 4) {
                for (x in startX until endX step 4) {
                    val px = bitmap.getPixel(x, y)
                    redSum += (px shr 16) and 0xFF
                    greenSum += (px shr 8) and 0xFF
                    count++
                }
            }

            if (count > 0) {
                val redMean = redSum.toDouble() / count
                val greenMean = greenSum.toDouble() / count
                // Valid finger-over-torch signature: high red saturation, strongly attenuated green
                val valid = redMean >= MIN_RED_THRESHOLD && redMean > (greenMean * 2.2)
                onPpgSample(System.currentTimeMillis(), redMean, valid)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Finger PPG frame error", e)
        } finally {
            imageProxy.close()
        }
    }
}
