# SL-ANDROID-UNIVERSAL-COMPATIBILITY-01 — report (2026-11-20)

Order App v1.0.3 (versionCode 4). Package `com.shubhlabh.order`. Customer-reported problem: vivo V60e (Dimensity 7360-Turbo, 8 GB) — app flashes and closes, no login screen. No crash log and no vivo device were available, so the **root cause is not confirmed**; the changes below remove the realistic causes found and add diagnostics.

## Stack (actual)
Expo SDK 57.0.26, React Native 0.86.3 (New Architecture on, Hermes on), React 19.2.3, Node 24, Gradle 9.3.1, AGP 8.12.0, Kotlin 2.1.20, compileSdk 36, targetSdk 36, minSdk 24, NDK 27.1, R8/minify off, ABIs arm64-v8a / armeabi-v7a / x86 / x86_64, native libs 16 KB aligned (zipalign -P 16: 76/76 OK).

## Findings
| # | Finding | Action |
|---|---|---|
| 1 | `allowBackup="true"` with **no** exclusion of the Keystore-encrypted SecureStore prefs. On a new phone (cloud restore / phone transfer) the encrypted login is restored without its Keystore key; reading it throws at the first launch. | `android:fullBackupContent` + `android:dataExtractionRules` now point at expo-secure-store's own exclusion XML. |
| 2 | Saved-login storage adapter had no error handling, no timeout, un-awaited writes. | `src/core/api/resilientStorage.js`: timeouts, failed read = "no saved login" (entry removed), failed write kept in memory, errors reported. |
| 3 | `getSession()` had no `.catch`; a stalled first profile request left "Loading..." forever. | `AuthContext`: `.catch` → login screen; 15 s startup watchdog. |
| 4 | No error boundary: any JS render error in release closes the app with no message. | `ErrorBoundary` at the app root (Try again / फिर कोशिश करें) + local error record `@sl_last_error` (`crashLog.js`), global handler records then delegates unchanged (fatal errors are not hidden). |
| 5 | Unused sensitive permissions RECORD_AUDIO, SYSTEM_ALERT_WINDOW in the manifest (vendor installers/scanners flag overlay permission). | Removed with `tools:node="remove"`. |
| 6 | Release APK signed with the public Android debug key. | Production keystore created; build.gradle uses it only when `SL_RELEASE_*` properties are supplied. Default build still uses the old key so installed apps update in place (owner decision). |
| 7 | Installed vs Expo-expected versions differ: async-storage 3.1.1 (expected 2.2.0), expo 57.0.26 (57.0.33), screens 4.28.0 (4.26.0), svg 15.15.5 (15.15.4), image-picker/location patch. | **Not changed** (no blind upgrade; async-storage major downgrade could affect stored data). Listed as follow-up. |
| 8 | Optional services (presence, notifications, theme storage) already catch their own failures; no runtime permission is requested at startup. | Verified, covered by tests. |

## Not tracked by Git
`android/` is in `.gitignore`. The manifest, `build.gradle` (version, signing) and the other native edits exist only in this working copy.

## Artifacts (`dist/release-1.0.3/`, not tracked)
- `shubhlabh-order-v1.0.3-debugkey.apk` — same signing key as 1.0.0–1.0.2, updates in place. SHA-256 `2066C9EF…242AAC`.
- `shubhlabh-order-v1.0.3-prodkey.apk` — production key `3D:7F:13:7C:…:2F:81:C2`. Cannot update an installed 1.0.x (different key). SHA-256 `CA534F94…C6268`.
- `shubhlabh-order-v1.0.3.aab` — signed with the production key, for Play upload.
- Keystore + passwords: `C:\Users\dell\ShubhLabhKeys\` (outside the repo). **Back it up; losing it means no future updates with that key.**
- Existing customer downloads in `app/public/downloads` were not touched.

## Tests
Automated: 254 passing. Physical: Redmi Note 5 Pro (Android 9, arm64) — update-install over 1.0.2 kept data and session, 6 cold launches, warm launch, offline launch, online launch. Emulators (x86_64 AOSP): Android 10, 13, 15, 16 — fresh install, first launch (Login screen on Android 16 verified by screenshot), 3 cold launches, warm launch, airplane-mode launch, update install, no FATAL/JS error lines.

---

# Release gate (SL-ANDROID-COMPATIBILITY-RELEASE-GATE-02) and v1.0.4 (2026-11-20)

## What changed after 1.0.3
- **Navigation bug found** (customer-reported "Couldn't find a screen named 'MainTabs' to use as 'initialRouteName'"): `App.js:67` (commit 31c3687, 2026-11-19) declared `initialRouteName="MainTabs"` for the signed-in navigator, but `MainTabs` was registered only when `onboarding_completed || is_onboarded`; otherwise only `Onboarding` existed. This is the most likely cause of the vivo "flashes and closes" report (before 1.0.3 had an error boundary).
- **SL-ONBOARDING-SKIP-01:** the onboarding gate is removed. A signed-in customer always gets `MainTabs` (registered unconditionally). Onboarding screens are kept, unused. An optional dismissible reminder card (`ProfileCompletionCard`) appears on the Dashboard while the five core profile fields are incomplete; it opens Edit Profile (`BusinessProfile`), hides itself when complete and for 7 days after dismissal.
- **Dependencies aligned** to Expo SDK 57 (`expo-doctor` 21/21): expo 57.0.33, expo-location 57.0.23, expo-image-picker 57.0.21, react-native-screens 4.26.x, react-native-svg 15.15.4. **AsyncStorage stays at 3.1.1 on purpose** (listed in `expo.install.exclude`): v3's default export copies the old `RKStorage` database into a new `AsyncStorage` Room database and keeps writing only there, so every installed app already holds its data in the v3 database; downgrading to 2.2.0 would read the stale `RKStorage` copy and silently lose theme/font preferences.
- **Android configuration now persists** (`android/` is generated by `expo prebuild` and git-ignored): `app.json` (`android.versionCode`, `blockedPermissions` RECORD_AUDIO + SYSTEM_ALERT_WINDOW, plugin `expo-secure-store` for the backup-exclusion rules) and the local config plugin `plugins/withReleaseSigning.js` (optional production-key hook). A from-scratch `npm ci` + `expo prebuild --clean` + `gradlew clean assembleRelease` reproduced everything (debug.keystore and gradle.properties identical to the working project).

## Release signing
Published 1.0.0/1.0.1/1.0.2 and the 1.0.4 `-debugkey` APK share certificate SHA-256 `fac61745dc09…` (CN=Android Debug), package `com.shubhlabh.order`; codes 1, 2, 3 and 5. The production key is documented above; keystore and passwords are in `C:\Users\dell\ShubhLabhKeys\` with a copy in `D:\ShubhLabhKeys-backup\` (same disk machine — keep an off-machine copy). Nothing secret is in Git.

## 1.0.4 artifacts (`dist/release-1.0.4/`, untracked)
| file | signing | SHA-256 |
|---|---|---|
| shubhlabh-order-v1.0.4-debugkey.apk | existing key (updates in place) | 5A07FB35…D6DD |
| shubhlabh-order-v1.0.4-prodkey.apk | production key (cannot update an installed 1.0.x) | 8B1080AC…8D1B |
| shubhlabh-order-v1.0.4.aab | production key (Play upload) | 23CBB4C1…565F |
Clean build log: `dist/release-1.0.4/clean-build.log` (clean assembleRelease 19 min 26 s).
