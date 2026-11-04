// Daily labour register (LH-DAILY-REGISTER-APPROVAL-01).
// Pure module (no React Native imports) so it is unit-tested in Node.
//
// Times are stored as UTC instants (ISO 'Z') and always SHOWN in India Standard Time.
// IST is UTC+05:30 all year (no daylight saving), so the conversion is a fixed offset and
// does not depend on the phone's time-zone setting or Intl support.
// The business date ('YYYY-MM-DD') is chosen on the phone and is never derived from a timestamp.

import { contentHash, entrySyncStatus } from '../services/CloudSync.js';

const IST_OFFSET_MIN = 330;
const pad = (n) => String(n).padStart(2, '0');

const istParts = (iso) => {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return null;
  const d = new Date(t + IST_OFFSET_MIN * 60000);
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() };
};

/** '14:05' in IST, or '' for a missing/invalid time. */
export function formatIstTime(iso) {
  const p = istParts(iso);
  return p ? `${pad(p.h)}:${pad(p.mi)}` : '';
}

/** '03-11-2026 14:05 IST', or '' for a missing/invalid time. */
export function formatIstDateTime(iso) {
  const p = istParts(iso);
  return p ? `${pad(p.d)}-${pad(p.mo)}-${p.y} ${pad(p.h)}:${pad(p.mi)} IST` : '';
}

/** IST calendar date ('YYYY-MM-DD') of an instant. */
export function istYmd(iso) {
  const p = istParts(iso);
  return p ? `${p.y}-${pad(p.mo)}-${pad(p.d)}` : null;
}

/** 'HH:MM' → true when it is a valid 24-hour time. */
export const isValidHm = (hm) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(hm || '').trim());

/** UTC ISO instant for an IST business date + 'HH:MM' (e.g. '2026-11-03', '14:05'). */
export function istToIso(ymd, hm) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''));
  if (!m || !isValidHm(hm)) return null;
  const [h, mi] = String(hm).trim().split(':').map(Number);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), h, mi) - IST_OFFSET_MIN * 60000).toISOString();
}

/** Time the work is ordered by: completion time, else recording time. */
const sortKey = (e) => Date.parse(e.workCompletedAt || e.createdAt || '') || Number.MAX_SAFE_INTEGER;

export const SYNC_LABELS = {
  device: 'केवल फ़ोन पर — साइन इन करें (Saved on device only)',
  pending: 'सिंक नहीं — कनेक्शन की प्रतीक्षा (Not synced — waiting for connection)',
  synced: 'डेटाबेस में सहेजा गया (Saved to database)',
  failed: 'सिंक विफल — दोबारा कोशिश होगी (Sync failed)',
};

/**
 * Approval shown for a day. `register` is the server row (or undefined when the server has no
 * register yet, e.g. not synced or proposal 252 not installed) — that is still Pending:
 * nothing on the phone can approve a day.
 */
export function approvalInfo(register) {
  const status = register?.status || 'Pending';
  if (status === 'Approved') {
    return { status, label: 'Approval: Approved — Shubh Labh CRM', decidedAt: register.decided_at || null, reason: null };
  }
  if (status === 'Rejected') {
    return {
      status,
      label: 'Approval: Rejected — Shubh Labh CRM',
      decidedAt: register.decided_at || null,
      reason: register.rejection_reason || '',
      nextStep: 'प्रविष्टियाँ सुधारें और सिंक करें; दिन फिर से "Pending" होकर दोबारा स्वीकृति के लिए जाएगा।',
    };
  }
  return { status: 'Pending', label: 'Approval: Pending — Awaiting Shubh Labh CRM', decidedAt: null, reason: null, onServer: Boolean(register) };
}

/**
 * The register for one business date, from the phone's real entries.
 * Returns { date, rows (time order), totals, approval, syncCounts }.
 */
export function buildDailyRegister({ entries = [], date, syncItems = [], failed = [], registers = [], signedIn = false }) {
  const stateById = new Map(syncItems.map(s => [s.id, s]));
  const failedIds = new Set(failed.map(f => f.localId));
  const rows = entries
    .filter(e => e.date === date)
    .sort((a, b) => sortKey(a) - sortKey(b) || String(a.id).localeCompare(String(b.id)))
    .map(e => {
      const labourerIds = (e.allocations && e.allocations.length ? e.allocations.map(a => a.labourerId) : e.participatingLabourerIds) || [];
      return {
        id: e.id,
        workType: e.categoryName || e.categoryId,
        completedAt: e.workCompletedAt || null,
        recordedAt: e.createdAt || null,
        unit: e.unit,
        totalKg: Number(e.totalKg) || 0,
        totalBags: Number(e.totalBags) || 0,
        totalBatches: Number(e.totalBatches) || 0,
        labourCount: new Set(labourerIds.map(String)).size,
        amount: Number(e.totalAmount) || 0,
        sync: entrySyncStatus(e, stateById.get(e.id), failedIds, signedIn),
        hash: contentHash(e),
      };
    });
  const labourers = new Set();
  entries.filter(e => e.date === date).forEach(e => ((e.allocations && e.allocations.length ? e.allocations.map(a => a.labourerId) : e.participatingLabourerIds) || []).forEach(id => labourers.add(String(id))));
  const totals = {
    entries: rows.length,
    amount: Math.round(rows.reduce((s, r) => s + r.amount, 0) * 100) / 100,
    labourers: labourers.size,
    bags: rows.reduce((s, r) => s + r.totalBags, 0),
    kg: Math.round(rows.reduce((s, r) => s + r.totalKg, 0) * 100) / 100,
  };
  const syncCounts = rows.reduce((m, r) => ({ ...m, [r.sync]: (m[r.sync] || 0) + 1 }), {});
  const register = registers.find(r => String(r.work_date).slice(0, 10) === date);
  return { date, rows, totals, approval: approvalInfo(register), syncCounts };
}
