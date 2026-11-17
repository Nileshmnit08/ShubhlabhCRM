package com.shubhlabh.fieldassistant

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.provider.MediaStore
import android.util.Base64
import com.facebook.react.bridge.*
import java.io.ByteArrayOutputStream

/**
 * CameraModule.kt
 * FA-VISITOR-REGISTER-01: Native Android Camera Capture via system camera Intent.
 * Directly launches MediaStore.ACTION_IMAGE_CAPTURE to take a photo without gallery selection.
 * Compresses the captured photo to JPEG format (< 50KB) and returns data URI.
 */
class CameraModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    companion object {
        private const val MODULE_NAME = "CameraModule"
        private const val REQUEST_IMAGE_CAPTURE = 9801
    }

    private var capturePromise: Promise? = null

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = MODULE_NAME

    @ReactMethod
    fun capturePhoto(promise: Promise) {
        val currentActivity = reactContext.currentActivity
        if (currentActivity == null) {
            promise.reject("E_ACTIVITY_DOES_NOT_EXIST", "Activity does not exist")
            return
        }

        if (capturePromise != null) {
            promise.reject("E_BUSY", "Camera operation already in progress")
            return
        }

        capturePromise = promise

        try {
            val takePictureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
            if (takePictureIntent.resolveActivity(currentActivity.packageManager) != null) {
                currentActivity.startActivityForResult(takePictureIntent, REQUEST_IMAGE_CAPTURE)
            } else {
                capturePromise?.reject("E_NO_CAMERA", "No camera application found on device")
                capturePromise = null
            }
        } catch (e: Exception) {
            capturePromise?.reject("E_CAMERA_FAILED", e.message)
            capturePromise = null
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode != REQUEST_IMAGE_CAPTURE) return

        val promise = capturePromise
        capturePromise = null

        if (promise == null) return

        if (resultCode == Activity.RESULT_OK && data != null) {
            try {
                val extras = data.extras
                val imageBitmap = extras?.get("data") as? Bitmap
                if (imageBitmap != null) {
                    val stream = ByteArrayOutputStream()
                    // Compress to JPEG with 75% quality
                    imageBitmap.compress(Bitmap.CompressFormat.JPEG, 75, stream)
                    val byteArray = stream.toByteArray()
                    val base64String = Base64.encodeToString(byteArray, Base64.NO_WRAP)
                    val dataUri = "data:image/jpeg;base64,$base64String"

                    val map = Arguments.createMap().apply {
                        putString("uri", dataUri)
                        putInt("width", imageBitmap.width)
                        putInt("height", imageBitmap.height)
                        putInt("size", byteArray.size)
                    }
                    promise.resolve(map)
                } else {
                    promise.reject("E_NO_IMAGE_DATA", "Failed to retrieve photo bitmap from camera")
                }
            } catch (e: Exception) {
                promise.reject("E_COMPRESSION_FAILED", e.message)
            }
        } else if (resultCode == Activity.RESULT_CANCELED) {
            promise.reject("E_CANCELLED", "Camera capture was cancelled by user")
        } else {
            promise.reject("E_FAILED", "Camera capture failed with result code $resultCode")
        }
    }

    override fun onNewIntent(intent: Intent) {}
}
