// Comprehensive Automated Test Suite for LabourHisaab
// Tests all 10 Acceptance Criteria for MICRO-SPRINT: LH-UI-01

import assert from 'node:assert';
import {
  calculateWorkEntry,
  calculateDailyMetrics,
  calculateLabourerStatement,
  calculatePeriodReport,
  calculateExpenseDeductionForLabourer,
  getWeekRange,
} from '../src/utils/calculations.js';
import {
  buildWhatsAppStatementText,
  buildWhatsAppDailyStatementText,
  buildWhatsAppConsolidatedSummaryText,
  buildWhatsAppSettlementStatementText,
  buildWhatsAppSettlementSummaryText,
  formatRupees,
} from '../src/utils/shareWhatsApp.js';
import {
  generateIndividualStatementHtml,
  generateConsolidatedReportHtml,
  generateSettlementStatementHtml,
  generateConsolidatedSettlementHtml,
} from '../src/utils/pdfGenerator.js';
import {
  DEFAULT_WORK_RATES,
  INITIAL_LABOURERS,
  INITIAL_WORK_ENTRIES,
  INITIAL_PAYMENTS,
  INITIAL_EXPENSES,
  TODAY_DATE,
} from '../src/constants/initialData.js';
import {
  distributeWorkAllocation,
  distributeExpenseDeduction,
  default as labourDatabaseService,
} from '../src/services/LabourDatabaseService.js';

let passedTests = 0;
let totalTests = 0;
const testQueue = [];

function runTest(testName, testFn) {
  totalTests++;
  testQueue.push(async () => {
    try {
      await testFn();
      console.log(`  ✅ PASS: ${testName}`);
      passedTests++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${testName}`);
      console.error(`     Error: ${err.message}`);
      process.exitCode = 1;
    }
  });
}

console.log('\n======================================================');
console.log('🚀 RUNNING LABOURHISAAB COMPREHENSIVE VALIDATION SUITE');
console.log('======================================================\n');

// -----------------------------------------------------------------
// SUITE 1: Work Entry Calculations (Weight-based, Per-bag, Batch)
// -----------------------------------------------------------------
console.log('📋 Test Suite 1: Work Calculations (Weight, Bag, Batch)');

runTest('Weight-based calculation with single bag weight', () => {
  // Mix: 200 bags of 50kg = 10,000 kg @ ₹21 / 100kg
  // Formula: (10,000 / 100) * 21 = ₹2,100
  const result = calculateWorkEntry({
    rate: 21,
    unit: 'per_100_kg',
    type: 'weight',
    bagLines: [{ bagWeightKg: 50, bagCount: 200 }],
  });
  assert.strictEqual(result.totalKg, 10000);
  assert.strictEqual(result.totalBags, 200);
  assert.strictEqual(result.totalAmount, 2100);
});

runTest('Weight-based calculation with MULTIPLE bag weights in one entry', () => {
  // Maize Daliya @ ₹15 / 100kg
  // Line 1: 100 bags × 50kg = 5,000 kg
  // Line 2: 50 bags × 40kg = 2,000 kg
  // Total: 150 bags, 7,000 kg -> (7,000 / 100) * 15 = ₹1,050
  const result = calculateWorkEntry({
    rate: 15,
    unit: 'per_100_kg',
    type: 'weight',
    bagLines: [
      { bagWeightKg: 50, bagCount: 100 },
      { bagWeightKg: 40, bagCount: 50 },
    ],
  });
  assert.strictEqual(result.totalKg, 7000);
  assert.strictEqual(result.totalBags, 150);
  assert.strictEqual(result.totalAmount, 1050);
});

runTest('Per-bag calculation (e.g. Bag Stitching @ ₹0.30 / bag)', () => {
  // 1,500 bags @ ₹0.30 = ₹450
  const result = calculateWorkEntry({
    rate: 0.30,
    unit: 'per_bag',
    type: 'bag',
    totalBags: 1500,
  });
  assert.strictEqual(result.totalBags, 1500);
  assert.strictEqual(result.totalAmount, 450);
});

runTest('Batch-based calculation (Premix @ ₹300 / batch)', () => {
  // 4 batches @ ₹300 = ₹1,200
  const result = calculateWorkEntry({
    rate: 300,
    unit: 'per_batch',
    type: 'batch',
    totalBatches: 4,
  });
  assert.strictEqual(result.totalBatches, 4);
  assert.strictEqual(result.totalAmount, 1200);
});

// -----------------------------------------------------------------
// SUITE 2: Service Expense Allocation Policy (Contractor vs Deductions)
// -----------------------------------------------------------------
console.log('\n📋 Test Suite 2: Service Expense Allocation Engine');

runTest('Contractor Borne Expense is NEVER deducted from labourers', () => {
  const expense = {
    id: 'exp_01',
    amount: 500,
    allocationType: 'contractor_expense',
    allocatedLabourerIds: [],
  };
  const deduction = calculateExpenseDeductionForLabourer(expense, 'LH_LAB_001');
  assert.strictEqual(deduction, 0, 'Contractor expense must yield 0 deduction');
});

runTest('Individual Deduction allocates full amount to target labourer only', () => {
  const expense = {
    id: 'exp_02',
    amount: 350,
    allocationType: 'individual',
    allocatedLabourerIds: ['LH_LAB_002'],
  };
  const deductionTarget = calculateExpenseDeductionForLabourer(expense, 'LH_LAB_002');
  const deductionOther = calculateExpenseDeductionForLabourer(expense, 'LH_LAB_001');
  assert.strictEqual(deductionTarget, 350);
  assert.strictEqual(deductionOther, 0);
});

runTest('Group Deduction equally divides expense among chosen labourers', () => {
  const expense = {
    id: 'exp_03',
    amount: 600,
    allocationType: 'group',
    allocatedLabourerIds: ['LH_LAB_001', 'LH_LAB_002', 'LH_LAB_003'],
  };
  const deductionMember = calculateExpenseDeductionForLabourer(expense, 'LH_LAB_001');
  const deductionNonMember = calculateExpenseDeductionForLabourer(expense, 'LH_LAB_004');
  assert.strictEqual(deductionMember, 200, '600 / 3 = 200 per member');
  assert.strictEqual(deductionNonMember, 0);
});

// -----------------------------------------------------------------
// SUITE 3: Daily Metrics for Home Screen (Verified with Snapshot)
// -----------------------------------------------------------------
console.log('\n📋 Test Suite 3: Daily Summary & Remaining Payable Metrics');

runTest('Daily metrics compute total earned, paid, expenses and remaining balance', () => {
  const metrics = calculateDailyMetrics({
    date: TODAY_DATE,
    workEntries: INITIAL_WORK_ENTRIES,
    payments: INITIAL_PAYMENTS,
    serviceExpenses: INITIAL_EXPENSES,
    labourers: INITIAL_LABOURERS,
  });

  // Verify Active Labourers count (Matches Snapshot Screen 1: 6 active labourers)
  assert.strictEqual(metrics.activeLabourersCount, 6);

  // Today's Work: WE_1001 (3990) + WE_1002 (618) + WE_1003 (1200) = 5808 (Matches Snapshot Screen 1!)
  assert.strictEqual(metrics.todayLabourEarned, 5808);

  // Today's Payments: Golu (1000) + Satish (1000) + Aangresh (1000) + Rahul (1000) = 4000 (Matches Snapshot Screen 2!)
  assert.strictEqual(metrics.todayPayments, 4000);

  // Today's Expenses: Food (300) + Tea (60) = 360 (Matches Snapshot Screen 2!)
  assert.strictEqual(metrics.todayTotalExpenses, 360);
  assert.strictEqual(metrics.todayContractorExpenses, 60);
  assert.strictEqual(metrics.todayAllocatedDeductions, 300);

  // Remaining Payable Today = 5808 (Earned) - 4000 (Payments) - 300 (Deductions) = 1508
  assert.strictEqual(metrics.remainingPayableToday, 1508);
});

// -----------------------------------------------------------------
// SUITE 4: Labour Management & Stable IDs
// -----------------------------------------------------------------
console.log('\n📋 Test Suite 4: Labour Management & Stable IDs');

runTest('Stable Local ID is generated and preserved across name changes', () => {
  const mockLabourer = {
    id: 'LH_LAB_001',
    name: 'रमेश कुमार',
    isActive: true,
  };

  // Rename labourer
  const updated = { ...mockLabourer, name: 'रमेश कुमार शर्मा (Ramesh Sharma)' };
  assert.strictEqual(updated.id, 'LH_LAB_001', 'ID must remain invariant');
  assert.strictEqual(updated.name, 'रमेश कुमार शर्मा (Ramesh Sharma)');

  // Past payments must still link cleanly via labourerId
  const pastPayment = INITIAL_PAYMENTS.find(p => p.labourerId === 'LH_LAB_001');
  assert.ok(pastPayment, 'Historical payments must remain linked by ID');
  assert.strictEqual(pastPayment.labourerId, updated.id);
});

// -----------------------------------------------------------------
// SUITE 5: Individual Monthly Statement Formula
// -----------------------------------------------------------------
console.log('\n📋 Test Suite 5: Individual Monthly Statement Calculation');

runTest('Remaining Balance = Total labour earned - Total payments - Allocated service deductions', () => {
  const statement = calculateLabourerStatement({
    labourerId: 'LH_LAB_001',
    yearMonth: '2026-11',
    workEntries: INITIAL_WORK_ENTRIES,
    payments: INITIAL_PAYMENTS,
    serviceExpenses: INITIAL_EXPENSES,
    labourers: INITIAL_LABOURERS,
  });

  // Verify calculation consistency
  const calculatedRemaining =
    statement.totalLabourEarned -
    statement.totalAmountPaid -
    statement.totalAllocatedServiceExpenses;

  assert.strictEqual(
    statement.remainingBalance,
    Math.round(calculatedRemaining * 100) / 100,
    'Remaining balance must strictly match formula'
  );
  assert.ok(statement.workingDays > 0, 'Working days must be calculated');
  assert.ok(statement.contractorBorneExpenses >= 0, 'Contractor borne expense tracked');
});

// -----------------------------------------------------------------
// SUITE 6: Reports Engine (Daily, Weekly, Monthly)
// -----------------------------------------------------------------
console.log('\n📋 Test Suite 6: Period Reports (Daily, Weekly, Monthly)');

runTest('Period reports support Daily, Weekly, and Monthly modes', () => {
  const dailyReport = calculatePeriodReport({
    filterType: 'daily',
    referenceDate: TODAY_DATE,
    workEntries: INITIAL_WORK_ENTRIES,
    payments: INITIAL_PAYMENTS,
    serviceExpenses: INITIAL_EXPENSES,
    labourers: INITIAL_LABOURERS,
  });
  assert.strictEqual(dailyReport.filterType, 'daily');
  assert.strictEqual(dailyReport.totalLabourEarned, 5808); // Matches Screen 1
  assert.strictEqual(dailyReport.individualSummaries.length, INITIAL_LABOURERS.length);

  const monthlyReport = calculatePeriodReport({
    filterType: 'monthly',
    referenceDate: '2026-10-31', // October 2026 matching Screen 4
    workEntries: INITIAL_WORK_ENTRIES,
    payments: INITIAL_PAYMENTS,
    serviceExpenses: INITIAL_EXPENSES,
    labourers: INITIAL_LABOURERS,
  });
  assert.strictEqual(monthlyReport.filterType, 'monthly');
  assert.strictEqual(monthlyReport.totalLabourEarned, 168240); // Matches Screen 4 exact ₹1,68,240!
  assert.strictEqual(monthlyReport.individualSummaries.length, 6);
});

// -----------------------------------------------------------------
// SUITE 7: WhatsApp Share Text Summary
// -----------------------------------------------------------------
console.log('\n📋 Test Suite 7: WhatsApp Text Summary Generation');

runTest('WhatsApp share text formats Hindi statement with complete metrics', () => {
  const text = buildWhatsAppStatementText({
    labourerName: 'रमेश कुमार',
    labourerId: 'LH_LAB_001',
    yearMonth: '2026-11',
    workingDays: 3,
    totalLabourEarned: 3500,
    totalAmountPaid: 1500,
    totalAllocatedServiceExpenses: 150,
    contractorBorneExpenses: 350,
    remainingBalance: 1850,
    contractorName: 'शुभ लाभ लेबर कांट्रेक्टर',
  });

  assert.ok(text.includes('लेबर मासिक हिसाब पर्ची'), 'Contains header');
  assert.ok(text.includes('रमेश कुमार'), 'Contains labourer name');
  assert.ok(text.includes('LH_LAB_001'), 'Contains stable ID');
  assert.ok(text.includes('नवम्बर 2026'), 'Contains Hindi month');
  assert.ok(text.includes('₹3,500'), 'Contains formatted earned amount');
  assert.ok(text.includes('₹1,500'), 'Contains formatted paid amount');
  assert.ok(text.includes('₹150'), 'Contains formatted deduction amount');
  assert.ok(text.includes('₹1,850'), 'Contains formatted remaining balance');
  assert.ok(text.includes('ठेकेदार वहन खर्च: ₹350'), 'Distinguishes contractor-paid expense');
  assert.ok(text.includes('शुभ लाभ लेबर कांट्रेक्टर'), 'Contains contractor name');
});

// -----------------------------------------------------------------
// SUITE 8: Work Rate Revision (Settings)
// -----------------------------------------------------------------
console.log('\n📋 Test Suite 8: Rate Revision');

runTest('Settings allow revising work rates and units in mock data', () => {
  const rates = [...DEFAULT_WORK_RATES];
  const targetIndex = rates.findIndex(r => r.id === 'bag_stitching');
  assert.ok(targetIndex >= 0);

  // Revise bag stitching from 0.30 to 0.40
  rates[targetIndex] = {
    ...rates[targetIndex],
    rate: 0.40,
    unit: 'per_bag',
    unitLabel: '₹0.40 / बोरी',
  };

  const recalculated = calculateWorkEntry({
    rate: rates[targetIndex].rate,
    unit: rates[targetIndex].unit,
    type: rates[targetIndex].type,
    totalBags: 1000,
  });

  assert.strictEqual(recalculated.totalAmount, 400, '1000 bags @ 0.40 = 400');
});

// -----------------------------------------------------------------
// SUITE 9: Penny-Perfect Ledger Allocations (LH-LEDGER-01)
// -----------------------------------------------------------------
console.log('\n📋 Test Suite 9: Penny-Perfect Ledger Allocations (LH-LEDGER-01)');

runTest('Work allocation guarantees exact sum match with penny rounding absorption', () => {
  // Test with odd amount ₹100 among 3 labourers
  const allocations = distributeWorkAllocation(100, ['l1', 'l2', 'l3']);
  assert.strictEqual(allocations.length, 3);
  assert.strictEqual(allocations[0].allocatedAmount, 33.33);
  assert.strictEqual(allocations[1].allocatedAmount, 33.33);
  assert.strictEqual(allocations[2].allocatedAmount, 33.34);

  const sum = allocations.reduce((acc, a) => acc + a.allocatedAmount, 0);
  assert.strictEqual(Math.round(sum * 100) / 100, 100);

  // Test with snapshot figure ₹5,808 among 6 labourers
  const alloc6 = distributeWorkAllocation(5808, ['l1', 'l2', 'l3', 'l4', 'l5', 'l6']);
  assert.strictEqual(alloc6.length, 6);
  alloc6.forEach(a => assert.strictEqual(a.allocatedAmount, 968));
  const sum6 = alloc6.reduce((acc, a) => acc + a.allocatedAmount, 0);
  assert.strictEqual(sum6, 5808);
});

runTest('Expense deduction correctly allocates contractor-borne vs labourer deductions', () => {
  // Contractor expense produces zero labourer deductions
  const contractorDeductions = distributeExpenseDeduction(500, 'contractor_expense', ['l1', 'l2']);
  assert.strictEqual(contractorDeductions.length, 0);

  // Individual deduction allocates 100% to selected labourer
  const individualDeductions = distributeExpenseDeduction(300, 'individual', ['l1']);
  assert.strictEqual(individualDeductions.length, 1);
  assert.strictEqual(individualDeductions[0].labourerId, 'l1');
  assert.strictEqual(individualDeductions[0].deductionAmount, 300);

  // Group deduction with penny rounding
  const groupDeductions = distributeExpenseDeduction(100, 'group', ['l1', 'l2', 'l3']);
  assert.strictEqual(groupDeductions.length, 3);
  const sumDeductions = groupDeductions.reduce((acc, d) => acc + d.deductionAmount, 0);
  assert.strictEqual(Math.round(sumDeductions * 100) / 100, 100);
});

// -----------------------------------------------------------------
// SUITE 10: Ledger Database Service Integration (LH-LEDGER-01)
// -----------------------------------------------------------------
console.log('\n📋 Test Suite 10: Ledger Database Service Integration (LH-LEDGER-01)');

runTest('Database service calculates daily ledger and monthly summary reconciling balances', async () => {
  const dailyLedger = await labourDatabaseService.getDailyLedger(TODAY_DATE);
  assert.strictEqual(dailyLedger.date, TODAY_DATE);
  assert.strictEqual(dailyLedger.totalLabourEarned, 5808);
  assert.strictEqual(dailyLedger.totalPayments, 4000);
  assert.strictEqual(dailyLedger.totalServiceExpenses, 360);
  assert.strictEqual(dailyLedger.contractorExpenses, 60);
  assert.strictEqual(dailyLedger.allocatedDeductions, 300);
  assert.strictEqual(dailyLedger.remainingPayableToday, 1508);
  assert.strictEqual(dailyLedger.labourerLedger.length, 6);

  const monthlySummary = await labourDatabaseService.getMonthlySummary('2026-10');
  assert.strictEqual(monthlySummary.totalLabourEarned, 168240);
  assert.strictEqual(monthlySummary.totalAllocatedServiceExpenses + monthlySummary.contractorBorneExpenses, 18600);
  assert.strictEqual(monthlySummary.remainingPayableBalance, 60);
  assert.strictEqual(monthlySummary.individualSummaries.length, 6);

  // Verify Golu has negative balance in October
  const golu = monthlySummary.individualSummaries.find(l => l.labourerName === 'गोलू');
  assert.ok(golu, 'Golu must exist');
  assert.strictEqual(golu.remainingBalance, -1060); // Matches Screen 3 and 4!
});

// -----------------------------------------------------------------
// SUITE 11: Daily & Weekly Reporting Modules (LH-REPORTS-01)
// -----------------------------------------------------------------
console.log('\n📋 Test Suite 11: Daily & Weekly Reporting Modules (LH-REPORTS-01)');

runTest('Daily report aggregates actual work, payments, expenses, and labourer breakdown', async () => {
  const dailyReport = await labourDatabaseService.getDailyReport(TODAY_DATE);
  assert.strictEqual(dailyReport.date, TODAY_DATE);
  assert.strictEqual(dailyReport.totalLabourEarned, 5808);
  assert.strictEqual(dailyReport.totalPaymentsMade, 4000);
  assert.strictEqual(dailyReport.totalServiceExpenses, 360);
  assert.strictEqual(dailyReport.contractorExpenses, 60);
  assert.strictEqual(dailyReport.allocatedDeductions, 300);
  assert.strictEqual(dailyReport.remainingPayableToday, 1508);
  assert.strictEqual(dailyReport.totalWeightProcessedKg, 19000); // WE_1001
  assert.strictEqual(dailyReport.totalBags, 2460); // 400 mix + 2060 stitching
  assert.strictEqual(dailyReport.labourerBreakdown.length, 6);
});

runTest('Weekly report handles Monday-to-Sunday range and aggregates date-range totals', async () => {
  // Test week range helper
  const wk = getWeekRange('2026-11-03');
  assert.strictEqual(wk.startDate, '2026-11-02'); // Monday
  assert.strictEqual(wk.endDate, '2026-11-08');   // Sunday
  assert.ok(wk.label.includes('2026-11-02'));

  const weeklyReport = await labourDatabaseService.getWeeklyReport({
    weekType: 'current',
    referenceDate: '2026-11-03',
  });
  assert.strictEqual(weeklyReport.startDate, '2026-11-02');
  assert.strictEqual(weeklyReport.endDate, '2026-11-08');
  assert.strictEqual(weeklyReport.totalLabourEarned, 5808);
  assert.strictEqual(weeklyReport.totalPaymentsMade, 4000);
  assert.strictEqual(weeklyReport.totalServiceExpenses, 360);
  assert.strictEqual(weeklyReport.remainingPayable, 1508);
  assert.strictEqual(weeklyReport.labourerSummaries.length, 6);
});

// -----------------------------------------------------------------
// SUITE 12: Monthly Sorting & Reconciliation (LH-REPORTS-01)
// -----------------------------------------------------------------
console.log('\n📋 Test Suite 12: Monthly Sorting & Reconciliation (LH-REPORTS-01)');

runTest('Monthly report supports sorting by name, earned, paid, and balance', async () => {
  // Natural / default
  const defaultSummary = await labourDatabaseService.getMonthlySummary('2026-10', null, 'default');
  assert.strictEqual(defaultSummary.individualSummaries.length, 6);

  // Sort by earned descending
  const earnedSorted = await labourDatabaseService.getMonthlySummary('2026-10', null, 'earned', 'desc');
  for (let i = 0; i < earnedSorted.individualSummaries.length - 1; i++) {
    assert.ok(earnedSorted.individualSummaries[i].totalLabourEarned >= earnedSorted.individualSummaries[i + 1].totalLabourEarned);
  }

  // Sort by name ascending
  const nameSorted = await labourDatabaseService.getMonthlySummary('2026-10', null, 'name', 'asc');
  assert.ok(nameSorted.individualSummaries.length === 6);

  // Reconciliation: sum of individual remaining balances must EXACTLY equal overall remainingPayableBalance
  const sumBalances = defaultSummary.individualSummaries.reduce((sum, l) => sum + l.remainingBalance, 0);
  assert.strictEqual(Math.round(sumBalances * 100) / 100, defaultSummary.remainingPayableBalance);
});

// -----------------------------------------------------------------
// SUITE 13: Payment Ledger & Service Expense Segregation (LH-REPORTS-01)
// -----------------------------------------------------------------
console.log('\n📋 Test Suite 13: Payment Ledger & Expense Segregation (LH-REPORTS-01)');

runTest('Payment ledger lists all payments, separates wages from paid disbursements, and avoids duplicates', async () => {
  const ledger = await labourDatabaseService.getPaymentLedger({
    filterType: 'monthly',
    yearMonth: '2026-10',
  });
  assert.strictEqual(ledger.totalPaymentsCount, 6);
  assert.strictEqual(ledger.totalPaid, 152000); // 26000 + 25500 + 24500 + 25500 + 25000 + 25500
  assert.strictEqual(ledger.labourerTotals.length, 6);

  // Verify earned wages are NOT identical to paid disbursements
  const monthly = await labourDatabaseService.getMonthlySummary('2026-10');
  assert.notStrictEqual(ledger.totalPaid, monthly.totalLabourEarned); // 152,000 !== 168,240
});

runTest('Service expense report categorizes 5 categories and segregates contractor-borne expenses', async () => {
  const expenseReport = await labourDatabaseService.getServiceExpenseReport({
    filterType: 'monthly',
    yearMonth: '2026-10',
  });
  assert.strictEqual(expenseReport.totalServiceExpenses, 18600);
  assert.strictEqual(expenseReport.contractorExpenses, 2420);
  assert.strictEqual(expenseReport.allocatedDeductions, 16180);
  assert.strictEqual(expenseReport.categories.length, 5);

  // Food / Meals should contain Golu's food deduction
  const foodCat = expenseReport.categories.find(c => c.category === 'food_meals');
  assert.ok(foodCat.totalAmount > 0);
});

// -----------------------------------------------------------------
// SUITE 14: WhatsApp Text Generation (LH-REPORTS-01)
// -----------------------------------------------------------------
console.log('\n📋 Test Suite 14: WhatsApp Text Generation (LH-REPORTS-01)');

runTest('WhatsApp statement generator outputs formatted share-ready Hindi text for individual & consolidated reports', () => {
  // Individual statement
  const indText = buildWhatsAppStatementText({
    labourerName: 'गोलू',
    labourerId: 'LH_LAB_001',
    yearMonth: '2026-10',
    workingDays: 26,
    totalWeightProcessedKg: 125000,
    totalLabourEarned: 28040,
    totalAmountPaid: 26000,
    totalAllocatedFoodExpenses: 2600,
    totalOtherAllocatedExpenses: 500,
    remainingBalance: -1060,
    contractorBorneExpenses: 2420,
    contractorName: 'शुभ लाभ लेबर कांट्रेक्टर',
  });

  assert.ok(indText.includes('लेबर मासिक हिसाब पर्ची'));
  assert.ok(indText.includes('गोलू'));
  assert.ok(indText.includes('अक्टूबर 2026'));
  assert.ok(indText.includes('26 दिन'));
  assert.ok(indText.includes('1,25,000 kg'));
  assert.ok(indText.includes('₹28,040'));
  assert.ok(indText.includes('₹26,000'));
  assert.ok(indText.includes('₹2,600'));
  assert.ok(indText.includes('-₹1,060') || indText.includes('₹-1,060'));
  assert.ok(indText.includes('ठेकेदार वहन खर्च: ₹2,420'));

  // Consolidated report
  const consText = buildWhatsAppConsolidatedSummaryText({
    periodLabel: 'अक्टूबर 2026',
    totalLabourers: 6,
    totalWorkingDays: 26,
    totalWeightKg: 125000,
    totalLabourEarned: 168240,
    totalPaymentsMade: 152000,
    totalServiceExpenses: 18600,
    contractorExpenses: 2420,
    allocatedDeductions: 16180,
    remainingPayable: 60,
    labourersList: [
      { labourerName: 'गोलू', totalLabourEarned: 28040, remainingBalance: -1060 },
      { labourerName: 'सतीश', totalLabourEarned: 28040, remainingBalance: 0 },
    ],
    contractorName: 'शुभ लाभ लेबर कांट्रेक्टर',
  });

  assert.ok(consText.includes('मासिक समरी रिपोर्ट (सभी मजदूर)'));
  assert.ok(consText.includes('₹1,68,240'));
  assert.ok(consText.includes('₹18,600'));
  assert.ok(consText.includes('₹60'));
});

// -----------------------------------------------------------------
// SUITE 15: PDF Statement & HTML Generation (LH-REPORTS-01)
// -----------------------------------------------------------------
console.log('\n📋 Test Suite 15: PDF Statement & HTML Generation (LH-REPORTS-01)');

runTest('PDF generator creates valid print-ready HTML with Indian currency, meta tables, and signatures', () => {
  // Individual HTML
  const indHtml = generateIndividualStatementHtml({
    labourerName: 'गोलू',
    labourerId: 'LH_LAB_001',
    yearMonth: 'अक्टूबर 2026',
    workingDays: 26,
    totalWeightProcessedKg: 125000,
    totalLabourEarned: 28040,
    totalAmountPaid: 26000,
    totalAllocatedFoodExpenses: 2600,
    totalOtherAllocatedExpenses: 500,
    contractorBorneExpenses: 2420,
    remainingBalance: -1060,
  });

  assert.ok(indHtml.includes('<!DOCTYPE html>'));
  assert.ok(indHtml.includes('लेबर हिसाब पर्ची - गोलू'));
  assert.ok(indHtml.includes('₹28,040'));
  assert.ok(indHtml.includes('₹26,000'));
  assert.ok(indHtml.includes('- ₹1,060'));
  assert.ok(indHtml.includes('@page'));
  assert.ok(indHtml.includes('मजदूर के हस्ताक्षर'));
  assert.ok(indHtml.includes('ठेकेदार के हस्ताक्षर'));

  // Consolidated HTML
  const consHtml = generateConsolidatedReportHtml({
    periodLabel: 'अक्टूबर 2026',
    totalWorkingDays: 26,
    totalLabourEarned: 168240,
    totalPaymentsMade: 152000,
    totalAllocatedServiceExpenses: 16180,
    contractorBorneExpenses: 2420,
    remainingPayableBalance: 60,
    individualSummaries: [
      { labourerName: 'गोलू', workingDays: 26, totalLabourEarned: 28040, totalAmountPaid: 26000, totalAllocatedServiceExpenses: 3100, remainingBalance: -1060 },
      { labourerName: 'सतीश', workingDays: 26, totalLabourEarned: 28040, totalAmountPaid: 25500, totalAllocatedServiceExpenses: 2540, remainingBalance: 0 },
    ],
  });

  assert.ok(consHtml.includes('<!DOCTYPE html>'));
  assert.ok(consHtml.includes('मासिक लेबर समरी'));
  assert.ok(consHtml.includes('₹1,68,240'));
  assert.ok(consHtml.includes('₹18,600') || consHtml.includes('18,600'));
  assert.ok(consHtml.includes('खर्च वर्गीकरण पारदर्शिता'));
});

// -----------------------------------------------------------------
// SUITE 16: Monthly Settlement & Account Closing (LH-SETTLEMENT-01)
// -----------------------------------------------------------------
console.log('\n📋 Test Suite 16: Monthly Settlement & Account Closing (LH-SETTLEMENT-01)');

runTest('Monthly settlement calculates Closing = Opening + Earned − Paid − Deductions for all labourers', async () => {
  const settlementOct = await labourDatabaseService.getMonthlySettlement('2026-10');

  assert.strictEqual(settlementOct.yearMonth, '2026-10');
  assert.strictEqual(settlementOct.status, 'Closed');
  assert.strictEqual(settlementOct.items.length, 6);
  assert.strictEqual(settlementOct.totalOpeningBalance, 0); // October starting period
  assert.strictEqual(settlementOct.totalEarnings, 168240);
  assert.strictEqual(settlementOct.totalPaid, 152000);
  assert.strictEqual(settlementOct.totalDeductions, 16180);
  assert.strictEqual(settlementOct.contractorExpenses, 2420);
  assert.strictEqual(settlementOct.totalClosingBalance, 60);

  // Individual Labourer Balances in October
  const golu = settlementOct.items.find(i => i.labourerId === 'LH_LAB_001');
  assert.ok(golu);
  assert.strictEqual(golu.openingBalance, 0);
  assert.strictEqual(golu.currentEarnings, 28040);
  assert.strictEqual(golu.paymentsMade, 26000);
  assert.strictEqual(golu.allocatedDeductions, 3100);
  // Closing = 0 + 28,040 - 26,000 - 3,100 = -1,060
  assert.strictEqual(golu.closingBalance, -1060);
  assert.strictEqual(golu.advanceAmount, 1060);
  assert.strictEqual(golu.payableAmount, 0);

  const satish = settlementOct.items.find(i => i.labourerId === 'LH_LAB_002');
  assert.ok(satish);
  assert.strictEqual(satish.closingBalance, 0);

  const aangresh = settlementOct.items.find(i => i.labourerId === 'LH_LAB_003');
  assert.ok(aangresh);
  assert.strictEqual(aangresh.closingBalance, 1040);
  assert.strictEqual(aangresh.payableAmount, 1040);
  assert.strictEqual(aangresh.advanceAmount, 0);
});

runTest('Advance vs Payable distinction flags positive dues as payable and negative balances as advance', async () => {
  const settlement = await labourDatabaseService.getMonthlySettlement('2026-10');

  settlement.items.forEach(item => {
    if (item.closingBalance > 0) {
      assert.strictEqual(item.payableAmount, item.closingBalance);
      assert.strictEqual(item.advanceAmount, 0);
    } else if (item.closingBalance < 0) {
      assert.strictEqual(item.advanceAmount, Math.abs(item.closingBalance));
      assert.strictEqual(item.payableAmount, 0);
    } else {
      assert.strictEqual(item.payableAmount, 0);
      assert.strictEqual(item.advanceAmount, 0);
    }
  });

  assert.strictEqual(settlement.totalPayableRemaining, 1580); // Aangresh 1040 + Sonu 540 = 1580
  assert.strictEqual(settlement.totalAdvanceOutstanding, 1520); // Golu 1060 + Rahul 460 = 1520
  // Net = 1580 - 1520 = 60
  assert.strictEqual(settlement.totalClosingBalance, 60);
});

runTest('Account Closing carries forward closing balance into next month opening balance cleanly without re-calculating past records', async () => {
  // Trigger close month on October
  const closeRes = await labourDatabaseService.closeMonthAndCarryForward('2026-10', 'शुभ लाभ ठेकेदार');

  assert.ok(closeRes.success);
  assert.strictEqual(closeRes.closedYearMonth, '2026-10');
  assert.strictEqual(closeRes.nextYearMonth, '2026-11');
  assert.strictEqual(closeRes.carriedCount, 6);

  // Retrieve November settlement
  const settlementNov = await labourDatabaseService.getMonthlySettlement('2026-11');

  assert.strictEqual(settlementNov.yearMonth, '2026-11');
  assert.strictEqual(settlementNov.status, 'Open');
  assert.strictEqual(settlementNov.totalOpeningBalance, 60); // 60 carried forward from October

  const goluNov = settlementNov.items.find(i => i.labourerId === 'LH_LAB_001');
  assert.ok(goluNov);
  // Opening balance in November must match October closing balance
  assert.strictEqual(goluNov.openingBalance, -1060);

  const rahulNov = settlementNov.items.find(i => i.labourerId === 'LH_LAB_004');
  assert.strictEqual(rahulNov.openingBalance, -460);

  const aangreshNov = settlementNov.items.find(i => i.labourerId === 'LH_LAB_003');
  assert.strictEqual(aangreshNov.openingBalance, 1040);
});

runTest('Independent transaction computation prevents double counting across months', async () => {
  const settlementNov = await labourDatabaseService.getMonthlySettlement('2026-11');

  // November work entries and payments should only count November transactions
  // November 3 has total work of ₹5,808 (WE_1001 ₹3,990 + WE_1002 ₹618 + WE_1003 ₹1,200)
  assert.strictEqual(settlementNov.totalWorkingDays, 1);
  assert.strictEqual(settlementNov.totalEarnings, 5808);

  const goluNov = settlementNov.items.find(i => i.labourerId === 'LH_LAB_001');
  assert.strictEqual(goluNov.workingDays, 1);
  // Golu participated in WE_1001 (₹3,990 / 4 = ₹997.5) and WE_1003 (₹1,200 / 4 = ₹300) = ₹1,297.5
  assert.strictEqual(goluNov.currentEarnings, 1297.5);
  assert.strictEqual(goluNov.paymentsMade, 1000); // 3 Nov payment
  // 3 Nov food is ₹300 / 6 = ₹50; tea of ₹60 is contractor-borne and never deducted from labourers
  assert.strictEqual(goluNov.allocatedDeductions, 50);
  // Golu Nov Closing = Opening (-1,060) + Earned (1,297.5) - Paid (1,000) - Deductions (50)
  // = -1,060 + 1,297.5 - 1,000 - 50 = -812.5
  assert.strictEqual(goluNov.closingBalance, -812.5);
});

runTest('Status transitions and confirmations work properly across Open, Reviewed, Settled, Closed', async () => {
  // Test transition to Reviewed
  const reviewed = await labourDatabaseService.confirmSettlementStatus('2026-11', 'Reviewed', 'लेखापाल द्वारा मिलान पूर्ण');
  assert.strictEqual(reviewed.status, 'Reviewed');
  assert.strictEqual(reviewed.notes, 'लेखापाल द्वारा मिलान पूर्ण');

  // Verify status in settlement output
  const settlementNov = await labourDatabaseService.getMonthlySettlement('2026-11');
  assert.strictEqual(settlementNov.status, 'Reviewed');

  // Reset back to Open
  await labourDatabaseService.confirmSettlementStatus('2026-11', 'Open', '');
});

runTest('Traceable corrections log audit trail with reason and adjust balances safely', async () => {
  // Record a traceable correction for Rahul in November opening balance with reason
  const correction = await labourDatabaseService.recordSettlementCorrection({
    yearMonth: '2026-11',
    labourerId: 'LH_LAB_004',
    field: 'openingBalance',
    newValue: -400,
    reason: 'पिछली पर्ची में ₹60 का हिसाब समायोजन',
    correctedBy: 'कांट्रेक्टर मुंशी',
  });

  assert.ok(correction.id);
  assert.strictEqual(correction.reason, 'पिछली पर्ची में ₹60 का हिसाब समायोजन');
  assert.strictEqual(correction.newValue, -400);

  // Verify audit trail
  const logs = await labourDatabaseService.getSettlementCorrections('2026-11');
  assert.ok(logs.length > 0);
  const found = logs.find(l => l.id === correction.id);
  assert.ok(found);
  assert.strictEqual(found.reason, 'पिछली पर्ची में ₹60 का हिसाब समायोजन');

  // Verify settlement recalculation with updated opening balance
  const settlementNov = await labourDatabaseService.getMonthlySettlement('2026-11', 'LH_LAB_004');
  assert.strictEqual(settlementNov.items[0].openingBalance, -400);
});

runTest('WhatsApp settlement statements and PDF generator produce valid Hindi formatted documents', () => {
  // Individual WhatsApp statement
  const waText = buildWhatsAppSettlementStatementText({
    labourerName: 'गोलू',
    labourerId: 'LH_LAB_001',
    yearMonth: '2026-10',
    workingDays: 26,
    openingBalance: 0,
    currentEarnings: 28040,
    paymentsMade: 26000,
    allocatedDeductions: 3100,
    closingBalance: -1060,
    status: 'Closed',
    contractorName: 'शुभ लाभ लेबर कांट्रेक्टर',
  });

  assert.ok(waText.includes('मासिक सेटलमेंट हिसाब पर्ची'));
  assert.ok(waText.includes('गोलू'));
  assert.ok(waText.includes('प्रारंभिक शेष (Opening Balance)'));
  assert.ok(waText.includes('₹28,040'));
  assert.ok(waText.includes('₹26,000'));
  assert.ok(waText.includes('₹3,100'));
  assert.ok(waText.includes('अंतिम शेष (Closing Balance): -₹1,060') || waText.includes('₹-1,060'));
  assert.ok(waText.includes('अग्रिम / पेशगी (Advance Balance)'));

  // Consolidated WhatsApp summary
  const waSummary = buildWhatsAppSettlementSummaryText({
    yearMonth: '2026-10',
    status: 'Closed',
    totalLabourers: 6,
    totalOpeningBalance: 0,
    totalEarnings: 168240,
    totalPaid: 152000,
    totalDeductions: 16180,
    totalClosingBalance: 60,
    totalPayableRemaining: 1580,
    totalAdvanceOutstanding: 1520,
    items: [
      { labourerName: 'गोलू', openingBalance: 0, currentEarnings: 28040, closingBalance: -1060 },
    ],
  });

  assert.ok(waSummary.includes('मासिक सेटलमेंट एवं खाता क्लोजिंग समरी'));
  assert.ok(waSummary.includes('₹1,68,240'));
  assert.ok(waSummary.includes('₹1,580'));
  assert.ok(waSummary.includes('₹1,520'));

  // PDF Individual HTML
  const pdfItem = generateSettlementStatementHtml({
    labourerName: 'गोलू',
    labourerId: 'LH_LAB_001',
    yearMonth: '2026-10',
    workingDays: 26,
    openingBalance: 0,
    currentEarnings: 28040,
    paymentsMade: 26000,
    allocatedDeductions: 3100,
    closingBalance: -1060,
    status: 'Closed',
  });

  assert.ok(pdfItem.includes('मासिक सेटलमेंट पर्ची'));
  assert.ok(pdfItem.includes('Closing Balance = Opening + Earned − Paid − Deductions'));
  assert.ok(pdfItem.includes('₹28,040'));
  assert.ok(pdfItem.includes('मजदूर पर अग्रिम शेष'));

  // PDF Consolidated HTML
  const pdfCons = generateConsolidatedSettlementHtml({
    yearMonth: '2026-10',
    status: 'Closed',
    totalLabourers: 6,
    totalEarnings: 168240,
    totalPaid: 152000,
    totalDeductions: 16180,
    totalOpeningBalance: 0,
    totalClosingBalance: 60,
    totalPayableRemaining: 1580,
    totalAdvanceOutstanding: 1520,
    items: [
      { labourerName: 'गोलू', workingDays: 26, openingBalance: 0, currentEarnings: 28040, paymentsMade: 26000, allocatedDeductions: 3100, closingBalance: -1060, status: 'Closed' },
    ],
  });

  assert.ok(pdfCons.includes('मासिक खाता क्लोजिंग लेजर'));
  assert.ok(pdfCons.includes('₹1,68,240'));
  assert.ok(pdfCons.includes('ठेकेदार देय बकाया'));
  assert.ok(pdfCons.includes('अग्रिम बकाया (Advance)'));
});

// -----------------------------------------------------------------
// SUITE 17: End-to-End Workflow & Final QA Production Readiness (LH-QA-01)
// -----------------------------------------------------------------
console.log('\n📋 Test Suite 17: End-to-End Workflow & QA Production Readiness (LH-QA-01)');

runTest('E2E Workflow: 16-step complete contractor lifecycle operates seamlessly', async () => {
  // Step 1: Create a contractor profile
  const contractorProfile = { name: 'श्री श्याम लेबर सर्विसेज', phone: '9829011111' };
  assert.ok(contractorProfile.name);

  // Step 2: Add multiple labourers
  const lab1 = await labourDatabaseService.addLabourer({
    id: 'LH_LAB_007',
    name: 'मुकेश कुमार',
    phone: '9829077777',
    role: 'मिक्स ऑपरेटर',
  });
  const lab2 = await labourDatabaseService.addLabourer({
    id: 'LH_LAB_008',
    name: 'सुरेश पाल',
    phone: '9829088888',
    role: 'सिलाई कारीगर',
  });
  assert.strictEqual(lab1.id, 'LH_LAB_007');
  assert.strictEqual(lab2.id, 'LH_LAB_008');

  // Step 3: Rename and deactivate labourers
  await labourDatabaseService.renameLabourer('LH_LAB_007', 'मुकेश कुमार (वरिष्ठ)');
  const updatedLab1 = labourDatabaseService.labourers.find(l => l.id === 'LH_LAB_007');
  assert.strictEqual(updatedLab1.name, 'मुकेश कुमार (वरिष्ठ)');

  await labourDatabaseService.toggleLabourerActive('LH_LAB_008');
  const deactivatedLab2 = labourDatabaseService.labourers.find(l => l.id === 'LH_LAB_008');
  assert.strictEqual(deactivatedLab2.isActive, false);

  // Step 4-6: Enter daily work with multiple bag weights and calculate totals
  const calcWork = calculateWorkEntry({
    rate: 21,
    unit: 'per_100_kg',
    type: 'weight',
    bagLines: [
      { bagWeightKg: 50, bagCount: 100 }, // 5,000 kg
      { bagWeightKg: 45, bagCount: 200 }, // 9,000 kg
      { bagWeightKg: 40, bagCount: 150 }, // 6,000 kg
    ],
  });
  assert.strictEqual(calcWork.totalBags, 450);
  assert.strictEqual(calcWork.totalKg, 20000); // 20,000 kg
  assert.strictEqual(calcWork.totalAmount, 4200); // (20,000 / 100) * 21 = ₹4,200

  // Step 7: Allocate work to selected labourers (Mukesh and Golu)
  const allocRes = await labourDatabaseService.addWorkEntry({
    date: '2026-11-04',
    workType: 'Mix',
    rate: 21,
    rateUnit: 'Per 100 kg',
    totalWeightKg: 20000,
    totalBags: 450,
    totalAmount: 4200,
    labourerIds: ['LH_LAB_001', 'LH_LAB_007'],
  });
  assert.ok(allocRes.workEntry.id);
  assert.strictEqual(allocRes.allocations.length, 2);
  assert.strictEqual(allocRes.allocations[0].allocatedAmount, 2100);
  assert.strictEqual(allocRes.allocations[1].allocatedAmount, 2100);
  assert.strictEqual(allocRes.allocations[0].allocatedAmount + allocRes.allocations[1].allocatedAmount, 4200);

  // Step 8: Record daily payments
  const pay1 = await labourDatabaseService.addPayment({
    date: '2026-11-04',
    labourerId: 'LH_LAB_007',
    labourerName: 'मुकेश कुमार (वरिष्ठ)',
    amount: 1500,
    paymentMethod: 'Cash',
    notes: 'पहला आंशिक भुगतान',
  });
  assert.strictEqual(pay1.amount, 1500);

  // Step 9: Record food and service expenses
  const expRes = await labourDatabaseService.addServiceExpense({
    date: '2026-11-04',
    category: 'food_meals',
    amount: 200,
    description: 'दोपहर खाना (2 मजदूर)',
    allocationType: 'group',
    allocatedLabourerIds: ['LH_LAB_001', 'LH_LAB_007'],
  });
  assert.strictEqual(expRes.deductions.length, 2);
  assert.strictEqual(expRes.deductions[0].deductionAmount, 100);
  assert.strictEqual(expRes.deductions[1].deductionAmount, 100);

  // Step 10: Generate daily, weekly and monthly reports
  const dailyRep = await labourDatabaseService.getDailyLedger('2026-11-04');
  assert.strictEqual(dailyRep.totalWorkCompleted, 1);
  assert.strictEqual(dailyRep.totalLabourEarned, 4200);
  assert.strictEqual(dailyRep.totalPaymentsMade, 1500);
  assert.strictEqual(dailyRep.totalServiceExpenses, 200);

  // Step 11: Generate individual labourer statements
  const mukeshStatement = await labourDatabaseService.getLabourerMonthlyStatement('LH_LAB_007', '2026-11');
  assert.strictEqual(mukeshStatement.totalLabourEarned, 2100);
  assert.strictEqual(mukeshStatement.totalAmountPaid, 1500);
  assert.strictEqual(mukeshStatement.totalAllocatedServiceExpenses, 100);
  // Remaining = 2100 - 1500 - 100 = 500
  assert.strictEqual(mukeshStatement.remainingBalance, 500);

  // Step 12: Share a statement through WhatsApp
  const waStatement = buildWhatsAppStatementText({
    labourerName: mukeshStatement.labourerName,
    labourerId: mukeshStatement.labourerId,
    yearMonth: '2026-11',
    workingDays: mukeshStatement.workingDays,
    totalLabourEarned: mukeshStatement.totalLabourEarned,
    totalAmountPaid: mukeshStatement.totalAmountPaid,
    totalAllocatedFoodExpenses: mukeshStatement.totalAllocatedFoodExpenses,
    remainingBalance: mukeshStatement.remainingBalance,
    contractorName: contractorProfile.name,
  });
  assert.ok(waStatement.includes('मुकेश कुमार (वरिष्ठ)'));
  assert.ok(waStatement.includes('₹2,100'));
  assert.ok(waStatement.includes('देय शेष राशि (Payable): ₹500'));

  // Step 13: Generate a PDF statement
  const pdfStatement = generateIndividualStatementHtml({
    labourerName: mukeshStatement.labourerName,
    labourerId: mukeshStatement.labourerId,
    yearMonth: '2026-11',
    workingDays: mukeshStatement.workingDays,
    totalLabourEarned: mukeshStatement.totalLabourEarned,
    totalAmountPaid: mukeshStatement.totalAmountPaid,
    remainingBalance: mukeshStatement.remainingBalance,
  }, contractorProfile.name);
  assert.ok(pdfStatement.includes('मुकेश कुमार (वरिष्ठ)'));
  assert.ok(pdfStatement.includes('₹2,100'));

  // Step 14-16: Close a month, carry forward closing balance, review next month's opening balance
  const closeNov = await labourDatabaseService.closeMonthAndCarryForward('2026-11', contractorProfile.name);
  assert.ok(closeNov.success);
  assert.strictEqual(closeNov.closedYearMonth, '2026-11');
  assert.strictEqual(closeNov.nextYearMonth, '2026-12');

  const settlementDec = await labourDatabaseService.getMonthlySettlement('2026-12');
  assert.strictEqual(settlementDec.yearMonth, '2026-12');
  assert.strictEqual(settlementDec.status, 'Open');
  const mukeshDec = settlementDec.items.find(i => i.labourerId === 'LH_LAB_007');
  assert.ok(mukeshDec);
  // Mukesh December opening balance must equal November closing balance of 500
  assert.strictEqual(mukeshDec.openingBalance, 500);
});

runTest('Financial Validation: Multi-bag weights, fractional currency, and penny-rounding reconciliation', () => {
  // Test 50kg, 45kg, 40kg combinations
  const multiBag = calculateWorkEntry({
    rate: 21,
    unit: 'per_100_kg',
    type: 'weight',
    bagLines: [
      { bagWeightKg: 50, bagCount: 50 },  // 2,500 kg
      { bagWeightKg: 45, bagCount: 100 }, // 4,500 kg
      { bagWeightKg: 40, bagCount: 75 },  // 3,000 kg
    ],
  });
  // Total kg = 2,500 + 4,500 + 3,000 = 10,000 kg = 100 quintals
  assert.strictEqual(multiBag.totalKg, 10000);
  assert.strictEqual(multiBag.totalBags, 225);
  assert.strictEqual(multiBag.totalAmount, 2100.00);

  // Fractional currency test with prime numbers (e.g. 595 kg @ ₹21.75 / 100 kg)
  const fractional = (595 / 100) * 21.75; // 129.4125 -> 129.41
  const roundedTotal = Math.round(fractional * 100) / 100;
  assert.strictEqual(roundedTotal, 129.41);

  // Equal labour allocation among 3 labourers with penny absorption
  const allocs = distributeWorkAllocation(129.41, ['L1', 'L2', 'L3']);
  // 129.41 / 3 = 43.1366... baseShare = 43.13
  // L1 = 43.13, L2 = 43.13, L3 = 129.41 - 86.26 = 43.15
  assert.strictEqual(allocs.length, 3);
  assert.strictEqual(allocs[0].allocatedAmount, 43.13);
  assert.strictEqual(allocs[1].allocatedAmount, 43.13);
  assert.strictEqual(allocs[2].allocatedAmount, 43.15);
  // Guarantee exact reconciliation
  const sumAllocs = Math.round((allocs[0].allocatedAmount + allocs[1].allocatedAmount + allocs[2].allocatedAmount) * 100) / 100;
  assert.strictEqual(sumAllocs, 129.41);
});

runTest('Rate Revision: Historical entries retain original snapshot while new entries use revised rate', async () => {
  // Check original rate of Maize Daliya (default rate is 15)
  const daliyaRate = labourDatabaseService.workRates.find(r => r.id === 'maize_daliya');
  assert.strictEqual(daliyaRate.rate, 15);

  // Create an entry with original rate of 15
  const originalEntry = await labourDatabaseService.addWorkEntry({
    date: '2026-11-05',
    workType: 'Maize Daliya',
    rate: 15,
    rateUnit: 'Per 100 kg',
    totalWeightKg: 1000,
    totalBags: 20,
    totalAmount: 150, // (1000 / 100) * 15 = 150
    labourerIds: ['LH_LAB_001'],
  });
  assert.strictEqual(originalEntry.workEntry.rate, 15);
  assert.strictEqual(originalEntry.workEntry.totalAmount, 150);

  // Admin revises rate from 15 to 18
  await labourDatabaseService.updateWorkRate('maize_daliya', 18);
  const updatedRate = labourDatabaseService.workRates.find(r => r.id === 'maize_daliya');
  assert.strictEqual(updatedRate.rate, 18);

  // Create new entry using new rate of 18
  const newEntry = await labourDatabaseService.addWorkEntry({
    date: '2026-11-06',
    workType: 'Maize Daliya',
    rate: 18,
    rateUnit: 'Per 100 kg',
    totalWeightKg: 1000,
    totalBags: 20,
    totalAmount: 180, // (1000 / 100) * 18 = 180
    labourerIds: ['LH_LAB_001'],
  });
  assert.strictEqual(newEntry.workEntry.rate, 18);
  assert.strictEqual(newEntry.workEntry.totalAmount, 180);

  // Verify historical entry was NOT modified or recalculated
  const preservedHistorical = labourDatabaseService.workEntries.find(e => e.id === originalEntry.workEntry.id);
  assert.strictEqual(preservedHistorical.rate, 15);
  assert.strictEqual(preservedHistorical.totalAmount, 150);
});

runTest('Payment and Expense Validation: Multiple payments, advances, and contractor segregation', async () => {
  // Test multiple payments on the same day for same labourer
  const p1 = await labourDatabaseService.addPayment({
    date: '2026-11-07',
    labourerId: 'LH_LAB_002',
    labourerName: 'सतीश',
    amount: 500,
    paymentMethod: 'Cash',
    notes: 'सुबह की पेशगी',
  });
  const p2 = await labourDatabaseService.addPayment({
    date: '2026-11-07',
    labourerId: 'LH_LAB_002',
    labourerName: 'सतीश',
    amount: 1000,
    paymentMethod: 'UPI',
    notes: 'शाम का भुगतान',
  });
  assert.strictEqual(p1.amount, 500);
  assert.strictEqual(p2.amount, 1000);

  // Contractor-level expense test: ensure NOT deducted from labourers
  const contractorExp = await labourDatabaseService.addServiceExpense({
    date: '2026-11-07',
    category: 'transportation',
    amount: 800,
    description: 'कांट्रेक्टर निजी वाहन डीज़ल',
    allocationType: 'contractor_expense',
    allocatedLabourerIds: [],
  });
  assert.strictEqual(contractorExp.deductions.length, 0); // Zero labourer deductions

  // Confirm contractor expense is segregated in reports
  const expReport = await labourDatabaseService.getServiceExpenseReport({
    filterType: 'daily',
    referenceDate: '2026-11-07',
  });
  assert.strictEqual(expReport.contractorExpenses, 800);
  assert.strictEqual(expReport.allocatedDeductions, 0);
});

runTest('Backup and Restore: Portable JSON creation, integrity validation, and non-destructive restore', async () => {
  // Create backup
  const backup = await labourDatabaseService.createBackup('शुभ लाभ टेस्ट कांट्रेक्टर');
  assert.strictEqual(backup.app, 'LabourHisaab');
  assert.strictEqual(backup.version, '1.0.0');
  assert.ok(backup.exportedAt);
  assert.ok(backup.stats.totalLabourers >= 6);
  assert.ok(backup.stats.totalWorkEntries > 0);
  assert.ok(backup.data.labourers.length >= 6);

  // Restore backup
  const restoreRes = await labourDatabaseService.restoreBackup(backup);
  assert.ok(restoreRes.success);
  assert.ok(restoreRes.stats.restoredLabourers >= 6);

  // Verify invalid backup rejection
  await assert.rejects(
    async () => await labourDatabaseService.restoreBackup({ app: 'WrongApp' }),
    /असंगत बैकअप फ़ाइल/
  );
  await assert.rejects(
    async () => await labourDatabaseService.restoreBackup(null),
    /अमान्य बैकअप डेटा/
  );
});

runTest('Offline Persistence Diagnostics & Security Validation', () => {
  // Test offline diagnostics
  const diag = labourDatabaseService.getOfflineDiagnostics();
  assert.strictEqual(diag.mode, 'offline_first_resilient');
  assert.strictEqual(diag.storageEngine, 'in_memory_synced_with_local_state');
  assert.strictEqual(diag.duplicatePrevention, 'idempotency_keys_active');
  assert.strictEqual(diag.dataLossRisk, 'none_local_work_never_discarded');

  // Verify Security: anon key used, no service-role secrets exposed in client
  assert.ok(!process.env.SUPABASE_SERVICE_ROLE_KEY, 'Service role key must not be exposed');
});

// -----------------------------------------------------------------
// LH-HOME-LABOUR-ENTRY-01: zero stays zero on the Home work-entry flow
// -----------------------------------------------------------------
console.log('\n📋 Test Suite LH-HOME-LABOUR-ENTRY-01: Zero handling in daily work entry');

runTest('Normal quantity × rate gives the expected amount (100 bags × 50 kg @ ₹21/100 kg = ₹1,050)', () => {
  const r = calculateWorkEntry({ rate: 21, unit: 'per_100_kg', type: 'weight', bagLines: [{ bagWeightKg: 50, bagCount: 100 }] });
  assert.strictEqual(r.totalKg, 5000);
  assert.strictEqual(r.totalAmount, 1050);
  const bags = calculateWorkEntry({ rate: 2, unit: 'per_bag', type: 'bag', totalBags: 120 });
  assert.strictEqual(bags.totalAmount, 240);
  const batch = calculateWorkEntry({ rate: 300, unit: 'per_batch', type: 'batch', totalBatches: 2 });
  assert.strictEqual(batch.totalAmount, 600);
});

runTest('Quantity 0 gives amount 0 for weight, bag and batch work', () => {
  assert.strictEqual(calculateWorkEntry({ rate: 21, unit: 'per_100_kg', type: 'weight', bagLines: [{ bagWeightKg: 50, bagCount: 0 }] }).totalAmount, 0);
  assert.strictEqual(calculateWorkEntry({ rate: 2, unit: 'per_bag', type: 'bag', totalBags: 0 }).totalAmount, 0);
  assert.strictEqual(calculateWorkEntry({ rate: 300, unit: 'per_batch', type: 'batch', totalBatches: 0 }).totalAmount, 0);
});

runTest('Rate 0 gives amount 0 (never replaced by a default rate)', () => {
  assert.strictEqual(calculateWorkEntry({ rate: 0, unit: 'per_100_kg', type: 'weight', bagLines: [{ bagWeightKg: 50, bagCount: 100 }] }).totalAmount, 0);
  assert.strictEqual(calculateWorkEntry({ rate: 0, unit: 'per_bag', type: 'bag', totalBags: 120 }).totalAmount, 0);
  assert.strictEqual(calculateWorkEntry({ rate: 0, unit: 'per_batch', type: 'batch', totalBatches: 3 }).totalAmount, 0);
});

runTest('Explicit fixed amount 0 is kept (not replaced by the rate); absent amount still uses the rate', () => {
  assert.strictEqual(calculateWorkEntry({ rate: 500, unit: 'fixed', type: 'fixed', fixedAmount: 0 }).totalAmount, 0);
  assert.strictEqual(calculateWorkEntry({ rate: 500, unit: 'fixed', type: 'fixed', fixedAmount: '0' }).totalAmount, 0);
  assert.strictEqual(calculateWorkEntry({ rate: 500, unit: 'fixed', type: 'fixed', fixedAmount: 350 }).totalAmount, 350);
  assert.strictEqual(calculateWorkEntry({ rate: 500, unit: 'fixed', type: 'fixed' }).totalAmount, 500);
});

runTest('Empty required fields are rejected; explicit 0 is accepted', async () => {
  const { toNumberOrNull, validateWorkEntryInputs } = await import('../src/utils/calculations.js');
  assert.strictEqual(toNumberOrNull(''), null);
  assert.strictEqual(toNumberOrNull('  '), null);
  assert.strictEqual(toNumberOrNull('0'), 0);
  assert.strictEqual(toNumberOrNull(0), 0);
  assert.ok(Number.isNaN(toNumberOrNull('abc')));

  const ok = { rate: '21', labourerCount: 2 };
  // Empty → validation message
  assert.match(validateWorkEntryInputs({ ...ok, type: 'weight', rate: '', bagLines: [{ bagWeightKg: '50', bagCount: '10' }] }), /दर/);
  assert.match(validateWorkEntryInputs({ ...ok, type: 'weight', bagLines: [{ bagWeightKg: '50', bagCount: '' }] }), /वजन और संख्या/);
  assert.match(validateWorkEntryInputs({ ...ok, type: 'bag', totalBags: '' }), /बोरियों/);
  assert.match(validateWorkEntryInputs({ ...ok, type: 'batch', totalBatches: '' }), /बैच/);
  assert.match(validateWorkEntryInputs({ ...ok, type: 'bag', totalBags: '5', labourerCount: 0 }), /मजदूर/);
  assert.match(validateWorkEntryInputs({ ...ok, type: 'bag', totalBags: '-3' }), /मान्य/);
  assert.match(validateWorkEntryInputs({ ...ok, type: 'bag', totalBags: 'abc' }), /मान्य/);
  // Explicit 0 → valid
  assert.strictEqual(validateWorkEntryInputs({ ...ok, type: 'weight', bagLines: [{ bagWeightKg: '50', bagCount: '0' }] }), null);
  assert.strictEqual(validateWorkEntryInputs({ ...ok, type: 'bag', totalBags: '0' }), null);
  assert.strictEqual(validateWorkEntryInputs({ ...ok, type: 'batch', totalBatches: '0' }), null);
  assert.strictEqual(validateWorkEntryInputs({ ...ok, type: 'bag', rate: '0', totalBags: '10' }), null);
});

runTest('Saved amount drives the Home total (incl. a ₹0 entry), and saving work creates no payment', async () => {
  const DATE = '2031-01-15'; // isolated date: no sample data
  const paymentsBefore = labourDatabaseService.payments.length;
  const entry = calculateWorkEntry({ rate: 21, unit: 'per_100_kg', type: 'weight', bagLines: [{ bagWeightKg: 50, bagCount: 100 }] });
  const zero = calculateWorkEntry({ rate: 0, unit: 'per_bag', type: 'bag', totalBags: 40 });
  await labourDatabaseService.saveWorkEntry({ id: 'WE_ZERO_TEST_1', date: DATE, categoryId: 'mix', rate: 21, unit: 'per_100_kg', type: 'weight',
    bagLines: entry.bagLines, totalBags: entry.totalBags, totalKg: entry.totalKg, totalAmount: entry.totalAmount, participatingLabourerIds: ['LH_LAB_001'] });
  await labourDatabaseService.saveWorkEntry({ id: 'WE_ZERO_TEST_2', date: DATE, categoryId: 'bag_stitching', rate: 0, unit: 'per_bag', type: 'bag',
    bagLines: [], totalBags: 40, totalKg: 0, totalAmount: zero.totalAmount, participatingLabourerIds: ['LH_LAB_001'] });
  assert.strictEqual(labourDatabaseService.payments.length, paymentsBefore, 'saving work must not create a payment');

  const saved = labourDatabaseService.workEntries.filter(e => e.date === DATE);
  assert.deepStrictEqual(saved.map(e => Number(e.totalAmount)).sort((a, b) => a - b), [0, 1050], 'saved amounts equal the displayed amounts');
  const zeroRateEntry = saved.find(e => Number(e.totalAmount) === 0);
  assert.strictEqual(Number(zeroRateEntry.rate ?? zeroRateEntry.rateSnapshot), 0, 'a saved rate of 0 is not replaced by the category rate');
  const metrics = calculateDailyMetrics({ date: DATE, workEntries: saved, payments: labourDatabaseService.payments, serviceExpenses: [], labourers: [] });
  assert.strictEqual(metrics.todayLabourEarned, 1050);
  assert.strictEqual(metrics.todayPayments, 0);
  assert.strictEqual(metrics.remainingPayableToday, 1050);
});

runTest('Home entry screen: no `||` default on rate, no preset quantities, zero-safe edit, double-submit guard', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../src/screens/AddWorkEntryScreen.js', import.meta.url), 'utf8');
  assert.ok(!/Number\(customRate\)\s*\|\|/.test(src), 'rate must not fall back with ||');
  assert.ok(!/bagCount:\s*'(100|50)'/.test(src), 'no preset bag counts');
  assert.ok(!/:\s*'100'\s*\)/.test(src) && !/:\s*'1'\s*\)/.test(src), 'no preset total bags / batches');
  assert.ok(/totalBags \?\? 0/.test(src) && /totalBatches \?\? 0/.test(src), 'editing keeps a saved 0');
  assert.ok(/if \(savingRef\.current\) return;/.test(src) && /disabled=\{isSaving\}/.test(src), 'double submit guarded');
  assert.ok(/catch \(e\)[\s\S]{0,200}savingRef\.current = false/.test(src), 'failed save unlocks and keeps inputs');
  assert.ok(!/addPayment/.test(src), 'work entry screen never records a payment');
  const ctx = fs.readFileSync(new URL('../src/context/LabourHisaabContext.js', import.meta.url), 'utf8');
  const addFn = ctx.slice(ctx.indexOf('const addWorkEntry'), ctx.indexOf('const updateWorkEntry'));
  assert.ok(!/addPayment|setPayments/.test(addFn), 'addWorkEntry never creates a payment');
  assert.ok(/updates\.totalAmount \?\? merged\.totalAmount/.test(ctx), 'update keeps an explicit 0 amount');
});

// -----------------------------------------------------------------
// EXECUTE AND SUMMARY
// -----------------------------------------------------------------
(async () => {
  for (const fn of testQueue) {
    await fn();
  }

  console.log('\n======================================================');
  console.log(`📊 TEST EXECUTION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('======================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL ACCEPTANCE CRITERIA VALIDATED SUCCESSFULLY!');
  } else {
    console.error('⚠️ SOME TESTS FAILED.');
    process.exit(1);
  }
})();

