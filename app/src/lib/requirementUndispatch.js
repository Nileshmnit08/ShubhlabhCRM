/**
 * CRM-REQUIREMENT-UNDISPATCH-01: rules for reversing a requirement that was
 * marked "Dispatched" by mistake.
 *
 * Nothing is deleted. The reversal reuses the existing model:
 *  - dispatch records are set to status 'Cancelled' (as Dispatches/Detail does);
 *    v_requirement_dispatch_summary already excludes cancelled dispatches, so the
 *    board's dispatched quantity / progress fall back to "Not Dispatched";
 *  - the requirement goes back to the status it had before it was closed as
 *    dispatched, taken from requirement_status_history, with a new history row.
 */

// Dispatch statuses that no longer count (mirrors Dispatches/Dashboard.jsx).
export const INACTIVE_DISPATCH_STATUSES = ['Cancelled', 'Voided', 'Deleted', 'Reversed'];
// Statuses that record a real-world outcome; reversing those belongs on the Dispatch board.
const OUTCOME_DISPATCH_STATUSES = ['Delivered', 'Returned'];
// Requirement statuses written when an order is marked dispatched (List: 'Closed'; View maps 'Dispatched' → 'Closed').
const DISPATCHED_REQUIREMENT_STATUSES = ['Closed', 'Dispatched'];
export const DEFAULT_RESTORE_STATUS = 'New';

export const UNDISPATCH_REASON = 'Dispatch status corrected by admin: marked as not dispatched (set by mistake).';

export const activeDispatches = (dispatches) =>
  (dispatches || []).filter((d) => !INACTIVE_DISPATCH_STATUSES.includes(d.status));

/**
 * Whether the reversal may proceed. Returns { ok, reason }.
 * Refuses when a dispatch already has a delivery/return or recorded return
 * quantity: cancelling it would erase a real logistics outcome.
 */
export function checkUndispatch(dispatches) {
  const active = activeDispatches(dispatches);
  if (active.length === 0) return { ok: false, reason: 'No active dispatch found for this requirement. Refresh the board.' };
  const outcome = active.find((d) => OUTCOME_DISPATCH_STATUSES.includes(d.status) || Number(d.return_quantity) > 0);
  if (outcome) {
    return { ok: false, reason: `A dispatch is already marked ${outcome.status}. Correct it from the Dispatch board instead.` };
  }
  return { ok: true, reason: null };
}

/**
 * Status to restore: the old_status of the most recent history entry that moved
 * the requirement into its dispatched/closed status. Falls back to 'New'.
 * `history` rows: { old_status, new_status, changed_at | created_at }.
 */
export function restoreStatus(history) {
  const ts = (h) => new Date(h.changed_at || h.created_at || 0).getTime() || 0;
  const entry = [...(history || [])]
    .sort((a, b) => ts(b) - ts(a))
    .find((h) => DISPATCHED_REQUIREMENT_STATUSES.includes(h.new_status)
      && h.old_status && !DISPATCHED_REQUIREMENT_STATUSES.includes(h.old_status));
  return entry ? entry.old_status : DEFAULT_RESTORE_STATUS;
}

export const needsStatusRestore = (status) => DISPATCHED_REQUIREMENT_STATUSES.includes(status);
