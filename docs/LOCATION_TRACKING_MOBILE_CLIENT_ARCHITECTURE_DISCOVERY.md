# Location Tracking Mobile Client Architecture Discovery

## 1. Current mobile architecture
The Shubh Labh CRM is currently a pure **Web Application**. There is no dedicated mobile client architecture present in the codebase. It relies entirely on standard web browsers for access.

## 2. Framework/runtime
- **Frontend Framework:** React 19
- **Build Tool:** Vite
- **Language:** JavaScript
- **Backend/BaaS:** Supabase (PostgreSQL)
- **Mobile Container:** None (No Capacitor, Cordova, React Native, or Native Android dependencies).

## 3. Android project existence
**MISSING.** There is no native Android project in the repository. Extensive searches confirm the absence of an `AndroidManifest.xml`, `build.gradle`, or any Android-specific build configuration.

## 4. Android package/application ID
**N/A.** Since there is no Android project, there is no package or application ID.

## 5. Android SDK configuration
**N/A.** No SDK targets or minimum versions are configured.

## 6. Current permissions
**NONE.** The application does not currently request any Android permissions, nor does it use the Web Geolocation API for browser-based location access.

## 7. Authentication architecture
Authentication is handled entirely via **Supabase Auth** (`@supabase/supabase-js`). The web client manages session tokens (JWTs), which are passed automatically to the Supabase PostgreSQL backend on every request.

## 8. Staff/User identity architecture
Users are mapped to their CRM roles (e.g., 'Admin', 'Operator') via custom logic in the frontend referencing `users` or `app_users` tables, leveraging the authenticated Supabase session.

## 9. Supabase architecture
- **Client Library:** `@supabase/supabase-js` (v2.112.3)
- **Data Access:** The React application queries the Supabase REST/PostgREST APIs directly from the client.
- **Backend:** There is no intermediate Node.js/Python backend; it is a direct Client-to-Supabase architecture.

## 10. Existing background execution capability
**NONE.** As a standard web application, it possesses zero capability to execute native Android background tasks, services, or WakeLocks when the browser tab is closed or minimized.

## 11. Existing location-related implementation
The database contains text fields for static location records (e.g., `raw_location`, `warehouse_location`, `market_location`). There is no existing GPS tracking, foreground tracking, or background tracking logic. 

## 12. Existing mobile build/run process
There is no mobile build process. The application is built for the web using `npm run build` and deployed as a standard website.

## 13. OnePlus/Xiaomi/Samsung information found
**NONE.** There are no manufacturer-specific configurations, workarounds, or documentation for battery optimization handling.

## 14. Can the existing client technically support Android Location Services?
**NO.** A pure web application cannot natively bind to Android Location Services (e.g., `FusedLocationProviderClient`) or manage native foreground services. It is restricted to the browser's Geolocation API, which is unsuitable for reliable field tracking.

## 15. Can the existing client technically support supported background execution?
**NO.** Web applications are aggressively suspended by mobile operating systems (iOS and Android) when backgrounded. They cannot run continuous background location tracking.

## 16. What is missing?
- A native mobile wrapper or container (e.g., Capacitor, React Native, Native Android) to interface with the OS.
- Android background execution permissions (`ACCESS_BACKGROUND_LOCATION`).
- A background tracking service.
- An offline SQLite/Local queue for sync during network loss.

## 17. What is already reusable?
- **Supabase Backend:** The PostgreSQL database, RLS policies, and Auth are perfectly suited for a mobile client.
- **React UI:** If a wrapper like Capacitor is chosen, the entire existing React UI can be deployed as an app with minimal changes.

## 18. Recommended architecture options
1. **Capacitor (Recommended):** Wrap the existing Vite/React web app in Capacitor. This allows 99% code reuse while providing access to native Android APIs (like Background Geolocation plugins and SQLite offline storage).
2. **React Native / Expo:** Build a separate, dedicated mobile companion app for field staff.
3. **Native Android (Kotlin/Java):** Build a separate, dedicated native application.

## 19. Risks of each option
- **Capacitor:** Background location plugins (like `capacitor-background-geolocation`) often require commercial licenses for robust enterprise features, and background performance in a WebView can sometimes be less efficient than native.
- **React Native / Native Android:** Requires building and maintaining a completely separate, duplicate UI and codebase, dramatically increasing development time and technical debt.

## 20. Product Owner decisions required before implementation
**BLOCKED — MOBILE CLIENT ARCHITECTURE DECISION REQUIRED**
The Product Owner must approve the introduction of a mobile framework (e.g., Capacitor) to the repository before any Android Location Services implementation can begin.
