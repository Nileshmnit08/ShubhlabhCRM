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

test('commandCenterMetrics: separates approved vs pending, excludes pending from payableNow', async () => {
  const { commandCenterMetrics } = await import('../labourHisaabData.js');
  const es = [
    { id: 'e1', work_date: '2026-11-02', approval_status: 'Approved', calculated_labour_amount: 5000 },
    { id: 'e2', work_date: '2026-11-03', approval_status: 'Pending', calculated_labour_amount: 2000 },
    { id: 'e3', work_date: '2026-11-03', approval_status: 'Rejected', calculated_labour_amount: 800 },
  ];
  const ls = [
    { work_entry_id: 'e1', labourer_id: 'L1', allocated_amount: 5000 },
    { work_entry_id: 'e2', labourer_id: 'L1', allocated_amount: 2000 },
    { work_entry_id: 'e3', labourer_id: 'L1', allocated_amount: 800 },
  ];
  const payments = [{ labourer_id: 'L1', amount: 1500 }];
  const deductions = [{ labourer_id: 'L1', allocated_amount: 200 }];

  const m = commandCenterMetrics({ entries: es, lines: ls, payments, deductions });
  assert.equal(m.approvedWage, 5000);
  assert.equal(m.pendingWage, 2000);
  assert.equal(m.rejectedWage, 800);
  assert.equal(m.totalRecordedWage, 7000); // 5000 + 2000
  assert.equal(m.approvedEarned, 5000);
  assert.equal(m.pendingEarned, 2000);
  assert.equal(m.paid, 1500);
  assert.equal(m.deductions, 200);
  assert.equal(m.payableNow, 3300); // 5000 - 1500 - 200
  assert.equal(m.labourersWorked, 1);
  assert.equal(m.avgApprovedPerLabourer, 5000);
  assert.equal(m.workDays, 1);
});

test('groupedDailyEntries, detailedLabourerLedger, workTypeSummary, and CSV exports', async () => {
  const {
    groupedDailyEntries, detailedLabourerLedger, workTypeSummary,
    generateDailyRegisterCsv, generateLabourerBalancesCsv,
  } = await import('../labourHisaabData.js');

  const es = [
    { id: 'e1', contractor_id: 'c1', work_date: '2026-11-03', work_type: 'pallet', rate_snapshot: 21, rate_unit_snapshot: 'Per 100 kg', total_weight_kg: 5000, total_bags: 100, total_batches: 0, calculated_labour_amount: 1050, approval_status: 'Approved' },
    { id: 'e2', contractor_id: 'c1', work_date: '2026-11-02', work_type: 'mix', rate_snapshot: 21, rate_unit_snapshot: 'Per 100 kg', total_weight_kg: 2000, total_bags: 40, total_batches: 0, calculated_labour_amount: 420, approval_status: 'Pending' },
  ];
  const ls = [
    { work_entry_id: 'e1', labourer_id: 'L1', work_date: '2026-11-03', allocated_amount: 1050 },
    { work_entry_id: 'e2', labourer_id: 'L1', work_date: '2026-11-02', allocated_amount: 420 },
  ];
  const labourersById = { L1: { name: 'Golu', local_id: 'LH_LAB_001', active_status: true } };
  const contractorsById = { c1: { name: 'Shubh Labh' } };

  // 1. Grouped Daily Entries
  const grouped = groupedDailyEntries({ entries: es, lines: ls, contractorsById, labourersById });
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].date, '2026-11-03');
  assert.equal(grouped[0].dayStatus, 'Approved');
  assert.equal(grouped[0].totalApprovedAmount, 1050);
  assert.equal(grouped[1].date, '2026-11-02');
  assert.equal(grouped[1].dayStatus, 'Pending');
  assert.equal(grouped[1].totalPendingAmount, 420);

  // 2. Detailed Labourer Ledger
  const ledger = detailedLabourerLedger({ lines: ls, payments: [{ labourer_id: 'L1', amount: 500 }], deductions: [], entries: es, labourersById });
  assert.equal(ledger.length, 1);
  assert.equal(ledger[0].approvedEarned, 1050);
  assert.equal(ledger[0].pendingEarned, 420);
  assert.equal(ledger[0].paid, 500);
  assert.equal(ledger[0].payableBalance, 550); // 1050 - 500
  assert.equal(ledger[0].workHistory.length, 2);

  // 3. Work Type Summary
  const wt = workTypeSummary({ entries: es });
  assert.equal(wt.length, 2);
  assert.equal(wt[0].workType, 'pallet');
  assert.equal(wt[0].totalAmount, 1050);

  // 4. CSV Exports
  const dailyCsv = generateDailyRegisterCsv(grouped, { contractorName: 'Shubh Labh', fromDate: '2026-11-01', toDate: '2026-11-03' });
  assert.match(dailyCsv, /Daily Register/);
  assert.match(dailyCsv, /2026-11-03/);
  assert.match(dailyCsv, /Golu/);

  const labCsv = generateLabourerBalancesCsv(ledger, { contractorName: 'Shubh Labh', fromDate: '2026-11-01', toDate: '2026-11-03' });
  assert.match(labCsv, /Labourer Balances/);
  assert.match(labCsv, /LH_LAB_001/);
});

test('LH-SETTLEMENT-UX-02: reconciliationPanelData, contractorSettlementSummaries, and date presets', async () => {
  const {
    shiftDays, weekStart, lastMonthRange, getDateRangePreset,
    reconciliationPanelData, contractorSettlementSummaries,
  } = await import('../labourHisaabData.js');

  // 1. Date math & presets
  assert.equal(shiftDays('2026-11-05', -1), '2026-11-04');
  assert.equal(weekStart('2026-11-05'), '2026-11-02');
  assert.deepEqual(lastMonthRange('2026-11-05'), { fromDate: '2026-10-01', toDate: '2026-10-31' });
  assert.deepEqual(getDateRangePreset('today', '2026-11-05'), { fromDate: '2026-11-05', toDate: '2026-11-05' });
  assert.deepEqual(getDateRangePreset('yesterday', '2026-11-05'), { fromDate: '2026-11-04', toDate: '2026-11-04' });
  assert.deepEqual(getDateRangePreset('thisWeek', '2026-11-05'), { fromDate: '2026-11-02', toDate: '2026-11-05' });
  assert.deepEqual(getDateRangePreset('thisMonth', '2026-11-05'), { fromDate: '2026-11-01', toDate: '2026-11-05' });
  assert.deepEqual(getDateRangePreset('lastMonth', '2026-11-05'), { fromDate: '2026-10-01', toDate: '2026-10-31' });

  // 2. Reconciliation panel: Approved Wages − Paid − Deductions = Balance Payable
  const entries = [
    { id: 'e1', contractor_id: 'c1', calculated_labour_amount: 10000, approval_status: 'Approved' },
    { id: 'e2', contractor_id: 'c1', calculated_labour_amount: 3000, approval_status: 'Pending' },
    { id: 'e3', contractor_id: 'c2', calculated_labour_amount: 4000, approval_status: 'Approved' },
  ];
  const lines = [
    { work_entry_id: 'e1', contractor_id: 'c1', allocated_amount: 10000 },
    { work_entry_id: 'e2', contractor_id: 'c1', allocated_amount: 3000 },
    { work_entry_id: 'e3', contractor_id: 'c2', allocated_amount: 4000 },
  ];
  const payments = [
    { id: 'p1', contractor_id: 'c1', amount: 4000, payment_date: '2026-11-03' },
  ];
  const deductions = [
    { id: 'd1', contractor_id: 'c1', allocated_amount: 1000 },
  ];

  const recon = reconciliationPanelData({ entries, lines, payments, deductions });
  assert.equal(recon.approvedWages, 14000);
  assert.equal(recon.pendingWages, 3000);
  assert.equal(recon.paid, 4000);
  assert.equal(recon.deductions, 1000);
  // 14000 (approved) - 4000 (paid) - 1000 (deductions) = 9000
  assert.equal(recon.balancePayable, 9000);
  assert.equal(recon.isPartiallyPaid, true);
  assert.equal(recon.isFullySettled, false);

  // 3. Contractor settlement summaries
  const contractors = [
    { id: 'c1', name: 'Contractor 1', is_active: true },
    { id: 'c2', name: 'Contractor 2', is_active: true },
  ];
  const summaries = contractorSettlementSummaries({ contractors, entries, lines, payments, deductions });
  assert.equal(summaries.length, 2);

  const c1 = summaries.find(s => s.contractorId === 'c1');
  assert.equal(c1.approvedWages, 10000);
  assert.equal(c1.pendingWages, 3000);
  assert.equal(c1.paid, 4000);
  assert.equal(c1.deductions, 1000);
  assert.equal(c1.balancePayable, 5000); // 10000 - 4000 - 1000
  assert.equal(c1.lastPaymentDate, '2026-11-03');
  assert.equal(c1.status, 'Partially Paid');

  const c2 = summaries.find(s => s.contractorId === 'c2');
  assert.equal(c2.approvedWages, 4000);
  assert.equal(c2.pendingWages, 0);
  assert.equal(c2.paid, 0);
  assert.equal(c2.balancePayable, 4000);
  assert.equal(c2.lastPaymentDate, null);
  assert.equal(c2.status, 'Unpaid');
});

test('connection states: missing tables vs permission denied', () => {
  assert.equal(isNotConnectedError({ code: 'PGRST205', message: "Could not find the table 'public.v_labour_work_lines'" }), true);
  assert.equal(isNotConnectedError({ code: '42P01', message: 'relation "daily_work_entries" does not exist' }), true);
  assert.equal(isNotConnectedError({ code: '42501', message: 'permission denied for table daily_work_entries' }), false);
  assert.equal(isPermissionError({ code: '42501', message: 'permission denied' }), true);
});
