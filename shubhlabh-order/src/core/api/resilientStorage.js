/**
 * SL-ANDROID-UNIVERSAL-COMPATIBILITY-01 — a storage adapter that can never take the app down.
 *
 * Wraps a key-value backend (expo-secure-store in the app; a fake in tests). Pure JavaScript, backend injected.
 *
 * Why: the auth session is read from the Android Keystore-backed SecureStore at the very start of every launch.
 * On some phones that read throws or hangs — e.g. app data restored to a NEW phone by a cloud backup / phone
 * transfer (the encryption key does not exist there), or a vendor Keystore quirk. Without a guard the session
 * check never finishes and the customer never reaches the login screen.
 *
 * Behaviour:
 *   - every call has a time limit, so a hung Keystore cannot freeze the splash screen
 *   - a failed READ is treated as "no saved value" (the customer simply signs in again) and the unreadable entry
 *     is removed so it does not fail on every launch
 *   - a failed WRITE keeps the value in memory for this run (the session still works) and reports the problem
 *   - genuine problems are reported through `onError` (never swallowed silently)
 */

export const STORAGE_TIMEOUT_MS = 8000;

export function withTimeout(promise, ms, label = 'operation') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}

export function createResilientStorage({ backend, onError = () => {}, timeoutMs = STORAGE_TIMEOUT_MS }) {
  const memory = new Map(); // values that could not be persisted (this run only)
  const report = (op, key, error) => {
    try { onError({ op, key, message: error && error.message ? error.message : String(error) }); } catch (e) { /* reporting must never throw */ }
  };

  return {
    async getItem(key) {
      try {
        const value = await withTimeout(backend.getItem(key), timeoutMs, `storage.getItem(${key})`);
        if (value !== null && value !== undefined) return value;
        return memory.has(key) ? memory.get(key) : null;
      } catch (error) {
        report('getItem', key, error);
        // Unreadable entry (undecryptable after a restore, corrupted): drop it so the next launch is clean.
        try { await withTimeout(backend.removeItem(key), timeoutMs, `storage.removeItem(${key})`); } catch (e) { report('removeItem', key, e); }
        return memory.has(key) ? memory.get(key) : null;
      }
    },
    async setItem(key, value) {
      memory.set(key, value);
      try {
        await withTimeout(backend.setItem(key, value), timeoutMs, `storage.setItem(${key})`);
        memory.delete(key); // safely persisted
      } catch (error) {
        report('setItem', key, error);
      }
    },
    async removeItem(key) {
      memory.delete(key);
      try {
        await withTimeout(backend.removeItem(key), timeoutMs, `storage.removeItem(${key})`);
      } catch (error) {
        report('removeItem', key, error);
      }
    },
  };
}
