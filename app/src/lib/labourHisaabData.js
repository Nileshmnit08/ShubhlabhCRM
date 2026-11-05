/**
 * LH-CLOUD-SYNC-01 (CRM side): pure helpers for the Labour Hisaab page.
 *
 * Source: the secure LabourHisaab tables/views (proposal 249), read-only for CRM admins.
 * Rows arrive from the LabourHisaab app's cloud sync. No sample data, no fallbacks:
 * missing values are zero, and an empty period is an empty state.
 */

export const WORK_TYPE_LABELS = {
  mix: 'मिक्स बनाना (Mix)',
  pallet: 'पैलेट बनाना (Pallet)',
  maize_daliya: 'मक्का दलिया (Maize Daliya)',
  maize_flour: 'मक्का आटा (Maize Flour)',
  chana_churi: 'चना चूरी (Chana Churi)',
  unloading_weight: 'उतराई (Unloading, weight)',
  unloading_bag: 'अनलोडिंग (Unloading, bags)',
  bag_stitching: 'बैग सिलाई (Bag Stitching)',
  material_transfer: 'माल पलटाई (Material Transfer)',
  premix: 'प्रीमिक्स (Premix)',
  paddy_labour: 'धान लेबर (Paddy Labour)',
};

export const workTypeLabel = (id) => WORK_TYPE_LABELS[id] || String(id || '—');

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n) => Math.round(n * 100) / 100;

/** "5000 kg (100 बोरी)" / "120 बोरी" / "2 बैच" / "फिक्स राशि" from an entry row. */
export function quantityLabel(entry) {
  const unit = entry.rate_unit_snapshot;
  if (unit === 'Per 100 kg') return `${num(entry.total_weight_kg).toLocaleString('en-IN')} kg (${num(entry.total_bags).toLocaleString('en-IN')} बोरी)`;
  if (unit === 'Per bag') return `${num(entry.total_bags).toLocaleString('en-IN')} बोरी`;
  if (unit === 'Per batch') return `${num(entry.total_batches).toLocaleString('en-IN')} बैच`;
  return 'फिक्स राशि';
}

export function rateLabel(entry) {
  const r = num(entry.rate_snapshot);
  const unit = entry.rate_unit_snapshot;
  if (unit === 'Per 100 kg') return `₹${r} / 100 kg`;
  if (unit === 'Per bag') return `₹${r} / बोरी`;
  if (unit === 'Per batch') return `₹${r} / बैच`;
  return '—';
}

/**
 * Headline figures for the filtered period.
 *  totalWage      = Σ entry amounts (same figure the app's Home shows per day)
 *  earned         = Σ labourer shares (what is owed to people)
 *  pending        = earned − paid − allocated deductions (contractor expenses excluded)
 */
export function summarize({ entries = [], lines = [], payments = [], deductions = [] }) {
  const totalWage = round2(entries.reduce((s, e) => s + num(e.calculated_labour_amount), 0));
  const earned = round2(lines.reduce((s, l) => s + num(l.allocated_amount), 0));
  const paid = round2(payments.reduce((s, p) => s + num(p.amount), 0));
  const deducted = round2(deductions.reduce((s, d) => s + num(d.allocated_amount), 0));
  return {
    entryCount: entries.length,
    workDays: new Set(entries.map(e => e.work_date)).size,
    labourersWorked: new Set(lines.map(l => l.labourer_id)).size,
    totalWage,
    earned,
    paid,
    deducted,
    pending: round2(earned - paid - deducted),
  };
}

/** One row per work entry, newest first, with the labourers who shared it. */
export function dailyRows({ entries = [], lines = [], contractorsById = {}, labourersById = {} }) {
  const people = new Map();
  lines.forEach(l => {
    const list = people.get(l.work_entry_id) || [];
    list.push({ name: labourersById[l.labourer_id]?.name || l.labourer_name || '—', amount: num(l.allocated_amount) });
    people.set(l.work_entry_id, list);
  });
  return [...entries]
    .sort((a, b) => (a.work_date < b.work_date ? 1 : a.work_date > b.work_date ? -1 : 0))
    .map(e => ({
      id: e.id,
      date: e.work_date,
      contractor: contractorsById[e.contractor_id]?.name || '—',
      workType: workTypeLabel(e.work_type),
      quantity: quantityLabel(e),
      rate: rateLabel(e),
      amount: num(e.calculated_labour_amount),
      labourers: people.get(e.id) || [],
      status: e.approval_status || null,
      source: e.entry_source || null,
      entry: e,
    }));
}

/** Per-labourer balances for the period (sorted: largest amount still owed first). */
export function labourerBalances({ lines = [], payments = [], deductions = [], labourersById = {} }) {
  const by = new Map();
  const row = (id) => {
    if (!by.has(id)) {
      const lab = labourersById[id] || {};
      by.set(id, { id, name: lab.name || '—', localId: lab.local_id || '', active: lab.active_status !== false,
        days: new Set(), earned: 0, paid: 0, deducted: 0 });
    }
    return by.get(id);
  };
  lines.forEach(l => { const r = row(l.labourer_id); r.earned += num(l.allocated_amount); r.days.add(l.work_date); });
  payments.forEach(p => { row(p.labourer_id).paid += num(p.amount); });
  deductions.forEach(d => { row(d.labourer_id).deducted += num(d.allocated_amount); });
  return [...by.values()]
    .map(r => ({ ...r, days: r.days.size, earned: round2(r.earned), paid: round2(r.paid), deducted: round2(r.deducted),
      balance: round2(r.earned - r.paid - r.deducted) }))
    .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name));
}

// ─────────────────────────────────────────────────────────────────────────────
// LH-CRM-APPROVED-SUMMARY-ADMIN-CRUD-09: only APPROVED work counts.
// Approval is per contractor-day (labour_daily_registers). Missing / Pending / Rejected /
// anything else = not approved. With proposal 255 the database supplies approval_status and the
// approved-only views; without it the same rule is applied here from the registers.
// ─────────────────────────────────────────────────────────────────────────────
export const APPROVED = 'Approved';
export const isApproved = (status) => status === APPROVED;

/** Adds approval_status to entries from register rows (fallback when 255 is not installed). */
export function attachApprovalStatus(entries = [], registers = []) {
  const byDay = new Map(registers.map(r => [`${r.contractor_id}|${String(r.work_date).slice(0, 10)}`, r.status]));
  return entries.map(e => ({ ...e, approval_status: byDay.get(`${e.contractor_id}|${String(e.work_date).slice(0, 10)}`) || 'Pending' }));
}

/** Approved entries and the labourer shares that belong to them (same rule for both). */
export function approvedOnly({ entries = [], lines = [] }) {
  const approved = entries.filter(e => isApproved(e.approval_status));
  const ids = new Set(approved.map(e => e.id));
  return { entries: approved, lines: lines.filter(l => ids.has(l.work_entry_id)) };
}

/** What is NOT counted (shown next to the totals so nothing is silently hidden). */
export function notCountedSummary(entries = []) {
  const out = { count: 0, amount: 0, byStatus: {} };
  entries.filter(e => !isApproved(e.approval_status)).forEach(e => {
    const st = e.approval_status || 'Pending';
    out.count += 1;
    out.amount = round2(out.amount + num(e.calculated_labour_amount));
    out.byStatus[st] = (out.byStatus[st] || 0) + 1;
  });
  return out;
}

export const UNITS = ['Per 100 kg', 'Per bag', 'Per batch', 'Fixed amount'];

/**
 * Command Center KPIs: Approved, Pending, Total Recorded, Paid, Deductions, Payable Now, Labourers.
 * Guarantees pending/rejected never inflate approved wages or payable balance.
 */
export function commandCenterMetrics({ entries = [], lines = [], payments = [], deductions = [] }) {
  const approved = entries.filter(e => isApproved(e.approval_status));
  const pending = entries.filter(e => !isApproved(e.approval_status) && e.approval_status !== 'Rejected');
  const rejected = entries.filter(e => e.approval_status === 'Rejected');

  const approvedWage = round2(approved.reduce((s, e) => s + num(e.calculated_labour_amount), 0));
  const pendingWage = round2(pending.reduce((s, e) => s + num(e.calculated_labour_amount), 0));
  const rejectedWage = round2(rejected.reduce((s, e) => s + num(e.calculated_labour_amount), 0));
  const totalRecordedWage = round2(approvedWage + pendingWage);

  const approvedEntryIds = new Set(approved.map(e => e.id));
  const approvedLines = lines.filter(l => approvedEntryIds.has(l.work_entry_id));
  const approvedEarned = round2(approvedLines.reduce((s, l) => s + num(l.allocated_amount), 0));

  const pendingEntryIds = new Set(pending.map(e => e.id));
  const pendingLines = lines.filter(l => pendingEntryIds.has(l.work_entry_id));
  const pendingEarned = round2(pendingLines.reduce((s, l) => s + num(l.allocated_amount), 0));

  const paid = round2(payments.reduce((s, p) => s + num(p.amount), 0));
  const deductionsTotal = round2(deductions.reduce((s, d) => s + num(d.allocated_amount), 0));
  const payableNow = round2(approvedEarned - paid - deductionsTotal);

  const labourersWorked = new Set(approvedLines.map(l => l.labourer_id)).size;
  const avgApprovedPerLabourer = labourersWorked > 0 ? round2(approvedEarned / labourersWorked) : 0;
  const workDays = new Set(approved.map(e => e.work_date)).size;

  return {
    approvedWage,
    approvedCount: approved.length,
    pendingWage,
    pendingCount: pending.length,
    rejectedWage,
    rejectedCount: rejected.length,
    totalRecordedWage,
    totalRecordedCount: approved.length + pending.length,
    totalEntriesCount: entries.length,
    approvedEarned,
    pendingEarned,
    paid,
    deductions: deductionsTotal,
    payableNow,
    labourersWorked,
    avgApprovedPerLabourer,
    workDays,
  };
}

/**
 * Groups daily rows by date (newest first) with subtotals and day statuses.
 */
export function groupedDailyEntries({ entries = [], lines = [], contractorsById = {}, labourersById = {} }) {
  const rows = dailyRows({ entries, lines, contractorsById, labourersById });
  const byDate = new Map();

  rows.forEach(r => {
    if (!byDate.has(r.date)) {
      byDate.set(r.date, []);
    }
    byDate.get(r.date).push(r);
  });

  const sortedDates = [...byDate.keys()].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));

  return sortedDates.map(date => {
    const dateRows = byDate.get(date);
    const approvedRows = dateRows.filter(r => isApproved(r.status));
    const pendingRows = dateRows.filter(r => !isApproved(r.status));

    const totalApprovedAmount = round2(approvedRows.reduce((s, r) => s + num(r.amount), 0));
    const totalPendingAmount = round2(pendingRows.reduce((s, r) => s + num(r.amount), 0));
    const totalAmount = round2(dateRows.reduce((s, r) => s + num(r.amount), 0));
    const totalWeightKg = dateRows.reduce((s, r) => s + num(r.entry?.total_weight_kg), 0);
    const totalBags = dateRows.reduce((s, r) => s + num(r.entry?.total_bags), 0);
    const totalBatches = dateRows.reduce((s, r) => s + num(r.entry?.total_batches), 0);

    const statuses = new Set(dateRows.map(r => r.status || 'Pending'));
    let dayStatus = 'Pending';
    if (statuses.size === 1) {
      dayStatus = [...statuses][0];
    } else if (statuses.has('Approved') && (statuses.has('Pending') || statuses.has('Rejected'))) {
      dayStatus = 'Mixed';
    }

    const uniqueLabourerNames = new Set();
    dateRows.forEach(r => {
      (r.labourers || []).forEach(l => {
        if (l.name && l.name !== '—') uniqueLabourerNames.add(l.name);
      });
    });

    return {
      date,
      rows: dateRows,
      entryCount: dateRows.length,
      totalApprovedAmount,
      totalPendingAmount,
      totalAmount,
      totalWeightKg,
      totalBags,
      totalBatches,
      dayStatus,
      labourerCount: uniqueLabourerNames.size,
    };
  });
}

/**
 * Detailed labourer balances and history for drill-down.
 */
export function detailedLabourerLedger({ lines = [], payments = [], deductions = [], entries = [], labourersById = {} }) {
  const entriesById = Object.fromEntries(entries.map(e => [e.id, e]));
  const by = new Map();

  const getLabourer = (id) => {
    if (!by.has(id)) {
      const lab = labourersById[id] || {};
      by.set(id, {
        id,
        name: lab.name || '—',
        localId: lab.local_id || '',
        active: lab.active_status !== false,
        approvedDays: new Set(),
        pendingDays: new Set(),
        approvedEarned: 0,
        pendingEarned: 0,
        paid: 0,
        deducted: 0,
        workHistory: [],
        paymentHistory: [],
        deductionHistory: [],
      });
    }
    return by.get(id);
  };

  lines.forEach(l => {
    const r = getLabourer(l.labourer_id);
    const entry = entriesById[l.work_entry_id] || {};
    const approved = isApproved(entry.approval_status);
    const amount = num(l.allocated_amount);
    if (approved) {
      r.approvedEarned += amount;
      r.approvedDays.add(l.work_date);
    } else {
      r.pendingEarned += amount;
      r.pendingDays.add(l.work_date);
    }
    r.workHistory.push({
      id: l.allocation_id || `${l.work_entry_id}_${l.labourer_id}`,
      workEntryId: l.work_entry_id,
      date: l.work_date,
      workType: workTypeLabel(entry.work_type),
      quantity: quantityLabel(entry),
      rate: rateLabel(entry),
      allocatedAmount: amount,
      status: entry.approval_status || 'Pending',
    });
  });

  payments.forEach(p => {
    const r = getLabourer(p.labourer_id);
    const amount = num(p.amount);
    r.paid += amount;
    r.paymentHistory.push({
      id: p.id,
      date: p.payment_date,
      amount,
      method: p.payment_method || 'Cash',
    });
  });

  deductions.forEach(d => {
    const r = getLabourer(d.labourer_id);
    const amount = num(d.allocated_amount);
    r.deducted += amount;
    r.deductionHistory.push({
      id: d.id || `${d.expense_id}_${d.labourer_id}`,
      expenseId: d.expense_id,
      amount,
    });
  });

  return [...by.values()]
    .map(r => {
      const approvedEarned = round2(r.approvedEarned);
      const pendingEarned = round2(r.pendingEarned);
      const paid = round2(r.paid);
      const deducted = round2(r.deducted);
      const totalEarned = round2(approvedEarned + pendingEarned);
      const payableBalance = round2(approvedEarned - paid - deducted);

      r.workHistory.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
      r.paymentHistory.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

      return {
        ...r,
        approvedDays: r.approvedDays.size,
        pendingDays: r.pendingDays.size,
        approvedEarned,
        pendingEarned,
        totalEarned,
        paid,
        deducted,
        payableBalance,
      };
    })
    .sort((a, b) => b.payableBalance - a.payableBalance || a.name.localeCompare(b.name));
}

/**
 * Breakdown by work type.
 */
export function workTypeSummary({ entries = [] }) {
  const byType = new Map();

  entries.forEach(e => {
    const t = e.work_type || 'other';
    if (!byType.has(t)) {
      byType.set(t, {
        workType: t,
        label: workTypeLabel(t),
        unit: e.rate_unit_snapshot || '',
        count: 0,
        approvedCount: 0,
        pendingCount: 0,
        approvedAmount: 0,
        pendingAmount: 0,
        totalAmount: 0,
        totalWeightKg: 0,
        totalBags: 0,
        totalBatches: 0,
      });
    }
    const row = byType.get(t);
    const amt = num(e.calculated_labour_amount);
    const approved = isApproved(e.approval_status);
    row.count += 1;
    row.totalAmount = round2(row.totalAmount + amt);
    row.totalWeightKg += num(e.total_weight_kg);
    row.totalBags += num(e.total_bags);
    row.totalBatches += num(e.total_batches);
    if (approved) {
      row.approvedCount += 1;
      row.approvedAmount = round2(row.approvedAmount + amt);
    } else {
      row.pendingCount += 1;
      row.pendingAmount = round2(row.pendingAmount + amt);
    }
  });

  return [...byType.values()].sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * Export daily register rows to CSV string.
 */
export function generateDailyRegisterCsv(groupedRows = [], { contractorName = '', fromDate = '', toDate = '' } = {}) {
  const headers = ['Date', 'Contractor', 'Work Type', 'Quantity', 'Rate', 'Amount (INR)', 'Status', 'Labourer Count', 'Labourers'];
  const lines = [
    `# Labour Hisaab - Daily Register`,
    `# Period: ${fromDate} to ${toDate}`,
    `# Contractor: ${contractorName || 'All'}`,
    headers.join(','),
  ];

  const escape = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
  groupedRows.forEach(g => {
    g.rows.forEach(r => {
      const labourersStr = (r.labourers || []).map(l => `${l.name} (${l.amount})`).join('; ');
      lines.push([
        r.date,
        escape(r.contractor),
        escape(r.workType),
        escape(r.quantity),
        escape(r.rate),
        r.amount,
        escape(r.status || 'Pending'),
        (r.labourers || []).length,
        escape(labourersStr),
      ].join(','));
    });
  });

  return lines.join('\n');
}

/**
 * Export labourer balances to CSV string.
 */
export function generateLabourerBalancesCsv(labourers = [], { contractorName = '', fromDate = '', toDate = '' } = {}) {
  const headers = ['Labourer Name', 'Local ID', 'Status', 'Days Worked', 'Approved Earned (INR)', 'Pending Earned (INR)', 'Total Earned (INR)', 'Paid (INR)', 'Deductions (INR)', 'Payable Balance (INR)'];
  const lines = [
    `# Labour Hisaab - Labourer Balances`,
    `# Period: ${fromDate} to ${toDate}`,
    `# Contractor: ${contractorName || 'All'}`,
    headers.join(','),
  ];

  const escape = (v) => `"${String(v || '').replace(/"/g, '""')}"`;
  labourers.forEach(l => {
    lines.push([
      escape(l.name),
      escape(l.localId),
      l.active ? 'Active' : 'Inactive',
      l.approvedDays || l.days || 0,
      l.approvedEarned ?? l.earned ?? 0,
      l.pendingEarned ?? 0,
      l.totalEarned ?? l.earned ?? 0,
      l.paid ?? 0,
      l.deducted ?? 0,
      l.payableBalance ?? l.balance ?? 0,
    ].join(','));
  });

  return lines.join('\n');
}

/** Amount the server will compute (fn_calculate_work_amount) — preview only. */
export function previewAmount({ rate, unit, totalWeightKg = 0, totalBags = 0, totalBatches = 0 }) {
  const r = num(rate);
  if (unit === 'Per 100 kg') return round2((num(totalWeightKg) / 100) * r);
  if (unit === 'Per bag') return round2(num(totalBags) * r);
  if (unit === 'Per batch') return round2(num(totalBatches) * r);
  return round2(r);
}

/** Validation for the admin add/edit form (the database validates again). Returns an error or null. */
export function adminEntryError(f, todayYmd) {
  if (!f.contractorId) return 'Choose a contractor.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.workDate || '')) return 'Choose the work date.';
  if (todayYmd && f.workDate > todayYmd) return 'Work date cannot be in the future.';
  if (!String(f.workType || '').trim()) return 'Choose the work type.';
  if (!UNITS.includes(f.unit)) return 'Choose the unit.';
  const n = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));
  if (f.unit === 'Per 100 kg' && !(n(f.totalWeightKg) >= 0)) return 'Enter the total weight (kg).';
  if (f.unit === 'Per bag' && !(n(f.totalBags) >= 0 && Number.isInteger(n(f.totalBags)))) return 'Enter the number of bags (whole number).';
  if (f.unit === 'Per batch' && !(n(f.totalBatches) >= 0 && Number.isInteger(n(f.totalBatches)))) return 'Enter the number of batches (whole number).';
  if (f.rate !== '' && f.rate !== null && f.rate !== undefined && !(Number(f.rate) >= 0)) return 'Rate cannot be negative.';
  if (f.unit === 'Fixed amount' && (f.rate === '' || f.rate === null || f.rate === undefined)) return 'Enter the fixed amount.';
  if (!Array.isArray(f.labourerIds) || f.labourerIds.length === 0) return 'Select at least one labourer.';
  return null;
}

/** True when the error means the LabourHisaab tables are not installed yet. */
export function isNotConnectedError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return code === 'PGRST205' || code === '42P01' || msg.includes('could not find the table')
    || (msg.includes('relation') && msg.includes('does not exist'));
}

export const isPermissionError = (error) => !!error && (String(error.code) === '42501' || /permission denied/i.test(error.message || ''));

export const formatInr = (n) => `₹${num(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

/** First day of the month of a 'YYYY-MM-DD' date. */
export const monthStart = (ymd) => `${String(ymd).slice(0, 7)}-01`;
