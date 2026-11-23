package sk.mindshield.mobile.vision

import android.content.Context
import android.os.SystemClock
import android.util.Log
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarker
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarkerResult

/**
 * Local-First CameraX Analyzer extracting 52 FACS Blendshapes on-device at up to 60fps.
 * Works identically with Front (self-mode) and Rear (observer-mode) lenses.
 * Zero video frames are persisted or transmitted.
 */
class FaceMicroexpressionAnalyzer(
    context: Context,
    private val onBlendshapes: (epochMs: Long, scores: Map<String, Float>) -> Unit
) : ImageAnalysis.Analyzer {

    companion object {
        private const val TAG = "MindShieldFaceFACS"
        private const val MODEL_ASSET = "face_landmarker.task"
    }

    private var landmarker: FaceLandmarker? = null

    init {
        try {
            val baseOptions = BaseOptions.builder()
                .setModelAssetPath(MODEL_ASSET)
                .setDelegate(Delegate.GPU)
                .build()

            val options = FaceLandmarker.FaceLandmarkerOptions.builder()
                .setBaseOptions(baseOptions)
                .setRunningMode(RunningMode.LIVE_STREAM)
                .setOutputFaceBlendshapes(true)
                .setNumFaces(1)
                .setResultListener { result, _ -> handleResult(result) }
                .setErrorListener { err -> Log.e(TAG, "MediaPipe runtime error", err) }
                .build()

            landmarker = FaceLandmarker.createFromOptions(context, options)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize FaceLandmarker", e)
        }
    }

    override fun analyze(imageProxy: ImageProxy) {
        val detector = landmarker
        if (detector == null) {
            imageProxy.close()
            return
        }
        try {
            val bitmap = imageProxy.toBitmap()
            val mpImage = BitmapImageBuilder(bitmap).build()
            detector.detectAsync(mpImage, SystemClock.uptimeMillis())
        } catch (e: Exception) {
            Log.e(TAG, "Frame analysis error", e)
        } finally {
            imageProxy.close()
        }
    }

    private fun handleResult(result: FaceLandmarkerResult) {
        val blendshapesOpt = result.faceBlendshapes()
        if (!blendshapesOpt.isPresent || blendshapesOpt.get().isEmpty()) return

        val scores = HashMap<String, Float>(52)
        for (cat in blendshapesOpt.get()[0]) {
            scores[cat.categoryName()] = cat.score()
        }
        onBlendshapes(System.currentTimeMillis(), scores)
    }

    fun closeSafe() {
        try {
            landmarker?.close()
            landmarker = null
        } catch (e: Exception) {
            Log.e(TAG, "Error closing FaceLandmarker", e)
        }
    }
}
