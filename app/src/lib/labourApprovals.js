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

export const EVENT_LABELS = {
  Created: 'Register created (Pending)',
  Approved: 'Approved',
  Rejected: 'Rejected',
  Reopened: 'Changed after decision — back to Pending',
};

/** True when the error means proposal 252 is not installed yet. */
export function isRegisterNotInstalled(error) {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  return String(error.code) === 'PGRST205' || String(error.code) === '42P01'
    || (msg.includes('labour_daily_registers') || msg.includes('v_lh_daily_registers')) && (msg.includes('could not find') || msg.includes('does not exist'));
}
