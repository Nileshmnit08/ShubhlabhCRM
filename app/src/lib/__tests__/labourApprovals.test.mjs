import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  formatIst, formatIstTime, sortRegisters, registerTimeline, registerTotals, decisionError, isRegisterNotInstalled, EVENT_LABELS,
} from '../labourApprovals.js';

const read = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('IST formatting: fixed +05:30, missing values shown as a dash', () => {
  assert.equal(formatIst('2026-11-03T12:40:00+00:00'), '03-11-2026 18:10 IST');
  assert.equal(formatIst('2026-11-02T18:45:00Z'), '03-11-2026 00:15 IST');
  assert.equal(formatIstTime('2026-11-04T05:00:00Z'), '10:30');
  assert.equal(formatIst(null), '—');
  assert.equal(formatIstTime('nope'), '—');
});

test('register list: Pending first, then newest date', () => {
  const rows = [
    { id: 1, status: 'Approved', work_date: '2026-11-04', contractor_name: 'Ajay' },
    { id: 2, status: 'Pending', work_date: '2026-11-02', contractor_name: 'Ajay' },
    { id: 3, status: 'Pending', work_date: '2026-11-03', contractor_name: 'Ajay' },
    { id: 4, status: 'Rejected', work_date: '2026-11-01', contractor_name: 'Ajay' },
  ];
  assert.deepEqual(sortRegisters(rows).map(r => r.id), [3, 2, 4, 1]);
});

test('register detail: time order (completed → recorded → server) and totals from real entries', () => {
  const entries = [
    { id: 'b', work_completed_at: '2026-11-04T09:00:00Z', calculated_labour_amount: '210.00', total_bags: 20 },
    { id: 'a', work_completed_at: '2026-11-04T05:00:00Z', calculated_labour_amount: '420.00', total_bags: 40 },
    { id: 'c', recorded_at: '2026-11-04T06:00:00Z', calculated_labour_amount: '0.00', total_bags: 5 },
  ];
  const lines = [
    { work_entry_id: 'a', labourer_id: 'L1', labourer_name: 'One', allocated_amount: '210' },
    { work_entry_id: 'a', labourer_id: 'L2', labourer_name: 'Two', allocated_amount: '210' },
    { work_entry_id: 'b', labourer_id: 'L1', labourer_name: 'One', allocated_amount: '210' },
  ];
  const tl = registerTimeline(entries, lines);
  assert.deepEqual(tl.map(e => e.id), ['a', 'c', 'b']);
  assert.deepEqual(tl[0].labourers, [{ name: 'One', amount: 210 }, { name: 'Two', amount: 210 }]);
  assert.deepEqual(registerTotals(entries, lines), { entries: 3, amount: 630, labourers: 2, bags: 65 });
  assert.deepEqual(registerTotals([], []), { entries: 0, amount: 0, labourers: 0, bags: 0 });
});

test('decision checks: reject needs a reason; only Approved / Rejected', () => {
  assert.equal(decisionError({ decision: 'Approved' }), null);
  assert.match(decisionError({ decision: 'Rejected', reason: '  ' }), /reason/);
  assert.equal(decisionError({ decision: 'Rejected', reason: 'Bag count wrong' }), null);
  assert.match(decisionError({ decision: 'Maybe' }), /Approve or Reject/);
  assert.match(decisionError({ decision: 'Rejected', reason: 'x'.repeat(1001) }), /1000/);
  assert.equal(EVENT_LABELS.Reopened, 'Changed after decision — back to Pending');
});

test('original (approved snapshot) vs revised: edited fields, added and removed entries', async () => {
  const { diffAgainstApproved } = await import('../labourApprovals.js');
  const snapshot = [
    { id: 'e1', work_type: 'pallet', total_bags: 100, total_weight_kg: 5000, calculated_labour_amount: 1050, rate_snapshot: 21, notes: null,
      work_completed_at: '2026-11-04T05:00:00+00:00', shares: [{ labourer_name: 'One', allocated_amount: 1050 }] },
    { id: 'e2', work_type: 'mix', total_bags: 10, calculated_labour_amount: 100, shares: [] },
    { id: 'e3', work_type: 'premix', total_bags: 5, calculated_labour_amount: 50, shares: [] },
  ];
  const current = [
    { id: 'e1', work_type: 'pallet', total_bags: '120', total_weight_kg: '6000.00', calculated_labour_amount: '1260.00', rate_snapshot: '21.00', notes: 'corrected', work_completed_at: '2026-11-04T05:00:00.000Z' },
    { id: 'e2', work_type: 'mix', total_bags: 10, calculated_labour_amount: '100.00' },
    { id: 'e4', work_type: 'mix', total_bags: 1, calculated_labour_amount: '10.00' },
  ];
  const lines = [{ work_entry_id: 'e1', labourer_name: 'One', allocated_amount: '630' }, { work_entry_id: 'e1', labourer_name: 'Two', allocated_amount: '630' }];
  const d = diffAgainstApproved(snapshot, current, lines);
  const e1 = d.find(x => x.id === 'e1');
  assert.equal(e1.change, 'edited');
  assert.deepEqual(e1.fields.map(f => f.field), ['total_bags', 'total_weight_kg', 'calculated_labour_amount', 'notes', 'shares'], 'number formats and +00:00 vs Z are not "changes"');
  assert.equal(d.find(x => x.id === 'e2').change, 'same');
  assert.equal(d.find(x => x.id === 'e3').change, 'removed');
  assert.equal(d.find(x => x.id === 'e4').change, 'added');
  assert.deepEqual(diffAgainstApproved([], [], []), []);
});

test('approvals page shows original vs revised and flags edits after approval', () => {
  const page = read('../../pages/LabourHisaabApprovals.jsx');
  assert.match(page, /Edit to a previously approved register/);
  assert.match(page, /aria-label="Original vs revised"/);
  assert.match(page, /Edited after approval/);
  assert.match(page, /from\('labour_daily_register_snapshots'\)/);
  assert.match(page, /snRes\.error \? \[\]/, 'works before proposal 253 is installed');
});

test('not-installed detection for proposal 252', () => {
  assert.equal(isRegisterNotInstalled({ code: 'PGRST205', message: "Could not find the table 'public.v_lh_daily_registers'" }), true);
  assert.equal(isRegisterNotInstalled({ code: '42501', message: 'permission denied for view v_lh_daily_registers' }), false);
});

test('approvals page: admin route, only write is lh_decide_daily_register with the reviewed revision; real data only', () => {
  const app = read('../../App.jsx');
  assert.match(app, /const LabourHisaabApprovals = lazy\(\(\) => import\('\.\/pages\/LabourHisaabApprovals'\)\);/);
  const route = app.indexOf('<Route path="labour-hisaab/approvals" element={<LabourHisaabApprovals />} />');
  const adminOpen = app.indexOf('<Route element={<AdminRoute />}>');
  assert.ok(route > adminOpen && adminOpen > 0, 'inside the AdminRoute group');
  let depth = 0;
  for (const m of app.slice(adminOpen + '<Route element={<AdminRoute />}>'.length, route).matchAll(/<Route\b[^>]*?(\/?)>|<\/Route>/g)) {
    depth += m[0] === '</Route>' ? -1 : (m[1] !== '/' ? 1 : 0);
    assert.ok(depth >= 0, 'AdminRoute group still open at the approvals route');
  }
  const page = read('../../pages/LabourHisaabApprovals.jsx');
  assert.ok(!/\.(insert|update|upsert|delete)\(/.test(page), 'no direct table writes');
  assert.deepEqual([...page.matchAll(/\.rpc\('([^']+)'/g)].map(m => m[1]), ['lh_decide_daily_register'], 'the decision RPC is the only write');
  assert.match(page, /p_revision: reg\.revision/, 'decides the revision that was reviewed');
  assert.match(page, /role="dialog" aria-label="Confirm decision"/, 'confirmation step before deciding');
  assert.ok(!/initialData|INITIAL_|demo/i.test(page.replace(/no demo entries/gi, '')), 'no sample data');
  const main = read('../../pages/LabourHisaab.jsx');
  assert.match(main, /to="\/labour-hisaab\/approvals"/, 'linked from Labour Hisaab');
});
