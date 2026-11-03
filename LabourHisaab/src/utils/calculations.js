// LabourHisaab Calculation Engine
// Adheres strictly to the business logic specified in MICRO-SPRINT: LH-UI-01

/**
 * LH-HOME-LABOUR-ENTRY-01: parses a numeric form input while keeping "empty" and
 * an explicit 0 apart. Returns null for empty input, NaN for non-numeric input,
 * otherwise the number (0 stays 0). Never substitute a default with `||`.
 */
export function toNumberOrNull(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (text === '') return null;
  return Number(text);
}

const isValidNonNegative = (n) => n !== null && Number.isFinite(n) && n >= 0;

/**
 * Validates the work-entry form. Empty required fields are errors; an explicit 0
 * is a valid value (it simply produces a ₹0 amount). Returns a Hindi message or null.
 */
export function validateWorkEntryInputs({ type, rate, bagLines = [], totalBags, totalBatches, labourerCount = 0 }) {
  const numericRate = toNumberOrNull(rate);
  if (numericRate === null) return 'कृपया दर (Rate) दर्ज करें।';
  if (!isValidNonNegative(numericRate)) return 'दर (Rate) 0 या उससे अधिक मान्य संख्या होनी चाहिए।';

  if (type === 'weight') {
    if (bagLines.length === 0) return 'कम से कम एक वजन लाइन आवश्यक है।';
    for (const line of bagLines) {
      const weight = toNumberOrNull(line.bagWeightKg);
      const count = toNumberOrNull(line.bagCount);
      if (weight === null || count === null) return 'कृपया हर लाइन में बोरी का वजन और संख्या दर्ज करें।';
      if (!isValidNonNegative(weight) || !isValidNonNegative(count)) return 'वजन और बोरी संख्या 0 या उससे अधिक मान्य संख्या होनी चाहिए।';
    }
  } else if (type === 'bag') {
    const bags = toNumberOrNull(totalBags);
    if (bags === null) return 'कृपया बोरियों की संख्या दर्ज करें।';
    if (!isValidNonNegative(bags)) return 'बोरी संख्या 0 या उससे अधिक मान्य संख्या होनी चाहिए।';
  } else if (type === 'batch') {
    const batches = toNumberOrNull(totalBatches);
    if (batches === null) return 'कृपया बैच संख्या दर्ज करें।';
    if (!isValidNonNegative(batches)) return 'बैच संख्या 0 या उससे अधिक मान्य संख्या होनी चाहिए।';
  }

  if (labourerCount === 0) return 'कृपया कम से कम एक मजदूर का चयन करें।';
  return null;
}

/**
 * Calculates work entry totals based on work category type and inputs.
 * Supports weight-based (multiple bag weights), per-bag, and batch-based.
 */
export function calculateWorkEntry({
  rate,
  unit, // 'per_100_kg' | 'per_bag' | 'per_batch' | 'fixed'
  type, // 'weight' | 'bag' | 'batch' | 'fixed'
  bagLines = [], // [{ bagWeightKg: number, bagCount: number }]
  totalBags = 0,
  totalBatches = 0,
  fixedAmount, // explicit amount for 'fixed' work; when absent the rate is the amount
}) {
  const numericRate = Number(rate) || 0;

  if (type === 'weight' || unit === 'per_100_kg') {
    // Weight-based work:
    // Total kg = Bag weight × Number of bags (sum across all bag lines)
    // Labour amount = Total kg ÷ 100 × Rate
    let calculatedTotalKg = 0;
    let calculatedTotalBags = 0;

    const processedLines = bagLines.map(line => {
      const weight = Number(line.bagWeightKg) || 0;
      const count = Number(line.bagCount) || 0;
      const lineKg = weight * count;
      calculatedTotalKg += lineKg;
      calculatedTotalBags += count;
      return {
        bagWeightKg: weight,
        bagCount: count,
        lineKg,
      };
    });

    const totalAmount = (calculatedTotalKg / 100) * numericRate;

    return {
      type: 'weight',
      rate: numericRate,
      unit,
      bagLines: processedLines,
      totalBags: calculatedTotalBags,
      totalKg: calculatedTotalKg,
      totalBatches: 0,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  }

  if (type === 'bag' || unit === 'per_bag') {
    // Per-bag work:
    // Labour amount = Number of bags × Rate
    const bags = Number(totalBags) || 0;
    const totalAmount = bags * numericRate;

    return {
      type: 'bag',
      rate: numericRate,
      unit,
      bagLines: [],
      totalBags: bags,
      totalKg: 0,
      totalBatches: 0,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  }

  if (type === 'batch' || unit === 'per_batch') {
    // Fixed-batch work:
    // Labour amount = Number of batches × Rate
    const batches = Number(totalBatches) || 0;
    const totalAmount = batches * numericRate;

    return {
      type: 'batch',
      rate: numericRate,
      unit,
      bagLines: [],
      totalBags: 0,
      totalKg: 0,
      totalBatches: batches,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  }

  // Fixed amount: an explicitly entered amount (including 0) is kept as-is;
  // only an absent amount falls back to the rate.
  const explicitAmount = toNumberOrNull(fixedAmount);
  const amount = explicitAmount !== null && Number.isFinite(explicitAmount) ? explicitAmount : numericRate;
  return {
    type: 'fixed',
    rate: numericRate,
    unit,
    bagLines: [],
    totalBags: 0,
    totalKg: 0,
    totalBatches: 0,
    totalAmount: Math.round(amount * 100) / 100,
  };
}

/**
 * Calculates expense deduction for a specific labourer.
 * STRICT POLICY: Never deducts if allocationType === 'contractor_expense'.
 */
export function calculateExpenseDeductionForLabourer(expense, labourerId) {
  if (!expense || expense.allocationType === 'contractor_expense') {
    return 0;
  }

  const amount = Number(expense.amount) || 0;
  const allocatedIds = expense.allocatedLabourerIds || [];

  if (expense.allocationType === 'individual') {
    return allocatedIds.includes(labourerId) ? amount : 0;
  }

  if (expense.allocationType === 'group') {
    if (allocatedIds.includes(labourerId) && allocatedIds.length > 0) {
      return Math.round((amount / allocatedIds.length) * 100) / 100;
    }
  }

  return 0;
}

/**
 * LH-LABOUR-COUNT-01: stable ids of the distinct labourers who have work recorded in the
 * given entries. Each labourer counts once however many entries they appear in. Uses
 * participatingLabourerIds, falling back to allocation labourer ids; never names or indexes.
 * Registered-but-idle labourers are not counted; a labourer with recorded work is counted
 * even if since deactivated (the work happened).
 */
export function distinctWorkingLabourerIds(entries = []) {
  const ids = new Set();
  entries.forEach(e => {
    const fromParticipants = Array.isArray(e.participatingLabourerIds) ? e.participatingLabourerIds : [];
    const fromAllocations = Array.isArray(e.allocations) ? e.allocations.map(a => a && a.labourerId) : [];
    [...fromParticipants, ...fromAllocations].forEach(id => {
      if (id !== null && id !== undefined && String(id).trim() !== '') ids.add(String(id));
    });
  });
  return [...ids];
}

/**
 * Calculates today's summary metrics for the Home screen.
 */
export function calculateDailyMetrics({
  date,
  workEntries = [],
  payments = [],
  serviceExpenses = [],
  labourers = [],
}) {
  const dayWork = workEntries.filter(e => e.date === date);
  const dayPayments = payments.filter(p => p.date === date);
  const dayExpenses = serviceExpenses.filter(e => e.date === date);

  const activeLabourers = labourers.filter(l => l.isActive);

  // Today's total labour earned
  const todayLabourEarned = dayWork.reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0);

  // Today's total payments
  const todayPayments = dayPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Today's service expenses (Contractor vs Deductions)
  let todayTotalExpenses = 0;
  let todayContractorExpenses = 0;
  let todayAllocatedDeductions = 0;

  dayExpenses.forEach(exp => {
    const amt = Number(exp.amount) || 0;
    todayTotalExpenses += amt;
    if (exp.allocationType === 'contractor_expense') {
      todayContractorExpenses += amt;
    } else {
      todayAllocatedDeductions += amt;
    }
  });

  // Today's remaining payable amount =
  // Total labour earned - Total payments - Allocated service deductions
  const remainingPayableToday = Math.round((todayLabourEarned - todayPayments - todayAllocatedDeductions) * 100) / 100;

  return {
    date,
    activeLabourersCount: activeLabourers.length, // registered roster (not a daily figure)
    // Distinct labourers with work on this date — same entries as the wage total below.
    workingLabourersCount: distinctWorkingLabourerIds(dayWork).length,
    todayLabourEarned: Math.round(todayLabourEarned * 100) / 100,
    todayPayments: Math.round(todayPayments * 100) / 100,
    todayTotalExpenses: Math.round(todayTotalExpenses * 100) / 100,
    todayContractorExpenses: Math.round(todayContractorExpenses * 100) / 100,
    todayAllocatedDeductions: Math.round(todayAllocatedDeductions * 100) / 100,
    remainingPayableToday,
    workCount: dayWork.length,
    paymentsCount: dayPayments.length,
    expensesCount: dayExpenses.length,
  };
}

/**
 * Computes individual labourer monthly statement.
 * Formula:
 * Remaining balance = Total labour earned − Total payments − Allocated service deductions
 */
export function calculateLabourerStatement({
  labourerId,
  yearMonth, // e.g. '2026-11'
  workEntries = [],
  payments = [],
  serviceExpenses = [],
  labourers = [],
}) {
  const labourer = labourers.find(l => l.id === labourerId) || { id: labourerId, name: 'Unknown' };

  // Filter for the specified month
  const monthWork = workEntries.filter(e => (e.date || '').startsWith(yearMonth));
  const monthPayments = payments.filter(p => (p.date || '').startsWith(yearMonth) && p.labourerId === labourerId);
  const monthExpenses = serviceExpenses.filter(e => (e.date || '').startsWith(yearMonth));

  // Determine working days, weight, bags, and earned amount
  const workingDaysSet = new Set();
  let totalLabourEarned = 0;
  let totalWeightProcessedKg = 0;
  let totalWorkBags = 0;
  let totalWorkBatches = 0;

  monthWork.forEach(entry => {
    const participants = entry.participatingLabourerIds || [];
    const isParticipant = participants.length === 0 || participants.includes(labourerId);

    if (isParticipant) {
      workingDaysSet.add(entry.date);
      // Check if entry has explicit allocations array stored
      const explicitAlloc = (entry.allocations || []).find(a => a.labourerId === labourerId);
      if (explicitAlloc) {
        totalLabourEarned += (Number(explicitAlloc.allocatedAmount) || 0);
      } else {
        const shareCount = participants.length > 0 ? participants.length : 1;
        const shareAmount = (Number(entry.totalAmount) || 0) / shareCount;
        totalLabourEarned += shareAmount;
      }

      totalWeightProcessedKg += (Number(entry.totalWeightKg || entry.totalKg) || 0);
      totalWorkBags += (Number(entry.totalBags) || 0);
      totalWorkBatches += (Number(entry.totalBatches) || 0);
    }
  });

  // Also include days where payments were recorded as attendance
  monthPayments.forEach(p => workingDaysSet.add(p.date));

  // Total amount paid
  const totalAmountPaid = monthPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Total allocated service deductions (categorized)
  let totalAllocatedServiceExpenses = 0;
  let totalAllocatedFoodExpenses = 0;
  let totalOtherAllocatedExpenses = 0;
  let contractorBorneExpenses = 0;

  monthExpenses.forEach(exp => {
    const deduction = calculateExpenseDeductionForLabourer(exp, labourerId);
    totalAllocatedServiceExpenses += deduction;

    if (exp.category === 'food_meals') {
      totalAllocatedFoodExpenses += deduction;
    } else if (exp.allocationType !== 'contractor_expense') {
      totalOtherAllocatedExpenses += deduction;
    }

    if (exp.allocationType === 'contractor_expense') {
      contractorBorneExpenses += (Number(exp.amount) || 0);
    }
  });

  // Consistent calculation:
  // Remaining balance = Total labour earned − Total payments − Allocated service deductions
  const remainingBalance = Math.round(
    (totalLabourEarned - totalAmountPaid - totalAllocatedServiceExpenses) * 100
  ) / 100;

  return {
    labourerId: labourer.id,
    labourerName: labourer.name,
    labourerPhone: labourer.phone || '',
    yearMonth,
    workingDays: workingDaysSet.size,
    totalWeightProcessedKg: Math.round(totalWeightProcessedKg * 100) / 100,
    totalWorkBags,
    totalWorkBatches,
    totalLabourEarned: Math.round(totalLabourEarned * 100) / 100,
    totalAmountPaid: Math.round(totalAmountPaid * 100) / 100,
    totalAllocatedServiceExpenses: Math.round(totalAllocatedServiceExpenses * 100) / 100,
    totalAllocatedFoodExpenses: Math.round(totalAllocatedFoodExpenses * 100) / 100,
    totalOtherAllocatedExpenses: Math.round(totalOtherAllocatedExpenses * 100) / 100,
    contractorBorneExpenses: Math.round(contractorBorneExpenses * 100) / 100,
    remainingBalance,
    payments: monthPayments,
    workEntries: monthWork,
  };
}

/**
 * Computes standard Monday-to-Sunday week date range for any reference date.
 */
export function getWeekRange(referenceDate = '2026-11-03', offsetWeeks = 0) {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0 is Sun, 1 is Mon...
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday + (offsetWeeks * 7));

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const startStr = monday.toISOString().split('T')[0];
  const endStr = sunday.toISOString().split('T')[0];

  return {
    startDate: startStr,
    endDate: endStr,
    label: `${startStr} से ${endStr}`,
  };
}

/**
 * Computes period report (Daily, Weekly, Monthly) with summary cards & individual breakdowns.
 */
export function calculatePeriodReport({
  filterType, // 'daily' | 'weekly' | 'monthly' | 'custom'
  referenceDate, // YYYY-MM-DD
  startDate = null,
  endDate = null,
  workEntries = [],
  payments = [],
  serviceExpenses = [],
  labourers = [],
}) {
  const ref = new Date(referenceDate || '2026-11-03');
  const year = ref.getFullYear();
  const monthStr = String(ref.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${year}-${monthStr}`;

  let filteredWork = [];
  let filteredPayments = [];
  let filteredExpenses = [];
  let periodLabel = '';

  if (filterType === 'daily') {
    filteredWork = workEntries.filter(e => e.date === referenceDate);
    filteredPayments = payments.filter(p => p.date === referenceDate);
    filteredExpenses = serviceExpenses.filter(e => e.date === referenceDate);
    periodLabel = `आज (${referenceDate})`;
  } else if (filterType === 'weekly') {
    let startStr = startDate;
    let endStr = endDate;
    if (!startStr || !endStr) {
      const wk = getWeekRange(referenceDate, 0);
      startStr = wk.startDate;
      endStr = wk.endDate;
    }
    filteredWork = workEntries.filter(e => e.date >= startStr && e.date <= endStr);
    filteredPayments = payments.filter(p => p.date >= startStr && p.date <= endStr);
    filteredExpenses = serviceExpenses.filter(e => e.date >= startStr && e.date <= endStr);
    periodLabel = `सप्ताह (${startStr} से ${endStr})`;
  } else if (filterType === 'custom' && startDate && endDate) {
    filteredWork = workEntries.filter(e => e.date >= startDate && e.date <= endDate);
    filteredPayments = payments.filter(p => p.date >= startDate && p.date <= endDate);
    filteredExpenses = serviceExpenses.filter(e => e.date >= startDate && e.date <= endDate);
    periodLabel = `अवधि (${startDate} से ${endDate})`;
  } else {
    // Monthly
    filteredWork = workEntries.filter(e => (e.date || '').startsWith(yearMonth));
    filteredPayments = payments.filter(p => (p.date || '').startsWith(yearMonth));
    filteredExpenses = serviceExpenses.filter(e => (e.date || '').startsWith(yearMonth));
    periodLabel = `इस महीने (${yearMonth})`;
  }

  // High-level aggregates
  const totalLabourEarned = filteredWork.reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0);
  const totalPaymentsMade = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const totalWeightProcessedKg = filteredWork.reduce((sum, e) => sum + (Number(e.totalWeightKg || e.totalKg) || 0), 0);
  const totalWorkBags = filteredWork.reduce((sum, e) => sum + (Number(e.totalBags) || 0), 0);
  const totalWorkBatches = filteredWork.reduce((sum, e) => sum + (Number(e.totalBatches) || 0), 0);

  let totalServiceExpenses = 0;
  let contractorExpenses = 0;
  let allocatedDeductions = 0;

  filteredExpenses.forEach(exp => {
    const amt = Number(exp.amount) || 0;
    totalServiceExpenses += amt;
    if (exp.allocationType === 'contractor_expense') {
      contractorExpenses += amt;
    } else {
      allocatedDeductions += amt;
    }
  });

  const totalRemainingBalance = Math.round(
    (totalLabourEarned - totalPaymentsMade - allocatedDeductions) * 100
  ) / 100;

  // Distinct working days
  const workingDaysSet = new Set(filteredWork.map(e => e.date));
  const workingDays = workingDaysSet.size;

  // Individual summaries
  const individualSummaries = labourers.map(lab => {
    const labStatement = calculateLabourerStatement({
      labourerId: lab.id,
      yearMonth: filterType === 'monthly' ? yearMonth : (referenceDate || '2026-11').slice(0, 7),
      workEntries: filteredWork,
      payments: filteredPayments,
      serviceExpenses: filteredExpenses,
      labourers,
    });
    return {
      ...labStatement,
      isActive: lab.isActive,
    };
  });

  return {
    filterType,
    periodLabel,
    referenceDate,
    yearMonth,
    totalWeightProcessedKg: Math.round(totalWeightProcessedKg * 100) / 100,
    totalWorkBags,
    totalWorkBatches,
    totalLabourEarned: Math.round(totalLabourEarned * 100) / 100,
    totalPaymentsMade: Math.round(totalPaymentsMade * 100) / 100,
    totalServiceExpenses: Math.round(totalServiceExpenses * 100) / 100,
    contractorExpenses: Math.round(contractorExpenses * 100) / 100,
    allocatedDeductions: Math.round(allocatedDeductions * 100) / 100,
    totalRemainingBalance,
    workingDays,
    individualSummaries,
    workEntries: filteredWork,
    payments: filteredPayments,
    serviceExpenses: filteredExpenses,
  };
}

