package com.shubhlabh.fieldassistant

import android.content.Context
import android.media.AudioManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

/**
 * AudioRouteModule.kt
 * Dedicated native Android audio routing controller for Field Assist.
 * Ensures hardware Acoustic Echo Cancellation (AEC), Noise Suppression (NS),
 * and Automatic Gain Control (AGC) are preserved via AudioManager.MODE_IN_COMMUNICATION.
 * Toggles speakerphone without dropping communication mode.
 */
class AudioRouteModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val audioManager: AudioManager? =
        reactContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

    override fun getName(): String = "AudioRouteModule"

    @ReactMethod
    fun startCallAudio(speaker: Boolean, promise: Promise) {
        try {
            audioManager?.let { am ->
                am.mode = AudioManager.MODE_IN_COMMUNICATION
                am.isSpeakerphoneOn = speaker
                promise.resolve(true)
            } ?: promise.reject("NO_AUDIO_MGR", "AudioManager unavailable")
        } catch (e: Exception) {
            promise.reject("AUDIO_ERROR", e.message)
        }
    }

    @ReactMethod
    fun setSpeakerphoneOn(speaker: Boolean, promise: Promise) {
        try {
            audioManager?.let { am ->
                am.mode = AudioManager.MODE_IN_COMMUNICATION
                am.isSpeakerphoneOn = speaker
                promise.resolve(speaker)
            } ?: promise.reject("NO_AUDIO_MGR", "AudioManager unavailable")
        } catch (e: Exception) {
            promise.reject("AUDIO_ERROR", e.message)
        }
    }

    @ReactMethod
    fun stopCallAudio(promise: Promise) {
        try {
            audioManager?.let { am ->
                am.isSpeakerphoneOn = false
                am.mode = AudioManager.MODE_NORMAL
                promise.resolve(true)
            } ?: promise.reject("NO_AUDIO_MGR", "AudioManager unavailable")
        } catch (e: Exception) {
            promise.reject("AUDIO_ERROR", e.message)
        }
    }

    @ReactMethod
    fun isSpeakerphoneOn(promise: Promise) {
        try {
            audioManager?.let { am ->
                promise.resolve(am.isSpeakerphoneOn)
            } ?: promise.reject("NO_AUDIO_MGR", "AudioManager unavailable")
        } catch (e: Exception) {
            promise.reject("AUDIO_ERROR", e.message)
        }
    }
}
