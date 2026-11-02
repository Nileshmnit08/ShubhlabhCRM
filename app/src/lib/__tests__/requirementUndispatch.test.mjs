import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  activeDispatches, checkUndispatch, restoreStatus, needsStatusRestore, DEFAULT_RESTORE_STATUS,
} from '../requirementUndispatch.js';

test('only active dispatches are reversed; cancelled/voided ones are left alone', () => {
  const rows = [
    { id: 'a', status: 'Dispatched' },
    { id: 'b', status: 'Cancelled' },
    { id: 'c', status: 'Voided' },
    { id: 'd', status: 'In Transit' },
  ];
  assert.deepEqual(activeDispatches(rows).map((d) => d.id), ['a', 'd']);
});

test('reversal allowed for a plain mistaken dispatch', () => {
  assert.deepEqual(checkUndispatch([{ id: 'a', status: 'Dispatched', return_quantity: 0 }]), { ok: true, reason: null });
});

test('reversal refused when nothing is dispatched or a real outcome is recorded', () => {
  assert.equal(checkUndispatch([]).ok, false);
  assert.equal(checkUndispatch([{ id: 'a', status: 'Cancelled' }]).ok, false);
  assert.match(checkUndispatch([{ id: 'a', status: 'Delivered' }]).reason, /Delivered/);
  assert.match(checkUndispatch([{ id: 'a', status: 'Returned' }]).reason, /Dispatch board/);
  assert.equal(checkUndispatch([{ id: 'a', status: 'Dispatched', return_quantity: 5 }]).ok, false);
});

test('restores the status the requirement had before it was closed as dispatched', () => {
  const history = [
    { old_status: 'New', new_status: 'Quotation Sent', created_at: '2026-10-01T10:00:00Z' },
    { old_status: 'Quotation Sent', new_status: 'Closed', created_at: '2026-10-05T10:00:00Z' },
  ];
  assert.equal(restoreStatus(history), 'Quotation Sent');
  // Most recent close wins (re-dispatched after an earlier reopen).
  const again = [...history,
    { old_status: 'Closed', new_status: 'Commercial Intent', created_at: '2026-10-06T10:00:00Z' },
    { old_status: 'Commercial Intent', new_status: 'Closed', created_at: '2026-10-07T10:00:00Z' }];
  assert.equal(restoreStatus(again), 'Commercial Intent');
  assert.equal(restoreStatus([]), DEFAULT_RESTORE_STATUS);
  assert.equal(restoreStatus([{ old_status: 'Closed', new_status: 'Closed' }]), DEFAULT_RESTORE_STATUS);
});

test('status restore applies only to dispatched/closed requirements', () => {
  assert.equal(needsStatusRestore('Closed'), true);
  assert.equal(needsStatusRestore('Dispatched'), true);
  assert.equal(needsStatusRestore('Quotation Sent'), false);
});

test('board wiring: admin-only menu action, confirmation, cancel-not-delete', () => {
  const page = readFileSync(new URL('../../pages/Requirements/List.jsx', import.meta.url), 'utf8');
  assert.match(page, /isDispatched && isAdmin && \(/, 'menu item gated on dispatched + admin');
  assert.match(page, /Mark this requirement as not dispatched\?/);
  assert.match(page, /This will correct its dispatch status\./);
  assert.match(page, /if \(!reqToUndispatch \|\| !isAdmin\) return;/, 'handler re-checks admin');
  assert.match(page, /update\(\{ status: 'Cancelled', cancellation_reason: UNDISPATCH_REASON \}\)/);
  const undispatch = page.slice(page.indexOf('const executeUndispatch'), page.indexOf('const getProductName'));
  assert.equal(/\.delete\(/.test(undispatch), false, 'no deletes in the reversal');
});
