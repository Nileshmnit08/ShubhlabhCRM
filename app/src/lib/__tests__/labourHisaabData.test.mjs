import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('approved-only: only Approved days count; Pending, Rejected, unknown and missing never do', async () => {
  const { attachApprovalStatus, approvedOnly, notCountedSummary } = await import('../labourHisaabData.js');
  const es = [
    { id: 'a', contractor_id: 'c1', work_date: '2026-11-02', calculated_labour_amount: 5775 },
    { id: 'b', contractor_id: 'c1', work_date: '2026-11-03', calculated_labour_amount: 1050 },
    { id: 'c', contractor_id: 'c1', work_date: '2026-11-04', calculated_labour_amount: 300 },
    { id: 'd', contractor_id: 'c2', work_date: '2026-11-02', calculated_labour_amount: 99 },
    { id: 'e', contractor_id: 'c1', work_date: '2026-11-05', calculated_labour_amount: 7 },
  ];
  const regs = [
    { contractor_id: 'c1', work_date: '2026-11-02', status: 'Approved' },
    { contractor_id: 'c1', work_date: '2026-11-03', status: 'Rejected' },
    { contractor_id: 'c1', work_date: '2026-11-04', status: 'Pending' },
    { contractor_id: 'c2', work_date: '2026-11-02', status: 'Weird' },
  ]; // e has no register at all
  const withStatus = attachApprovalStatus(es, regs);
  assert.deepEqual(withStatus.map(x => x.approval_status), ['Approved', 'Rejected', 'Pending', 'Weird', 'Pending']);
  const ls = es.map(x => ({ work_entry_id: x.id, labourer_id: `L-${x.id}`, work_date: x.work_date, allocated_amount: x.calculated_labour_amount }));
  const ok = approvedOnly({ entries: withStatus, lines: ls });
  assert.deepEqual([ok.entries.map(x => x.id), ok.lines.map(x => x.work_entry_id)], [['a'], ['a']]);
  const s = summarize({ entries: ok.entries, lines: ok.lines });
  assert.deepEqual([s.totalWage, s.earned, s.entryCount, s.workDays, s.labourersWorked], [5775, 5775, 1, 1, 1]);
  const b = labourerBalances({ lines: ok.lines, labourersById: {} });
  assert.deepEqual(b.map(x => x.earned), [5775], 'labourer totals: approved only');
  const nc = notCountedSummary(withStatus);
  assert.deepEqual(nc, { count: 4, amount: 1456, byStatus: { Rejected: 1, Pending: 2, Weird: 1 } });
});

test('approved-only with filters: contractor and date filters still apply to the approved set', async () => {
  const { approvedOnly } = await import('../labourHisaabData.js');
  const es = [
    { id: 'a', contractor_id: 'c1', work_date: '2026-11-02', approval_status: 'Approved', calculated_labour_amount: 100 },
    { id: 'b', contractor_id: 'c2', work_date: '2026-11-02', approval_status: 'Approved', calculated_labour_amount: 200 },
    { id: 'c', contractor_id: 'c1', work_date: '2026-10-30', approval_status: 'Approved', calculated_labour_amount: 400 },
  ];
  const filtered = es.filter(e => e.contractor_id === 'c1' && e.work_date >= '2026-11-01'); // what the query filters return
  assert.deepEqual(summarize(approvedOnly({ entries: filtered, lines: [] })).totalWage, 100);
  assert.deepEqual(summarize(approvedOnly({ entries: es, lines: [] })).totalWage, 700);
});

test('admin form validation and amount preview follow the server rules', async () => {
  const { adminEntryError, previewAmount } = await import('../labourHisaabData.js');
  const base = { contractorId: 'c1', workDate: '2026-11-04', workType: 'pallet', unit: 'Per 100 kg', totalWeightKg: '5000', totalBags: '100', rate: '', labourerIds: ['L1'] };
  assert.equal(adminEntryError(base, '2026-11-04'), null);
  assert.match(adminEntryError({ ...base, contractorId: '' }, '2026-11-04'), /contractor/);
  assert.match(adminEntryError({ ...base, workDate: '2026-11-05' }, '2026-11-04'), /future/);
  assert.match(adminEntryError({ ...base, workType: '' }, '2026-11-04'), /work type/);
  assert.match(adminEntryError({ ...base, labourerIds: [] }, '2026-11-04'), /labourer/);
  assert.match(adminEntryError({ ...base, unit: 'Per bag', totalBags: '2.5' }, '2026-11-04'), /whole number/);
  assert.match(adminEntryError({ ...base, rate: '-1' }, '2026-11-04'), /negative/);
  assert.match(adminEntryError({ ...base, unit: 'Fixed amount', rate: '' }, '2026-11-04'), /fixed amount/);
  assert.equal(previewAmount({ rate: 21, unit: 'Per 100 kg', totalWeightKg: 27500 }), 5775);
  assert.equal(previewAmount({ rate: 0.3, unit: 'Per bag', totalBags: 40 }), 12);
  assert.equal(previewAmount({ rate: 300, unit: 'Per batch', totalBatches: 2 }), 600);
  assert.equal(previewAmount({ rate: 250, unit: 'Fixed amount' }), 250);
});

test('admin dialog writes ONLY through the 255 functions; delete needs confirmation + reason; page shows approval', () => {
  const dlg = readFileSync(new URL('../../components/LabourEntryAdminDialog.jsx', import.meta.url), 'utf8');
  assert.ok(!/\.from\([^)]*\)\s*\.(insert|update|upsert|delete)\(/.test(dlg), 'no direct table writes');
  assert.deepEqual([...dlg.matchAll(/\.rpc\('([^']+)'/g)].map(m => m[1]).sort(), ['lh_admin_delete_work_entry', 'lh_admin_save_work_entry']);
  assert.ok(!/status:\s*'Approved'|p_status|approval_status\s*:/.test(dlg), 'the dialog never sets an approval status');
  assert.match(dlg, /Confirm delete/);
  assert.match(dlg, /Give a reason for deleting/);
  assert.match(dlg, /const idRef = useRef\(entry\?\.id \|\| newId\(\)\)/, 'stable id per dialog (retry-safe)');
  const page = readFileSync(new URL('../../pages/LabourHisaab.jsx', import.meta.url), 'utf8');
  assert.match(page, /from\('v_lh_approved_entries'\)/);
  assert.match(page, /from\('v_lh_approved_work_lines'\)/);
  assert.match(page, /summarize\(\{ entries: approvedData\.entries, lines: approvedData\.lines/, 'KPIs from approved data only');
  assert.match(page, /labourerBalances\(\{ lines: approvedData\.lines/, 'balances from approved data only');
  assert.match(page, /isAdmin \? <th style=\{th\}>Actions<\/th> : null/, 'actions only for admins');
});

test('connection states: missing tables vs permission denied', () => {
  assert.equal(isNotConnectedError({ code: 'PGRST205', message: "Could not find the table 'public.v_labour_work_lines'" }), true);
  assert.equal(isNotConnectedError({ code: '42P01', message: 'relation "daily_work_entries" does not exist' }), true);
  assert.equal(isNotConnectedError({ code: '42501', message: 'permission denied for table daily_work_entries' }), false);
  assert.equal(isPermissionError({ code: '42501', message: 'permission denied' }), true);
});
