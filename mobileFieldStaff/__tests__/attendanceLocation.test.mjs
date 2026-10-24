/**
 * FA-ATTENDANCE-LOCATION-01 unit tests (real modules, fake device API).
 * Run: node --test mobileFieldStaff/__tests__/attendanceLocation.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  LOCATION_STATUS, evaluateFix, captureWithApi, locationFields, pickLocationFields,
  hasCoordinates, isValidCoordinate, locationProblemMessage, interpretLocationColumnsProbe,
} from '../src/utils/attendanceLocation.js';
import { buildCheckInPayload, buildCheckOutPayload, mergeAttendanceRecord } from '../src/utils/attendance.js';

const STAFF = '11111111-1111-4111-8111-111111111111';
const NOW = Date.parse('2026-10-24T04:00:00Z');
const fix = (lat, lng, accuracy, ageMs = 2000) => ({ coords: { latitude: lat, longitude: lng, accuracy }, timestamp: NOW - ageMs });

function fakeApi({ services = true, perm = { status: 'granted', canAskAgain: true }, request = null, position = fix(26.9124, 75.7873, 12), throws = null, hang = false } = {}) {
  const calls = { request: 0, position: 0 };
  return {
    calls,
    hasServicesEnabledAsync: async () => services,
    getForegroundPermissionsAsync: async () => perm,
    requestForegroundPermissionsAsync: async () => { calls.request++; return request || perm; },
    getCurrentPositionAsync: () => {
      calls.position++;
      if (hang) return new Promise(() => {});
      if (throws) return Promise.reject(throws);
      return Promise.resolve(position);
    },
  };
}

test('fresh accurate fix is CAPTURED with real coordinates and fix time', () => {
  const r = evaluateFix(fix(26.9124, 75.7873, 12.34), NOW);
  assert.equal(r.status, LOCATION_STATUS.CAPTURED);
  assert.equal(r.latitude, 26.9124);
  assert.equal(r.longitude, 75.7873);
  assert.equal(r.accuracy_m, 12.3);
  assert.equal(r.captured_at, new Date(NOW - 2000).toISOString());
});

test('poor accuracy is labelled LOW_ACCURACY, never CAPTURED', () => {
  assert.equal(evaluateFix(fix(26.9, 75.7, 150), NOW).status, LOCATION_STATUS.LOW_ACCURACY);
  assert.equal(evaluateFix(fix(26.9, 75.7, 100), NOW).status, LOCATION_STATUS.CAPTURED, '100 m is within threshold');
  assert.equal(evaluateFix(fix(26.9, 75.7, undefined), NOW).status, LOCATION_STATUS.LOW_ACCURACY, 'unknown accuracy is not precise');
  assert.equal(evaluateFix(fix(26.9, 75.7, 40), NOW, { thresholdM: 30 }).status, LOCATION_STATUS.LOW_ACCURACY, 'threshold is configurable');
});

test('stale, future-dated, invalid and (0,0) fixes yield no coordinates', () => {
  const stale = evaluateFix(fix(26.9, 75.7, 10, 120000), NOW);
  assert.equal(stale.status, LOCATION_STATUS.STALE);
  assert.equal(stale.latitude, null);
  assert.equal(evaluateFix({ coords: { latitude: 26.9, longitude: 75.7, accuracy: 5 }, timestamp: NOW + 600000 }, NOW).status, LOCATION_STATUS.STALE);
  assert.equal(evaluateFix(fix(0, 0, 5), NOW).status, LOCATION_STATUS.UNAVAILABLE);
  assert.equal(evaluateFix(fix(NaN, 75, 5), NOW).status, LOCATION_STATUS.UNAVAILABLE);
  assert.equal(evaluateFix(fix(95, 75, 5), NOW).status, LOCATION_STATUS.UNAVAILABLE);
  assert.equal(evaluateFix(null, NOW).status, LOCATION_STATUS.UNAVAILABLE);
  assert.equal(isValidCoordinate(26.9, 75.7), true);
});

test('capture: success requests no permission when already granted', async () => {
  const api = fakeApi();
  const r = await captureWithApi(api, { now: () => NOW });
  assert.equal(r.status, LOCATION_STATUS.CAPTURED);
  assert.equal(api.calls.request, 0);
  assert.equal(api.calls.position, 1);
});

test('capture: device location off → SERVICES_DISABLED, no GPS call', async () => {
  const api = fakeApi({ services: false });
  const r = await captureWithApi(api, { now: () => NOW });
  assert.equal(r.status, LOCATION_STATUS.SERVICES_DISABLED);
  assert.equal(api.calls.position, 0);
  assert.equal(hasCoordinates(r), false);
});

test('capture: permission requested only when needed; denied vs permanently blocked', async () => {
  const granted = fakeApi({ perm: { status: 'undetermined', canAskAgain: true }, request: { status: 'granted', canAskAgain: true } });
  assert.equal((await captureWithApi(granted, { now: () => NOW })).status, LOCATION_STATUS.CAPTURED);
  assert.equal(granted.calls.request, 1);

  const denied = fakeApi({ perm: { status: 'undetermined', canAskAgain: true }, request: { status: 'denied', canAskAgain: true } });
  assert.equal((await captureWithApi(denied, { now: () => NOW })).status, LOCATION_STATUS.PERMISSION_DENIED);
  assert.equal(denied.calls.position, 0);

  const blockedAfterAsk = fakeApi({ perm: { status: 'undetermined', canAskAgain: true }, request: { status: 'denied', canAskAgain: false } });
  assert.equal((await captureWithApi(blockedAfterAsk, { now: () => NOW })).status, LOCATION_STATUS.PERMISSION_BLOCKED);

  const blocked = fakeApi({ perm: { status: 'denied', canAskAgain: false } });
  assert.equal((await captureWithApi(blocked, { now: () => NOW })).status, LOCATION_STATUS.PERMISSION_BLOCKED);
  assert.equal(blocked.calls.request, 0, 'no futile prompt when permanently denied');
});

test('capture: timeout does not hang and yields TIMEOUT', async () => {
  const api = fakeApi({ hang: true });
  const started = Date.now();
  const r = await captureWithApi(api, { now: () => NOW, timeoutMs: 50 });
  assert.equal(r.status, LOCATION_STATUS.TIMEOUT);
  assert.ok(Date.now() - started < 2000);
  assert.equal(r.latitude, null);
});

test('capture: device error yields UNAVAILABLE, never fake coordinates', async () => {
  const r = await captureWithApi(fakeApi({ throws: new Error('Location provider failure') }), { now: () => NOW });
  assert.equal(r.status, LOCATION_STATUS.UNAVAILABLE);
  assert.deepEqual([r.latitude, r.longitude, r.accuracy_m], [null, null, null]);
});

test('database fields: coordinates only for CAPTURED / LOW_ACCURACY', () => {
  const ok = locationFields('check_in', evaluateFix(fix(26.9124, 75.7873, 12), NOW));
  assert.equal(ok.check_in_latitude, 26.9124);
  assert.equal(ok.check_in_location_status, 'CAPTURED');
  const denied = locationFields('check_out', { status: 'PERMISSION_DENIED', latitude: 1, longitude: 2, accuracy_m: 3, captured_at: 'x' });
  assert.deepEqual(
    [denied.check_out_latitude, denied.check_out_longitude, denied.check_out_accuracy_m, denied.check_out_location_status],
    [null, null, null, 'PERMISSION_DENIED']
  );
});

test('payloads: no location keys unless a capture result is passed (schema not ready)', () => {
  const plain = buildCheckInPayload({ id: 'op-1', staffId: STAFF, now: new Date(NOW) });
  assert.deepEqual(Object.keys(plain).sort(), ['business_date', 'check_in_at', 'id', 'staff_id', 'status']);

  const withLoc = buildCheckInPayload({ id: 'op-1', staffId: STAFF, now: new Date(NOW), location: evaluateFix(fix(26.9, 75.7, 10), NOW) });
  assert.equal(withLoc.check_in_location_status, 'CAPTURED');
  assert.equal(withLoc.check_in_at, new Date(NOW).toISOString(), 'event time unchanged by capture');
});

test('check-out carries the original check-in location and adds its own', () => {
  const inLoc = evaluateFix(fix(26.9124, 75.7873, 10), NOW);
  const record = { business_date: '2026-10-24', check_in_at: '2026-10-24T03:30:00.000Z', check_out_at: null, ...locationFields('check_in', inLoc) };
  const outLoc = evaluateFix({ coords: { latitude: 26.95, longitude: 75.80, accuracy: 20 }, timestamp: NOW + 30000000 }, NOW + 30000000 + 1000);
  const p = buildCheckOutPayload({ id: 'op-2', staffId: STAFF, record, now: new Date(NOW + 30000000 + 1000), location: outLoc });
  assert.equal(p.check_in_latitude, 26.9124, 'check-in location preserved');
  assert.equal(p.check_out_latitude, 26.95, 'distinct check-out location');
  assert.notEqual(p.check_in_location_at, p.check_out_location_at, 'each event keeps its own capture time');

  const noLoc = buildCheckOutPayload({ id: 'op-3', staffId: STAFF, record, now: new Date(NOW + 1000) });
  assert.equal('check_in_latitude' in noLoc, false, 'nothing location-related when schema not ready');
  assert.equal(pickLocationFields({ check_in_latitude: 1 }, 'check_in').check_in_latitude, undefined, 'no status → nothing carried');
});

test('offline queue: queued payload keeps the original event location and time through serialization', () => {
  const capturedOffline = evaluateFix(fix(26.9124, 75.7873, 9), NOW);
  const queued = JSON.parse(JSON.stringify(buildCheckInPayload({ id: 'op-9', staffId: STAFF, now: new Date(NOW), location: capturedOffline })));
  assert.equal(queued.check_in_latitude, 26.9124);
  assert.equal(queued.check_in_location_at, capturedOffline.captured_at);
  assert.equal(queued.check_in_at, new Date(NOW).toISOString());
  // Re-sending the same payload (retry) is byte-identical: no new capture at sync time.
  assert.deepEqual(JSON.parse(JSON.stringify(queued)), queued);
});

test('merge: pending local check-out location overlays only when server has no check-out', () => {
  const server = { id: 's', check_in_at: 'a', check_out_at: null, check_in_location_status: 'CAPTURED', check_in_latitude: 1, check_in_longitude: 2 };
  const local = { check_out_at: 'b', check_out_location_status: 'TIMEOUT', check_out_latitude: null, check_out_longitude: null, check_out_accuracy_m: null, check_out_location_at: 't' };
  const merged = mergeAttendanceRecord(server, local);
  assert.equal(merged.check_out_location_status, 'TIMEOUT');
  assert.equal(merged.check_in_latitude, 1, 'server check-in location kept');
  const serverOut = { ...server, check_out_at: 'c', check_out_location_status: 'CAPTURED', check_out_latitude: 5, check_out_longitude: 6 };
  assert.equal(mergeAttendanceRecord(serverOut, local).check_out_location_status, 'CAPTURED', 'server check-out wins');
});

test('location column probe: missing column vs ready vs unknown', () => {
  assert.equal(interpretLocationColumnsProbe({ status: 400, error: { code: '42703', message: 'column staff_attendance.check_in_latitude does not exist' } }), 'MISSING');
  assert.equal(interpretLocationColumnsProbe({ status: 200, error: null, data: [] }), 'READY');
  assert.equal(interpretLocationColumnsProbe({ status: 401, error: { code: '42501', message: 'permission denied' } }), 'UNKNOWN');
  assert.equal(interpretLocationColumnsProbe({ status: 204, error: null, data: null }), 'UNKNOWN', 'HEAD-style empty success is not ready');
});

test('employee messages never contain coordinates or numbers', () => {
  for (const status of Object.values(LOCATION_STATUS)) {
    if (status === 'CAPTURED') continue;
    assert.equal(/\d/.test(locationProblemMessage({ status })), false, status);
  }
});

test('capture service: one-shot only — no last-known position, no continuous tracking', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(path.join(here, '../src/services/AttendanceLocationService.js'), 'utf8');
  assert.equal(/getLastKnownPositionAsync\s*\(|startLocationUpdatesAsync|watchPositionAsync|requestBackgroundPermissionsAsync/.test(src), false);
});
