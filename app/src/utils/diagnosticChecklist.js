/**
 * ==========================================
 * MOBILE SAFARI QA CHECKLIST
 * ==========================================
 * 
 * If you deploy to Vercel and get a blank screen on iPhone, check the following:
 * 
 * 1. Storage Access (SecurityError):
 *    - Did you use `window.localStorage` without a try/catch? 
 *    - Safari Private Browsing blocks localStorage. Use `src/utils/safeStorage.js` instead.
 * 
 * 2. Transpilation Target (Parse Error):
 *    - Did you use new JS features like `?.` or `??` that the user's iOS version doesn't support?
 *    - Fix: Ensure `vite.config.js` has `build: { target: 'es2015' }`
 * 
 * 3. Invalid Date Initialization:
 *    - Did you use `new Date('YYYY-MM-DD')`?
 *    - Fix: Safari throws "Invalid Date" for some non-ISO 8601 strings. Always use `T00:00:00Z` or safe parsers.
 * 
 * 4. CSS Layout / Rendering Bugs:
 *    - `100vh` causes scrolling issues due to the bottom address bar. Use `100dvh` or `min-height: -webkit-fill-available`.
 *    - Extensive `backdrop-filter: blur()` combined with `overflow: hidden` can cause Safari to render a blank layer.
 * 
 * 5. App Bootstrap Error Boundary:
 *    - If an error occurs in a module scope (e.g. `const x = localStorage.getItem('y')` at the top of a file),
 *      the standard React ErrorBoundary inside App.jsx won't catch it. 
 *    - Ensure `main.jsx` is wrapped in `try/catch` and `<AppErrorBoundary>`.
 * 
 * ==========================================
 */
