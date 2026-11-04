/**
 * LH-DAILY-REGISTER-APPROVAL-01 (CRM side): pure helpers for the Labour Hisaab approvals page.
 *
 * Source: proposal 252 (labour_daily_registers, v_lh_daily_registers, labour_daily_register_events,
 * lh_decide_daily_register). One register = one contractor's business date. Times are shown in IST.
 */

const IST_MS = 330 * 60000;
const pad = (n) => String(n).padStart(2, '0');

/** '03-11-2026 14:05 IST' (IST is UTC+05:30 all year), or '—'. */
export function formatIst(iso) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return '—';
  const d = new Date(t + IST_MS);
  return `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} IST`;
}

/** '14:05' in IST, or '—'. */
export function formatIstTime(iso) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return '—';
  const d = new Date(t + IST_MS);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export const STATUS_ORDER = { Pending: 0, Rejected: 1, Approved: 2 };

/** Registers for the list: Pending first, then newest date first. */
export function sortRegisters(rows = []) {
  return [...rows].sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
    || (a.work_date < b.work_date ? 1 : a.work_date > b.work_date ? -1 : 0)
    || String(a.contractor_name || '').localeCompare(String(b.contractor_name || '')));
}

/** Work entries of one register in time order (completed, else recorded, else server time). */
export function registerTimeline(entries = [], lines = []) {
  const people = new Map();
  lines.forEach(l => {
    const list = people.get(l.work_entry_id) || [];
    list.push({ name: l.labourer_name || '—', amount: Number(l.allocated_amount) || 0 });
    people.set(l.work_entry_id, list);
  });
  const key = (e) => Date.parse(e.work_completed_at || e.recorded_at || e.created_at || '') || Number.MAX_SAFE_INTEGER;
  return [...entries]
    .sort((a, b) => key(a) - key(b) || String(a.id).localeCompare(String(b.id)))
    .map(e => ({ ...e, labourers: people.get(e.id) || [] }));
}

/** Totals of one register, from its real entries. */
export function registerTotals(entries = [], lines = []) {
  return {
    entries: entries.length,
    amount: Math.round(entries.reduce((s, e) => s + (Number(e.calculated_labour_amount) || 0), 0) * 100) / 100,
    labourers: new Set(lines.map(l => l.labourer_id)).size,
    bags: entries.reduce((s, e) => s + (Number(e.total_bags) || 0), 0),
  };
}

/** Client-side check before calling lh_decide_daily_register (the server enforces it again). */
export function decisionError({ decision, reason }) {
  if (decision !== 'Approved' && decision !== 'Rejected') return 'Choose Approve or Reject.';
  const r = String(reason || '').trim();
  if (decision === 'Rejected' && !r) return 'A rejection needs a reason the operator can act on.';
  if (r.length > 1000) return 'Reason must be 1000 characters or fewer.';
  return null;
}

/**
 * LH-CRM-APPROVAL-ACTION-FIX-10: one approve/reject call, as the page runs it.
 * Success ONLY when the database returns the register with the requested status.
 * Errors are turned into messages an approver can act on (the database stays the authority).
 * → { ok, status, message, stale? }
 */
const ymd = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : String(d || '').slice(0, 10));

export async function decideRegister({ rpc, register, decision, reason }) {
  const err = decisionError({ decision, reason });
  if (err) return { ok: false, message: err };
  const { data, error } = await rpc('lh_decide_daily_register', {
    p_contractor: register.contractor_id, p_date: ymd(register.work_date), p_decision: decision,
    p_revision: register.revision, p_reason: decision === 'Rejected' ? String(reason).trim() : null,
  });
  if (error) {
    const msg = String(error.message || error);
    if (/member of/i.test(msg)) {
      return { ok: false, message: 'You cannot decide this register: your account is linked to this contractor in the LabourHisaab app (as Owner, Manager or Operator). Another CRM admin who is not linked to it must approve or reject it.' };
    }
    if (/changed while you were reviewing/i.test(msg)) {
      return { ok: false, stale: true, message: 'The register changed while you were reviewing it (new or edited work). It has been reloaded — review it again before deciding.' };
    }
    if (/changed entries of this day/i.test(msg)) {
      return { ok: false, message: 'You changed entries of this day, so another CRM admin must approve or reject it.' };
    }
    if (/already (Approved|Rejected)/i.test(msg)) {
      return { ok: false, stale: true, message: `${msg}. It has been reloaded.` };
    }
    if (/Only a Shubh Labh CRM approver/i.test(msg) || String(error.code) === '42501') {
      return { ok: false, message: 'Only Shubh Labh CRM admins can approve or reject registers.' };
    }
    return { ok: false, message: `Not saved: ${msg}` };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || row.status !== decision) {
    return { ok: false, stale: true, message: 'The database did not confirm the decision. The register has been reloaded — check its status before trying again.' };
  }
  return { ok: true, status: row.status, message: `${register.contractor_name || 'Register'} · ${ymd(register.work_date)}: ${row.status}${row.status === 'Rejected' ? ' (reason sent to the operator)' : ''}.` };
}

/**
 * Runs `fn` at most once at a time: calls made while it is running are ignored (resolve to
 * undefined), so a double click can never send a second approve/reject request.
 */
export function singleFlight(fn) {
  let running = false;
  return async (...args) => {
    if (running) return undefined;
    running = true;
    try { return await fn(...args); } finally { running = false; }
  };
}

export const EVENT_LABELS = {
  Created: 'Register created (Pending)',
  Approved: 'Approved',
  Rejected: 'Rejected',
  Reopened: 'Changed after decision — back to Pending',
};

const DIFF_FIELDS = [
  ['work_type', 'Work'], ['total_bags', 'Bags'], ['total_weight_kg', 'Weight (kg)'], ['total_batches', 'Batches'],
  ['rate_snapshot', 'Rate'], ['rate_unit_snapshot', 'Unit'], ['calculated_labour_amount', 'Amount'],
  ['notes', 'Notes'], ['work_completed_at', 'Completed at'], ['shares', 'Labourers'],
];
const norm = (field, v) => {
  if (v === null || v === undefined || v === '') return '';
  if (field === 'work_completed_at') { const t = Date.parse(v); return Number.isFinite(t) ? new Date(t).toISOString() : String(v); }
  if (['total_bags', 'total_weight_kg', 'total_batches', 'rate_snapshot', 'calculated_labour_amount'].includes(field)) return String(Number(v));
  return String(v);
};
const sharesText = (shares) => [...(shares || [])]
  .map(s => `${s.labourer_name || s.name || '—'} ${Number(s.allocated_amount ?? s.amount) || 0}`).sort().join(', ');

/**
 * Original (last APPROVED snapshot, proposal 253) vs revised (current rows) for one day.
 * Returns [{ id, change: 'edited' | 'added' | 'removed' | 'same', before, after, fields: [{ field, label, before, after }] }].
 * `lines` are the current v_labour_work_lines rows of the day.
 */
export function diffAgainstApproved(snapshotEntries = [], currentEntries = [], lines = []) {
  const currentShares = new Map();
  lines.forEach(l => {
    const list = currentShares.get(l.work_entry_id) || [];
    list.push({ labourer_name: l.labourer_name, allocated_amount: l.allocated_amount });
    currentShares.set(l.work_entry_id, list);
  });
  const before = new Map(snapshotEntries.map(e => [e.id, { ...e, shares: sharesText(e.shares) }]));
  const after = new Map(currentEntries.map(e => [e.id, { ...e, shares: sharesText(currentShares.get(e.id)) }]));
  const out = [];
  for (const [id, a] of after) {
    const b = before.get(id);
    if (!b) { out.push({ id, change: 'added', before: null, after: a, fields: [] }); continue; }
    const fields = DIFF_FIELDS.filter(([f]) => norm(f, b[f]) !== norm(f, a[f])).map(([f, label]) => ({ field: f, label, before: b[f], after: a[f] }));
    out.push({ id, change: fields.length ? 'edited' : 'same', before: b, after: a, fields });
  }
  for (const [id, b] of before) if (!after.has(id)) out.push({ id, change: 'removed', before: b, after: null, fields: [] });
  const order = { edited: 0, added: 1, removed: 2, same: 3 };
  return out.sort((x, y) => order[x.change] - order[y.change]);
}

/** True when the error means proposal 252 is not installed yet. */
export function isRegisterNotInstalled(error) {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  return String(error.code) === 'PGRST205' || String(error.code) === '42P01'
    || (msg.includes('labour_daily_registers') || msg.includes('v_lh_daily_registers')) && (msg.includes('could not find') || msg.includes('does not exist'));
}
