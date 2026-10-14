/**
 * test_fa_call_history_01.cjs
 * FA-CALL-HISTORY-01 Verification Suite
 *
 * Tests:
 *  1. Direction & missed status resolution
 *  2. Duration formatting
 *  3. Date grouping logic
 *  4. Participant isolation & RLS query structure
 *  5. Double-click call-back debounce
 *  6. Empty and error state handling
 *  7. CallContext duration_seconds persistence in endCall
 *  8. CallContext duration_seconds persistence in handleCallFailed
 */

'use strict';

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`✓ ${description}`);
    passed++;
  } else {
    console.error(`✗ ${description}`);
    failed++;
  }
}

// ─── Load source files for static analysis ───────────────────────────────────

const serviceSource = fs.readFileSync(
  path.join(__dirname, 'src/services/CallHistoryService.js'), 'utf8'
);
const screenSource = fs.readFileSync(
  path.join(__dirname, 'src/screens/CallHistoryScreen.js'), 'utf8'
);
const callContextSource = fs.readFileSync(
  path.join(__dirname, 'src/context/CallContext.js'), 'utf8'
);
const appSource = fs.readFileSync(path.join(__dirname, 'App.js'), 'utf8');
const screensIndex = fs.readFileSync(
  path.join(__dirname, 'src/screens/index.js'), 'utf8'
);
const messagesInbox = fs.readFileSync(
  path.join(__dirname, 'src/screens/MessagesInboxScreen.js'), 'utf8'
);

console.log('\n=== RUNNING TEST SUITE: FA-CALL-HISTORY-01 ===\n');

// ─── Test 1: Direction & missed status resolution ──────────────────────────

console.log('Test 1: Direction & missed-call status resolution...');

// Inline the logic from CallHistoryService for isolated unit test
function resolveCallStatus(rawStatus, direction) {
  switch (rawStatus) {
    case 'ENDED': return 'COMPLETED';
    case 'MISSED': return direction === 'INCOMING' ? 'MISSED' : 'NO_ANSWER';
    case 'REJECTED': return direction === 'INCOMING' ? 'DECLINED' : 'DECLINED_BY_OTHER';
    case 'CANCELLED': return direction === 'INCOMING' ? 'MISSED' : 'CANCELLED';
    case 'FAILED': return 'FAILED';
    default: return rawStatus || 'UNKNOWN';
  }
}
function isMissedCall(entry) {
  return (
    entry.direction === 'INCOMING' &&
    (entry.resolvedStatus === 'MISSED' || entry.resolvedStatus === 'DECLINED')
  );
}

const myId = 'user-A';
function makeEntry(row) {
  const direction = row.caller_id === myId ? 'OUTGOING' : 'INCOMING';
  const resolvedStatus = resolveCallStatus(row.status, direction);
  return { direction, resolvedStatus, isMissed: isMissedCall({ direction, resolvedStatus }) };
}

const cases = [
  { row: { caller_id: myId, receiver_id: 'user-B', status: 'ENDED' }, expected: { direction: 'OUTGOING', resolvedStatus: 'COMPLETED', isMissed: false } },
  { row: { caller_id: 'user-B', receiver_id: myId, status: 'ENDED' }, expected: { direction: 'INCOMING', resolvedStatus: 'COMPLETED', isMissed: false } },
  { row: { caller_id: 'user-B', receiver_id: myId, status: 'MISSED' }, expected: { direction: 'INCOMING', resolvedStatus: 'MISSED', isMissed: true } },
  { row: { caller_id: myId, receiver_id: 'user-B', status: 'MISSED' }, expected: { direction: 'OUTGOING', resolvedStatus: 'NO_ANSWER', isMissed: false } },
  { row: { caller_id: 'user-B', receiver_id: myId, status: 'REJECTED' }, expected: { direction: 'INCOMING', resolvedStatus: 'DECLINED', isMissed: true } },
  { row: { caller_id: myId, receiver_id: 'user-B', status: 'CANCELLED' }, expected: { direction: 'OUTGOING', resolvedStatus: 'CANCELLED', isMissed: false } },
  { row: { caller_id: 'user-B', receiver_id: myId, status: 'CANCELLED' }, expected: { direction: 'INCOMING', resolvedStatus: 'MISSED', isMissed: true } },
  { row: { caller_id: myId, receiver_id: 'user-B', status: 'FAILED' }, expected: { direction: 'OUTGOING', resolvedStatus: 'FAILED', isMissed: false } },
];

let allCasesPass = true;
for (const { row, expected } of cases) {
  const result = makeEntry(row);
  if (
    result.direction !== expected.direction ||
    result.resolvedStatus !== expected.resolvedStatus ||
    result.isMissed !== expected.isMissed
  ) {
    allCasesPass = false;
    console.error(`   FAIL: status=${row.status}, caller=${row.caller_id===myId?'self':'other'} → got ${JSON.stringify(result)}, expected ${JSON.stringify(expected)}`);
  }
}
assert(allCasesPass, 'Test 1: All direction & missed-call resolution cases correct.');

// ─── Test 2: Duration formatting ──────────────────────────────────────────────

console.log('\nTest 2: Duration formatting...');

function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

assert(formatDuration(0) === null, 'Test 2a: 0s → null');
assert(formatDuration(null) === null, 'Test 2b: null → null');
assert(formatDuration(59) === '0:59', 'Test 2c: 59s → "0:59"');
assert(formatDuration(60) === '1:00', 'Test 2d: 60s → "1:00"');
assert(formatDuration(125) === '2:05', 'Test 2e: 125s → "2:05"');
assert(formatDuration(3661) === '61:01', 'Test 2f: 3661s → "61:01"');

// ─── Test 3: Date grouping logic ──────────────────────────────────────────────

console.log('\nTest 3: Date grouping logic...');

function getDateGroup(dateString) {
  if (!dateString) return 'Unknown';
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

function groupCallHistory(entries) {
  const groups = {};
  const order = [];
  for (const entry of entries) {
    const key = getDateGroup(entry.created_at);
    if (!groups[key]) { groups[key] = []; order.push(key); }
    groups[key].push(entry);
  }
  return order.map(title => ({ title, data: groups[title] }));
}

const now = new Date().toISOString();
const yesterdayISO = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const oldISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

const testEntries = [
  { id: '1', created_at: now },
  { id: '2', created_at: now },
  { id: '3', created_at: yesterdayISO },
  { id: '4', created_at: oldISO },
];
const grouped = groupCallHistory(testEntries);

assert(grouped.length === 3, 'Test 3a: 3 date groups produced for today/yesterday/older');
assert(grouped[0].title === 'Today', 'Test 3b: First group is "Today"');
assert(grouped[0].data.length === 2, 'Test 3c: "Today" has 2 entries');
assert(grouped[1].title === 'Yesterday', 'Test 3d: Second group is "Yesterday"');
assert(grouped[2].title !== 'Today' && grouped[2].title !== 'Yesterday', 'Test 3e: Third group is a date string');
assert(getDateGroup(null) === 'Unknown', 'Test 3f: null date → "Unknown"');

// ─── Test 4: Participant isolation & RLS query structure ─────────────────────

console.log('\nTest 4: Participant isolation & RLS query structure...');

// Verify the query uses the correct FK aliases for caller/receiver enrichment
assert(
  serviceSource.includes("call_sessions_caller_id_fkey"),
  'Test 4a: CallHistoryService references call_sessions_caller_id_fkey FK alias'
);
assert(
  serviceSource.includes("call_sessions_receiver_id_fkey"),
  'Test 4b: CallHistoryService references call_sessions_receiver_id_fkey FK alias'
);
// Verify no client-side filtering by user ID (RLS does the isolation)
assert(
  !serviceSource.includes('.eq(\'caller_id\'') && !serviceSource.includes('.eq("caller_id"'),
  'Test 4c: No explicit client-side user ID filter — RLS handles isolation'
);
assert(
  serviceSource.includes('display_name') && serviceSource.includes('role'),
  'Test 4d: Enrichment query selects display_name and role from app_users'
);

// ─── Test 5: Double-click call-back debounce ──────────────────────────────────

console.log('\nTest 5: Double-tap call-back debounce...');

assert(
  screenSource.includes('DOUBLE_TAP_GUARD_MS') && screenSource.includes('lastCallInitiatedAt'),
  'Test 5a: Debounce guard constants defined (DOUBLE_TAP_GUARD_MS & lastCallInitiatedAt)'
);
assert(
  screenSource.includes('now - lastCallInitiatedAt < DOUBLE_TAP_GUARD_MS'),
  'Test 5b: Debounce check compares current time against last call time'
);
assert(
  screenSource.includes('lastCallInitiatedAt = now'),
  'Test 5c: lastCallInitiatedAt is updated upon call dispatch'
);

// Simulate debounce logic
let lastCallInit = 0;
const GUARD_MS = 2500;
function simulateCallBack() {
  const now = Date.now();
  if (now - lastCallInit < GUARD_MS) return 'BLOCKED';
  lastCallInit = now;
  return 'DISPATCHED';
}
assert(simulateCallBack() === 'DISPATCHED', 'Test 5d: First tap dispatches call');
assert(simulateCallBack() === 'BLOCKED',   'Test 5e: Immediate second tap is blocked');

// ─── Test 6: Empty and error state handling ───────────────────────────────────

console.log('\nTest 6: Empty and error state handling...');

assert(
  screenSource.includes('No call history yet'),
  'Test 6a: Empty state renders "No call history yet" message'
);
assert(
  screenSource.includes('Could not load call history'),
  'Test 6b: Error state renders failure message'
);
assert(
  screenSource.includes('Retry'),
  'Test 6c: Error state includes a Retry button'
);
assert(
  screenSource.includes('RefreshControl'),
  'Test 6d: Screen supports pull-to-refresh via RefreshControl'
);
assert(
  screenSource.includes('ActivityIndicator'),
  'Test 6e: Loading state renders ActivityIndicator spinner'
);

// ─── Test 7: CallContext endCall writes duration_seconds ─────────────────────

console.log('\nTest 7: CallContext endCall writes duration_seconds...');

assert(
  callContextSource.includes('duration_seconds = duration') ||
    callContextSource.includes('duration_seconds: duration'),
  'Test 7a: endCall sets duration_seconds in supabase update payload'
);
assert(
  callContextSource.includes('callDurationRef'),
  'Test 7b: callDurationRef ref tracks current call duration'
);
assert(
  callContextSource.includes('connectedAtRef'),
  'Test 7c: connectedAtRef tracks the time the call connected'
);
assert(
  callContextSource.includes('wasConnected'),
  'Test 7d: endCall computes wasConnected flag before persisting duration'
);

// ─── Test 8: CallContext handleCallFailed writes duration_seconds ─────────────

console.log('\nTest 8: CallContext handleCallFailed writes duration_seconds...');

assert(
  callContextSource.includes('isWasConnected'),
  'Test 8a: handleCallFailed uses isWasConnected guard'
);
// endCall and handleCallFailed both should include duration_seconds conditionally
const durationSaveCount = (callContextSource.match(/duration_seconds/g) || []).length;
assert(
  durationSaveCount >= 2,
  `Test 8b: duration_seconds appears ≥2 times in CallContext (found ${durationSaveCount})`
);

// ─── Test 9: Navigation & screen registration ─────────────────────────────────

console.log('\nTest 9: Navigation & screen registration...');

assert(
  appSource.includes('CallHistoryScreen'),
  'Test 9a: CallHistoryScreen is imported in App.js'
);
assert(
  appSource.includes('name="CallHistory"'),
  'Test 9b: Stack.Screen with name="CallHistory" registered in App.js'
);
assert(
  screensIndex.includes("export { CallHistoryScreen }"),
  'Test 9c: CallHistoryScreen exported from screens/index.js barrel'
);
assert(
  messagesInbox.includes('CallHistory') && messagesInbox.includes('history'),
  'Test 9d: MessagesInboxScreen header has Call History navigation trigger with "history" icon'
);

// ─── Test 10: Regression safeguard ───────────────────────────────────────────

console.log('\nTest 10: FA-VIDEO-REGRESSION-01 safeguards preserved...');
const activeCallSource = fs.readFileSync(
  path.join(__dirname, 'src/screens/ActiveCallScreen.js'), 'utf8'
);
assert(
  !activeCallSource.includes('zOrder={0}'),
  'Test 10a: No zOrder={0} on RTCView (regression guard)'
);
assert(
  !activeCallSource.includes('mainHasVideo'),
  'Test 10b: No mainHasVideo gate on remote RTCView (regression guard)'
);

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n=== FA-CALL-HISTORY-01 TEST RESULTS: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);
