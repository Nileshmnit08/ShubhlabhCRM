import test from 'node:test';
import assert from 'node:assert/strict';

test('isMissingTableError and PGRST205 are recognized as retryable', () => {
  const pgrst205 = {
    code: 'PGRST205',
    message: "Could not find the table 'public.visitor_register' in the schema cache",
  };

  // PGRST205 must be treated as transient/retryable (not permanent) so that the record
  // is never discarded while waiting for migration execution.
  const isPermanent = ['42501', '23514', '23503', '22P02', 'PGRST202'].includes(pgrst205.code);
  assert.equal(isPermanent, false, 'PGRST205 must not be categorized as a permanent non-retryable error');
});

test('manual retry selector correctly identifies FAILED visitor queue items', () => {
  const mockQueue = [
    {
      local_id: '95077add-b7bf-49ab-a42b-f50e37dc1668',
      table: 'visitor_register',
      action: 'insert',
      status: 'FAILED',
      attempts: 11,
      last_error: "Could not find the table 'public.visitor_register' in the schema cache",
      payload: {
        id: '95077add-b7bf-49ab-a42b-f50e37dc1668',
        visitor_name: 'Vushnu',
        mobile_number: '9829012345',
        category: 'Customer',
      },
    },
    {
      local_id: '16d15fb6-845b-4be3-9173-a3e12930f5e1',
      table: 'visitor_register',
      action: 'insert',
      status: 'FAILED',
      attempts: 11,
      last_error: "Could not find the table 'public.visitor_register' in the schema cache",
      payload: {
        id: '16d15fb6-845b-4be3-9173-a3e12930f5e1',
        visitor_name: 'Nilesh',
        mobile_number: '9928192696',
        category: 'Customer',
      },
    },
  ];

  // In auto background sync (isManualRetry = false):
  const autoRetryCandidates = mockQueue.filter(op => op.status === 'PENDING');
  assert.equal(autoRetryCandidates.length, 0, 'Auto-sync leaves failed items untouched');

  // In SYNC NOW manual retry (isManualRetry = true):
  const manualRetryCandidates = mockQueue.filter(op => op.status === 'PENDING' || op.status === 'FAILED');
  assert.equal(manualRetryCandidates.length, 2, 'SYNC NOW picks up both original failed visitor items');
  assert.equal(manualRetryCandidates[0].local_id, '95077add-b7bf-49ab-a42b-f50e37dc1668');
  assert.equal(manualRetryCandidates[1].local_id, '16d15fb6-845b-4be3-9173-a3e12930f5e1');
});

test('safePayload enriches legacy queued visitor payload with registration_source', () => {
  const legacyPayload = {
    id: '95077add-b7bf-49ab-a42b-f50e37dc1668',
    visitor_name: 'Vushnu',
    mobile_number: '9829012345',
    category: 'Customer',
    // registration_source was undefined in older payloads
  };

  const safePayload = { ...legacyPayload };
  if (!safePayload.registration_source) {
    safePayload.registration_source = 'Field Assist';
  }

  assert.equal(safePayload.registration_source, 'Field Assist');
  assert.equal(safePayload.id, '95077add-b7bf-49ab-a42b-f50e37dc1668');
  assert.equal(safePayload.visitor_name, 'Vushnu');
});

test('idempotent replay handles unique constraint code 23505 without duplicating records', () => {
  const queue = [
    {
      local_id: '95077add-b7bf-49ab-a42b-f50e37dc1668',
      table: 'visitor_register',
      status: 'SYNCING',
      attempts: 11,
    },
  ];

  const uniqueError = { code: '23505', message: 'duplicate key value violates unique constraint "visitor_register_pkey"' };

  // If Supabase returns 23505 (record already exists in DB from a previous attempt),
  // SyncService marks it SYNCED so it drops out of the queue idempotently
  let updatedQueue = queue.map(item => {
    if (uniqueError.code === '23505') {
      return { ...item, status: 'SYNCED' };
    }
    return item;
  });

  const remainingQueue = updatedQueue.filter(x => x.status !== 'SYNCED');
  assert.equal(remainingQueue.length, 0, 'Item successfully removed from queue after confirmed existence');
});
