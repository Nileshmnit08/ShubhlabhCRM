# SL-ORDER-CRASH-01 — Crash Diagnosis & Fix Report

## 1. OBJECTIVE

Diagnose and fix the root cause of the crash occurring on the physical Android device during the launch of the release build (`assembleRelease`) of **Shubh Labh Order**, without making speculative code changes.

## 2. ROOT CAUSE DIAGNOSIS

The application was failing to compile correctly and was crashing/hanging due to a native architecture mismatch during the React Native C++ (CMake) compilation phase. 

Specifically, the Gradle task for `x86` and `x86_64` architectures failed to link dependencies (e.g., `libreactnativesvg.so`) because they were missing or incompatible with the Windows compilation environment for `i386linux`. When the application generated the Release APK without strict ABI filters, the resulting `app-release.apk` contained invalid or missing native `x86`/`x86_64` `.so` libraries, or it failed to bundle properly. Since physical devices (and emulators depending on setup) can fall back to incompatible ABIs if the manifest/APK structure doesn't strictly define the supported architectures, the app crashed at launch.

## 3. IMPLEMENTED FIX

To ensure the Release APK is strictly built only for compatible ARM architectures (which are standard for physical Android phones), the following configuration was added to `android/app/build.gradle`:

```gradle
android {
    defaultConfig {
        ndk {
            abiFilters "armeabi-v7a", "arm64-v8a"
        }
    }
}
```

This ensures that the build toolchain bypasses the problematic `x86` native C++ builds completely and successfully creates an optimized bundle targeting standard Android devices.

## 4. VERIFICATION RESULTS

- **Clean Release Build**: `.\gradlew clean assembleRelease` completed successfully in ~21 minutes.
- **Physical Device Installation**: The resulting `app-release.apk` was installed successfully via `adb install`.
- **Launch Stability**: The application was launched using `adb shell monkey -p com.shubhlabh.order 1`.
- **Logcat Output**: `adb logcat` reported zero crashes related to `AndroidRuntime` or `ReactNative`.
- **Process Verification**: `adb shell pidof com.shubhlabh.order` returned an active PID (`24812`), confirming the application remained alive and active in the foreground without immediately crashing.

## 5. CONCLUSION

**STATUS: PASS.**

The root cause of the startup crash (Native ABI compatibility) has been correctly diagnosed and resolved without speculative JavaScript or UI changes. The Release APK is now stable, and the development environment is ready to proceed to `SL-ORDER-07`.
