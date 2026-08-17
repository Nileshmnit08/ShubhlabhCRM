/**
 * Helper to detect if the current environment is an iOS WebKit browser.
 * Useful for conditionally rendering complex components or animations
 * that might crash older iPhones.
 */
export function isIOSWebKit() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent) && /webkit/.test(userAgent);
}
