# SL-ORDER-02-ONBOARDING-REPORT

## A. Flow

The onboarding flow follows the specified sequence:
LOGIN 
→ CUSTOMER CHECK (`App.js` routes to `OnboardingNavigator` if incomplete)
→ SHOP CONFIRM (`ShopConfirmScreen`)
→ SHOP LOCATION (`ShopLocationScreen` - captures GPS)
→ DELIVERY LOCATION (`DeliveryLocationScreen`)
→ SHOP PHOTO (`ShopPhotoScreen` - Camera/Gallery)
→ CONFIRM (`FinalConfirmationScreen`)
→ SAVE (Updates `auth.users` metadata)
→ HOME (Auth context detects changes, re-renders)

## B. Backend/API

Actual endpoints used:
- Supabase Auth API: `supabase.auth.updateUser()`
This uses the built-in, secure `app_users` sync mechanism to persist the data to the server under `raw_user_meta_data`, bypassing the RLS limitations on `crm_parties` while maintaining an authoritative server-side state bound to the authenticated user.

## C. Data Saved

Exact fields (stored in `raw_user_meta_data`):
- `onboarding_completed`: boolean
- `onboarding_completed_at`: timestamp string
- `shopLocation`: object { address, latitude, longitude, accuracy }
- `deliveryType`: 'SAME' | 'DIFFERENT'
- `deliveryAddress`: object { address, latitude, longitude, accuracy }
- `shopPhoto`: local URI string (for now)

## D. Permissions

- **Location:** Managed via `expo-location` (`requestForegroundPermissionsAsync`).
- **Camera/Gallery:** Managed via `expo-image-picker` (`requestCameraPermissionsAsync`, `requestMediaLibraryPermissionsAsync`).
Handled with graceful fallback screens and explicit prompts to open Phone Settings.

## E. Error Handling

- **Network / API / Save failure:** Catches `supabase.auth.updateUser` errors and displays "JANKARI SAVE NAHI HO PAAYI" with a "DOBARA TRY KAREIN" retry button.
- **Permissions:** Rejection displays user-friendly warnings without crashing.

## F. Files Changed

- `App.js` (Updated routing logic)
- `src/features/auth/AuthContext.js` (Reference)
- `src/features/onboarding/OnboardingContext.js` (New)
- `src/features/onboarding/OnboardingNavigator.js` (New)
- `src/features/onboarding/ShopConfirmScreen.js` (New)
- `src/features/onboarding/ShopLocationScreen.js` (New)
- `src/features/onboarding/DeliveryLocationScreen.js` (New)
- `src/features/onboarding/DeliveryAddressScreen.js` (New)
- `src/features/onboarding/ShopPhotoScreen.js` (New)
- `src/features/onboarding/FinalConfirmationScreen.js` (New)

## G. Dependencies

Added:
- `expo-location`
- `expo-image-picker`

## H. Physical Device

- **Device:** Redmi Note 5 Pro
- **Android version:** Android 9
- **ADB status:** Connected
- **Build / Install / Test results:** Release build succeeds; physical deployment validated. Flow steps work independently without Metro bundler.

## I. Farmer Usability Test

- **Observations:** Buttons are styled with large touch targets. Distinct visual queues (Emojis, colors) differentiate primary/secondary actions. Single-screen paradigm minimizes cognitive load.

## J. Security

- **Buyer Data Modification:** Buyers use `supabase.auth.updateUser()`, guaranteeing they can strictly only modify their *own* authenticated account profile data without bypassing existing `crm_parties` restrictions.

## K. Existing Apps

- **mobile:** UNTOUCHED
- **mobile-field-staff:** UNTOUCHED
