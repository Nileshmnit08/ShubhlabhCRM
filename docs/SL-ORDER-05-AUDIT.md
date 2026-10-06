# SL-ORDER-05-AUDIT

## 1. Existing Product Implementation
- `ProductCatalogueScreen.js` handles loading, empty states, and local quantity state, with navigation contracts stubbed out via simple Alerts.

## 2. Existing Product Detail Implementation
- There is NO existing `ProductDetailScreen.js` currently implemented. The navigation contract in `ProductCatalogueScreen` points to it, but it needs to be built.

## 3. Existing Order/Cart State
- No existing cart/order state management libraries or contexts are present.
- The project relies heavily on `React Context` (`AuthContext`, `OnboardingContext`). Following instructions not to introduce new state libraries like Redux or Zustand, I will use `OrderListContext.js` internally.

## 4. Reusable Components
- Will reuse `UIStates.js` patterns for loading and empty screens.
- `lucide-react-native` icons will continue to be used.

## 5. Files to Change
- `ProductCatalogueScreen.js` (Update to use Context and navigate to actual Product Detail).
- `MainTabNavigator.js` or `App.js` (To add `ProductDetailScreen` and `MeriOrderListScreen` into the navigation stack).

## 6. Files to Leave Untouched
- External apps (`mobile`, `mobileFieldStaff`).
- Unrelated SQL tables.
- Base `AuthContext.js` (except possibly subscribing order-list context to logout).

## 7. Backend Dependencies
- Supabase for fetching the individual product details if necessary (though we can pass params safely for performance). We will not implement complex scheme/price calculation, keeping it lightweight per spec.

## 8. Blockers
- None. Safe to proceed with UI implementations and Context creation.
