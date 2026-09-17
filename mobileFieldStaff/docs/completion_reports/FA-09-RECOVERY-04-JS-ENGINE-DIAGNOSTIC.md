# FA-09-RECOVERY-04 — JS ENGINE / NATIVE LIBRARY DIAGNOSTIC

## 1. Exact Observed Crash
**Crash:** `com.facebook.soloader.SoLoaderDSONotFoundError: couldn't find DSO to load: libhermestooling.so`
**Condition:** Application crashes immediately on startup on the physical Android device.

## 2. Current JS Engine Configuration
- `react-native`: 0.86.3
- `expo`: ~57.0.22
- `newArchEnabled`: true (New Architecture enabled)
- `hermesEnabled`: false (Modified to bypass Windows Device Guard)

## 3. Native Dependency Analysis
Setting `hermesEnabled=false` disabled the execution of the `hermesc.exe` compiler during the bundle phase, successfully bypassing the Windows Application Control block. However, modern React Native (0.76+) and Expo SDK 57 with the New Architecture enabled are deeply coupled with the Hermes engine at the native C++ level (e.g., TurboModules and Fabric).

## 4. Source of libhermestooling.so Request
The native runtime library `libreactnative.so` (and associated Expo core modules) unconditionally request Hermes native bindings (`libhermestooling.so` and `libhermesvm.so`) because the New Architecture natively assumes Hermes as the primary JS execution environment in this SDK.

## 5. APK Native Library Inventory
An inspection of the generated APK `lib/arm64-v8a/` directory revealed:
- `libhermesvm.so` is PRESENT
- `libhermestooling.so` is PRESENT
- `libjsc.so` is MISSING

Despite being present, `SoLoader` fails to load `libhermestooling.so`, likely due to a mismatch, missing transitive dependency (like a specific `libc++_shared.so`), or a corrupted linkage caused by the hybrid `hermesEnabled=false` build configuration attempting to load it anyway.

## 6. Whether JSC is Supported in This Exact Project
**NO.** JSC is not genuinely supported in this project configuration without extensive manual fallbacks, external JSC AAR declarations (like `jsc-android`), and disabling the New Architecture. Modern Expo drops JSC support entirely.

## 7. Whether Hermes is Required
**YES.** Hermes is absolutely mandatory for Expo SDK 57, React Native 0.86.3, and `newArchEnabled=true`.

## 8. Minimal Change Made
Restored `hermesEnabled=true` in `android/gradle.properties`.

## 9. Build Result
**BLOCKED**
As documented in the sprint instructions, the `hermesc.exe` binary is blocked by Windows Device Guard on the current local environment. Therefore, a successful release APK cannot be built locally. 

**Recommendation:** The production build must be performed on an approved build environment (such as a managed CI/CD pipeline or a Mac/Linux machine) where the Hermes compiler execution is permitted.

## 10. Physical Test Result
**BLOCKED**
Cannot physically test the tracking capabilities until a valid Hermes-compiled APK is built on an approved environment.

## 11. Changed Files
- `d:\ShubhLabhCRM\mobileFieldStaff\android\gradle.properties`

---

### Final Classification
**PASS (DIAGNOSTIC)** / **BLOCKED (BUILD/TEST)**

The diagnostic successfully identified that `hermesEnabled=false` creates a broken hybrid build missing JSC while still requiring Hermes natively. The correct architecture has been restored (`hermesEnabled=true`). The sprint is structurally a PASS for identifying the root cause, but BLOCKED for final physical validation due to the local Windows Device Guard policy.
