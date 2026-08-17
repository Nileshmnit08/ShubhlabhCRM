/**
 * A safe storage wrapper that falls back to an in-memory object 
 * if window.localStorage or window.sessionStorage is blocked or unavailable
 * (e.g., iOS Safari Private Mode, strict privacy settings).
 */

class MemoryStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

function createSafeStorage(type) {
  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return storage;
  } catch (e) {
    console.warn(`${type} is not available, falling back to MemoryStorage.`, e);
    return new MemoryStorage();
  }
}

export const safeLocalStorage = createSafeStorage('localStorage');
export const safeSessionStorage = createSafeStorage('sessionStorage');

// Default export compatible with Supabase's expected storage interface
export const safeStorage = {
  getItem: (key) => safeLocalStorage.getItem(key),
  setItem: (key, value) => safeLocalStorage.setItem(key, value),
  removeItem: (key) => safeLocalStorage.removeItem(key),
};
