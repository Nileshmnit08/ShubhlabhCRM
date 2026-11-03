import test from 'node:test';
import assert from 'node:assert/strict';
import {
  summarize, dailyRows, labourerBalances, quantityLabel, rateLabel, workTypeLabel,
  isNotConnectedError, isPermissionError, formatInr, monthStart,
} from '../labourHisaabData.js';

// Rows shaped like the 249 tables/views, as synced from the LabourHisaab app.
const entries = [
  { id: 'e1', contractor_id: 'c1', work_date: '2026-11-03', work_type: 'pallet', rate_snapshot: 21, rate_unit_snapshot: 'Per 100 kg', total_weight_kg: 5000, total_bags: 100, total_batches: 0, calculated_labour_amount: 1050 },
  { id: 'e2', contractor_id: 'c1', work_date: '2026-11-02', work_type: 'pallet', rate_snapshot: 21, rate_unit_snapshot: 'Per 100 kg', total_weight_kg: 27500, total_bags: 550, total_batches: 0, calculated_labour_amount: 5775 },
  { id: 'e3', contractor_id: 'c1', work_date: '2026-11-03', work_type: 'bag_stitching', rate_snapshot: 0, rate_unit_snapshot: 'Per bag', total_weight_kg: 0, total_bags: 40, total_batches: 0, calculated_labour_amount: 0 },
];
const lines = [
  { work_entry_id: 'e1', labourer_id: 'L1', work_date: '2026-11-03', allocated_amount: 525 },
  { work_entry_id: 'e1', labourer_id: 'L2', work_date: '2026-11-03', allocated_amount: 525 },
  { work_entry_id: 'e2', labourer_id: 'L1', work_date: '2026-11-02', allocated_amount: 5775 },
  { work_entry_id: 'e3', labourer_id: 'L2', work_date: '2026-11-03', allocated_amount: 0 },
];
const labourersById = { L1: { name: 'Golu', local_id: 'LH_LAB_001' }, L2: { name: 'Satish', local_id: 'LH_LAB_002', active_status: false } };

test('summary: wage total = entry amounts; earned = shares; pending excludes nothing paid; zero stays zero', () => {
  const s = summarize({ entries, lines, payments: [{ labourer_id: 'L1', amount: 1000 }], deductions: [{ labourer_id: 'L2', allocated_amount: 25 }] });
  assert.deepEqual(s, { entryCount: 3, workDays: 2, labourersWorked: 2, totalWage: 6825, earned: 6825, paid: 1000, deducted: 25, pending: 5800 });
  assert.deepEqual(summarize({}), { entryCount: 0, workDays: 0, labourersWorked: 0, totalWage: 0, earned: 0, paid: 0, deducted: 0, pending: 0 });
});

test('daily rows: newest first, readable work type, quantity, rate and the labourers who shared it', () => {
  const rows = dailyRows({ entries, lines, contractorsById: { c1: { name: 'Contractor A' } }, labourersById });
  assert.deepEqual(rows.map(r => r.date), ['2026-11-03', '2026-11-03', '2026-11-02']);
  const pallet = rows.find(r => r.id === 'e1');
  assert.equal(pallet.workType, 'पैलेट बनाना (Pallet)');
  assert.equal(pallet.quantity, '5,000 kg (100 बोरी)');
  assert.equal(pallet.rate, '₹21 / 100 kg');
  assert.equal(pallet.amount, 1050);
  assert.deepEqual(pallet.labourers, [{ name: 'Golu', amount: 525 }, { name: 'Satish', amount: 525 }]);
  assert.equal(rows.find(r => r.id === 'e3').amount, 0);
});

test('labourer balances: earned − paid − deductions, by stable id, owed first; inactive labourers kept', () => {
  const b = labourerBalances({ lines, payments: [{ labourer_id: 'L1', amount: 1000 }], deductions: [{ labourer_id: 'L2', allocated_amount: 25 }], labourersById });
  assert.deepEqual(b.map(r => [r.name, r.days, r.earned, r.paid, r.deducted, r.balance, r.active]),
    [['Golu', 2, 6300, 1000, 0, 5300, true], ['Satish', 1, 525, 0, 25, 500, false]]);
});

test('labels and helpers', () => {
  assert.equal(quantityLabel({ rate_unit_snapshot: 'Per batch', total_batches: 2 }), '2 बैच');
  assert.equal(quantityLabel({ rate_unit_snapshot: 'Fixed amount' }), 'फिक्स राशि');
  assert.equal(rateLabel({ rate_snapshot: 0.3, rate_unit_snapshot: 'Per bag' }), '₹0.3 / बोरी');
  assert.equal(workTypeLabel('unknown_type'), 'unknown_type');
  assert.equal(formatInr(5775), '₹5,775');
  assert.equal(monthStart('2026-11-03'), '2026-11-01');
});

test('connection states: missing tables vs permission denied', () => {
  assert.equal(isNotConnectedError({ code: 'PGRST205', message: "Could not find the table 'public.v_labour_work_lines'" }), true);
  assert.equal(isNotConnectedError({ code: '42P01', message: 'relation "daily_work_entries" does not exist' }), true);
  assert.equal(isNotConnectedError({ code: '42501', message: 'permission denied for table daily_work_entries' }), false);
  assert.equal(isPermissionError({ code: '42501', message: 'permission denied' }), true);
});
