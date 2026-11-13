import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeDayStatusKey,
  parseDayStatusKey,
  isLabourerActiveOnDay,
  canToggleLabourerStatus,
  redistributeDailyLabour,
  redistributeAllLines,
  getDailyLabourersSummary,
  labourerBalances,
} from '../labourHisaabData.js';

// Setup mock test environment
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => (mockStorage.has(k) ? mockStorage.get(k) : null),
  setItem: (k, v) => mockStorage.set(k, String(v)),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear(),
};

const CONTRACTOR_1 = 'c_01';
const DATE_1 = '2026-11-13';
const DATE_2 = '2026-11-14';

// 5 Labourers: L1, L2, L3, L4, L5
const labourers = [
  { id: 'L1', name: 'Aman', local_id: 'LH01' },
  { id: 'L2', name: 'Bharat', local_id: 'LH02' },
  { id: 'L3', name: 'Chirag', local_id: 'LH03' },
  { id: 'L4', name: 'Deepak', local_id: 'LH04' },
  { id: 'L5', name: 'Eshwar', local_id: 'LH05' },
];
const labourersById = Object.fromEntries(labourers.map(l => [l.id, l]));

// Single entry on DATE_1 with 2500 total amount
const singleEntryDay1 = [
  {
    id: 'entry_day1_1',
    contractor_id: CONTRACTOR_1,
    work_date: DATE_1,
    work_type: 'pallet',
    calculated_labour_amount: 2500,
  },
];

// 5 initial lines of 500 each
const initialLinesDay1 = labourers.map((l, i) => ({
  allocation_id: `alloc_d1_${i + 1}`,
  work_entry_id: 'entry_day1_1',
  contractor_id: CONTRACTOR_1,
  work_date: DATE_1,
  labourer_id: l.id,
  labourer_name: l.name,
  allocated_amount: 500,
}));

// Entry on DATE_2 for date-independence tests (total 1000, 2 labourers: L1, L2, 500 each)
const entryDay2 = [
  {
    id: 'entry_day2_1',
    contractor_id: CONTRACTOR_1,
    work_date: DATE_2,
    work_type: 'bag_stitching',
    calculated_labour_amount: 1000,
  },
];
const linesDay2 = [
  { allocation_id: 'alloc_d2_1', work_entry_id: 'entry_day2_1', contractor_id: CONTRACTOR_1, work_date: DATE_2, labourer_id: 'L1', labourer_name: 'Aman', allocated_amount: 500 },
  { allocation_id: 'alloc_d2_2', work_entry_id: 'entry_day2_1', contractor_id: CONTRACTOR_1, work_date: DATE_2, labourer_id: 'L2', labourer_name: 'Bharat', allocated_amount: 500 },
];

test('Scenario 1: 5 active labourers; deactivate 1 (L5 inactive -> ₹0, remaining 4 receive ₹625 each, total ₹2500)', () => {
  const statusMap = {
    [makeDayStatusKey(CONTRACTOR_1, DATE_1, 'L5')]: false,
  };

  const redistributed = redistributeDailyLabour({
    workDate: DATE_1,
    contractorId: CONTRACTOR_1,
    entries: singleEntryDay1,
    lines: initialLinesDay1,
    dayStatusMap: statusMap,
  });

  assert.equal(redistributed.length, 5);

  const l5 = redistributed.find(l => l.labourer_id === 'L5');
  assert.equal(l5.allocated_amount, 0, 'Inactive labourer L5 must receive exactly ₹0');

  const activeLines = redistributed.filter(l => l.labourer_id !== 'L5');
  assert.equal(activeLines.length, 4, 'Remaining active labourers count must be 4');
  activeLines.forEach(l => {
    assert.equal(l.allocated_amount, 625, `Active labourer ${l.labourer_id} should receive ₹625`);
  });

  const total = redistributed.reduce((s, l) => s + l.allocated_amount, 0);
  assert.equal(total, 2500, 'Sum of all amounts must equal original ₹2500');
});

test('Scenario 2: Reactivate previously inactive labourer (L5 toggled back to Active -> all 5 receive ₹500, total ₹2500)', () => {
  // Initially inactive
  const statusMapInactive = {
    [makeDayStatusKey(CONTRACTOR_1, DATE_1, 'L5')]: false,
  };
  const step1 = redistributeDailyLabour({
    workDate: DATE_1,
    contractorId: CONTRACTOR_1,
    entries: singleEntryDay1,
    lines: initialLinesDay1,
    dayStatusMap: statusMapInactive,
  });
  assert.equal(step1.find(l => l.labourer_id === 'L5').allocated_amount, 0);

  // Reactivate L5
  const statusMapReactivated = {
    [makeDayStatusKey(CONTRACTOR_1, DATE_1, 'L5')]: true,
  };
  const step2 = redistributeDailyLabour({
    workDate: DATE_1,
    contractorId: CONTRACTOR_1,
    entries: singleEntryDay1,
    lines: step1,
    dayStatusMap: statusMapReactivated,
  });

  step2.forEach(l => {
    assert.equal(l.allocated_amount, 500, `Labourer ${l.labourer_id} should receive ₹500`);
  });
  const total = step2.reduce((s, l) => s + l.allocated_amount, 0);
  assert.equal(total, 2500, 'Sum after reactivation must equal original ₹2500');
});

test('Scenario 3: Deactivate two labourers sequentially (L4 & L5 inactive -> ₹0, 3 active share ₹2500 penny-perfectly)', () => {
  const statusMap = {
    [makeDayStatusKey(CONTRACTOR_1, DATE_1, 'L4')]: false,
    [makeDayStatusKey(CONTRACTOR_1, DATE_1, 'L5')]: false,
  };

  const redistributed = redistributeDailyLabour({
    workDate: DATE_1,
    contractorId: CONTRACTOR_1,
    entries: singleEntryDay1,
    lines: initialLinesDay1,
    dayStatusMap: statusMap,
  });

  const inactive = redistributed.filter(l => l.labourer_id === 'L4' || l.labourer_id === 'L5');
  inactive.forEach(l => assert.equal(l.allocated_amount, 0, 'Inactive labourers must receive ₹0'));

  const active = redistributed.filter(l => l.labourer_id !== 'L4' && l.labourer_id !== 'L5');
  assert.equal(active.length, 3);

  // 2500 / 3 = 833.3333... -> penny-perfect integer paise split: 833.34, 833.33, 833.33
  const amounts = active.map(l => l.allocated_amount);
  assert.ok(amounts.every(a => a === 833.33 || a === 833.34), `Amounts should be 833.33 or 833.34, got ${amounts}`);

  const total = redistributed.reduce((s, l) => Math.round((s + l.allocated_amount) * 100) / 100, 0);
  assert.equal(total, 2500, 'Total must strictly equal ₹2500 down to the paisa');
});

test('Scenario 4: Date independence: status changes on DATE_1 do not affect DATE_2', () => {
  const combinedEntries = [...singleEntryDay1, ...entryDay2];
  const combinedLines = [...initialLinesDay1, ...linesDay2];

  // Deactivate L1 on DATE_1 only
  const statusMap = {
    [makeDayStatusKey(CONTRACTOR_1, DATE_1, 'L1')]: false,
  };

  const allRedistributed = redistributeAllLines(combinedEntries, combinedLines, statusMap);

  // On DATE_1, L1 must be 0 and L2-L5 receive 625
  const d1L1 = allRedistributed.find(l => l.work_date === DATE_1 && l.labourer_id === 'L1');
  assert.equal(d1L1.allocated_amount, 0);

  // On DATE_2, L1 must remain active and retain ₹500
  const d2L1 = allRedistributed.find(l => l.work_date === DATE_2 && l.labourer_id === 'L1');
  assert.equal(d2L1.allocated_amount, 500, 'DATE_2 allocation for L1 must be completely unaffected');

  const d2L2 = allRedistributed.find(l => l.work_date === DATE_2 && l.labourer_id === 'L2');
  assert.equal(d2L2.allocated_amount, 500, 'DATE_2 allocation for L2 must be completely unaffected');
});

test('Scenario 5: Status key parsing and storage roundtrip persistence', () => {
  const key = makeDayStatusKey('contractor_xyz', '2026-11-13', 'labourer_123');
  assert.equal(key, 'contractor_xyz|2026-11-13|labourer_123');

  const parsed = parseDayStatusKey(key);
  assert.deepEqual(parsed, {
    contractorId: 'contractor_xyz',
    workDate: '2026-11-13',
    labourerId: 'labourer_123',
  });

  const testMap = { [key]: false };
  assert.equal(isLabourerActiveOnDay(testMap, 'contractor_xyz', '2026-11-13', 'labourer_123'), false);
  assert.equal(isLabourerActiveOnDay(testMap, 'contractor_xyz', '2026-11-13', 'other_labourer'), true);
});

test('Scenario 6: Invariant verification: daily total remains strictly unchanged across all redistributions', () => {
  const randomAmounts = [1000, 2450.5, 3333.33, 15000, 789.45];
  for (const amt of randomAmounts) {
    const entry = [{ id: 'e_rnd', contractor_id: 'c1', work_date: '2026-11-13', calculated_labour_amount: amt }];
    const lines = [
      { work_entry_id: 'e_rnd', contractor_id: 'c1', work_date: '2026-11-13', labourer_id: 'L1', allocated_amount: amt / 3 },
      { work_entry_id: 'e_rnd', contractor_id: 'c1', work_date: '2026-11-13', labourer_id: 'L2', allocated_amount: amt / 3 },
      { work_entry_id: 'e_rnd', contractor_id: 'c1', work_date: '2026-11-13', labourer_id: 'L3', allocated_amount: amt / 3 },
    ];

    // Deactivate L2
    const statusMap = { [makeDayStatusKey('c1', '2026-11-13', 'L2')]: false };
    const res = redistributeDailyLabour({ workDate: '2026-11-13', contractorId: 'c1', entries: entry, lines, dayStatusMap: statusMap });

    const sum = res.reduce((s, l) => Math.round((s + l.allocated_amount) * 100) / 100, 0);
    assert.equal(sum, Math.round(amt * 100) / 100, `Sum ${sum} must equal target ${amt}`);
  }
});

test('Scenario 7: Paise and decimal rounding: odd divisions (e.g. ₹100 among 3 workers)', () => {
  const entry = [{ id: 'e_100', contractor_id: 'c1', work_date: '2026-11-13', calculated_labour_amount: 100 }];
  const lines = [
    { work_entry_id: 'e_100', contractor_id: 'c1', work_date: '2026-11-13', labourer_id: 'L1', allocated_amount: 33.33 },
    { work_entry_id: 'e_100', contractor_id: 'c1', work_date: '2026-11-13', labourer_id: 'L2', allocated_amount: 33.33 },
    { work_entry_id: 'e_100', contractor_id: 'c1', work_date: '2026-11-13', labourer_id: 'L3', allocated_amount: 33.34 },
  ];
  const res = redistributeDailyLabour({ workDate: '2026-11-13', contractorId: 'c1', entries: entry, lines, dayStatusMap: {} });
  const sum = res.reduce((s, l) => s + l.allocated_amount, 0);
  assert.equal(Math.round(sum * 100) / 100, 100);
});

test('Scenario 8: Guard check: attempting to deactivate the last active labourer is blocked', () => {
  const dayLabourers = [
    { id: 'L1', isActive: false },
    { id: 'L2', isActive: false },
    { id: 'L3', isActive: true }, // Only 1 active remaining
  ];

  // Attempting to deactivate L3
  const check = canToggleLabourerStatus(dayLabourers, 'L3', false);
  assert.equal(check.allowed, false, 'Must not allow deactivating the last active labourer');
  assert.equal(check.reason, 'At least one labourer must remain active for this day.');

  // Attempting to activate L2 should be allowed
  const checkActivate = canToggleLabourerStatus(dayLabourers, 'L2', true);
  assert.equal(checkActivate.allowed, true);
});

test('Scenario 9: Financial isolation: payments and deduction records remain strictly unchanged', () => {
  const payments = [
    { id: 'pay_1', labourer_id: 'L1', amount: 500, payment_date: '2026-11-13' },
    { id: 'pay_2', labourer_id: 'L5', amount: 300, payment_date: '2026-11-13' },
  ];
  const deductions = [
    { labourer_id: 'L1', allocated_amount: 50 },
  ];

  // Deactivate L5 on day 1
  const statusMap = { [makeDayStatusKey(CONTRACTOR_1, DATE_1, 'L5')]: false };
  const redistributed = redistributeDailyLabour({
    workDate: DATE_1,
    contractorId: CONTRACTOR_1,
    entries: singleEntryDay1,
    lines: initialLinesDay1,
    dayStatusMap: statusMap,
  });

  // Calculate balances with redistributed lines
  const balances = labourerBalances({
    lines: redistributed,
    payments,
    deductions,
    labourersById,
  });

  const bL5 = balances.find(b => b.id === 'L5');
  assert.equal(bL5.earned, 0, 'L5 earned must be 0 for this day');
  assert.equal(bL5.paid, 300, 'L5 paid must strictly remain ₹300 unchanged');
  assert.equal(bL5.balance, -300, 'L5 balance is 0 - 300 = -300 (overpaid/advance)');

  // Verify payments array was not mutated
  assert.equal(payments[0].amount, 500);
  assert.equal(payments[1].amount, 300);
});

test('Scenario 10: Multi-entry day: 2 entries on the same day correctly redistribute amounts', () => {
  const multiEntries = [
    { id: 'me_1', contractor_id: 'c1', work_date: '2026-11-13', calculated_labour_amount: 1000 },
    { id: 'me_2', contractor_id: 'c1', work_date: '2026-11-13', calculated_labour_amount: 1500 },
  ];
  // 4 workers: L1, L2, L3, L4 on both entries
  const multiLines = [
    // entry 1: 250 each
    { allocation_id: 'm1', work_entry_id: 'me_1', contractor_id: 'c1', work_date: '2026-11-13', labourer_id: 'L1', allocated_amount: 250 },
    { allocation_id: 'm2', work_entry_id: 'me_1', contractor_id: 'c1', work_date: '2026-11-13', labourer_id: 'L2', allocated_amount: 250 },
    { allocation_id: 'm3', work_entry_id: 'me_1', contractor_id: 'c1', work_date: '2026-11-13', labourer_id: 'L3', allocated_amount: 250 },
    { allocation_id: 'm4', work_entry_id: 'me_1', contractor_id: 'c1', work_date: '2026-11-13', labourer_id: 'L4', allocated_amount: 250 },
    // entry 2: 375 each
    { allocation_id: 'm5', work_entry_id: 'me_2', contractor_id: 'c1', work_date: '2026-11-13', labourer_id: 'L1', allocated_amount: 375 },
    { allocation_id: 'm6', work_entry_id: 'me_2', contractor_id: 'c1', work_date: '2026-11-13', labourer_id: 'L2', allocated_amount: 375 },
    { allocation_id: 'm7', work_entry_id: 'me_2', contractor_id: 'c1', work_date: '2026-11-13', labourer_id: 'L3', allocated_amount: 375 },
    { allocation_id: 'm8', work_entry_id: 'me_2', contractor_id: 'c1', work_date: '2026-11-13', labourer_id: 'L4', allocated_amount: 375 },
  ];

  // Deactivate L4 on this date
  const statusMap = { [makeDayStatusKey('c1', '2026-11-13', 'L4')]: false };
  const res = redistributeDailyLabour({
    workDate: '2026-11-13',
    contractorId: 'c1',
    entries: multiEntries,
    lines: multiLines,
    dayStatusMap: statusMap,
  });

  // L4 should have 0 on both entries
  const l4Lines = res.filter(l => l.labourer_id === 'L4');
  l4Lines.forEach(l => assert.equal(l.allocated_amount, 0));

  // Total should equal 1000 + 1500 = 2500
  const total = res.reduce((s, l) => Math.round((s + l.allocated_amount) * 100) / 100, 0);
  assert.equal(total, 2500, 'Sum of multi-entry day must strictly equal ₹2500');

  // getDailyLabourersSummary should show summary
  const summary = getDailyLabourersSummary({
    workDate: '2026-11-13',
    contractorId: 'c1',
    entries: multiEntries,
    lines: res,
    labourersById,
    dayStatusMap: statusMap,
  });

  const sumL4 = summary.find(s => s.id === 'L4');
  assert.equal(sumL4.currentAmount, 0);
  assert.equal(sumL4.isActive, false);

  const activeSum = summary.filter(s => s.isActive);
  assert.equal(activeSum.length, 3);
  const activeTotal = activeSum.reduce((s, l) => Math.round((s + l.currentAmount) * 100) / 100, 0);
  assert.equal(activeTotal, 2500);
});
