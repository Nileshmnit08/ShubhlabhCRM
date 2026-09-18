# MICRO-SPRINT FA-CONFIG-DIAG-01-REPORT.md

## 1. Objective
Diagnose why the currently installed Field Assistant APK is attempting to connect to `faked.supabase.co` instead of the actual Supabase URL, causing the `java.net.UnknownHostException: Unable to resolve host "faked.supabase.co"` error.

## 2. Current Supabase Configuration Architecture
The Supabase configuration values are initialized in `mobileFieldStaff/src/lib/supabase.js`.
It consumes environment variables supplied during the build process, specifically:
- `process.env.EXPO_PUBLIC_SUPABASE_URL`
- `process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY`

During the APK build process, the React Native bundler evaluates these environment variables and statically hardcodes the string values directly into the JavaScript bundle.

## 3. Configuration Sources Inspected
- `mobileFieldStaff/.env`: Contains the correct `EXPO_PUBLIC_SUPABASE_URL` (`https://fwkjddflpzkowlawkmka.supabase.co`) and a valid Anon Key.
- `mobileFieldStaff/src/lib/supabase.js`: Initializes Supabase using `process.env.EXPO_PUBLIC_SUPABASE_URL`.
- `mobileFieldStaff/package.json`: Reviewed, standard Expo configuration.
- `.github/workflows/android-release.yml`: Correctly specifies the environment variables using GitHub Actions secrets (`${{ secrets.EXPO_PUBLIC_SUPABASE_URL }}`).

## 4. Location/Source of faked.supabase.co
- **File**: Environment Variable substitution during the local `gradlew assembleRelease` build.
- **Configuration Source**: It was explicitly passed via command-line shell environment variables during the manual compilation of the previous sprint.
- **Is it a fallback?**: No, the fallback in `supabase.js` is `http://127.0.0.1:54321`. This was a manual injection.
- **Committed to Git?**: No, it is not present in `.env` or anywhere in the source repository.
- **Present in build config?**: Yes, it became permanently embedded into the JS bundle of the locally built APK.

## 5. Installed APK Finding
The physical device (ADB ID: `e0d9da95`) has the APK installed that I manually built and deployed a few minutes ago. Because this APK was built using the hijacked environment variables, the installed APK on the device is permanently hardcoded to query `faked.supabase.co`.

## 6. Local Build Finding
The local build execution during the previous sprint explicitly set:
`$env:EXPO_PUBLIC_SUPABASE_URL="https://faked.supabase.co"`
immediately before invoking `./gradlew assembleRelease`. The bundler faithfully injected this exact string into the `index.android.bundle`.

## 7. GitHub Actions Configuration Finding
- **SUPABASE URL secret configured**: YES
- **SUPABASE ANON KEY secret configured**: YES
The `.github/workflows/android-release.yml` file properly maps the workflow environment variables to the repository secrets.

## 8. Previous Working Configuration Comparison
The local `.env` file correctly contains the live production Supabase URL. The GitHub Actions workflow also correctly maps secrets. The regression is exclusively tied to the local command-line environment overrides performed in the current terminal session, which bypassed the correct `.env` file.

## 9. Exact Root Cause
**Root Cause: Environment Variable Override During Local Build**
The current APK was compiled locally using a command that explicitly overrode the `EXPO_PUBLIC_SUPABASE_URL` environment variable with `https://faked.supabase.co`. Because React Native evaluates and embeds environment variables at build-time, the resulting standalone APK contains `faked.supabase.co` hardcoded into its minified JS bundle.

## 10. Minimal Fix Plan
1. **Exact file/configuration requiring correction**: The command used to build the local APK.
2. **Exact configuration source that should be authoritative**: The local `mobileFieldStaff/.env` file.
3. **Whether `.env` should be corrected**: No, it already contains the correct values.
4. **Whether GitHub Actions secrets need verification**: No, they are properly configured.
5. **Whether source-code fallback should be removed**: No, the fallback (`http://127.0.0.1:54321`) is standard and harmless since production builds should supply values.
6. **Whether a new APK is required**: YES. The application must be rebuilt without the manual `$env:` overrides so that the bundler reads the correct values from the `.env` file.
7. **Physical validation required after the fix**: YES. The new APK must be installed and network connectivity to the correct Supabase backend must be verified.

## 11. Security Findings
- No `service_role` key is embedded in frontend/mobile code.
- No password is embedded.
- No secret is printed into logs.
- No credentials are included in the diagnostic report.

## 12. Files Changed
NONE.

## 13. Database Objects Changed
NONE.

## 14. Final Status
**PASS — ROOT CAUSE IDENTIFIED**

END
