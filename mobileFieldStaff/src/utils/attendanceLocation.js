/**
 * FA-ATTENDANCE-LOCATION-01: one-shot location capture for check-in / check-out.
 *
 * Pure module (no React Native imports). The device location API is injected,
 * so permission, timeout and accuracy handling is unit-tested in
 * __tests__/attendanceLocation.test.mjs. The real expo-location binding lives
 * in src/services/AttendanceLocationService.js.
 *
 * Rules:
 * - Only a fresh fix taken at the moment of the attendance action is used.
 * - No last-known, IP, office or background-session location, ever.
 * - Coordinates are stored only for CAPTURED or LOW_ACCURACY (explicitly labelled).
 * - Failures are recorded as an explicit status with null coordinates.
 */

export const LOCATION_ACCURACY_THRESHOLD_M = 100;
export const LOCATION_TIMEOUT_MS = 15000;
export const LOCATION_MAX_FIX_AGE_MS = 60000;

// Mirrors CHECK constraints in supabase/proposals/243_sprint_FA_ATTENDANCE_LOCATION_01.sql
export const LOCATION_STATUS = {
  CAPTURED: 'CAPTURED',                     // fresh fix within the accuracy threshold
  LOW_ACCURACY: 'LOW_ACCURACY',             // fresh fix, accuracy worse than threshold (stored, labelled)
  PERMISSION_DENIED: 'PERMISSION_DENIED',   // user declined this time
  PERMISSION_BLOCKED: 'PERMISSION_BLOCKED', // permanently denied; needs app settings
  SERVICES_DISABLED: 'SERVICES_DISABLED',   // device location switched off
  TIMEOUT: 'TIMEOUT',                       // no fix within the timeout
  STALE: 'STALE',                           // fix older than the freshness limit
  UNAVAILABLE: 'UNAVAILABLE',               // any other device error / invalid coordinates
};

const WITH_COORDINATES = new Set([LOCATION_STATUS.CAPTURED, LOCATION_STATUS.LOW_ACCURACY]);
export const hasCoordinates = (result) => !!result && WITH_COORDINATES.has(result.status);

const isFiniteNumber = (n) => typeof n === 'number' && Number.isFinite(n);

/** Validates coordinates; (0,0) is treated as invalid (common null-island artefact). */
export function isValidCoordinate(lat, lng) {
  if (!isFiniteNumber(lat) || !isFiniteNumber(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  return !(lat === 0 && lng === 0);
}

const failure = (status, attemptedAt) => ({
  status,
  latitude: null,
  longitude: null,
  accuracy_m: null,
  captured_at: attemptedAt,
});

/**
 * Turns a raw fix ({ coords: { latitude, longitude, accuracy }, timestamp }) into
 * a capture result. Never upgrades a stale or inaccurate fix to CAPTURED.
 */
export function evaluateFix(fix, nowMs, { thresholdM = LOCATION_ACCURACY_THRESHOLD_M, maxAgeMs = LOCATION_MAX_FIX_AGE_MS } = {}) {
  const attemptedAt = new Date(nowMs).toISOString();
  const c = fix && fix.coords;
  if (!c || !isValidCoordinate(c.latitude, c.longitude)) return failure(LOCATION_STATUS.UNAVAILABLE, attemptedAt);
  const fixMs = isFiniteNumber(fix.timestamp) ? fix.timestamp : NaN;
  if (!Number.isFinite(fixMs) || nowMs - fixMs > maxAgeMs || fixMs - nowMs > maxAgeMs) {
    return failure(LOCATION_STATUS.STALE, attemptedAt);
  }
  const accuracy = isFiniteNumber(c.accuracy) && c.accuracy >= 0 ? c.accuracy : null;
  return {
    status: accuracy !== null && accuracy <= thresholdM ? LOCATION_STATUS.CAPTURED : LOCATION_STATUS.LOW_ACCURACY,
    latitude: c.latitude,
    longitude: c.longitude,
    accuracy_m: accuracy === null ? null : Math.round(accuracy * 10) / 10,
    captured_at: new Date(fixMs).toISOString(),
  };
}

const timeoutError = () => Object.assign(new Error('Location timeout'), { code: 'ETIMEDOUT' });

/**
 * One-shot capture using an injected API with the expo-location shape:
 *   hasServicesEnabledAsync, getForegroundPermissionsAsync,
 *   requestForegroundPermissionsAsync, getCurrentPositionAsync
 * Permission is requested only here, i.e. only when the employee checks in/out.
 */
export async function captureWithApi(api, {
  now = () => Date.now(),
  timeoutMs = LOCATION_TIMEOUT_MS,
  thresholdM = LOCATION_ACCURACY_THRESHOLD_M,
  positionOptions = {},
} = {}) {
  const attemptedAt = new Date(now()).toISOString();
  try {
    if (!(await api.hasServicesEnabledAsync())) return failure(LOCATION_STATUS.SERVICES_DISABLED, attemptedAt);

    let perm = await api.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') {
      if (perm.canAskAgain === false) return failure(LOCATION_STATUS.PERMISSION_BLOCKED, attemptedAt);
      perm = await api.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        return failure(perm.canAskAgain === false ? LOCATION_STATUS.PERMISSION_BLOCKED : LOCATION_STATUS.PERMISSION_DENIED, attemptedAt);
      }
    }

    let timer = null;
    const fix = await Promise.race([
      api.getCurrentPositionAsync(positionOptions),
      new Promise((_, reject) => { timer = setTimeout(() => reject(timeoutError()), timeoutMs); }),
    ]).finally(() => timer && clearTimeout(timer));

    return evaluateFix(fix, now(), { thresholdM });
  } catch (e) {
    return failure(e && e.code === 'ETIMEDOUT' ? LOCATION_STATUS.TIMEOUT : LOCATION_STATUS.UNAVAILABLE, attemptedAt);
  }
}

/** Database fields for one event. prefix: 'check_in' | 'check_out'. */
export function locationFields(prefix, result) {
  if (!result) return {};
  const coords = hasCoordinates(result);
  return {
    [`${prefix}_latitude`]: coords ? result.latitude : null,
    [`${prefix}_longitude`]: coords ? result.longitude : null,
    [`${prefix}_accuracy_m`]: coords ? result.accuracy_m : null,
    [`${prefix}_location_at`]: result.captured_at || null,
    [`${prefix}_location_status`]: result.status,
  };
}

export const CHECK_IN_LOCATION_KEYS = Object.keys(locationFields('check_in', failure(LOCATION_STATUS.UNAVAILABLE, null)));
export const CHECK_OUT_LOCATION_KEYS = Object.keys(locationFields('check_out', failure(LOCATION_STATUS.UNAVAILABLE, null)));

/** Copies an event's location fields from a record (used to carry check-in location into the check-out upsert). */
export function pickLocationFields(record, prefix) {
  const keys = prefix === 'check_in' ? CHECK_IN_LOCATION_KEYS : CHECK_OUT_LOCATION_KEYS;
  const out = {};
  if (!record || record[`${prefix}_location_status`] === undefined || record[`${prefix}_location_status`] === null) return out;
  keys.forEach((k) => { out[k] = record[k] === undefined ? null : record[k]; });
  return out;
}

/** Message for the employee when a fix was not captured precisely. No coordinates are shown. */
export function locationProblemMessage(result) {
  switch (result && result.status) {
    case LOCATION_STATUS.LOW_ACCURACY:
      return 'Your location signal is weak, so the recorded location may be imprecise. Move to an open area and retry, or continue.';
    case LOCATION_STATUS.PERMISSION_DENIED:
      return 'Location permission was not granted. Your attendance location will not be recorded.';
    case LOCATION_STATUS.PERMISSION_BLOCKED:
      return 'Location permission is turned off for this app. Enable it in the app settings to record your attendance location.';
    case LOCATION_STATUS.SERVICES_DISABLED:
      return 'Device location is switched off. Turn on location to record your attendance location.';
    case LOCATION_STATUS.TIMEOUT:
      return 'Could not get a location fix in time. Move to an open area and retry, or continue without a location.';
    case LOCATION_STATUS.STALE:
      return 'Only an old location was available, so it was not used. Retry, or continue without a location.';
    case LOCATION_STATUS.UNAVAILABLE:
    default:
      return 'Your location could not be determined. Retry, or continue without a location.';
  }
}

/** Probe result for whether the live table has the location columns. → 'READY' | 'MISSING' | 'UNKNOWN' */
export function interpretLocationColumnsProbe({ status, error, data }) {
  if (error) {
    const code = String(error.code || '');
    const msg = String(error.message || '').toLowerCase();
    if (code === '42703' || code === 'PGRST204' || (msg.includes('column') && msg.includes('does not exist'))) return 'MISSING';
    return 'UNKNOWN';
  }
  return status >= 200 && status < 300 && Array.isArray(data) ? 'READY' : 'UNKNOWN';
}
