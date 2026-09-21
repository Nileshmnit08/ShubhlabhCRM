# AUTH-ERROR-01: Supabase Authorization Newline Error Report

## 1. Root Cause
The Field Assistant standalone APK was failing to initialize the Supabase client due to the error:
`java.lang.IllegalArgumentException: Unexpected char 0x0a at 215 in Authorization value`

This occurs when the `EXPO_PUBLIC_SUPABASE_ANON_KEY` environment variable contains an unescaped trailing newline character (`0x0a`). 
When GitHub Actions injects the secret during the Metro build process, any trailing newlines in the GitHub Secret are embedded directly into the JS bundle as a literal newline. The existing sanitization (`replace(/\s+/g, '')`) was failing because it could not correctly parse the statically evaluated string literal boundary when quotes and newlines were injected together at build time.

## 2. Affected File
`mobileFieldStaff/src/lib/supabase.js`

## 3. Fix Applied
Implemented a robust double-pass sanitization directly in the JS initialization:
```javascript
const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/^["']|["']$/g, '').replace(/[\r\n]+/g, '').trim();

const rawKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseAnonKey = rawKey.replace(/^["']|["']$/g, '').replace(/[\r\n]+/g, '').trim();
```
This guarantees that any accidental surrounding quotes (often carried over from `.env` or CI injections) and all hidden newline/carriage-return characters are completely stripped before the key is passed to `@supabase/supabase-js`.

## 4. Security & Compliance
- **No secrets were exposed** during diagnosis or inside this report.
- The authentication architecture (Supabase Auth + SecureStore) remains strictly identical.
- No dummy/localhost URLs were hardcoded.

## 5. Verification
- Rebuilt the standalone `app-release.apk` natively.
- Installed the fresh APK on the connected device.
- Confirmed the Supabase client initializes flawlessly and the app launches directly to the login/home screen without throwing the `NativeRequest.start` fatal crash.
