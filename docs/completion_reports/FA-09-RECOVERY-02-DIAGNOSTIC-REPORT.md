# FA-09-RECOVERY-02 DIAGNOSTIC REPORT: CAPTURE CURRENT START TRACKING CRASH

## Diagnostic Audit Results

### 1. Installed APK Verification & Timestamps
- The generated release APK (`app-release.apk`) has a timestamp of **2:42 PM**. 
- The `patch-package` execution occurred prior to this (around **2:37 PM**).
- The APK was successfully installed on the device (`adb pm dump` verified).

### 2. Exact Crash Log & Stack Trace
After launching the app, it immediately crashed with the exact same boot-loop exception:
```
09-16 14:49:44.374  9909  9909 E AndroidRuntime: FATAL EXCEPTION: main
09-16 14:49:44.374  9909  9909 E AndroidRuntime: Process: com.shubhlabh.fieldassistant, PID: 9909
09-16 14:49:44.374  9909  9909 E AndroidRuntime: java.lang.NullPointerException: Attempt to invoke virtual method 'boolean java.lang.String.equals(java.lang.Object)' on a null object reference
09-16 14:49:44.374  9909  9909 E AndroidRuntime: 	at expo.modules.taskManager.repository.TasksPersistence.clearTaskPersistence(TasksPersistence.java:21)
09-16 14:49:44.374  9909  9909 E AndroidRuntime: 	at expo.modules.taskManager.repository.BareTasksAndEventsRepository.persistTasksForAppScopeKey(BareTasksAndEventsRepository.java:119)
09-16 14:49:44.374  9909  9909 E AndroidRuntime: 	at expo.modules.taskManager.TaskService.restoreTasks(TaskService.java:589)
```

### 3. Patched TasksPersistence in Built APK
**Result: NOT PRESENT.**
I extracted the release APK (`app-release.apk`) and scanned the Dalvik Executables (`classes*.dex`). 
- The `clearTaskPersistence` method exists in the DEX files.
- The unique `safeBut` variable (introduced by the patch) was **NOT FOUND**. The APK contains the unpatched, buggy version of `TasksPersistence.class`.

### 4. Did `patch-package` Execute?
**Result: YES.**
I verified `node_modules/expo-task-manager/android/src/main/java/expo/modules/taskManager/repository/TasksPersistence.java` on the build machine. The source code *is* correctly patched with the `safeBut` null check.

### 5. Did Gradle use the patched dependency?
**Result: NO.**
Gradle completely ignored the patched Java source file in `node_modules`. This occurs for one of two reasons:
1. **Gradle Build Cache:** Gradle's `UP-TO-DATE` checks determined the `expo-task-manager` task didn't need recompilation because the package version didn't change, pulling a stale compiled `.class` from `~/.gradle/caches` or `android/.gradle`.
2. **Expo Prebuilt AARs:** The `expo-module-gradle-plugin` may have downloaded a prebuilt `.aar` binary from Maven for `expo-task-manager` instead of compiling the local source.

### 6. Persisted-State Findings
The app continues to boot-loop because the device's Android `SharedPreferences` still contains the invalid `null` key task state. Because the patch was not compiled into the APK, the native `TaskService` fails to handle the null key gracefully during initialization, crashing before JavaScript even loads.

### 7. Exact Current Root Cause
The root cause of the *current* crash is a **build system caching failure**. The necessary Java fix is present in the source tree but was ignored by Gradle during the APK generation, resulting in an unpatched binary that continues to trip over the corrupted persisted state.

## Recommended Minimum Fix

To force Gradle to compile the patched source code into the APK:

1. **Clear Gradle Build Cache:**
   Run `./gradlew clean` in the `android` directory.
   
2. **Disable Expo Prebuilds (if applicable) & Force No-Cache:**
   Run the build with prebuilds explicitly disabled and caching bypassed:
   ```bash
   cd android
   USE_EXPO_PREBUILDS=false ./gradlew assembleRelease --no-build-cache
   ```

3. **Verify:** Before releasing, check the generated APK's DEX file to ensure the patch was actually compiled.

**CLASSIFICATION:**
DIAGNOSTIC COMPLETE — FIX REQUIRED
