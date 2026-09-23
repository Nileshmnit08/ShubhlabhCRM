package com.shubhlabh.fieldassistant

// VOICE_RECOGNITION_MODE = ON_DEVICE (when API 31+), FALLBACK_GRACEFUL on API < 31
// This module uses Android's on-device SpeechRecognizer exclusively.
// NO cloud/network speech API is used or contacted.
// NO audio is saved, stored, or uploaded.
// Only the transcript text is returned to JavaScript.

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class SpeechRecognizerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val MODULE_NAME = "SpeechRecognizerModule"

        // Event names emitted to JavaScript
        private const val EVENT_STARTED       = "onSpeechStarted"
        private const val EVENT_PARTIAL        = "onSpeechPartialResults"
        private const val EVENT_RESULTS        = "onSpeechResults"
        private const val EVENT_END            = "onSpeechEnd"
        private const val EVENT_ERROR          = "onSpeechError"
        private const val EVENT_VOLUME_CHANGED = "onSpeechVolumeChanged"

        // On-device SpeechRecognizer APIs require API 31 (Android 12)
        private const val MIN_API_ON_DEVICE = Build.VERSION_CODES.S // 31
    }

    private var speechRecognizer: SpeechRecognizer? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var isListening = false

    // ─────────────────────────────────────────────────────────────────
    // Required by RN NativeEventEmitter — prevents JS warning/crash
    // ─────────────────────────────────────────────────────────────────
    @ReactMethod
    fun addListener(eventName: String) {
        // Required stub for NativeEventEmitter compatibility
        android.util.Log.d("VOICE_DEBUG", "addListener: $eventName")
    }

    @ReactMethod
    fun removeListeners(count: Double) {
        // Required stub for NativeEventEmitter compatibility
        android.util.Log.d("VOICE_DEBUG", "removeListeners: $count")
    }

    override fun getName(): String = MODULE_NAME

    // ─────────────────────────────────────────────────────────────────
    // isAvailable — check on-device availability (API-level guarded)
    // ─────────────────────────────────────────────────────────────────
    @ReactMethod
    fun isAvailable(callback: Callback) {
        mainHandler.post {
            try {
                android.util.Log.d("VOICE_DEBUG", "isAvailable check — API ${Build.VERSION.SDK_INT}")

                // CRITICAL: isOnDeviceRecognitionAvailable requires API 31+
                // Calling it on API < 31 causes NoSuchMethodError → app crash
                if (Build.VERSION.SDK_INT < MIN_API_ON_DEVICE) {
                    android.util.Log.d("VOICE_DEBUG", "isAvailable: false (API ${Build.VERSION.SDK_INT} < 31, on-device not supported)")
                    callback.invoke(null, false)
                    return@post
                }

                val available = SpeechRecognizer.isOnDeviceRecognitionAvailable(reactContext)
                android.util.Log.d("VOICE_DEBUG", "isAvailable: $available")
                callback.invoke(null, available)
            } catch (e: Exception) {
                android.util.Log.e("VOICE_DEBUG", "isAvailable exception: ${e.message}")
                callback.invoke(e.message, false)
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // start — begin speech recognition, on-device when possible
    // ─────────────────────────────────────────────────────────────────
    @ReactMethod
    fun start(locale: String) {
        mainHandler.post {
            android.util.Log.d("VOICE_DEBUG", "start called — locale=$locale, API=${Build.VERSION.SDK_INT}")

            // Guard: RECORD_AUDIO permission
            if (ContextCompat.checkSelfPermission(
                    reactContext,
                    Manifest.permission.RECORD_AUDIO
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                android.util.Log.d("VOICE_DEBUG", "start: PERMISSION_DENIED")
                emitError("PERMISSION_DENIED", "Microphone permission is required for voice typing.")
                return@post
            }

            android.util.Log.d("VOICE_DEBUG", "start: permission_granted")

            // Guard: API level for on-device recognizer
            if (Build.VERSION.SDK_INT < MIN_API_ON_DEVICE) {
                // API < 31: try standard SpeechRecognizer as a best-effort fallback
                // This may use Google's voice service if installed, or fail gracefully
                android.util.Log.d("VOICE_DEBUG", "start: API<31 — on-device not available, attempting standard recognizer")
                startWithStandardRecognizer(locale)
                return@post
            }

            // API 31+: check on-device availability explicitly
            val onDeviceAvailable = try {
                SpeechRecognizer.isOnDeviceRecognitionAvailable(reactContext)
            } catch (e: Exception) {
                android.util.Log.e("VOICE_DEBUG", "isOnDeviceRecognitionAvailable exception: ${e.message}")
                false
            }

            android.util.Log.d("VOICE_DEBUG", "start: on_device_available=$onDeviceAvailable")

            if (onDeviceAvailable) {
                startWithOnDeviceRecognizer(locale)
            } else {
                // On-device not available even on API 31+ (e.g. model not downloaded)
                emitError(
                    "NOT_AVAILABLE",
                    "Offline voice typing is not available on this device."
                )
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // On-device recognizer (API 31+)
    // ─────────────────────────────────────────────────────────────────
    private fun startWithOnDeviceRecognizer(locale: String) {
        destroyRecognizerInternal()
        try {
            android.util.Log.d("VOICE_DEBUG", "recognizer_created: on_device")
            speechRecognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(reactContext)
            speechRecognizer?.setRecognitionListener(recognitionListener)
            startListeningWithIntent(locale)
        } catch (e: Exception) {
            android.util.Log.e("VOICE_DEBUG", "recognizer_error (on-device): ${e.message}")
            isListening = false
            emitError("START_ERROR", "Could not start voice recognition: ${e.message}")
            destroyRecognizerInternal()
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Standard recognizer (API < 31 best-effort — uses device assistant)
    // ─────────────────────────────────────────────────────────────────
    private fun startWithStandardRecognizer(locale: String) {
        // Check if ANY speech recognition service is available
        if (!SpeechRecognizer.isRecognitionAvailable(reactContext)) {
            android.util.Log.d("VOICE_DEBUG", "recognizer: no recognition service available")
            emitError(
                "NOT_AVAILABLE",
                "Voice typing is not available on this device. Please type your message."
            )
            return
        }

        destroyRecognizerInternal()
        try {
            android.util.Log.d("VOICE_DEBUG", "recognizer_created: standard (API ${Build.VERSION.SDK_INT})")
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(reactContext)
            speechRecognizer?.setRecognitionListener(recognitionListener)
            startListeningWithIntent(locale)
        } catch (e: Exception) {
            android.util.Log.e("VOICE_DEBUG", "recognizer_error (standard): ${e.message}")
            isListening = false
            emitError("START_ERROR", "Could not start voice recognition: ${e.message}")
            destroyRecognizerInternal()
        }
    }

    private fun startListeningWithIntent(locale: String) {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(
                RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
            )
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, locale)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            // Hint to prefer offline — respected on newer devices
            putExtra("android.speech.extra.PREFER_OFFLINE", true)
        }
        isListening = true
        android.util.Log.d("VOICE_DEBUG", "recognizer_started")
        speechRecognizer?.startListening(intent)
    }

    // ─────────────────────────────────────────────────────────────────
    // stop — stop listening gracefully (will trigger onResults)
    // ─────────────────────────────────────────────────────────────────
    @ReactMethod
    fun stop() {
        mainHandler.post {
            if (isListening) {
                android.util.Log.d("VOICE_DEBUG", "recognizer stop requested")
                speechRecognizer?.stopListening()
                isListening = false
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // cancel — cancel without results
    // ─────────────────────────────────────────────────────────────────
    @ReactMethod
    fun cancel() {
        mainHandler.post {
            android.util.Log.d("VOICE_DEBUG", "recognizer cancel requested")
            speechRecognizer?.cancel()
            isListening = false
            emitEvent(EVENT_END, Arguments.createMap())
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // destroy — full cleanup (called on screen unmount)
    // ─────────────────────────────────────────────────────────────────
    @ReactMethod
    fun destroy() {
        mainHandler.post {
            android.util.Log.d("VOICE_DEBUG", "recognizer_destroyed (explicit)")
            destroyRecognizerInternal()
        }
    }

    private fun destroyRecognizerInternal() {
        try {
            speechRecognizer?.cancel()
            speechRecognizer?.destroy()
        } catch (_: Exception) {
            // Ignore errors during cleanup
        } finally {
            speechRecognizer = null
            isListening = false
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // RecognitionListener
    // ─────────────────────────────────────────────────────────────────
    private val recognitionListener = object : RecognitionListener {

        override fun onReadyForSpeech(params: Bundle?) {
            android.util.Log.d("VOICE_DEBUG", "onReadyForSpeech")
            emitEvent(EVENT_STARTED, Arguments.createMap())
        }

        override fun onBeginningOfSpeech() {
            android.util.Log.d("VOICE_DEBUG", "onBeginningOfSpeech")
        }

        override fun onRmsChanged(rmsdB: Float) {
            val params = Arguments.createMap()
            params.putDouble("value", rmsdB.toDouble())
            emitEvent(EVENT_VOLUME_CHANGED, params)
        }

        override fun onBufferReceived(buffer: ByteArray?) {
            // Audio buffer — intentionally NOT saved or forwarded
            // This is transient pipeline data only
        }

        override fun onEndOfSpeech() {
            android.util.Log.d("VOICE_DEBUG", "onEndOfSpeech")
            isListening = false
            emitEvent(EVENT_END, Arguments.createMap())
        }

        override fun onPartialResults(partialResults: Bundle?) {
            val results = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            val text = results?.firstOrNull() ?: return
            android.util.Log.d("VOICE_DEBUG", "onPartialResults: $text")
            val params = Arguments.createMap()
            params.putString("transcript", text)
            emitEvent(EVENT_PARTIAL, params)
        }

        override fun onResults(results: Bundle?) {
            isListening = false
            val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            val text = matches?.firstOrNull() ?: ""
            android.util.Log.d("VOICE_DEBUG", "onResults: $text")
            val params = Arguments.createMap()
            params.putString("transcript", text)
            emitEvent(EVENT_RESULTS, params)
            destroyRecognizerInternal()
        }

        override fun onError(error: Int) {
            isListening = false
            android.util.Log.d("VOICE_DEBUG", "recognizer_error code=$error")
            val (code, message) = mapSpeechError(error)
            emitError(code, message)
            destroyRecognizerInternal()
        }

        override fun onEvent(eventType: Int, params: Bundle?) {
            // Not used
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Error mapping
    // ─────────────────────────────────────────────────────────────────
    private fun mapSpeechError(error: Int): Pair<String, String> {
        return when (error) {
            SpeechRecognizer.ERROR_AUDIO ->
                "ERROR_AUDIO" to "Audio recording error. Please try again."
            SpeechRecognizer.ERROR_CLIENT ->
                "ERROR_CLIENT" to "Voice recognition client error. Please try again."
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS ->
                "ERROR_INSUFFICIENT_PERMISSIONS" to "Microphone permission is required. Please enable it in Settings."
            SpeechRecognizer.ERROR_NETWORK ->
                "ERROR_NETWORK" to "Voice recognition network error. On-device recognition may not be available."
            SpeechRecognizer.ERROR_NETWORK_TIMEOUT ->
                "ERROR_NETWORK_TIMEOUT" to "Voice recognition timed out. Please try again."
            SpeechRecognizer.ERROR_NO_MATCH ->
                "ERROR_NO_MATCH" to "No speech was detected. Please try again."
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY ->
                "ERROR_RECOGNIZER_BUSY" to "Voice recognition is busy. Please wait a moment and try again."
            SpeechRecognizer.ERROR_SERVER ->
                "ERROR_SERVER" to "Voice recognition server error. Please try again."
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT ->
                "ERROR_SPEECH_TIMEOUT" to "No speech detected. Please tap the mic and speak."
            else ->
                "ERROR_UNKNOWN" to "Voice recognition failed. Please try again."
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Event emission helpers
    // ─────────────────────────────────────────────────────────────────
    private fun emitEvent(eventName: String, params: com.facebook.react.bridge.WritableMap) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (_: Exception) {
            // Ignore if JS bridge is torn down
        }
    }

    private fun emitError(code: String, message: String) {
        val params = Arguments.createMap()
        params.putString("code", code)
        params.putString("message", message)
        emitEvent(EVENT_ERROR, params)
    }

    // ─────────────────────────────────────────────────────────────────
    // Lifecycle cleanup
    // ─────────────────────────────────────────────────────────────────
    @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
    override fun onCatalystInstanceDestroy() {
        mainHandler.post {
            destroyRecognizerInternal()
        }
        super.onCatalystInstanceDestroy()
    }

    override fun invalidate() {
        mainHandler.post {
            destroyRecognizerInternal()
        }
        super.invalidate()
    }
}
