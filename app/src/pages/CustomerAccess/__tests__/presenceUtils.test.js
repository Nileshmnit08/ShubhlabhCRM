import test from 'node:test';
import assert from 'node:assert';

import {
  isSessionOnline,
  formatActiveDuration,
  formatIST,
  formatRelativeIST,
  aggregateCustomerPresence,
  buildCustomerPresenceMap,
  ONLINE_EXPIRY_THRESHOLD_MS,
} from '../utils/presenceUtils.js';

test('1. ONLINE_EXPIRY_THRESHOLD_MS is exactly 150000 ms (2.5 minutes)', () => {
  assert.strictEqual(ONLINE_EXPIRY_THRESHOLD_MS, 150000);
});

test('2. isSessionOnline checks active state, lack of ended_at, and 150s expiry window', () => {
  const now = 1700000000000;

  // Active session with heartbeat 30 seconds ago -> Online
  const recentSession = {
    app_state: 'active',
    ended_at: null,
    last_seen_at: new Date(now - 30000).toISOString(),
  };
  assert.strictEqual(isSessionOnline(recentSession, now), true);

  // Active session with heartbeat 149 seconds ago -> Online
  const boundarySession = {
    app_state: 'active',
    ended_at: null,
    last_seen_at: new Date(now - 149000).toISOString(),
  };
  assert.strictEqual(isSessionOnline(boundarySession, now), true);

  // Active session with heartbeat 151 seconds ago -> Offline (expired)
  const expiredSession = {
    app_state: 'active',
    ended_at: null,
    last_seen_at: new Date(now - 151000).toISOString(),
  };
  assert.strictEqual(isSessionOnline(expiredSession, now), false);

  // Backgrounded session with recent timestamp -> Offline
  const bgSession = {
    app_state: 'background',
    ended_at: null,
    last_seen_at: new Date(now - 10000).toISOString(),
  };
  assert.strictEqual(isSessionOnline(bgSession, now), false);

  // Terminated session (logout) -> Offline
  const endedSession = {
    app_state: 'terminated',
    ended_at: new Date(now - 10000).toISOString(),
    last_seen_at: new Date(now - 10000).toISOString(),
  };
  assert.strictEqual(isSessionOnline(endedSession, now), false);

  // Malformed / null inputs -> Offline
  assert.strictEqual(isSessionOnline(null, now), false);
  assert.strictEqual(isSessionOnline({}, now), false);
  assert.strictEqual(isSessionOnline({ app_state: 'active', last_seen_at: 'invalid' }, now), false);
});

test('3. formatActiveDuration formats minute and hour increments correctly', () => {
  assert.strictEqual(formatActiveDuration(0), '< 1m');
  assert.strictEqual(formatActiveDuration(30000), '< 1m');
  assert.strictEqual(formatActiveDuration(60000), '1m');
  assert.strictEqual(formatActiveDuration(120000), '2m');
  assert.strictEqual(formatActiveDuration(14 * 60000), '14m');
  assert.strictEqual(formatActiveDuration(60 * 60000), '1h');
  assert.strictEqual(formatActiveDuration((60 + 22) * 60000), '1h 22m');
  assert.strictEqual(formatActiveDuration((2 * 60 + 5) * 60000), '2h 5m');
  assert.strictEqual(formatActiveDuration(-500), '< 1m');
  assert.strictEqual(formatActiveDuration(null), '< 1m');
});

test('4. formatIST converts UTC timestamp to Asia/Kolkata correctly', () => {
  // 2026-11-20T06:00:00Z -> IST is +5:30 -> 11:30 AM
  const isoUtc = '2026-11-20T06:00:00.000Z';
  const istStr = formatIST(isoUtc);
  assert.ok(istStr.includes('20'));
  assert.ok(istStr.includes('Nov'));
  assert.ok(istStr.includes('11:30'));
  assert.ok(istStr.includes('am') || istStr.includes('AM'));

  // Empty / null handling
  assert.strictEqual(formatIST(null), 'Never logged in');
  assert.strictEqual(formatIST(''), 'Never logged in');
  assert.strictEqual(formatIST('invalid-date'), '—');
});

test('5. aggregateCustomerPresence handles multi-device and offline scenarios', () => {
  const now = 1700000000000;

  // Scenario A: Customer with no sessions
  const emptyRes = aggregateCustomerPresence([], now);
  assert.strictEqual(emptyRes.isOnline, false);
  assert.strictEqual(emptyRes.lastActiveFormatted, 'Never logged in');
  assert.strictEqual(emptyRes.activeDurationFormatted, null);

  // Scenario B: Single active device
  const session1 = {
    session_id: 'dev1',
    app_state: 'active',
    ended_at: null,
    foreground_entered_at: new Date(now - 14 * 60000).toISOString(), // 14 mins ago
    last_seen_at: new Date(now - 20000).toISOString(),
  };
  const activeRes = aggregateCustomerPresence([session1], now);
  assert.strictEqual(activeRes.isOnline, true);
  assert.strictEqual(activeRes.activeDurationFormatted, '14m');
  assert.strictEqual(activeRes.activeSessionCount, 1);

  // Scenario C: Two devices - one backgrounded, one active
  const session2Bg = {
    session_id: 'dev2',
    app_state: 'background',
    ended_at: null,
    foreground_entered_at: new Date(now - 30 * 60000).toISOString(),
    last_seen_at: new Date(now - 40000).toISOString(),
  };
  const multiRes = aggregateCustomerPresence([session1, session2Bg], now);
  assert.strictEqual(multiRes.isOnline, true); // Still online via dev1
  assert.strictEqual(multiRes.activeSessionCount, 1);

  // Scenario D: One device logged out, one still active
  const session1LoggedOut = {
    session_id: 'dev1',
    app_state: 'terminated',
    ended_at: new Date(now - 10000).toISOString(),
    last_seen_at: new Date(now - 10000).toISOString(),
  };
  const session2Active = {
    session_id: 'dev2',
    app_state: 'active',
    ended_at: null,
    foreground_entered_at: new Date(now - 5 * 60000).toISOString(),
    last_seen_at: new Date(now - 15000).toISOString(),
  };
  const oneLoggedOutRes = aggregateCustomerPresence([session1LoggedOut, session2Active], now);
  assert.strictEqual(oneLoggedOutRes.isOnline, true); // Online via dev2
  assert.strictEqual(oneLoggedOutRes.activeDurationFormatted, '5m');

  // Scenario E: Both devices terminated -> Offline, last active matches latest
  const session2LoggedOut = {
    session_id: 'dev2',
    app_state: 'terminated',
    ended_at: new Date(now - 5000).toISOString(),
    last_seen_at: new Date(now - 5000).toISOString(),
  };
  const bothOfflineRes = aggregateCustomerPresence([session1LoggedOut, session2LoggedOut], now);
  assert.strictEqual(bothOfflineRes.isOnline, false);
  assert.strictEqual(bothOfflineRes.activeDurationFormatted, null);
  assert.strictEqual(bothOfflineRes.lastActiveAt, session2LoggedOut.last_seen_at);
});

test('6. buildCustomerPresenceMap indexes by crm_party_id correctly', () => {
  const now = 1700000000000;
  const sessions = [
    {
      crm_party_id: 'party-1',
      session_id: 's1',
      app_state: 'active',
      ended_at: null,
      foreground_entered_at: new Date(now - 10 * 60000).toISOString(),
      last_seen_at: new Date(now - 20000).toISOString(),
    },
    {
      crm_party_id: 'party-2',
      session_id: 's2',
      app_state: 'terminated',
      ended_at: new Date(now - 60000).toISOString(),
      last_seen_at: new Date(now - 60000).toISOString(),
    },
  ];

  const map = buildCustomerPresenceMap(sessions, now);
  assert.ok(map['party-1']);
  assert.ok(map['party-2']);
  assert.strictEqual(map['party-1'].isOnline, true);
  assert.strictEqual(map['party-1'].activeDurationFormatted, '10m');
  assert.strictEqual(map['party-2'].isOnline, false);
  assert.strictEqual(map['party-2'].activeDurationFormatted, null);
});
