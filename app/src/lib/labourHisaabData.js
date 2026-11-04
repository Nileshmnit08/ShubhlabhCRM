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
