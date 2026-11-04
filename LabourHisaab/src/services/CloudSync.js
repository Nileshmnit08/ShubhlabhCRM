// CloudSync for LabourHisaab (LH-CLOUD-SYNC-01)
// Uploads device-saved work entries and the labourer roster to the secure LabourHisaab
// tables (proposal 249) so the CRM can show them. Device storage stays the source of truth
// on the phone; sync is one-way (phone → cloud) and safe to repeat.
//
// Pure module: the database operations are injected (`adapter`), so the same code runs in the
// app (Supabase) and in tests (local PostgreSQL with the real 249/250 rules).
//
// Guarantees:
//  - Every entry gets a permanent server UUID before its first upload (saved first), so a
//    retry or an interrupted sync never creates a duplicate.
//  - An entry is re-uploaded only when its content changed (content hash).
//  - Deleting a synced entry on the phone queues a server delete, uploaded on the next sync.
//  - The server re-checks everything (access rules, amount = rate × quantity, closed months);
//    a rejected entry is reported and retried next time, never marked as synced.

export const SYNC_KEYS = {
  state: '@labourhisaab/v1/sync_state',     // items: [{ id: localEntryId, serverId, hash, syncedAt }]
  deletes: '@labourhisaab/v1/sync_deletes', // items: [{ id: serverId }]
};

const UNIT_TO_SERVER = {
  per_100_kg: 'Per 100 kg',
  per_bag: 'Per bag',
  per_batch: 'Per batch',
  fixed: 'Fixed amount',
};

// Roles (contractor_members, proposal 251): who may upload, and who may delete on the server.
export const ENTRY_ROLES = ['Owner', 'Manager', 'Operator'];
export const DELETE_ROLES = ['Owner', 'Manager'];
export const OPERATOR_DELETE_MESSAGE = 'सिंक हो चुकी एंट्री केवल मालिक या मैनेजर हटा सकते हैं।';

/**
 * Choose the contractor this phone uploads to from the user's active memberships
 * ([{ contractor_id, role }]). One phone = one contractor: if the account may enter data for
 * more than one contractor, refuse rather than guess (a wrong guess files records under the
 * wrong contractor). Read-only memberships are returned only when nothing writable exists.
 */
export function pickMembership(rows) {
  const list = rows || [];
  const writable = list.filter(r => ENTRY_ROLES.includes(r.role));
  if (new Set(writable.map(r => r.contractor_id)).size > 1) {
    throw new Error('यह खाता एक से अधिक ठेकेदार से जुड़ा है। हर फ़ोन के लिए एक ठेकेदार का खाता इस्तेमाल करें।');
  }
  const best = ENTRY_ROLES.map(role => writable.find(r => r.role === role)).find(Boolean) || list[0];
  return best ? { contractorId: best.contractor_id, role: best.role } : null;
}

// Synced rate rows start here so any historical work date falls inside the period.
export const SYNC_RATE_EFFECTIVE_FROM = '2000-01-01';

/** RFC 4122 v4 UUID (random source injectable for tests). */
export function makeUuid(random = Math.random) {
  const hex = [];
  for (let i = 0; i < 16; i++) hex.push(Math.floor(random() * 256));
  hex[6] = (hex[6] & 0x0f) | 0x40;
  hex[8] = (hex[8] & 0x3f) | 0x80;
  const h = hex.map(b => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** Stable short hash of what the server stores for an entry (djb2 over canonical JSON). */
export function contentHash(entry) {
  const canonical = JSON.stringify([
    entry.date, entry.categoryId, entry.type, entry.unit, Number(entry.rate), Number(entry.totalAmount),
    Number(entry.totalKg) || 0, Number(entry.totalBags) || 0, Number(entry.totalBatches) || 0, entry.notes || '',
    (entry.bagLines || []).map(l => [Number(l.bagWeightKg) || 0, Number(l.bagCount) || 0]),
    (entry.allocations || []).map(a => [a.labourerId, Number(a.allocatedAmount) || 0]),
  ]);
  let h = 5381;
  for (let i = 0; i < canonical.length; i++) h = ((h << 5) + h + canonical.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

export const serverUnitFor = (unit) => UNIT_TO_SERVER[unit] || null;

/** Server labourer row for a device labourer (stable local id → (contractor_id, local_id)). */
export function labourerRow(contractorId, lab, today) {
  return {
    contractor_id: contractorId,
    local_id: String(lab.id),
    name: String(lab.name || '').trim() || String(lab.id),
    phone: lab.phone ? String(lab.phone) : null,
    role: lab.role || 'सामान्य मजदूर',
    active_status: lab.isActive !== false,
    join_date: lab.joinDate || today,
    notes: lab.notes || null,
  };
}

/**
 * Builds the server rows for one entry. Throws a readable error when the entry cannot be
 * represented (e.g. unknown unit or a labourer the server does not know).
 */
export function planEntry(entry, { serverId, contractorId, rate, labourerIds }) {
  const unit = serverUnitFor(entry.unit);
  if (!unit) throw new Error(`Unknown work unit "${entry.unit}".`);
  const amount = Number(entry.totalAmount);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Invalid amount.');
  // Fixed work: the amount is the "rate" for the server's rate × quantity check.
  const rateSnapshot = unit === 'Fixed amount' ? amount : Number(entry.rate);
  if (!Number.isFinite(rateSnapshot) || rateSnapshot < 0) throw new Error('Invalid rate.');

  const entryRow = {
    id: serverId,
    contractor_id: contractorId,
    work_date: entry.date,
    work_type: String(entry.categoryId),
    rate_id: rate.id,
    rate_snapshot: rateSnapshot,
    rate_unit_snapshot: unit,
    quantity: unit === 'Per 100 kg' ? Number(entry.totalKg) || 0
      : unit === 'Per bag' ? Number(entry.totalBags) || 0
      : unit === 'Per batch' ? Number(entry.totalBatches) || 0 : 0,
    total_weight_kg: Number(entry.totalKg) || 0,
    total_bags: Math.round(Number(entry.totalBags) || 0),
    total_batches: Math.round(Number(entry.totalBatches) || 0),
    calculated_labour_amount: amount,
    notes: entry.notes || null,
  };

  // Bag-weight lines: the server only accepts positive weight and count.
  const details = (entry.bagLines || [])
    .map(l => ({ bag_weight_kg: Number(l.bagWeightKg) || 0, bag_count: Math.round(Number(l.bagCount) || 0) }))
    .filter(l => l.bag_weight_kg > 0 && l.bag_count > 0)
    .map(l => ({ work_entry_id: serverId, contractor_id: contractorId, ...l }));

  const allocations = (entry.allocations || []).map(a => {
    const labourerId = labourerIds[String(a.labourerId)];
    if (!labourerId) throw new Error(`Labourer ${a.labourerId} is not on the server roster.`);
    return {
      work_entry_id: serverId,
      contractor_id: contractorId,
      labourer_id: labourerId,
      allocated_amount: Number(a.allocatedAmount) || 0,
      allocation_method: 'Equal',
    };
  });

  return { entryRow, details, allocations };
}

/**
 * One sync run. Returns { uploaded, unchanged, deleted, failed: [{ localId, message }], contractorId }.
 *
 * adapter (all async, throw on failure):
 *   getMembership() → { contractorId, role } | null
 *   upsertLabourers(rows) → [{ id, local_id }]
 *   ensureRate({ contractorId, workType, unit, rate }) → { id, rate, rate_unit, is_editable_rate }
 *   deleteEntry(serverId), deleteAllocations(serverId), upsertEntry(row),
 *   replaceDetails(serverId, rows), insertAllocations(rows)
 * store (each update is an atomic read-modify-write, so a delete queued on the phone while a
 * sync is running is never overwritten by the sync's own bookkeeping):
 *   getState() → [], updateState(fn(items) → items), getDeletes() → [], updateDeletes(fn)
 */
export async function syncAll({ adapter, store, entries: entriesSource, labourers, today, random = Math.random, now = () => new Date().toISOString() }) {
  // `entries` may be a function returning the CURRENT device list, re-read at the end so
  // entries deleted on the phone during this run are recognised.
  const readEntries = async () => (typeof entriesSource === 'function' ? await entriesSource() : entriesSource) || [];
  const entries = await readEntries();
  const membership = await adapter.getMembership();
  if (!membership) throw new Error('इस खाते को किसी ठेकेदार से नहीं जोड़ा गया है। व्यवस्थापक से संपर्क करें।');
  if (!ENTRY_ROLES.includes(membership.role)) throw new Error('इस खाते को केवल देखने की अनुमति है (Viewer)।');
  const { contractorId, role } = membership;
  const result = { uploaded: 0, unchanged: 0, deleted: 0, failed: [], contractorId, role };

  // 1. Pending deletes first, so a deleted-then-recreated day never double counts.
  const deletes = await store.getDeletes();
  for (const d of deletes) {
    try {
      // An Operator's queued delete stays queued (reported), never silently dropped.
      if (!DELETE_ROLES.includes(role)) throw new Error(OPERATOR_DELETE_MESSAGE);
      await adapter.deleteEntry(d.id);
      await store.updateDeletes(list => list.filter(x => x.id !== d.id));
      result.deleted += 1;
    } catch (e) {
      result.failed.push({ localId: `delete:${d.id}`, message: e.message || String(e) });
    }
  }

  // 2. Roster (labourers referenced by entries must exist on the server).
  const rows = (labourers || []).map(l => labourerRow(contractorId, l, today));
  const saved = rows.length ? await adapter.upsertLabourers(rows) : [];
  const labourerIds = Object.fromEntries(saved.map(r => [String(r.local_id), r.id]));

  // 3. Server ids for new entries are assigned and SAVED before any upload (idempotent retries).
  await store.updateState(list => {
    const known = new Set(list.map(s => s.id));
    const added = entries.filter(e => !known.has(e.id))
      .map(e => ({ id: e.id, serverId: makeUuid(random), hash: null, syncedAt: null }));
    return added.length ? [...list, ...added] : list;
  });
  const byLocal = new Map((await store.getState()).map(s => [s.id, s]));

  // 4. Upload changed entries. Each entry's sync record is re-read just before upload: if the
  //    entry was deleted on the phone meanwhile (tombstone), it is skipped. If the delete lands
  //    after this check, the upload reuses the SAME server id, which the queued delete removes.
  const rateCache = new Map();
  for (const e of entries) {
    const s = (await store.getState()).find(x => x.id === e.id) || byLocal.get(e.id);
    if (!s || s.deleted) continue;
    const hash = contentHash(e);
    if (s.hash === hash) { result.unchanged += 1; continue; }
    try {
      const unit = serverUnitFor(e.unit);
      const key = `${e.categoryId}|${unit}`;
      if (!rateCache.has(key)) {
        rateCache.set(key, await adapter.ensureRate({ contractorId, workType: String(e.categoryId), unit, rate: Number(e.rate) || 0 }));
      }
      const plan = planEntry(e, { serverId: s.serverId, contractorId, rate: rateCache.get(key), labourerIds });
      await adapter.deleteAllocations(s.serverId);   // lets an edit lower the amount
      await adapter.upsertEntry(plan.entryRow);
      await adapter.replaceDetails(s.serverId, plan.details);
      if (plan.allocations.length) await adapter.insertAllocations(plan.allocations);
      const syncedAt = now();
      // A tombstone written during the upload is kept (never turned back into a live record).
      await store.updateState(list => list.map(x => (x.id === e.id && !x.deleted ? { ...x, serverId: s.serverId, hash, syncedAt } : x)));
      result.uploaded += 1;
    } catch (err) {
      result.failed.push({ localId: e.id, message: err.message || String(err) });
    }
  }

  // 5. Drop tombstones that are finished: server delete done and entry gone from the phone.
  const pendingDeletes = new Set((await store.getDeletes()).map(d => d.id));
  const stillOnPhone = new Set((await readEntries()).map(e => e.id));
  await store.updateState(list => list.filter(x => !x.deleted || stillOnPhone.has(x.id) || (x.serverId && pendingDeletes.has(x.serverId))));
  return result;
}

/**
 * Call BEFORE deleting an entry on the phone. Marks its sync record as a tombstone (keeping
 * its server id, so a sync already in progress cannot re-upload it under a NEW id) and, if
 * it has a server id, queues that server row for deletion. Both are persisted.
 */
export async function queueServerDelete(store, localId) {
  let serverId = null;
  await store.updateState(list => {
    const existing = list.find(x => x.id === localId);
    serverId = existing ? existing.serverId : null;
    return existing
      ? list.map(x => (x.id === localId ? { ...x, deleted: true } : x))
      : [...list, { id: localId, serverId: null, hash: null, syncedAt: null, deleted: true }];
  });
  if (serverId) {
    await store.updateDeletes(list => (list.some(d => d.id === serverId) ? list : [...list, { id: serverId }]));
  }
  return Boolean(serverId);
}

/**
 * Sync bookkeeping store over a LocalPersistence store. Every update runs under one lock,
 * so concurrent updates (sync run + delete on the phone) can never overwrite each other.
 */
export function createSyncStore(localStore) {
  let lock = Promise.resolve();
  const locked = (fn) => {
    const run = lock.then(fn);
    lock = run.catch(() => {});
    return run;
  };
  const read = async (key) => (await localStore.loadList(key)) || [];
  const update = (key) => (fn) => locked(async () => {
    const next = fn(await read(key));
    await localStore.saveList(key, next);
    return next;
  });
  return {
    getState: () => locked(() => read(SYNC_KEYS.state)),
    updateState: update(SYNC_KEYS.state),
    getDeletes: () => locked(() => read(SYNC_KEYS.deletes)),
    updateDeletes: update(SYNC_KEYS.deletes),
  };
}

/** Entries whose current content has not been uploaded yet. */
export function pendingCount(entries, stateItems) {
  const byLocal = new Map((stateItems || []).map(s => [s.id, s]));
  return (entries || []).filter(e => !byLocal.get(e.id)?.deleted && byLocal.get(e.id)?.hash !== contentHash(e)).length;
}
