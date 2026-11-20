/**
 * SL-ANDROID-UNIVERSAL-COMPATIBILITY-01 — a tiny local record of the last JavaScript error / startup problem, so a
 * failure on a customer's phone can be diagnosed without asking the customer for logs. Pure JavaScript; the storage
 * is injected (AsyncStorage in the app). Recording never throws and never blocks.
 */

export const CRASH_LOG_KEY = '@sl_last_error';
const MAX_STACK = 2000;

export function describeError(error, extra = {}) {
  const e = error && typeof error === 'object' ? error : { message: String(error) };
  return {
    message: String(e.message || e).slice(0, 500),
    stack: String(e.stack || '').slice(0, MAX_STACK),
    name: String(e.name || 'Error'),
    at: new Date().toISOString(),
    ...extra,
  };
}

export async function recordError(storage, error, extra = {}) {
  try {
    await storage.setItem(CRASH_LOG_KEY, JSON.stringify(describeError(error, extra)));
    return true;
  } catch (e) {
    return false;
  }
}

export async function readLastError(storage) {
  try {
    const raw = await storage.getItem(CRASH_LOG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export async function clearLastError(storage) {
  try { await storage.removeItem(CRASH_LOG_KEY); } catch (e) { /* nothing to do */ }
}

/**
 * Installs a global JavaScript error hook that RECORDS the error and then hands it to the previous handler
 * unchanged. It does not swallow anything: a fatal error still behaves exactly as before.
 */
export function installGlobalErrorRecorder(errorUtils, storage) {
  if (!errorUtils || typeof errorUtils.setGlobalHandler !== 'function') return false;
  const previous = typeof errorUtils.getGlobalHandler === 'function' ? errorUtils.getGlobalHandler() : null;
  errorUtils.setGlobalHandler((error, isFatal) => {
    recordError(storage, error, { fatal: !!isFatal, source: 'global' });
    if (typeof previous === 'function') previous(error, isFatal);
  });
  return true;
}
