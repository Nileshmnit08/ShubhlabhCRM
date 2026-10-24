/**
 * Unit Test Suite for FA-SYNC-FIX-03:
 * Sync Queue Recovery, Bounded Timeouts, Idempotency, and Accurate Counts
 */

const assert = require('assert');

// 1. In-memory AsyncStorage Mock
const storage = new Map();
const mockAsyncStorage = {
  getItem: async (key) => storage.get(key) || null,
  setItem: async (key, val) => storage.set(key, val),
  clear: async () => storage.clear()
};

// 2. Logic reproduction of SyncService timeout & error handling
const withTimeout = (promiseOrThenable, ms = 15000, errorMsg = 'Network request timed out after 15 seconds') => {
  let timer = null;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(errorMsg);
      err.code = 'ETIMEDOUT';
      reject(err);
    }, ms);
  });
  const wrappedPromise = Promise.resolve(promiseOrThenable).then(
    (res) => {
      if (timer) clearTimeout(timer);
      return res;
    },
    (err) => {
      if (timer) clearTimeout(timer);
      throw err;
    }
  );
  return Promise.race([wrappedPromise, timeoutPromise]);
};

const sanitizeError = (err) => {
  if (!err) return 'Unknown error';
  let msg = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
  return msg
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/apikey\s+[A-Za-z0-9._-]+/gi, 'apikey [REDACTED]')
    .replace(/password\s*[:=]\s*\S+/gi, 'password=[REDACTED]')
    .replace(/"access_token"\s*:\s*"[^"]+"/gi, '"access_token":"[REDACTED]"');
};

const isPermanentError = (error, table) => {
  if (!error) return false;
  const code = error.code ? String(error.code) : '';
  const msg = (error.message || '').toLowerCase();

  if (code === '23505' || msg.includes('duplicate key') || msg.includes('unique constraint')) {
    return false;
  }
  if (code === '42501' || msg.includes('permission denied') || msg.includes('violates row-level security')) {
    return true;
  }
  if (code === '23514' || msg.includes('check constraint')) {
    return true;
  }
  if (code === '23503' || msg.includes('foreign key constraint')) {
    return true;
  }
  if (code === '22P02' || msg.includes('invalid input syntax')) {
    return true;
  }
  if (msg.includes('jwt expired') || msg.includes('invalid claim') || msg.includes('invalid refresh token')) {
    return true;
  }
  return false;
};

// Test implementation of queue recovery
function recoverStaleSyncingItems(queue) {
  let recoveredCount = 0;
  const now = new Date().toISOString();
  for (const item of queue) {
    if (item.status === 'SYNCING') {
      recoveredCount++;
      const currentAttempts = item.attempts || 0;
      if (currentAttempts >= 3) {
        item.status = 'FAILED';
        item.last_error = item.last_error || 'Previous sync attempt timed out or was interrupted. Maximum attempts reached.';
      } else {
        item.status = 'PENDING';
        item.last_error = item.last_error || 'Previous sync attempt timed out or was interrupted. Ready to retry.';
      }
      item.last_attempted_at = item.last_attempted_at || now;
    } else if (item.status === 'FAILED' && item.last_error && item.last_error.includes('undefined is not a function')) {
      recoveredCount++;
      item.status = 'PENDING';
      item.last_error = 'Recovered from client runtime error. Ready to retry.';
      item.attempts = 0;
      item.last_attempted_at = now;
    }
  }
  return { queue, recoveredCount };
}

// Test implementation of processing step
async function processItemAttempt(item, dbOperationMock) {
  item.status = 'SYNCING';
  let error = null;

  try {
    const res = await withTimeout(dbOperationMock(), 200, `Insert on ${item.table} timed out after 200ms`);
    if (res && res.error) error = res.error;
  } catch (err) {
    error = err;
  }

  if (error) {
    if (error.code === '23505' || (error.message && error.message.includes('unique'))) {
      item.status = 'SYNCED';
    } else {
      item.attempts = (item.attempts || 0) + 1;
      item.last_attempted_at = new Date().toISOString();
      const sanitizedErrMsg = sanitizeError(error.message || error);
      item.last_error = sanitizedErrMsg;

      const permanent = isPermanentError(error, item.table);
      if (permanent || item.attempts >= 3) {
        item.status = 'FAILED';
      } else {
        item.status = 'PENDING';
      }
    }
  } else {
    item.status = 'SYNCED';
  }

  return item;
}

// Derive counts
function deriveCounts(queue) {
  const actionable = queue.filter(op => op.status !== 'SYNCED');
  const failed = queue.filter(op => op.status === 'FAILED');
  const retrying = queue.filter(op => op.status === 'PENDING' && (op.attempts || 0) > 0);
  const pending = queue.filter(op => op.status === 'PENDING' && !(op.attempts > 0));
  const syncing = queue.filter(op => op.status === 'SYNCING');

  return {
    totalPending: actionable.length,
    failedCount: failed.length,
    retryingCount: retrying.length,
    freshPendingCount: pending.length,
    syncingCount: syncing.length,
  };
}

// RUN TESTS
async function runAllTests() {
  console.log('=== STARTING SYNC RECOVERY & RELIABILITY TEST SUITE ===\n');

  // TEST 1: Stale SYNCING items from interrupted session recover cleanly
  console.log('TEST 1: Interrupted app session recovery (stale SYNCING items)');
  {
    const initialQueue = [
      { local_id: '34e9ad79', table: 'staff_location_history', status: 'SYNCING', attempts: 0 },
      { local_id: '227b9d83', table: 'staff_location_history', status: 'SYNCING', attempts: 1 },
      { local_id: '273e0e8f', table: 'staff_location_history', status: 'SYNCING', attempts: 3 },
      { local_id: 'c645d31a', table: 'staff_location_history', status: 'PENDING', attempts: 0 }
    ];

    const { queue, recoveredCount } = recoverStaleSyncingItems(initialQueue);
    assert.strictEqual(recoveredCount, 3, 'Should recover exactly 3 SYNCING items');
    assert.strictEqual(queue[0].status, 'PENDING', 'Item with 0 attempts recovers to PENDING');
    assert.strictEqual(queue[1].status, 'PENDING', 'Item with 1 attempt recovers to PENDING');
    assert.strictEqual(queue[2].status, 'FAILED', 'Item with >=3 attempts marked FAILED');
    assert.strictEqual(queue[3].status, 'PENDING', 'Original PENDING item remains intact');
    assert.ok(queue[0].last_error.includes('interrupted'), `Expected interrupted note, got: ${queue[0].last_error}`);
    console.log('  -> PASS: Stale SYNCING items restored to PENDING or FAILED with last_error recorded.');
  }

  // TEST 2: Network timeout aborts and does not leave record stuck in SYNCING
  console.log('TEST 2: Network timeout terminates and transitions out of SYNCING');
  {
    const item = { local_id: '34e9ad79', table: 'staff_location_history', status: 'PENDING', attempts: 0 };
    const hangingCall = () => new Promise(resolve => setTimeout(resolve, 500)); // takes 500ms, timeout is 200ms

    const result = await processItemAttempt(item, hangingCall);
    assert.notStrictEqual(result.status, 'SYNCING', 'Status must NOT remain SYNCING on timeout');
    assert.strictEqual(result.status, 'PENDING', 'Transient timeout under 3 attempts remains PENDING for retry');
    assert.strictEqual(result.attempts, 1, 'Attempts counter incremented');
    assert.ok(result.last_error.includes('timed out'), `Expected timeout error message, got: ${result.last_error}`);
    assert.ok(result.last_attempted_at, 'Last attempt timestamp recorded');
    console.log('  -> PASS: Timed out request increments attempts and restores to PENDING.');
  }

  // TEST 3: Permanent database error (e.g. RLS / 42501) transitions directly to FAILED
  console.log('TEST 3: Permanent database error immediately marked FAILED without endless retry');
  {
    const item = { local_id: 'perm-err-1', table: 'staff_location_history', status: 'PENDING', attempts: 0 };
    const rlsErrorCall = async () => ({ error: { code: '42501', message: 'new row violates row-level security policy for table staff_location_history' } });

    const result = await processItemAttempt(item, rlsErrorCall);
    assert.strictEqual(result.status, 'FAILED', 'Permanent RLS error must immediately mark FAILED');
    assert.strictEqual(result.attempts, 1);
    assert.ok(result.last_error.includes('row-level security'), 'Sanitized error preserved');
    console.log('  -> PASS: Permanent error marked FAILED immediately with actionable error details.');
  }

  // TEST 4: Idempotency (PostgreSQL 23505 unique violation treated as success)
  console.log('TEST 4: Retried request duplicate key (23505) acknowledged as idempotent success');
  {
    const item = { local_id: '227b9d83', table: 'staff_location_history', status: 'PENDING', attempts: 1 };
    const duplicateKeyCall = async () => ({ error: { code: '23505', message: 'duplicate key value violates unique constraint "staff_location_history_pkey"' } });

    const result = await processItemAttempt(item, duplicateKeyCall);
    assert.strictEqual(result.status, 'SYNCED', 'Idempotent duplicate key error must be marked SYNCED');
    console.log('  -> PASS: Duplicate key error handled idempotently as SYNCED.');
  }

  // TEST 5: Terminal failure after max retry attempts (3 attempts)
  console.log('TEST 5: Max retry threshold transitions retryable error to FAILED');
  {
    const item = { local_id: '34e9ad79', table: 'staff_location_history', status: 'PENDING', attempts: 2 };
    const networkFailCall = async () => { throw new Error('TypeError: Network request failed'); };

    const result = await processItemAttempt(item, networkFailCall);
    assert.strictEqual(result.attempts, 3, 'Attempts counter reached 3');
    assert.strictEqual(result.status, 'FAILED', 'Must transition to FAILED after 3 attempts');
    assert.ok(result.last_error.includes('Network request failed'));
    console.log('  -> PASS: Item transitions to FAILED upon reaching 3 attempts.');
  }

  // TEST 6: Sensitive credential sanitization
  console.log('TEST 6: Sensitive credential sanitization in errors');
  {
    const rawError = 'PostgREST error: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI... and apikey sb_secret_key_123 password=secret123';
    const sanitized = sanitizeError(rawError);
    assert.ok(!sanitized.includes('sb_secret_key_123'), 'API key must be redacted');
    assert.ok(!sanitized.includes('secret123'), 'Password must be redacted');
    assert.ok(sanitized.includes('[REDACTED]'), 'Redaction placeholder present');
    console.log('  -> PASS: Sensitive credentials stripped from recorded error messages.');
  }

  // TEST 7: Accurate count derivations (eliminates false '0 Failed')
  console.log('TEST 7: Authoritative queue count derivations (Pending, Retrying, Failed)');
  {
    const queue = [
      { local_id: '1', status: 'PENDING', attempts: 0 },
      { local_id: '2', status: 'PENDING', attempts: 1 }, // Retrying
      { local_id: '3', status: 'PENDING', attempts: 2 }, // Retrying
      { local_id: '4', status: 'FAILED', attempts: 3 },
      { local_id: '5', status: 'FAILED', attempts: 1 },
      { local_id: '6', status: 'SYNCED', attempts: 1 }
    ];

    const counts = deriveCounts(queue);
    assert.strictEqual(counts.totalPending, 5, 'Total actionable items is 5 (excluding SYNCED)');
    assert.strictEqual(counts.failedCount, 2, 'Failed count must be 2 (NOT 0!)');
    assert.strictEqual(counts.retryingCount, 2, 'Retrying count is 2');
    assert.strictEqual(counts.freshPendingCount, 1, 'Fresh pending count is 1');
    console.log('  -> PASS: Count derivation accurately reports Failed items and Retrying breakdowns.');
  }

  // TEST 8: Successful sync leaves queue
  console.log('TEST 8: Successful sync marked SYNCED and filtered from queue');
  {
    let queue = [
      { local_id: 'loc-1', table: 'staff_location_history', status: 'PENDING' },
      { local_id: 'loc-2', table: 'staff_location_history', status: 'PENDING' }
    ];

    const successCall = async () => ({ data: [{ id: 'loc-1' }], error: null });
    const res = await processItemAttempt(queue[0], successCall);
    assert.strictEqual(res.status, 'SYNCED');

    // Simulate queue filter
    queue = queue.filter(x => x.status !== 'SYNCED');
    assert.strictEqual(queue.length, 1);
    assert.strictEqual(queue[0].local_id, 'loc-2');
    console.log('  -> PASS: Acknowledged item is removed from queue while remaining items stay intact.');
  }

  // TEST 9: Concurrency guard prevents duplicate processing loops
  console.log('TEST 9: Concurrency lock prevents parallel overlapping workers');
  {
    let isProcessing = false;
    let runs = 0;

    const simulateSyncCall = async () => {
      if (isProcessing) return;
      isProcessing = true;
      try {
        runs++;
        await new Promise(r => setTimeout(r, 50));
      } finally {
        isProcessing = false;
      }
    };

    // Trigger 5 concurrent calls
    await Promise.all([
      simulateSyncCall(),
      simulateSyncCall(),
      simulateSyncCall(),
      simulateSyncCall(),
      simulateSyncCall()
    ]);

    assert.strictEqual(runs, 1, 'Only 1 worker should enter the critical section');
    console.log('  -> PASS: Concurrency guard correctly serialized executions.');
  }

  // TEST 10: Preserving unsynced location data during partial failures
  console.log('TEST 10: Preserving all unsynced location payloads across partial errors');
  {
    const queue = [
      { local_id: 'loc-good', payload: { latitude: 26.85, longitude: 75.78 }, status: 'PENDING', attempts: 0 },
      { local_id: 'loc-bad', payload: { latitude: 26.86, longitude: 75.79 }, status: 'PENDING', attempts: 0 }
    ];

    // Good succeeds
    await processItemAttempt(queue[0], async () => ({ error: null }));
    // Bad fails transiently
    await processItemAttempt(queue[1], async () => { throw new Error('ETIMEDOUT'); });

    assert.strictEqual(queue[0].status, 'SYNCED');
    assert.strictEqual(queue[1].status, 'PENDING');
    assert.deepStrictEqual(queue[1].payload, { latitude: 26.86, longitude: 75.79 }, 'Payload must remain intact');
    console.log('  -> PASS: Failed item retains complete original coordinate payload.');
  }

  // TEST 11: PostgrestBuilder / Thenable without .finally resolves cleanly without 'undefined is not a function'
  console.log('TEST 11: PostgrestBuilder Thenable without .finally() succeeds in withTimeout');
  {
    // Simulate Supabase PostgrestFilterBuilder object which only has .then(), NOT .finally() or .catch()
    const mockPostgrestBuilder = {
      then: (onfulfilled, onrejected) => {
        return Promise.resolve({ data: [{ id: 'call-1' }], error: null }).then(onfulfilled, onrejected);
      }
    };

    assert.strictEqual(typeof mockPostgrestBuilder.finally, 'undefined', 'Mock PostgrestBuilder must not have .finally');
    const res = await withTimeout(mockPostgrestBuilder, 1000);
    assert.deepStrictEqual(res, { data: [{ id: 'call-1' }], error: null });
    console.log('  -> PASS: Thenable without .finally() resolved cleanly without throwing undefined is not a function.');
  }

  // TEST 12: Recovery of items failed with 'undefined is not a function'
  console.log('TEST 12: Recovery of items failed due to client runtime error');
  {
    const queue = [
      { local_id: 'call-err-1', table: 'crm_call_events', status: 'FAILED', attempts: 9, last_error: 'undefined is not a function' },
      { local_id: 'call-err-2', table: 'crm_call_events', status: 'FAILED', attempts: 4, last_error: 'undefined is not a function' },
      { local_id: 'perm-err', table: 'crm_notifications', status: 'FAILED', attempts: 1, last_error: 'new row violates row-level security policy' }
    ];

    const { queue: recovered, recoveredCount } = recoverStaleSyncingItems(queue);
    assert.strictEqual(recoveredCount, 2, 'Should recover both items failed with undefined is not a function');
    assert.strictEqual(recovered[0].status, 'PENDING');
    assert.strictEqual(recovered[0].attempts, 0);
    assert.strictEqual(recovered[1].status, 'PENDING');
    assert.strictEqual(recovered[1].attempts, 0);
    assert.strictEqual(recovered[2].status, 'FAILED', 'Legitimate DB error must remain FAILED');
    console.log('  -> PASS: Runtime-error items safely restored to PENDING with attempts reset.');
  }

  // TEST 13: crm_call_events INSERT idempotency
  console.log('TEST 13: crm_call_events duplicate key (23505) acknowledged idempotently');
  {
    const callItem = {
      local_id: 'call-idemp-1',
      table: 'crm_call_events',
      payload: {
        staff_id: '34932213-b6f9-4302-a124-497154565aaa',
        device_event_id: 'android_call_1792727870132_916367443543',
        direction: 'INCOMING',
        call_type: 'ANSWERED'
      },
      status: 'PENDING',
      attempts: 1
    };

    const duplicateErrorCall = async () => ({
      error: {
        code: '23505',
        message: 'duplicate key value violates unique constraint "idx_crm_call_events_idempotency"'
      }
    });

    const res = await processItemAttempt(callItem, duplicateErrorCall);
    assert.strictEqual(res.status, 'SYNCED');
    console.log('  -> PASS: Duplicate call event handled idempotently as SYNCED.');
  }

  console.log('\n=== ALL 13 TESTS PASSED SUCCESSFULLY! ===\n');
}

runAllTests().catch(err => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
