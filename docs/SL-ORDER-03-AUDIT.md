# SL-ORDER-03-AUDIT

## 1. Existing Navigation Structure
- `App.js` currently uses `@react-navigation/native-stack` to switch between `LoginScreen`, `OnboardingNavigator`, and `HomeScreen`.
- `OnboardingNavigator` handles the onboarding flow correctly.
- Currently, there is NO bottom tab navigation for the main authenticated flow. The `HomeScreen` is just a placeholder in `App.js`.
- Placeholder screens exist in `src/features/products`, `src/features/orders`, `src/features/updates`, `src/features/profile` as stubbed out in `scaffold.js`.

## 2. Existing Home Screen
- The current `HomeScreen` is a functional component inside `App.js` with basic "Welcome" text and a "LOGOUT" button.
- It needs to be moved to `src/features/home/HomeScreen.js`.

## 3. Reusable Components
- `src/shared/components/WhatsAppFAB.js` is available (assumed from scaffold/file listing).
- `src/shared/components/UIStates.js` is available.
- `src/shared/theme/index.js` holds the color/typography theme.

## 4. Missing Stitch Elements
- Bottom navigation (Home, Products, Orders, Profile).
- Home dashboard sections: Dynamic Banner, Repeat Last Order, New Order, Current Order, Aaj Ki Khabar.
- Three-dot menu in the header.

## 5. Data/API Dependencies
- Need to fetch previous order and current order (mocked or structure setup for now).
- Need to fetch active banner/promotions (mocked or structure setup).
- Buyer identity is already available via `AuthContext` (`customerProfile`).

## 6. Files that need modification
- `App.js` (Move HomeScreen to separate file, introduce MainTabNavigator).
- `src/features/home/HomeScreen.js` (Implement actual Home Dashboard UI).
- `src/features/products/ProductCatalogueScreen.js` (Navigation target).
- `src/features/orders/MyOrdersScreen.js` (Navigation target).
- `src/features/profile/ProfileScreen.js` (Navigation target).
- `src/navigation/RootNavigator.js` or `MainTabNavigator.js` (To manage tabs).

## 7. Files that should remain untouched
- `mobile/*` and `mobileFieldStaff/*` applications.
- `AuthContext.js` (Unless auth profile requires new fields, which it shouldn't).
- `OnboardingNavigator.js` and onboarding screens.

## 8. Risks/Blockers
- Missing robust backend endpoints for 'Dynamic Banner', 'Last Order', and 'Current Order' specific to the Buyer.
- **Action Plan:** Safely implement the navigation shell and UI components handling both loading and empty states natively. If backend data doesn't exist yet, it should default to the Empty State gracefully as required by the spec. No new RPCs or database tables will be created.

---
**Audit Complete.** Safe to proceed with implementation.
