/**
 * SL-ONBOARDING-SKIP-01 — how complete a customer's business profile is, and whether the optional Dashboard
 * reminder should be shown. Pure JavaScript (no React Native), unit-tested in Node.
 *
 * Profile completion is INFORMATIONAL only: it never gates navigation, browsing, the cart or order placement.
 * The five core fields are the ones the Profile screen has always used for its completion bar.
 */

export const CORE_FIELDS = ['shop', 'owner', 'mobile', 'city', 'state'];
export const DISMISS_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000; // a dismissed reminder stays away for 7 days
export const dismissKey = (partyId) => `@sl_profile_card_dismissed:${partyId}`;

const filled = (v) => typeof v === 'string' && v.trim().length > 0;

export function getProfileCompletion(customerProfile, userProfile) {
  const cp = customerProfile || {};
  const up = userProfile || {};
  const has = {
    shop: filled(cp.display_name),
    owner: filled(cp.legal_or_core_name) || filled(up.display_name),
    mobile: filled(cp.mobile) || filled(up.mobile),
    city: filled(cp.city),
    state: filled(cp.state),
  };
  const done = CORE_FIELDS.filter((k) => has[k]).length;
  const percent = Math.round((done / CORE_FIELDS.length) * 100);
  return {
    has,
    hasGst: filled(cp.gst_number),
    missing: CORE_FIELDS.filter((k) => !has[k]),
    percent,
    isComplete: done === CORE_FIELDS.length,
  };
}

/** Which Edit Profile section the reminder opens: the address section when city / state are missing, else the top. */
export function editProfileSection(completion) {
  return completion.has.city && completion.has.state ? null : 'address';
}

/**
 * Show the reminder only for a LOADED customer whose profile is incomplete and who has not dismissed it recently.
 * While the profile is still loading (no customer yet) nothing is shown, so the card never flashes.
 */
export function shouldShowCompletionCard({ customerProfile, userProfile, dismissedAt = null, now = Date.now() }) {
  if (!customerProfile || !customerProfile.id) return false;
  if (getProfileCompletion(customerProfile, userProfile).isComplete) return false;
  const t = Number(dismissedAt);
  if (Number.isFinite(t) && t > 0 && now - t < DISMISS_SNOOZE_MS) return false;
  return true;
}

export async function readDismissedAt(storage, partyId) {
  if (!partyId) return null;
  try {
    const raw = await storage.getItem(dismissKey(partyId));
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch (e) {
    return null;
  }
}

export async function saveDismissedAt(storage, partyId, now = Date.now()) {
  if (!partyId) return false;
  try { await storage.setItem(dismissKey(partyId), String(now)); return true; } catch (e) { return false; }
}
