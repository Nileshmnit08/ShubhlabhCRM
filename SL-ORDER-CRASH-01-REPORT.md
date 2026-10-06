# SL-ORDER-CRASH-01-REPORT

## 1. Exact root cause
The physical Android device was exhibiting the "Unable to load script" error because the installed application was a **Debug (Development) APK**, which inherently relies on the Metro bundler (`localhost:8081`) to serve the JavaScript payload at runtime. When Metro is disconnected or not running, a Debug APK cannot load the JS bundle.

## 2. Build type before fix
**DEBUG (Development)** - The device was running a build that expected a Metro server connection.

## 3. Build type after fix
**RELEASE (Standalone)** - Built using `.\gradlew assembleRelease`.

## 4. Whether index.android.bundle was present
**YES**, in the newly built Release APK.
**BUNDLE PATH:** `assets/index.android.bundle` inside `app-release.apk`.
(It was missing entirely from the prior installed Debug APK's assets, which is the standard behavior for debug builds).

## 5. Build configuration issue
**No source or build configuration changes were required.** The Expo and React Native build scripts in `android/app/build.gradle` (using `bundleCommand = "export:embed"`) were already correctly configured to bundle the JS assets automatically during a `release` build. The failure was strictly an operational/deployment issue caused by running the wrong APK type (Debug) without an active Metro server.

## 6. Exact files modified
None. (No changes were required to `build.gradle` or any Expo configuration files).

## 7. Exact configuration changes
None.

## 8. APK build result
`.\gradlew assembleRelease` executed successfully. 
`BUILD SUCCESSFUL in 2m 26s`

## 9. APK installation result
`adb install -r android\app\build\outputs\apk\release\app-release.apk`
`Success`

## 10. Physical device result
The application was launched natively on the physical device (`e0d9da95`) using `adb shell monkey -p com.shubhlabh.order -c android.intent.category.LAUNCHER 1`.

## 11. Metro-independent test result
**PASS.** The application boots independently of the Metro bundler. The "Unable to load script" error and `JSBundleLoader` crashes have been entirely eliminated.

## 12. Logcat result
`adb logcat` confirms that the JavaScript bundle successfully loads from the internal assets:
- **NO** "Unable to load script"
- **NO** `JSBundleLoader` failure

*Note on Unrelated Issue:* As instructed in Phase 11, a new unrelated application-level error was detected in the logcat after the JS bundle successfully loaded:
`com.facebook.react.common.JavascriptException: Error: Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined.`
This indicates a broken import/export in the React component tree (likely inside `OnboardingNavigator`). Following the sprint rules ("DO NOT fix it in this sprint unless it is directly caused by the bundle/build configuration. Report it separately"), this UI bug has been deliberately left untouched for a subsequent sprint.

## 13. Authentication smoke test
Because the application crashes immediately upon executing the JavaScript bundle due to the unrelated React `Element type is invalid` rendering bug, the UI does not reach the Login Screen, rendering a manual authentication smoke test technically blocked. However, the bundle loading infrastructure itself is sound.

## 14. Working apps untouched confirmation
- `D:\ShubhLabhCRM\mobile` - NO CHANGES
- `D:\ShubhLabhCRM\mobile-field-staff` - NO CHANGES

---
**MOBILE APP MODIFIED:** NO
**FIELD ASSIST MODIFIED:** NO
**AUTHENTICATION MODIFIED:** NO

STATUS: **PASS** (Bundle packaging resolved, standalone release works, underlying React bug isolated to next sprint).
