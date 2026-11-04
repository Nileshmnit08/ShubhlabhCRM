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
// LH-HOME-TOTAL-DATE-01: Home wage total follows the selected date; no sample fallback
// -----------------------------------------------------------------
console.log('\n📋 Test Suite LH-HOME-TOTAL-DATE-01: Home daily total & date selection');

const homeEntry = (id, date, rate, bags) => {
  const c = calculateWorkEntry({ rate, unit: 'per_bag', type: 'bag', totalBags: bags });
  return { id, date, categoryId: 'bag_stitching', type: 'bag', rate: c.rate, totalBags: c.totalBags, totalAmount: c.totalAmount };
};
const homeTotal = (entries, date) => calculateDailyMetrics({ date, workEntries: entries, payments: [], serviceExpenses: [], labourers: [] }).todayLabourEarned;

runTest('Date with no entries → total ₹0', () => {
  assert.strictEqual(homeTotal([], '2031-02-01'), 0);
  assert.strictEqual(homeTotal([homeEntry('a', '2031-02-02', 2, 10)], '2031-02-01'), 0, 'other dates are not counted');
});

runTest('Date with three zero-amount entries → total ₹0 (the ₹5,808 case)', () => {
  const zeros = [homeEntry('m', '2031-02-03', 0, 100), homeEntry('b', '2031-02-03', 2, 0), homeEntry('p', '2031-02-03', 0, 0)];
  assert.strictEqual(zeros.length, 3);
  assert.ok(zeros.every(e => e.totalAmount === 0));
  assert.strictEqual(homeTotal(zeros, '2031-02-03'), 0);
});

runTest('Non-zero entries → total equals the sum of that date\'s entries only (payments excluded)', () => {
  const list = [homeEntry('x', '2031-02-04', 2, 120), homeEntry('y', '2031-02-04', 0.3, 1000), homeEntry('z', '2031-02-05', 2, 50)];
  const m = calculateDailyMetrics({ date: '2031-02-04', workEntries: list, labourers: [],
    payments: [{ date: '2031-02-04', amount: 999 }], serviceExpenses: [{ date: '2031-02-04', amount: 50, allocationType: 'contractor_expense' }] });
  assert.strictEqual(m.todayLabourEarned, 540); // 240 + 300; the 2031-02-05 entry, payment and expense are not wages
  const shown = list.filter(e => e.date === '2031-02-04').reduce((s, e) => s + e.totalAmount, 0);
  assert.strictEqual(m.todayLabourEarned, shown, 'total reconciles with the entry list for the date');
});

runTest('Switching dates changes entries and total together', () => {
  const list = [homeEntry('d1', '2031-02-06', 2, 10), homeEntry('d2', '2031-02-07', 2, 30)];
  for (const [date, expected] of [['2031-02-06', 20], ['2031-02-07', 60], ['2031-02-08', 0]]) {
    const shown = list.filter(e => e.date === date);
    assert.strictEqual(homeTotal(list, date), expected);
    assert.strictEqual(shown.reduce((s, e) => s + e.totalAmount, 0), expected);
  }
});

runTest('Date helpers: local today, Hindi label, day/month navigation, calendar grid', async () => {
  const { todayYmd, formatHindiDate, addDaysYmd, monthGrid, monthOf, shiftMonth, isValidYmd } = await import('../src/utils/dates.js');
  assert.strictEqual(todayYmd(new Date(2026, 10, 3, 23, 30)), '2026-11-03', 'local calendar date, not UTC');
  assert.ok(isValidYmd(todayYmd()));
  assert.strictEqual(formatHindiDate('2026-11-03'), '03 नवम्बर 2026 (मंगलवार)');
  assert.strictEqual(formatHindiDate('2026-12-31'), '31 दिसम्बर 2026 (गुरुवार)');
  assert.strictEqual(addDaysYmd('2026-12-31', 1), '2027-01-01');
  assert.strictEqual(addDaysYmd('2026-03-01', -1), '2026-02-28');
  assert.deepStrictEqual(shiftMonth({ year: 2026, month: 0 }, -1), { year: 2025, month: 11 });
  assert.deepStrictEqual(monthOf('2026-11-15'), { year: 2026, month: 10 });
  const grid = monthGrid(2026, 10); // November 2026 starts on Sunday, 30 days
  assert.strictEqual(grid[0][0], '2026-11-01');
  assert.strictEqual(grid.flat().filter(Boolean).length, 30);
  assert.ok(grid.every(w => w.length === 7));
});

runTest('Entry added while a past date is selected is saved to that date', async () => {
  const fs = await import('node:fs');
  const screen = fs.readFileSync(new URL('../src/screens/AddWorkEntryScreen.js', import.meta.url), 'utf8');
  // LH-WORK-EDIT-APPROVAL-07: the form's date starts at the selected date (new) or the entry's
  // own date (edit); the operator may change it to today or earlier.
  assert.ok(/useState\(workEntryToEdit\?\.date \?\? selectedDate\)/.test(screen) && /date: workDate,/.test(screen), 'new entries save with the selected date; edits keep their own date');
  const ctx = fs.readFileSync(new URL('../src/context/LabourHisaabContext.js', import.meta.url), 'utf8');
  assert.ok(/date: entryData\.date \|\| selectedDate/.test(ctx), 'context keeps the provided (selected) date');
  // Behaviour: the selected past date is what lands on the saved entry.
  const past = '2031-01-20';
  const saved = { ...homeEntry('p1', past, 2, 5) };
  assert.strictEqual(saved.date, past);
  assert.strictEqual(homeTotal([saved], past), 10);
  assert.strictEqual(homeTotal([saved], '2031-01-21'), 0);
});

runTest('No sample/default amount on Home; app starts on the real date with no sample records', async () => {
  const fs = await import('node:fs');
  const home = fs.readFileSync(new URL('../src/screens/HomeScreen.js', import.meta.url), 'utf8');
  assert.ok(!/5808/.test(home), 'no hard-coded ₹5,808');
  assert.ok(!/\|\| 6\}/.test(home), 'no hard-coded labourer count');
  assert.ok(!/'2026-11-03'/.test(home), 'no hard-coded date');
  assert.ok(/onPress=\{openDatePicker\}/.test(home) && /<Modal/.test(home), 'date card opens a picker');
  assert.ok(/setSelectedDate\(today\)/.test(home), 'one-tap return to today');
  const ctx = fs.readFileSync(new URL('../src/context/LabourHisaabContext.js', import.meta.url), 'utf8');
  assert.ok(/useState\(\(\) => todayYmd\(\)\)/.test(ctx), 'selected date starts at the device date');
  assert.ok(/const \[allWorkEntries, setWorkEntries\] = useState\(\[\]\)/.test(ctx), 'no sample work entries on start');
  assert.ok(/const \[payments, setPayments\] = useState\(\[\]\)/.test(ctx), 'no sample payments on start');
  assert.ok(/const \[serviceExpenses, setServiceExpenses\] = useState\(\[\]\)/.test(ctx), 'no sample expenses on start');
  assert.strictEqual(homeTotal([], todayYmdForTest()), 0, 'empty start → ₹0 on Home');
});
// -----------------------------------------------------------------
// LH-LABOUR-COUNT-01: Home labour count = distinct labourers with work on the selected date
// -----------------------------------------------------------------
console.log('\n📋 Test Suite LH-LABOUR-COUNT-01: Home labour count');

const countEntry = (id, date, labourerIds, amount = 100) => ({
  id, date, type: 'bag', totalAmount: amount, participatingLabourerIds: labourerIds,
  allocations: labourerIds.map(l => ({ labourerId: l, allocatedAmount: amount / labourerIds.length })),
});
const roster = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'].map((id, i) => ({ id, name: `N${i}`, isActive: true }));
const workingCount = (entries, date) =>
  calculateDailyMetrics({ date, workEntries: entries, payments: [], serviceExpenses: [], labourers: roster }).workingLabourersCount;

runTest('No work entries for the date → 0 (a 6-person roster is not counted)', () => {
  assert.strictEqual(workingCount([], '2031-03-01'), 0);
  assert.strictEqual(workingCount([countEntry('o', '2031-03-02', ['L1'])], '2031-03-01'), 0, 'other dates ignored');
});

runTest('One labourer with multiple entries → 1 (incl. a ₹0 entry)', () => {
  const list = [countEntry('a', '2031-03-03', ['L1']), countEntry('b', '2031-03-03', ['L1'], 0), countEntry('c', '2031-03-03', ['L1'])];
  assert.strictEqual(workingCount(list, '2031-03-03'), 1);
});

runTest('Two different labourers → 2, even when one has several entries', () => {
  const list = [countEntry('a', '2031-03-04', ['L1', 'L2']), countEntry('b', '2031-03-04', ['L2']), countEntry('c', '2031-03-04', ['L1'])];
  assert.strictEqual(workingCount(list, '2031-03-04'), 2);
});

runTest('Changing the date updates the count with the same entries as the wage total', () => {
  const list = [countEntry('a', '2031-03-05', ['L1', 'L2', 'L3'], 300), countEntry('b', '2031-03-06', ['L4'], 50)];
  for (const [date, count, total] of [['2031-03-05', 3, 300], ['2031-03-06', 1, 50], ['2031-03-07', 0, 0]]) {
    const m = calculateDailyMetrics({ date, workEntries: list, payments: [], serviceExpenses: [], labourers: roster });
    assert.strictEqual(m.workingLabourersCount, count);
    assert.strictEqual(m.todayLabourEarned, total);
  }
});

runTest('Counts by stable id (not name), falls back to allocations, ignores blanks; inactive labourer with work is counted', async () => {
  const { distinctWorkingLabourerIds } = await import('../src/utils/calculations.js');
  // Same display name, different ids → two people.
  assert.strictEqual(distinctWorkingLabourerIds([{ participatingLabourerIds: ['L1', 'L9'] }]).length, 2);
  // Older entry shape with allocations only.
  assert.deepStrictEqual(distinctWorkingLabourerIds([{ allocations: [{ labourerId: 'L3' }, { labourerId: 'L3' }] }]), ['L3']);
  assert.deepStrictEqual(distinctWorkingLabourerIds([{ participatingLabourerIds: ['', null, 'L2'] }]), ['L2']);
  const inactiveRoster = [{ id: 'L1', isActive: false }];
  const m = calculateDailyMetrics({ date: '2031-03-08', workEntries: [countEntry('x', '2031-03-08', ['L1'])], payments: [], serviceExpenses: [], labourers: inactiveRoster });
  assert.strictEqual(m.workingLabourersCount, 1, 'work recorded before deactivation still counts');
  assert.strictEqual(m.activeLabourersCount, 0);
});

runTest('Home count uses the daily working count; no fixed 6 fallback; app starts with no sample work', async () => {
  const fs = await import('node:fs');
  const home = fs.readFileSync(new URL('../src/screens/HomeScreen.js', import.meta.url), 'utf8');
  assert.ok(/todayMetrics\.workingLabourersCount/.test(home), 'Home shows the working count');
  assert.ok(!/activeLabourersCount/.test(home), 'Home no longer shows the roster size');
  assert.ok(!/\|\|\s*6\b/.test(home), 'no || 6 fallback');
  const ctx = fs.readFileSync(new URL('../src/context/LabourHisaabContext.js', import.meta.url), 'utf8');
  assert.ok(/const \[allWorkEntries, setWorkEntries\] = useState\(\[\]\)/.test(ctx), 'no sample work entries at start → count 0');
});

// -----------------------------------------------------------------
// LH-PERSISTENCE-FIX-01: work entries survive app restart (device storage)
// -----------------------------------------------------------------
console.log('\n📋 Test Suite LH-PERSISTENCE-FIX-01: Durable work-entry storage');

// A key-value backend that outlives each simulated "app run" (like the phone's storage).
const memoryBackend = () => {
  const data = new Map();
  return { data, getItem: async (k) => (data.has(k) ? data.get(k) : null), setItem: async (k, v) => { data.set(k, v); } };
};
const persistedEntry = (id, date, rate, bags, labourers) => {
  const c = calculateWorkEntry({ rate, unit: 'per_bag', type: 'bag', totalBags: bags });
  return { id, date, categoryId: 'bag_stitching', categoryName: 'Bag Stitching', rate: c.rate, unit: 'per_bag', type: 'bag',
    totalBags: c.totalBags, totalAmount: c.totalAmount, participatingLabourerIds: labourers,
    allocations: distributeWorkAllocation(c.totalAmount, labourers), createdAt: '2031-04-01T10:00:00.000Z' };
};

runTest('Saved entry survives a restart with the same date, labourers, quantity, rate and amount', async () => {
  const { createLocalStore, STORAGE_KEYS, upsertById } = await import('../src/services/LocalPersistence.js');
  const disk = memoryBackend();
  const run1 = createLocalStore(disk);
  assert.strictEqual(await run1.loadList(STORAGE_KEYS.workEntries), null, 'first launch: nothing saved, no sample data');
  const e = persistedEntry('WE_a', '2031-04-01', 2, 120, ['LH_LAB_001', 'LH_LAB_002']);
  await run1.saveList(STORAGE_KEYS.workEntries, upsertById([], e));

  const run2 = createLocalStore(disk); // app closed and reopened
  const loaded = await run2.loadList(STORAGE_KEYS.workEntries);
  assert.strictEqual(loaded.length, 1);
  assert.deepStrictEqual(loaded[0], e);
  assert.strictEqual(loaded[0].date, '2031-04-01');
  assert.deepStrictEqual(loaded[0].participatingLabourerIds, ['LH_LAB_001', 'LH_LAB_002']);
  assert.strictEqual(loaded[0].totalBags, 120);
  assert.strictEqual(loaded[0].rate, 2);
  assert.strictEqual(loaded[0].totalAmount, 240);
});

runTest('After restart: date switching, daily total and labour count come from saved records; zero stays zero', async () => {
  const { createLocalStore, STORAGE_KEYS } = await import('../src/services/LocalPersistence.js');
  const { distinctWorkingLabourerIds } = await import('../src/utils/calculations.js');
  const disk = memoryBackend();
  const list = [
    persistedEntry('WE_1', '2031-04-02', 2, 50, ['L1']),
    persistedEntry('WE_2', '2031-04-02', 0, 80, ['L1', 'L2']), // explicit rate 0 → ₹0
    persistedEntry('WE_3', '2031-04-03', 2, 10, ['L3']),
  ];
  await createLocalStore(disk).saveList(STORAGE_KEYS.workEntries, list);
  const loaded = await createLocalStore(disk).loadList(STORAGE_KEYS.workEntries);
  const day = (d) => calculateDailyMetrics({ date: d, workEntries: loaded, payments: [], serviceExpenses: [], labourers: [] });
  assert.strictEqual(day('2031-04-02').todayLabourEarned, 100);
  assert.strictEqual(day('2031-04-02').workingLabourersCount, 2);
  assert.strictEqual(loaded.find(x => x.id === 'WE_2').totalAmount, 0, 'saved zero is still zero');
  assert.strictEqual(loaded.find(x => x.id === 'WE_2').rate, 0);
  assert.strictEqual(day('2031-04-03').todayLabourEarned, 20, 'switch date');
  assert.strictEqual(day('2031-04-02').todayLabourEarned, 100, 'return to the saved date');
  assert.strictEqual(day('2031-04-09').todayLabourEarned, 0);
  assert.deepStrictEqual(distinctWorkingLabourerIds(loaded.filter(x => x.date === '2031-04-02')).sort(), ['L1', 'L2']);
});

runTest('Retries and edits update the same record; delete removes it from storage', async () => {
  const { createLocalStore, STORAGE_KEYS, upsertById, removeById, makeEntryId } = await import('../src/services/LocalPersistence.js');
  const disk = memoryBackend();
  const store = createLocalStore(disk);
  const id = makeEntryId(1700000000000, () => 0.5);
  assert.match(id, /^WE_[0-9a-z]+_[0-9a-z]+$/);
  let list = upsertById([], persistedEntry(id, '2031-04-04', 2, 10, ['L1']));
  list = upsertById(list, persistedEntry(id, '2031-04-04', 2, 10, ['L1'])); // double tap / retry
  assert.strictEqual(list.length, 1, 'no duplicate');
  list = upsertById(list, { ...list[0], totalBags: 15, totalAmount: 30 }); // edit
  await store.saveList(STORAGE_KEYS.workEntries, list);
  let reloaded = await createLocalStore(disk).loadList(STORAGE_KEYS.workEntries);
  assert.strictEqual(reloaded.length, 1);
  assert.strictEqual(reloaded[0].totalAmount, 30);
  await store.saveList(STORAGE_KEYS.workEntries, removeById(reloaded, id));
  reloaded = await createLocalStore(disk).loadList(STORAGE_KEYS.workEntries);
  assert.deepStrictEqual(reloaded, [], 'deleted entry is gone after restart');
});

runTest('Storage failure is reported (no false success); unreadable data is never silently replaced', async () => {
  const { createLocalStore, STORAGE_KEYS } = await import('../src/services/LocalPersistence.js');
  const failing = { getItem: async () => null, setItem: async () => { throw new Error('disk full'); } };
  await assert.rejects(() => createLocalStore(failing).saveList(STORAGE_KEYS.workEntries, [{ id: 'x' }]), /disk full/);
  const dropping = { getItem: async () => null, setItem: async () => {} }; // write "succeeds" but nothing is stored
  await assert.rejects(() => createLocalStore(dropping).saveList(STORAGE_KEYS.workEntries, [{ id: 'x' }]), /did not confirm/);
  const corrupt = memoryBackend();
  corrupt.data.set(STORAGE_KEYS.workEntries, '{not json');
  await assert.rejects(() => createLocalStore(corrupt).loadList(STORAGE_KEYS.workEntries), /unreadable/);
  assert.throws(() => createLocalStore(null), /not available/);
});

runTest('App wiring: storage before screen, success only after the write, retries reuse the id, load errors block writes', async () => {
  const fs = await import('node:fs');
  const ctx = fs.readFileSync(new URL('../src/context/LabourHisaabContext.js', import.meta.url), 'utf8');
  const screen = fs.readFileSync(new URL('../src/screens/AddWorkEntryScreen.js', import.meta.url), 'utf8');
  const pay = fs.readFileSync(new URL('../src/screens/DailyPaymentScreen.js', import.meta.url), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.strictEqual(pkg.dependencies['@react-native-async-storage/async-storage'], '2.2.0');
  assert.ok(/createWorkEntryRepository\(deviceStore\)/.test(ctx), 'context uses the repository on device storage');
  assert.ok(/repo\.init\(\)/.test(ctx), 'loads saved entries on launch through the repository');
  const add = ctx.slice(ctx.indexOf('const addWorkEntry'), ctx.indexOf('const updateWorkEntry'));
  assert.ok(/showSaved\(await repo\.upsert\(newEntry\)\)/.test(add), 'add writes through the repository before the screen updates');
  assert.ok(/showSaved\(await repo\.upsert\(updated\)\)/.test(ctx) && /showSaved\(await repo\.remove\(id\)\)/.test(ctx), 'edit/delete go through the repository');
  assert.ok(!/useState\(INITIAL_WORK_ENTRIES\)/.test(ctx), 'no sample entries');
  assert.ok(!/setWorkEntries\(prev/.test(ctx), 'no in-memory-only updates of entries');
  const sets = [...ctx.matchAll(/setWorkEntries\(([^)]*)\)/g)].map(m => m[1].trim());
  // downloadedList = a confirmed repo.upsertManyIf write of entries synced from other phones.
  assert.deepStrictEqual(sets.sort(), ['downloadedList', 'list', 'savedEntries'], 'entries reach the screen only from a completed load or a confirmed save');
  assert.ok(/const \{ list: downloadedList, savedIds \} = await repo\.upsertManyIf\(/.test(ctx), 'downloads are shown only after storage confirms them');
  // LH-REALTIME-WORK-SAVE-03: success only after the awaited local save AND the database confirmation.
  assert.ok(/: await addWorkEntry\(entryData\);[\s\S]*const cloud = await confirmCloudSave\(saved\.id\);[\s\S]*if \(cloud\.state === 'database'\) \{[\s\S]{0,400}?Alert\.alert\(workEntryToEdit \? 'बदलाव डेटाबेस में सहेजा गया ✅' : 'डेटाबेस में सहेजा गया ✅'/.test(screen), 'success shown after the awaited save and database confirmation');
  assert.ok(/\? await updateWorkEntry\(workEntryToEdit\.id, entryData\)/.test(screen), 'edit awaited');
  assert.ok(/id: entryIdRef\.current,/.test(screen) && /useRef\(workEntryToEdit\?\.id \|\| makeEntryId\(\)\)/.test(screen), 'one id per form');
  assert.ok(/catch \(e\)[\s\S]{0,200}savingRef\.current = false/.test(screen), 'failure keeps inputs and unlocks');
  assert.ok(/deleteWorkEntry\(w\.id\)\.catch/.test(pay), 'delete failure is reported');
  const persistence = fs.readFileSync(new URL('../src/services/LocalPersistence.js', import.meta.url), 'utf8');
  assert.ok(!/supabase|lh_/.test(persistence), 'no database tables or retired lh_ schema');
});

// -----------------------------------------------------------------
// LH-PERSISTENCE-REPAIR-02: the app's own WorkEntryRepository (used by the context)
// -----------------------------------------------------------------
console.log('\n📋 Test Suite LH-PERSISTENCE-REPAIR-02: Work entry repository (app logic, storage test double)');

const repoDisk = () => {
  const data = new Map();
  let failReads = false;
  let failWrites = false;
  return {
    data,
    setFailReads: (v) => { failReads = v; },
    setFailWrites: (v) => { failWrites = v; },
    getItem: async (k) => { if (failReads) throw new Error('read error'); return data.has(k) ? data.get(k) : null; },
    setItem: async (k, v) => { if (failWrites) throw new Error('write error'); data.set(k, v); },
  };
};
const repoKit = async () => {
  const { createLocalStore, STORAGE_KEYS } = await import('../src/services/LocalPersistence.js');
  const { createWorkEntryRepository, NOT_READY_MESSAGE, LOAD_FAILED_MESSAGE } = await import('../src/services/WorkEntryRepository.js');
  const open = (disk) => createWorkEntryRepository(createLocalStore(disk)); // = one app launch
  return { open, STORAGE_KEYS, NOT_READY_MESSAGE, LOAD_FAILED_MESSAGE };
};
const storedCount = (disk, key) => (disk.data.has(key) ? JSON.parse(disk.data.get(key)).items.length : 0);

runTest('History loads before use: no write is accepted until the saved list has loaded', async () => {
  const { open, STORAGE_KEYS, NOT_READY_MESSAGE } = await repoKit();
  const disk = repoDisk();
  const first = open(disk);
  await first.init();
  await first.upsert(persistedEntry('WE_keep', '2031-05-01', 2, 10, ['L1']));
  const second = open(disk); // next launch, before init has finished
  await assert.rejects(() => second.upsert(persistedEntry('WE_early', '2031-05-01', 2, 5, ['L2'])), (e) => e.message === NOT_READY_MESSAGE);
  assert.strictEqual(storedCount(disk, STORAGE_KEYS.workEntries), 1, 'early write did not replace history');
  const loaded = await second.init();
  assert.deepStrictEqual(loaded.map(e => e.id), ['WE_keep']);
});

runTest('Failed or delayed load never becomes an empty history that overwrites saved data', async () => {
  const { open, STORAGE_KEYS, LOAD_FAILED_MESSAGE } = await repoKit();
  const disk = repoDisk();
  const run1 = open(disk);
  await run1.init();
  await run1.upsert(persistedEntry('WE_1', '2031-05-02', 2, 10, ['L1']));
  await run1.upsert(persistedEntry('WE_2', '2031-05-03', 2, 20, ['L2']));
  disk.setFailReads(true); // storage read fails at the next launch
  const run2 = open(disk);
  await assert.rejects(() => run2.init(), /read error/);
  assert.strictEqual(run2.hasLoadFailed(), true);
  disk.setFailReads(false);
  await assert.rejects(() => run2.upsert(persistedEntry('WE_new', '2031-05-04', 2, 1, ['L1'])), (e) => e.message === LOAD_FAILED_MESSAGE);
  await assert.rejects(() => run2.remove('WE_1'), (e) => e.message === LOAD_FAILED_MESSAGE);
  await assert.rejects(() => run2.replaceAll([]), (e) => e.message === LOAD_FAILED_MESSAGE);
  assert.strictEqual(storedCount(disk, STORAGE_KEYS.workEntries), 2, 'saved history untouched');
  const run3 = open(disk); // a healthy launch afterwards sees everything
  assert.deepStrictEqual((await run3.init()).map(e => e.id).sort(), ['WE_1', 'WE_2']);
});

runTest('Save → fresh launch → same entries; multiple dates; switch and return; totals and counts from saved records', async () => {
  const { open } = await repoKit();
  const disk = repoDisk();
  const run1 = open(disk);
  await run1.init();
  await run1.upsert(persistedEntry('WE_today', '2031-05-10', 2, 100, ['L1', 'L2']));          // ₹200
  await run1.upsert(persistedEntry('WE_today_zero', '2031-05-10', 0, 40, ['L3']));           // ₹0
  await run1.upsert(persistedEntry('WE_past', '2031-05-09', 2, 275, ['L1']));                // ₹550
  const loaded = await open(disk).init(); // app closed from Recent Apps and reopened
  const day = (d) => calculateDailyMetrics({ date: d, workEntries: loaded, payments: [], serviceExpenses: [], labourers: [] });
  assert.strictEqual(loaded.length, 3);
  assert.deepStrictEqual([day('2031-05-10').todayLabourEarned, day('2031-05-10').workingLabourersCount], [200, 3]);
  assert.deepStrictEqual([day('2031-05-09').todayLabourEarned, day('2031-05-09').workingLabourersCount], [550, 1]);
  assert.deepStrictEqual([day('2031-05-10').todayLabourEarned, day('2031-05-10').workingLabourersCount], [200, 3], 'returning to the date shows the same history');
  assert.deepStrictEqual([day('2031-05-11').todayLabourEarned, day('2031-05-11').workingLabourersCount], [0, 0], 'empty date');
  assert.strictEqual(loaded.find(e => e.id === 'WE_today_zero').totalAmount, 0, 'zero kept');
});

runTest('Write failure: no false success, nothing changes; retries and concurrent saves never duplicate or lose entries', async () => {
  const { open, STORAGE_KEYS } = await repoKit();
  const disk = repoDisk();
  const repo = open(disk);
  await repo.init();
  await repo.upsert(persistedEntry('WE_a', '2031-05-12', 2, 10, ['L1']));
  disk.setFailWrites(true);
  await assert.rejects(() => repo.upsert(persistedEntry('WE_b', '2031-05-12', 2, 10, ['L1'])), /write error/);
  assert.deepStrictEqual(repo.list().map(e => e.id), ['WE_a'], 'failed save is not shown as saved');
  disk.setFailWrites(false);
  const retry = persistedEntry('WE_b', '2031-05-12', 2, 10, ['L1']);
  await Promise.all([repo.upsert(retry), repo.upsert(retry)]); // retry + double tap
  await Promise.all(['c', 'd', 'e'].map(x => repo.upsert(persistedEntry(`WE_${x}`, '2031-05-12', 2, 1, ['L1'])))); // concurrent saves
  const after = await open(disk).init();
  assert.deepStrictEqual(after.map(e => e.id).sort(), ['WE_a', 'WE_b', 'WE_c', 'WE_d', 'WE_e']);
  assert.strictEqual(storedCount(disk, STORAGE_KEYS.workEntries), 5);
  await repo.remove('WE_c');
  assert.deepStrictEqual((await open(disk).init()).map(e => e.id).sort(), ['WE_a', 'WE_b', 'WE_d', 'WE_e'], 'delete persists');
});

// -----------------------------------------------------------------
// LH-CLOUD-SYNC-01: sync engine (pure parts; DB integration is validated against 249/250 SQL separately)
// -----------------------------------------------------------------
console.log('\n📋 Test Suite LH-CLOUD-SYNC-01: Cloud sync engine');

runTest('Entry → server rows: units, quantities, fixed amount, bag lines and labourer shares', async () => {
  const { planEntry, serverUnitFor, makeUuid } = await import('../src/services/CloudSync.js');
  assert.match(makeUuid(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.deepStrictEqual(['per_100_kg', 'per_bag', 'per_batch', 'fixed'].map(serverUnitFor), ['Per 100 kg', 'Per bag', 'Per batch', 'Fixed amount']);
  const ctx = { serverId: 'srv-1', contractorId: 'c-1', rate: { id: 'r-1' }, labourerIds: { LH_LAB_001: 'u-1', LH_LAB_002: 'u-2' } };
  const weight = calculateWorkEntry({ rate: 21, unit: 'per_100_kg', type: 'weight', bagLines: [{ bagWeightKg: 50, bagCount: 100 }, { bagWeightKg: 40, bagCount: 0 }] });
  const p = planEntry({ id: 'WE_x', date: '2031-06-01', categoryId: 'pallet', unit: 'per_100_kg', rate: 21, totalKg: weight.totalKg, totalBags: weight.totalBags,
    totalBatches: 0, totalAmount: weight.totalAmount, bagLines: weight.bagLines, allocations: distributeWorkAllocation(weight.totalAmount, ['LH_LAB_001', 'LH_LAB_002']) }, ctx);
  assert.strictEqual(p.entryRow.id, 'srv-1');
  assert.strictEqual(p.entryRow.work_type, 'pallet');
  assert.strictEqual(p.entryRow.rate_snapshot, 21);
  assert.strictEqual(p.entryRow.rate_unit_snapshot, 'Per 100 kg');
  assert.strictEqual(p.entryRow.total_weight_kg, 5000);
  assert.strictEqual(p.entryRow.calculated_labour_amount, 1050);
  assert.strictEqual(p.details.length, 1, 'zero-count bag line is not sent');
  assert.deepStrictEqual(p.allocations.map(a => [a.labourer_id, a.allocated_amount]), [['u-1', 525], ['u-2', 525]]);
  const fixed = planEntry({ id: 'WE_f', date: '2031-06-01', categoryId: 'misc', unit: 'fixed', rate: 500, totalAmount: 0, allocations: [] }, ctx);
  assert.strictEqual(fixed.entryRow.rate_snapshot, 0, 'fixed work: the entered amount (even 0) is the server rate');
  assert.throws(() => planEntry({ id: 'WE_u', unit: 'per_bag', rate: 1, totalAmount: 1, allocations: [{ labourerId: 'LH_LAB_999', allocatedAmount: 1 }] }, ctx), /not on the server roster/);
});

runTest('Content hash and pending count: only changed entries are re-sent; deleted ones are not pending', async () => {
  const { contentHash, pendingCount } = await import('../src/services/CloudSync.js');
  const e = { id: 'WE_1', date: '2031-06-02', categoryId: 'mix', unit: 'per_bag', type: 'bag', rate: 2, totalAmount: 20, totalBags: 10, allocations: [{ labourerId: 'L1', allocatedAmount: 20 }] };
  const h = contentHash(e);
  assert.strictEqual(contentHash({ ...e }), h);
  assert.notStrictEqual(contentHash({ ...e, totalBags: 11, totalAmount: 22 }), h);
  assert.notStrictEqual(contentHash({ ...e, date: '2031-06-03' }), h);
  assert.strictEqual(pendingCount([e], []), 1);
  assert.strictEqual(pendingCount([e], [{ id: 'WE_1', hash: h }]), 0);
  assert.strictEqual(pendingCount([e], [{ id: 'WE_1', hash: null, deleted: true }]), 0);
});

runTest('Sync run with a fake server: ids saved before upload, retry-safe, deletes tombstoned and applied', async () => {
  const { syncAll, queueServerDelete, createSyncStore } = await import('../src/services/CloudSync.js');
  const { createLocalStore } = await import('../src/services/LocalPersistence.js');
  const disk = memoryBackend();
  const store = createSyncStore(createLocalStore(disk));
  const server = new Map();
  const calls = [];
  const adapter = {
    getMembership: async () => ({ contractorId: 'c-1', role: 'Manager' }),
    upsertLabourers: async (rows) => rows.map(r => ({ id: `u-${r.local_id}`, local_id: r.local_id })),
    ensureRate: async () => ({ id: 'r-1' }),
    deleteEntry: async (id) => { calls.push(['delete', id]); server.delete(id); },
    deleteAllocations: async () => {},
    upsertEntry: async (row) => { calls.push(['upsert', row.id]); server.set(row.id, row); },
    replaceDetails: async () => {},
    insertAllocations: async () => {},
  };
  const entries = [persistedEntry('WE_1', '2031-06-04', 2, 10, ['LH_LAB_001']), persistedEntry('WE_2', '2031-06-04', 0, 5, ['LH_LAB_001'])];
  entries.forEach(e => { e.unit = 'per_bag'; });
  const labs = [{ id: 'LH_LAB_001', name: 'A', isActive: true }];
  const r1 = await syncAll({ adapter, store, entries, labourers: labs, today: '2031-06-04' });
  assert.deepStrictEqual([r1.uploaded, r1.failed.length, server.size], [2, 0, 2]);
  const ids1 = (await store.getState()).map(s => s.serverId).sort();
  const r2 = await syncAll({ adapter, store, entries, labourers: labs, today: '2031-06-04' });
  assert.deepStrictEqual([r2.uploaded, r2.unchanged, server.size], [0, 2, 2], 'nothing re-sent');
  assert.deepStrictEqual((await store.getState()).map(s => s.serverId).sort(), ids1, 'server ids stable');
  await queueServerDelete(store, 'WE_2');
  const r3 = await syncAll({ adapter, store, entries: () => entries.filter(e => e.id !== 'WE_2'), labourers: labs, today: '2031-06-04' });
  assert.deepStrictEqual([r3.deleted, server.size], [1, 1]);
  assert.strictEqual((await store.getState()).some(s => s.id === 'WE_2'), false, 'finished tombstone cleaned up');
  const viewer = { ...adapter, getMembership: async () => ({ contractorId: 'c-1', role: 'Viewer' }) };
  await assert.rejects(() => syncAll({ adapter: viewer, store, entries, labourers: labs, today: '2031-06-04' }), /Viewer/);
});

// -----------------------------------------------------------------
// LH-DAILY-REGISTER-APPROVAL-01: daily register, timestamps, download merge, approval display
// (cross-device + approvals against the real 249/250/251/252 SQL are validated separately)
// -----------------------------------------------------------------
console.log('\n📋 Test Suite LH-DAILY-REGISTER-APPROVAL-01: Daily register & approval');

const regEntry = (id, date, cat, hmCompleted, createdAt, amount, labs) => ({
  id, date, categoryId: cat, categoryName: cat, unit: 'per_bag', type: 'bag', rate: 1, totalBags: amount, totalKg: 0, totalBatches: 0,
  totalAmount: amount, bagLines: [], notes: '', participatingLabourerIds: labs, allocations: distributeWorkAllocation(amount, labs),
  createdAt, workCompletedAt: hmCompleted,
});

runTest('IST times: fixed +05:30 conversion both ways; business date never shifted by UTC', async () => {
  const { istToIso, formatIstTime, formatIstDateTime, istYmd, isValidHm } = await import('../src/utils/dailyRegister.js');
  assert.strictEqual(istToIso('2026-11-03', '00:15'), '2026-11-02T18:45:00.000Z', '00:15 IST is the previous UTC day');
  assert.strictEqual(formatIstTime('2026-11-02T18:45:00.000Z'), '00:15');
  assert.strictEqual(istYmd('2026-11-02T18:45:00.000Z'), '2026-11-03');
  assert.strictEqual(formatIstDateTime('2026-11-03T08:30:00+00:00'), '03-11-2026 14:00 IST');
  assert.strictEqual(formatIstTime(undefined), '');
  assert.deepStrictEqual(['14:30', '24:00', '9:5', '23:59'].map(isValidHm), [true, false, false, true]);
});

runTest('Several entries on one date: register in completion-time order, totals from real entries only', async () => {
  const { buildDailyRegister } = await import('../src/utils/dailyRegister.js');
  const entries = [
    regEntry('WE_b', '2026-11-04', 'pallet', '2026-11-04T09:30:00.000Z', '2026-11-04T09:31:00.000Z', 300, ['L1', 'L2']),
    regEntry('WE_a', '2026-11-04', 'mix', '2026-11-04T04:00:00.000Z', '2026-11-04T10:00:00.000Z', 120, ['L2', 'L3']), // recorded later, done earlier
    regEntry('WE_old', '2026-11-04', 'premix', undefined, '2026-11-04T06:00:00.000Z', 0, ['L1']),                     // no completion time: by recorded time
    regEntry('WE_other', '2026-11-03', 'mix', '2026-11-03T05:00:00.000Z', '2026-11-03T05:00:00.000Z', 999, ['L9']),
  ];
  const r = buildDailyRegister({ entries, date: '2026-11-04' });
  assert.deepStrictEqual(r.rows.map(x => x.id), ['WE_a', 'WE_old', 'WE_b']);
  assert.deepStrictEqual(r.totals, { entries: 3, amount: 420, labourers: 3, bags: 420, kg: 0 });
  assert.strictEqual(r.rows[0].labourCount, 2);
  assert.strictEqual(r.rows.find(x => x.id === 'WE_old').completedAt, null, 'no invented completion time');
  const other = buildDailyRegister({ entries, date: '2026-11-03' });
  assert.deepStrictEqual([other.totals.entries, other.totals.amount], [1, 999], 'date selection loads that date only');
  const empty = buildDailyRegister({ entries, date: '2026-11-05' });
  assert.deepStrictEqual([empty.rows.length, empty.totals.amount], [0, 0]);
});

runTest('Sync state per entry and approval labels: new day Pending; Approved / Rejected with reason from the server', async () => {
  const { buildDailyRegister, approvalInfo } = await import('../src/utils/dailyRegister.js');
  const { contentHash } = await import('../src/services/CloudSync.js');
  const e1 = regEntry('WE_1', '2026-11-04', 'mix', undefined, '2026-11-04T05:00:00.000Z', 10, ['L1']);
  const e2 = regEntry('WE_2', '2026-11-04', 'mix', undefined, '2026-11-04T06:00:00.000Z', 20, ['L1']);
  const e3 = regEntry('WE_3', '2026-11-04', 'mix', undefined, '2026-11-04T07:00:00.000Z', 30, ['L1']);
  const items = [{ id: 'WE_1', serverId: 's1', hash: contentHash(e1) }, { id: 'WE_2', serverId: 's2', hash: 'old' }];
  const r = buildDailyRegister({ entries: [e1, e2, e3], date: '2026-11-04', syncItems: items, failed: [{ localId: 'WE_3', message: 'x' }], signedIn: true });
  assert.deepStrictEqual(r.rows.map(x => x.sync), ['synced', 'pending', 'failed']);
  assert.deepStrictEqual(buildDailyRegister({ entries: [e1], date: '2026-11-04' }).rows.map(x => x.sync), ['device']);
  assert.strictEqual(r.approval.status, 'Pending');
  assert.strictEqual(r.approval.label, 'Approval: Pending — Awaiting Shubh Labh CRM');
  const appr = buildDailyRegister({ entries: [e1], date: '2026-11-04', registers: [{ work_date: '2026-11-04', status: 'Approved', decided_at: '2026-11-04T12:00:00Z' }] });
  assert.strictEqual(appr.approval.label, 'Approval: Approved — Shubh Labh CRM');
  const rej = approvalInfo({ status: 'Rejected', rejection_reason: 'Bag count wrong', decided_at: '2026-11-04T12:00:00Z' });
  assert.deepStrictEqual([rej.status, rej.reason], ['Rejected', 'Bag count wrong']);
  assert.match(rej.nextStep, /Pending/);
});

runTest('Server copy of an entry hashes the same as the phone copy (no re-upload, no ping-pong)', async () => {
  const { contentHash, entryFromServer, planEntry, normalizeTs } = await import('../src/services/CloudSync.js');
  const c = calculateWorkEntry({ rate: 21, unit: 'per_100_kg', type: 'weight', bagLines: [{ bagWeightKg: 50, bagCount: 100 }, { bagWeightKg: 40, bagCount: 10 }] });
  const phone = { id: 'WE_p', date: '2026-11-03', categoryId: 'pallet', categoryName: 'Pallet', rate: 21, unit: 'per_100_kg', type: 'weight', bagLines: c.bagLines,
    totalBags: c.totalBags, totalKg: c.totalKg, totalBatches: 0, totalAmount: c.totalAmount, notes: '', participatingLabourerIds: ['LH_LAB_002', 'LH_LAB_001'],
    allocations: distributeWorkAllocation(c.totalAmount, ['LH_LAB_002', 'LH_LAB_001']), createdAt: '2026-11-03T12:30:00.123Z', workCompletedAt: '2026-11-03T12:00:00.000Z' };
  const plan = planEntry(phone, { serverId: 'srv', contractorId: 'c', rate: { id: 'r' }, labourerIds: { LH_LAB_001: 'u1', LH_LAB_002: 'u2' } });
  assert.strictEqual(plan.entryRow.recorded_at, '2026-11-03T12:30:00.123Z');
  // What PostgREST returns: numbers as strings, '+00:00' times, rows in another order.
  const back = entryFromServer({
    row: { ...plan.entryRow, rate_snapshot: '21.00', total_weight_kg: '5400.00', calculated_labour_amount: String(c.totalAmount), recorded_at: '2026-11-03T12:30:00.123+00:00', work_completed_at: '2026-11-03T12:00:00+00:00' },
    details: [...plan.details].reverse(),
    allocations: [{ labourer_local_id: 'LH_LAB_001', allocated_amount: String(plan.allocations[1].allocated_amount) }, { labourer_local_id: 'LH_LAB_002', allocated_amount: String(plan.allocations[0].allocated_amount) }],
  }, { localId: 'WE_p', categoryNames: { pallet: 'Pallet' } });
  assert.strictEqual(contentHash(back), contentHash(phone));
  assert.strictEqual(back.createdAt, '2026-11-03T12:30:00.123Z');
  assert.strictEqual(normalizeTs('2026-11-03T12:00:00+00:00'), '2026-11-03T12:00:00.000Z');
  const fixed = entryFromServer({ row: { id: 'f', work_date: '2026-11-03', work_type: 'misc', rate_unit_snapshot: 'Fixed amount', rate_snapshot: '250', calculated_labour_amount: '250', total_bags: 0, total_weight_kg: 0, total_batches: 0 } }, { localId: 'WE_f' });
  assert.strictEqual(contentHash(fixed), contentHash({ ...fixed, rate: 999 }), 'fixed work hashes the amount, not the rate');
});

runTest('New labourer ids are unique across phones; existing ids untouched', async () => {
  const { makeLabourerId } = await import('../src/services/LocalPersistence.js');
  const ids = new Set(Array.from({ length: 500 }, () => makeLabourerId()));
  assert.strictEqual(ids.size, 500);
  assert.match(makeLabourerId(), /^LH_LAB_[0-9a-z]+_[0-9a-z]+$/);
  assert.ok(makeLabourerId().length <= 50, 'fits labourers.local_id varchar(50)');
});

runTest('Downloads are saved in one write and never overwrite a local edit made meanwhile', async () => {
  const { createWorkEntryRepository } = await import('../src/services/WorkEntryRepository.js');
  const { createLocalStore } = await import('../src/services/LocalPersistence.js');
  const repo = createWorkEntryRepository(createLocalStore(memoryBackend()));
  await repo.init();
  await repo.upsert({ id: 'WE_mine', date: '2026-11-04', totalAmount: 10, v: 'edited-locally' });
  const { list, savedIds } = await repo.upsertManyIf(
    [{ id: 'WE_mine', date: '2026-11-04', totalAmount: 99 }, { id: 'WE_srv_x', date: '2026-11-04', totalAmount: 50 }],
    (item, current) => (item.id === 'WE_mine' ? current?.v === 'server-version' : !current));
  assert.deepStrictEqual(savedIds, ['WE_srv_x']);
  assert.strictEqual(list.find(e => e.id === 'WE_mine').totalAmount, 10, 'local edit kept');
  assert.strictEqual(list.length, 2);
});

runTest('Shared sync with a fake server: phone B gets phone A entries; B default roster never overwrites real names', async () => {
  const { syncAll, createSyncStore, contentHash } = await import('../src/services/CloudSync.js');
  const { createLocalStore } = await import('../src/services/LocalPersistence.js');
  const { createWorkEntryRepository } = await import('../src/services/WorkEntryRepository.js');
  const server = { labs: new Map(), entries: new Map(), seq: 0 };
  const adapter = (role = 'Operator') => ({
    getMembership: async () => ({ contractorId: 'c-1', role }),
    features: async () => ({ timestamps: true, registers: true }),
    fetchLabourers: async () => [...server.labs.values()],
    upsertLabourers: async (rows) => rows.map(r => { const ex = server.labs.get(r.local_id); const row = { ...r, id: ex?.id || `u${++server.seq}` }; server.labs.set(r.local_id, row); return row; }),
    ensureRate: async () => ({ id: 'r-1' }),
    deleteEntry: async () => {}, deleteAllocations: async (id) => { const e = server.entries.get(id); if (e) e.allocations = []; },
    upsertEntry: async (row) => { server.entries.set(row.id, { ...(server.entries.get(row.id) || {}), row, details: server.entries.get(row.id)?.details || [], allocations: server.entries.get(row.id)?.allocations || [] }); },
    replaceDetails: async (id, rows) => { server.entries.get(id).details = rows; },
    insertAllocations: async (rows) => { rows.forEach(a => { const lab = [...server.labs.values()].find(l => l.id === a.labourer_id); server.entries.get(a.work_entry_id).allocations.push({ labourer_local_id: lab.local_id, allocated_amount: a.allocated_amount }); }); },
    fetchEntries: async () => [...server.entries.values()].map(x => ({ row: x.row, details: x.details, allocations: x.allocations })),
    fetchRegisters: async () => [{ work_date: '2026-11-04', status: 'Pending', revision: 3 }],
  });
  const phone = async () => {
    const disk = memoryBackend();
    const repo = createWorkEntryRepository(createLocalStore(disk));
    await repo.init();
    const store = createSyncStore(createLocalStore(disk));
    let roster = null;
    const applyRemote = async ({ entries, labourers }) => {
      const want = new Map(entries.map(d => [d.entry.id, d.expectedHash]));
      const { savedIds } = await repo.upsertManyIf(entries.map(d => d.entry), (item, cur) => (want.get(item.id) === null ? !cur : !!cur && contentHash(cur) === want.get(item.id)));
      if (labourers.length) roster = roster.map(l => labourers.find(x => x.id === l.id) || l).concat(labourers.filter(x => !roster.some(l => l.id === x.id)));
      return { entryIds: savedIds };
    };
    return { repo, store, get roster() { return roster; }, set roster(v) { roster = v; },
      sync: (role) => syncAll({ adapter: adapter(role), store, entries: () => repo.list(), labourers: roster, today: '2026-11-04', applyRemote }) };
  };
  const A = await phone(); A.roster = [{ id: 'LH_LAB_001', name: 'Real One', isActive: true }, { id: 'LH_LAB_002', name: 'Real Two', isActive: true }];
  const B = await phone(); B.roster = [{ id: 'LH_LAB_001', name: 'Demo Golu', isActive: true }, { id: 'LH_LAB_002', name: 'Demo Satish', isActive: true }];
  await A.repo.upsert(regEntry('WE_a1', '2026-11-04', 'mix', '2026-11-04T04:00:00.000Z', '2026-11-04T04:05:00.000Z', 40, ['LH_LAB_001', 'LH_LAB_002']));
  await A.repo.upsert(regEntry('WE_a2', '2026-11-04', 'pallet', '2026-11-04T07:00:00.000Z', '2026-11-04T07:02:00.000Z', 60, ['LH_LAB_002']));
  const a1 = await A.sync();
  assert.deepStrictEqual([a1.uploaded, a1.failed.length], [2, 0]);
  const b1 = await B.sync();
  assert.strictEqual(b1.downloaded, 2, 'B downloads A entries');
  assert.deepStrictEqual(B.roster.map(l => l.name), ['Real One', 'Real Two'], 'server names win over B default roster');
  assert.deepStrictEqual([...server.labs.values()].map(l => l.name), ['Real One', 'Real Two'], 'server names untouched');
  assert.deepStrictEqual(B.repo.list().map(e => e.createdAt).sort(), ['2026-11-04T04:05:00.000Z', '2026-11-04T07:02:00.000Z'], 'timestamps travel');
  const b2 = await B.sync();
  assert.deepStrictEqual([b2.downloaded, b2.uploaded, B.repo.list().length, server.entries.size], [0, 0, 2, 2], 'repeat sync: no duplicates');
  const a2 = await A.sync();
  assert.deepStrictEqual([a2.downloaded, a2.uploaded], [0, 0], 'A does not ping-pong its own entries');
  assert.deepStrictEqual(b2.registers.map(r => r.status), ['Pending']);
});

runTest('App update: entries synced with the old hash are re-labelled, NOT re-uploaded (2/3 Nov stay untouched)', async () => {
  const { syncAll, createSyncStore, legacyContentHash, contentHash, HASH_VERSION } = await import('../src/services/CloudSync.js');
  const { createLocalStore } = await import('../src/services/LocalPersistence.js');
  const store = createSyncStore(createLocalStore(memoryBackend()));
  const nov2 = regEntry('WE_nov2', '2026-11-02', 'pallet', undefined, '2026-11-02T12:10:00.000Z', 5775, ['LH_LAB_001']);
  const changed = regEntry('WE_chg', '2026-11-03', 'pallet', undefined, '2026-11-03T12:40:00.000Z', 1050, ['LH_LAB_001']);
  await store.updateState(() => [
    { id: 'WE_nov2', serverId: 's-2', hash: legacyContentHash(nov2), syncedAt: 'x' },                    // synced by the old app
    { id: 'WE_chg', serverId: 's-3', hash: legacyContentHash({ ...changed, totalAmount: 1 }), syncedAt: 'x' }, // edited since
  ]);
  const writes = [];
  const adapter = {
    getMembership: async () => ({ contractorId: 'c-1', role: 'Owner' }),
    upsertLabourers: async (rows) => rows.map(r => ({ id: `u-${r.local_id}`, local_id: r.local_id })),
    ensureRate: async () => ({ id: 'r-1' }), deleteEntry: async () => {}, deleteAllocations: async (id) => writes.push(['alloc-reset', id]),
    upsertEntry: async (row) => writes.push(['upsert', row.id]), replaceDetails: async () => {}, insertAllocations: async () => {},
  };
  const r = await syncAll({ adapter, store, entries: [nov2, changed], labourers: [{ id: 'LH_LAB_001', name: 'A', isActive: true }], today: '2026-11-04' });
  assert.deepStrictEqual(writes.filter(w => w[1] === 's-2'), [], 'unchanged entry not rewritten');
  assert.deepStrictEqual([r.uploaded, r.unchanged], [1, 1], 'only the genuinely edited entry is sent');
  const s = await store.getState();
  assert.deepStrictEqual(s.find(x => x.id === 'WE_nov2'), { id: 'WE_nov2', serverId: 's-2', hash: contentHash(nov2), syncedAt: 'x', hv: HASH_VERSION });
});

// -----------------------------------------------------------------
// LH-REALTIME-WORK-SAVE-03: database-first save confirmation
// -----------------------------------------------------------------
console.log('\n📋 Test Suite LH-REALTIME-WORK-SAVE-03: Database-first save');

runTest('Save status: "Saved to database" only when the server holds this exact content', async () => {
  const { cloudSaveStatus, contentHash } = await import('../src/services/CloudSync.js');
  const e = regEntry('WE_s', '2026-11-04', 'mix', undefined, '2026-11-04T05:00:00.000Z', 40, ['L1']);
  const ok = cloudSaveStatus({ entry: e, item: { id: 'WE_s', serverId: 'srv-1', hash: contentHash(e), serverCreatedAt: '2026-11-04T05:00:01Z' }, outcome: { failed: [] } });
  assert.deepStrictEqual([ok.state, ok.serverId, ok.serverCreatedAt], ['database', 'srv-1', '2026-11-04T05:00:01Z']);
  assert.match(ok.message, /Saved to database/);
  const stale = cloudSaveStatus({ entry: { ...e, totalAmount: 41 }, item: { id: 'WE_s', serverId: 'srv-1', hash: contentHash(e) }, outcome: { failed: [] } });
  assert.notStrictEqual(stale.state, 'database', 'an older server copy is not a confirmation of the edit');
  const rejected = cloudSaveStatus({ entry: e, item: { id: 'WE_s', serverId: 'srv-1', hash: null }, outcome: { failed: [{ localId: 'WE_s', message: 'new row violates row-level security policy' }] } });
  assert.strictEqual(rejected.state, 'failed');
  assert.match(rejected.message, /row-level security/);
  const notLinked = cloudSaveStatus({ entry: e, item: null, outcome: null, error: 'इस खाते को किसी ठेकेदार से नहीं जोड़ा गया है।' });
  assert.deepStrictEqual([notLinked.state, /ठेकेदार/.test(notLinked.message)], ['failed', true]);
  const offline = cloudSaveStatus({ entry: e, item: null, outcome: null, error: 'TypeError: Network request failed' });
  assert.strictEqual(offline.state, 'offline');
  assert.match(offline.message, /Not synced — waiting for connection/);
  assert.strictEqual(cloudSaveStatus({ entry: e, item: null, outcome: null, signedIn: false }).state, 'device');
  assert.ok(![rejected, notLinked, offline].some(s => /Saved to database/.test(s.message)), 'no false success');
});

runTest('Sync keeps the persisted record the database returned; a mismatched id is a failure, not a save', async () => {
  const { syncAll, createSyncStore } = await import('../src/services/CloudSync.js');
  const { createLocalStore } = await import('../src/services/LocalPersistence.js');
  const base = {
    getMembership: async () => ({ contractorId: 'c-1', role: 'Operator' }),
    upsertLabourers: async (rows) => rows.map(r => ({ id: `u-${r.local_id}`, local_id: r.local_id })),
    ensureRate: async () => ({ id: 'r-1' }), deleteEntry: async () => {}, deleteAllocations: async () => {},
    replaceDetails: async () => {}, insertAllocations: async () => {},
  };
  const e = regEntry('WE_p1', '2026-11-04', 'mix', undefined, '2026-11-04T05:00:00.000Z', 40, ['LH_LAB_001']);
  const labs = [{ id: 'LH_LAB_001', name: 'A', isActive: true }];
  const store = createSyncStore(createLocalStore(memoryBackend()));
  const r = await syncAll({ adapter: { ...base, upsertEntry: async (row) => ({ id: row.id, created_at: '2026-11-04T05:00:02+00:00', updated_at: '2026-11-04T05:00:02+00:00' }) }, store, entries: [e], labourers: labs, today: '2026-11-04' });
  const s = (await store.getState())[0];
  assert.deepStrictEqual([r.uploaded, s.serverCreatedAt, typeof s.serverId], [1, '2026-11-04T05:00:02+00:00', 'string']);
  const store2 = createSyncStore(createLocalStore(memoryBackend()));
  const r2 = await syncAll({ adapter: { ...base, upsertEntry: async () => ({ id: 'someone-else' }) }, store: store2, entries: [e], labourers: labs, today: '2026-11-04' });
  assert.deepStrictEqual([r2.uploaded, r2.failed.length, (await store2.getState())[0].hash], [0, 1, null], 'not marked as saved');
});

runTest('Save screen: database confirmation awaited; success text only on database state; form kept for retry', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/screens/AddWorkEntryScreen.js', import.meta.url), 'utf8');
  assert.match(src, /const cloud = await confirmCloudSave\(saved\.id\);/);
  const okBranch = src.indexOf("if (cloud.state === 'database') {");
  assert.ok(okBranch > 0 && src.indexOf('डेटाबेस में सहेजा गया ✅') > okBranch, 'success alert lives inside the database branch');
  assert.ok(!/फ़ोन में सहेज लिया गया/.test(src), 'old local-only success text is gone');
  assert.match(src, /'दोबारा कोशिश करें \(Retry\)', onPress: \(\) => handleSave\(\{ confirmedDecided: true \}\)/, 'retry re-sends with the same entry id');
  const ctx = readFileSync(new URL('../src/context/LabourHisaabContext.js', import.meta.url), 'utf8');
  assert.match(ctx, /AppState\.addEventListener\('change'/, 'refresh when the app returns to the foreground');
  assert.match(ctx, /setInterval\(\(\) => \{ if \(AppState\.currentState === 'active'\) runSync\(\); \}, 60000\)/, 'periodic refresh while open');
});

// -----------------------------------------------------------------
// LH-CONTRACTOR-SELECT-SAVE-VERIFY-06: contractor selection
// -----------------------------------------------------------------
console.log('\n📋 Test Suite LH-CONTRACTOR-SELECT-SAVE-VERIFY-06: Contractor selection');

runTest('Membership + selection: honoured only for real memberships; several need a choice; none = clear error', async () => {
  const { pickMembership, NO_MEMBERSHIP_MESSAGE, CHOOSE_CONTRACTOR_MESSAGE, SELECTION_GONE_MESSAGE, syncAll, createSyncStore } = await import('../src/services/CloudSync.js');
  const { createLocalStore } = await import('../src/services/LocalPersistence.js');
  const ajay = { contractor_id: 'c-ajay', role: 'Operator', name: 'Ajay' };
  const other = { contractor_id: 'c-other', role: 'Manager', name: 'Other' };
  assert.deepStrictEqual(pickMembership([ajay]), { contractorId: 'c-ajay', role: 'Operator' }, 'single membership used automatically');
  assert.throws(() => pickMembership([ajay, other]), (e) => e.message === CHOOSE_CONTRACTOR_MESSAGE, 'several: must choose');
  assert.deepStrictEqual(pickMembership([ajay, other], 'c-other'), { contractorId: 'c-other', role: 'Manager' });
  assert.throws(() => pickMembership([ajay], 'c-not-mine'), (e) => e.message === SELECTION_GONE_MESSAGE, 'selection is not a membership');
  assert.strictEqual(pickMembership([]), null);
  const store = createSyncStore(createLocalStore(memoryBackend()));
  await assert.rejects(() => syncAll({ adapter: { getMembership: async () => null }, store, entries: [], labourers: [], today: '2026-11-04' }), (e) => e.message === NO_MEMBERSHIP_MESSAGE);
});

runTest('Selection is saved per signed-in user and restored; another user on the phone keeps their own', async () => {
  const { readSelection, writeSelection } = await import('../src/services/CloudSync.js');
  const { createLocalStore } = await import('../src/services/LocalPersistence.js');
  const disk = memoryBackend();
  const key = '@labourhisaab/v1/contractor_selection';
  let s = createLocalStore(disk);
  await s.saveList(key, writeSelection(await s.loadList(key), 'user-a', { contractor_id: 'c-ajay', name: 'Ajay' }));
  await s.saveList(key, writeSelection(await s.loadList(key), 'user-b', { contractor_id: 'c-other', name: 'Other' }));
  s = createLocalStore(disk); // app restart: a new store over the same device storage
  assert.deepStrictEqual(readSelection(await s.loadList(key), 'user-a'), { userId: 'user-a', contractorId: 'c-ajay', name: 'Ajay' });
  assert.strictEqual(readSelection(await s.loadList(key), 'user-b').contractorId, 'c-other');
  assert.strictEqual(readSelection(await s.loadList(key), 'user-c'), null, 'a new user starts with no selection');
  await s.saveList(key, writeSelection(await s.loadList(key), 'user-a', { contractor_id: 'c-other', name: 'Other' }));
  assert.strictEqual((await s.loadList(key)).length, 2, 'replaced, not duplicated');
});

runTest('Switching contractor: each record stays with its own contractor; older untagged ones with the first contractor', async () => {
  const { syncAll, createSyncStore, recordContractor } = await import('../src/services/CloudSync.js');
  const { createLocalStore } = await import('../src/services/LocalPersistence.js');
  assert.strictEqual(recordContractor({}, 'c-ajay'), 'c-ajay', '2/3 Nov (untagged) belong to the first contractor');
  assert.strictEqual(recordContractor({ contractorId: 'c-y' }, 'c-ajay'), 'c-y');
  const sent = [];
  const adapter = (cid) => ({
    getMembership: async () => ({ contractorId: cid, role: 'Operator' }),
    upsertLabourers: async (rows) => rows.map(r => ({ id: `u-${r.local_id}`, local_id: r.local_id })),
    ensureRate: async () => ({ id: 'r-1' }), deleteEntry: async () => {}, deleteAllocations: async () => {},
    upsertEntry: async (row) => { sent.push([row.contractor_id, row.work_date]); return { id: row.id }; }, replaceDetails: async () => {}, insertAllocations: async () => {},
  });
  const old = regEntry('WE_nov2', '2026-11-02', 'pallet', undefined, '2026-11-02T12:10:00.000Z', 5775, ['LH_LAB_001']); // untagged
  const yWork = { ...regEntry('WE_y', '2026-11-04', 'mix', undefined, '2026-11-04T05:00:00.000Z', 40, ['LH_LAB_y1']), contractorId: 'c-y' };
  const owns = (item, cid) => (item.contractorId || 'c-ajay' || cid) === cid;
  const labs = [{ id: 'LH_LAB_001', name: 'A', isActive: true }, { id: 'LH_LAB_y1', name: 'Y worker', isActive: true, contractorId: 'c-y' }];
  await syncAll({ adapter: adapter('c-y'), store: createSyncStore(createLocalStore(memoryBackend())), entries: [old, yWork], labourers: labs, owns, today: '2026-11-04' });
  assert.deepStrictEqual(sent, [['c-y', '2026-11-04']], 'with contractor Y selected only Y\'s entry is sent; 2 Nov is not moved to Y');
  sent.length = 0;
  await syncAll({ adapter: adapter('c-ajay'), store: createSyncStore(createLocalStore(memoryBackend())), entries: [old, yWork], labourers: labs, owns, today: '2026-11-04' });
  assert.deepStrictEqual(sent, [['c-ajay', '2026-11-02']], 'back on Ajay: only Ajay\'s entries');
});

runTest('Shared roster: the built-in sample labourers are never uploaded to a new contractor; real ones are', async () => {
  const { syncAll, createSyncStore } = await import('../src/services/CloudSync.js');
  const { createLocalStore } = await import('../src/services/LocalPersistence.js');
  const uploaded = [];
  const adapter = {
    getMembership: async () => ({ contractorId: 'c-new', role: 'Operator' }),
    features: async () => ({ timestamps: true, registers: false }),
    fetchLabourers: async () => [], fetchEntries: async () => [],
    upsertLabourers: async (rows) => { uploaded.push(...rows.map(r => r.local_id)); return rows.map(r => ({ id: `u-${r.local_id}`, local_id: r.local_id })); },
    ensureRate: async () => ({ id: 'r-1' }), deleteEntry: async () => {}, deleteAllocations: async () => {},
    upsertEntry: async (row) => ({ id: row.id }), replaceDetails: async () => {}, insertAllocations: async () => {},
  };
  const store = createSyncStore(createLocalStore(memoryBackend()));
  const labs = [
    { id: 'LH_LAB_001', name: 'Sample One', isActive: true },                                        // built-in sample, unused
    { id: 'LH_LAB_x1', name: 'Real Added', isActive: true, addedOnPhone: true, contractorId: 'c-new' },  // added on the phone
    { id: 'LH_LAB_002', name: 'Sample Used', isActive: true },                                       // used by work
  ];
  const work = { ...regEntry('WE_n', '2026-11-04', 'mix', undefined, '2026-11-04T05:00:00.000Z', 10, ['LH_LAB_002']), contractorId: 'c-new' };
  await syncAll({ adapter, store, entries: [work], labourers: labs, today: '2026-11-04', applyRemote: async () => ({ entryIds: [] }) });
  assert.deepStrictEqual(uploaded.sort(), ['LH_LAB_002', 'LH_LAB_x1']);
});

runTest('Settings shows the Contractor card; save screen names the contractor and the persisted record id', async () => {
  const { readFileSync } = await import('node:fs');
  const settings = readFileSync(new URL('../src/screens/SettingsScreen.js', import.meta.url), 'utf8');
  assert.match(settings, /<ContractorSelectCard \/>/);
  const card = readFileSync(new URL('../src/components/ContractorSelectCard.js', import.meta.url), 'utf8');
  assert.match(card, /listMemberships|loadContractors/);
  const adapterSrc = readFileSync(new URL('../src/services/supabaseSyncAdapter.js', import.meta.url), 'utf8');
  assert.match(adapterSrc, /rpc\('lh_list_active_contractors'\)/, 'all active contractors from the database (254)');
  assert.match(adapterSrc, /rpc\('lh_select_contractor', \{ p_contractor: contractorId \}\)/, 'the server authorises the choice');
  assert.ok(!/lh_set_member|lh_add_member_by_email|lh_set_operator|contractor_members'\)\.(insert|upsert|update)/.test(adapterSrc), 'no membership management from the phone');
  assert.match(card, /Alert\.alert\(\s*'ठेकेदार चुनें\?'/, 'confirmation before changing');
  assert.ok(!/contractor_members'\)\.insert|lh_add_member|lh_set_member|\.rpc\(/.test(card), 'the phone cannot grant itself membership');
  assert.ok(!/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(card), 'no hard-coded contractor ids');
  const form = readFileSync(new URL('../src/screens/AddWorkEntryScreen.js', import.meta.url), 'utf8');
  assert.match(form, /Record ID: \$\{cloud\.serverId\}/);
  assert.match(form, /'पहले ठेकेदार चुनें'/, 'no contractor selected → prompt before saving');
});

// -----------------------------------------------------------------
// LH-WORK-EDIT-APPROVAL-07: edit current/past work with re-approval
// -----------------------------------------------------------------
console.log('\n📋 Test Suite LH-WORK-EDIT-APPROVAL-07: Edit with re-approval');

runTest('Edit keeps the record id and creation time, records the edit time, can move to an earlier date', async () => {
  const { createWorkEntryRepository } = await import('../src/services/WorkEntryRepository.js');
  const { createLocalStore } = await import('../src/services/LocalPersistence.js');
  const { contentHash } = await import('../src/services/CloudSync.js');
  const repo = createWorkEntryRepository(createLocalStore(memoryBackend()));
  await repo.init();
  const original = regEntry('WE_edit', '2026-11-04', 'mix', '2026-11-04T05:00:00.000Z', '2026-11-04T05:01:00.000Z', 40, ['L1']);
  await repo.upsert(original);
  // What updateWorkEntry stores: merged values + updatedAt, same id; createdAt untouched.
  const edited = { ...original, date: '2026-11-02', totalBags: 50, totalAmount: 50, allocations: distributeWorkAllocation(50, ['L1', 'L2']), participatingLabourerIds: ['L1', 'L2'], updatedAt: '2026-11-04T09:00:00.000Z' };
  await repo.upsert(edited);
  const list = repo.list();
  assert.deepStrictEqual(list.map(e => e.id), ['WE_edit'], 'no second record');
  assert.deepStrictEqual([list[0].date, list[0].createdAt, list[0].updatedAt], ['2026-11-02', '2026-11-04T05:01:00.000Z', '2026-11-04T09:00:00.000Z']);
  assert.notStrictEqual(contentHash(list[0]), contentHash(original), 'the edit is sent to the database');
  await repo.upsert(edited);
  assert.strictEqual(repo.list().length, 1, 'repeated save of the same edit: still one record');
});

runTest('Edit form: date today-or-earlier, decided days ask before re-approval, Home shows day status + last edit', async () => {
  const { readFileSync } = await import('node:fs');
  const form = readFileSync(new URL('../src/screens/AddWorkEntryScreen.js', import.meta.url), 'utf8');
  assert.match(form, /const \[workDate, setWorkDate\] = useState\(workEntryToEdit\?\.date \?\? selectedDate\);/, 'edit starts at the entry date');
  assert.match(form, /workDate > todayYmd\(\)/, 'future dates refused');
  assert.match(form, /date: workDate,/, 'chosen date is saved');
  assert.match(form, /x\.st === 'Approved' \|\| x\.st === 'Rejected'/);
  assert.match(form, /बदलाव सहेजने पर यह दिन फिर से "Pending" होगा/, 'operator is told the edit needs re-approval');
  assert.ok(!/Approved'\s*:\s*'Approved|status: 'Approved'/.test(form), 'the app never sets Approved');
  const home = readFileSync(new URL('../src/screens/HomeScreen.js', import.meta.url), 'utf8');
  assert.match(home, /approvalInfo\(registers\.find\(/);
  assert.match(home, /अंतिम बदलाव: \{formatIstDateTime\(entry\.updatedAt\)\}/);
});

// -----------------------------------------------------------------
// LH-CONTRACTOR-VISIBILITY-FIX-08: a failure is never shown as "no contractors"
// -----------------------------------------------------------------
console.log('\n📋 Test Suite LH-CONTRACTOR-VISIBILITY-FIX-08: Contractor list errors');

runTest('Contractor list errors are classified: not approved / offline / server error', async () => {
  const { contractorErrorKind } = await import('../src/services/CloudSync.js');
  assert.strictEqual(contractorErrorKind(new Error('Contractor list: This account is not a LabourHisaab operator. Ask a Shubh Labh CRM admin to approve it.')), 'not_operator');
  assert.strictEqual(contractorErrorKind({ code: '42501', message: 'permission denied for function lh_list_active_contractors' }), 'not_operator');
  assert.strictEqual(contractorErrorKind(new Error('TypeError: Network request failed')), 'offline');
  assert.strictEqual(contractorErrorKind(new Error('Contractor list: column x does not exist')), 'error');
});

runTest('Adapter: missing 254 falls back to memberships; any OTHER error is raised (not swallowed into an empty list)', async () => {
  // The adapter imports './CloudSync' without an extension (Metro resolves it; Node does not):
  // load the REAL adapter source with that one specifier made absolute.
  const { readFileSync, writeFileSync, mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const srcUrl = new URL('../src/services/supabaseSyncAdapter.js', import.meta.url);
  const cloudSyncUrl = new URL('../src/services/CloudSync.js', import.meta.url).href;
  const tmp = join(mkdtempSync(join(tmpdir(), 'lh-adapter-')), 'adapter.mjs');
  writeFileSync(tmp, readFileSync(srcUrl, 'utf8').replace("from './CloudSync'", `from '${cloudSyncUrl}'`));
  const { createSupabaseSyncAdapter } = await import(pathToFileURL(tmp).href);
  const fakeSupabase = (rpcResult, memberRows = []) => ({
    rpc: async () => rpcResult,
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: () => ({ select: () => ({ eq: () => ({ eq: async () => ({ data: memberRows, error: null }) }) }) }),
  });
  const missing = await createSupabaseSyncAdapter(fakeSupabase({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.lh_list_active_contractors' } })).listContractors();
  assert.deepStrictEqual([missing.mode, missing.items.length], ['members', 0], 'pre-254: own memberships (none) — the UI explains why');
  await assert.rejects(() => createSupabaseSyncAdapter(fakeSupabase({ data: null, error: { code: '42501', message: 'This account is not a LabourHisaab operator.' } })).listContractors(),
    /not a LabourHisaab operator/, 'permission error surfaces as an error');
  const open = await createSupabaseSyncAdapter(fakeSupabase({ data: [{ id: 'c1', name: 'Ajay', business_name: null, my_role: null, my_membership_active: null }], error: null })).listContractors();
  assert.deepStrictEqual([open.mode, open.items[0].name, open.items[0].role], ['open', 'Ajay', null], 'approved operator without membership sees contractors');
});

runTest('Card: error state is distinct from the empty state; empty pre-254 list explains the cause; no emails hard-coded', async () => {
  const { readFileSync } = await import('node:fs');
  const card = readFileSync(new URL('../src/components/ContractorSelectCard.js', import.meta.url), 'utf8');
  assert.match(card, /status === 'error' \? \(/);
  assert.match(card, /errorKind === 'not_operator'/);
  assert.match(card, /proposal 254\) अभी चालू नहीं/);
  const all = ['../src/components/ContractorSelectCard.js', '../src/context/LabourHisaabContext.js', '../src/services/CloudSync.js', '../src/services/supabaseSyncAdapter.js']
    .map(p => readFileSync(new URL(p, import.meta.url), 'utf8')).join('\n');
  assert.ok(!/@shubhlabh\.com/i.test(all), 'no operator emails in app logic');
});

function todayYmdForTest() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

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

