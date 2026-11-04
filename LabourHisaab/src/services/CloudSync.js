// CloudSync for LabourHisaab (LH-CLOUD-SYNC-01)
// Uploads device-saved work entries and the labourer roster to the secure LabourHisaab
// tables (proposal 249) so the CRM can show them. Device storage stays the source of truth
// on the phone; sync is safe to repeat. LH-DAILY-REGISTER-APPROVAL-01 adds the download half:
// entries and labourers entered on other phones of the same contractor are brought onto this
// phone (a pending local edit always wins), plus the CRM approval status of each day.
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
  roster: '@labourhisaab/v1/sync_roster',   // items: [{ id: labourerLocalId, hash }] last synced roster
  registers: '@labourhisaab/v1/registers',  // items: server daily register rows (approval status)
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

export const NO_MEMBERSHIP_MESSAGE = 'इस खाते को किसी ठेकेदार से नहीं जोड़ा गया है। व्यवस्थापक से संपर्क करें।';
export const CHOOSE_CONTRACTOR_MESSAGE = 'यह खाता एक से अधिक ठेकेदार से जुड़ा है। सेटिंग्स → ठेकेदार (Contractor) में ठेकेदार चुनें।';
export const SELECTION_GONE_MESSAGE = 'चुना गया ठेकेदार अब इस खाते से जुड़ा नहीं है। सेटिंग्स → ठेकेदार में दोबारा चुनें।';

/**
 * Choose the contractor this phone uploads to from the user's active memberships
 * ([{ contractor_id, role }]) and the contractor selected in Settings (LH-CONTRACTOR-SELECT-SAVE-VERIFY-06).
 *  - A selection is honoured only if the account really is an active member of it (the
 *    database decides membership; the phone can never grant itself one).
 *  - Without a selection, a single membership is used; several writable ones require a choice
 *    (never guessed — a wrong guess files records under the wrong contractor).
 *  - Read-only memberships are returned only when nothing writable exists.
 */
export function pickMembership(rows, selectedContractorId = null) {
  const list = rows || [];
  if (selectedContractorId) {
    const mine = list.filter(r => r.contractor_id === selectedContractorId);
    if (!mine.length) throw new Error(SELECTION_GONE_MESSAGE);
    const best = ENTRY_ROLES.map(role => mine.find(r => r.role === role)).find(Boolean) || mine[0];
    return { contractorId: best.contractor_id, role: best.role };
  }
  const writable = list.filter(r => ENTRY_ROLES.includes(r.role));
  if (new Set(writable.map(r => r.contractor_id)).size > 1) throw new Error(CHOOSE_CONTRACTOR_MESSAGE);
  const best = ENTRY_ROLES.map(role => writable.find(r => r.role === role)).find(Boolean) || list[0];
  return best ? { contractorId: best.contractor_id, role: best.role } : null;
}

/** This user's saved contractor choice ([{ userId, contractorId, name }] on the phone), or null. */
export const readSelection = (list, userId) => (list || []).find(x => x.userId === userId) || null;

/** The saved list with this user's choice replaced (other users' choices untouched). */
export const writeSelection = (list, userId, { contractor_id, name }) => [
  ...(list || []).filter(x => x.userId !== userId), { userId, contractorId: contractor_id, name },
];

/**
 * Why the contractor list failed (LH-CONTRACTOR-VISIBILITY-FIX-08), so a permission problem is
 * never shown as "no contractors": 'not_operator' (account not approved as a LabourHisaab
 * operator), 'offline', or 'error'.
 */
export function contractorErrorKind(error) {
  const msg = String(error?.message || error || '');
  if (/not a LabourHisaab operator|42501|permission denied/i.test(msg) || String(error?.code) === '42501') return 'not_operator';
  if (NETWORK_ERROR.test(msg)) return 'offline';
  return 'error';
}

/**
 * Contractor a phone record belongs to (LH-CONTRACTOR-SELECT-OPEN-07): its own contractorId,
 * else the contractor this phone first synced with (records saved before tagging existed).
 * Switching contractor never moves records: each stays with its own contractor.
 */
export const recordContractor = (item, boundId) => item.contractorId || boundId || null;

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

const djb2 = (text) => {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(36);
};
const byJson = (a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1);

/** ISO-8601 UTC ('…Z') for any parseable timestamp, else null (server '+00:00' == phone 'Z'). */
export function normalizeTs(value) {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/**
 * Stable short hash of what the server stores for an entry (djb2 over canonical JSON).
 * Order-free for bag lines and shares, and fixed work hashes its amount as the rate, so an
 * entry downloaded from the server hashes the same as the phone copy it came from.
 */
export function contentHash(entry) {
  const amount = Number(entry.totalAmount);
  return djb2(JSON.stringify([
    entry.date, entry.categoryId, entry.unit, entry.unit === 'fixed' ? amount : Number(entry.rate), amount,
    Number(entry.totalKg) || 0, Number(entry.totalBags) || 0, Number(entry.totalBatches) || 0, entry.notes || '',
    (entry.bagLines || []).map(l => [Number(l.bagWeightKg) || 0, Math.round(Number(l.bagCount) || 0)])
      .filter(([w, c]) => w > 0 && c > 0).sort(byJson),
    (entry.allocations || []).map(a => [String(a.labourerId), Number(a.allocatedAmount) || 0]).sort(byJson),
    normalizeTs(entry.createdAt), normalizeTs(entry.workCompletedAt),
  ]));
}

/**
 * The hash used before LH-DAILY-REGISTER-APPROVAL-01 (kept only to recognise entries already
 * synced with it, so an app update does not re-upload — and rewrite — unchanged records).
 */
export function legacyContentHash(entry) {
  return djb2(JSON.stringify([
    entry.date, entry.categoryId, entry.type, entry.unit, Number(entry.rate), Number(entry.totalAmount),
    Number(entry.totalKg) || 0, Number(entry.totalBags) || 0, Number(entry.totalBatches) || 0, entry.notes || '',
    (entry.bagLines || []).map(l => [Number(l.bagWeightKg) || 0, Number(l.bagCount) || 0]),
    (entry.allocations || []).map(a => [a.labourerId, Number(a.allocatedAmount) || 0]),
  ]));
}
export const HASH_VERSION = 2;

/** Hash of the labourer fields the server stores. */
export const labourerHash = (lab) => djb2(JSON.stringify([
  String(lab.name || '').trim(), lab.phone ? String(lab.phone) : '', lab.role || 'सामान्य मजदूर',
  lab.isActive !== false, lab.joinDate || '', lab.notes || '',
]));

const UNIT_FROM_SERVER = Object.fromEntries(Object.entries(UNIT_TO_SERVER).map(([k, v]) => [v, k]));
const TYPE_FOR_UNIT = { per_100_kg: 'weight', per_bag: 'bag', per_batch: 'batch', fixed: 'fixed' };

/** Device labourer fields from a server labourer row. */
export const labourerFromServer = (row) => ({
  id: String(row.local_id),
  name: row.name,
  phone: row.phone || '',
  role: row.role || 'सामान्य मजदूर',
  isActive: row.active_status !== false,
  joinDate: row.join_date || '',
  notes: row.notes || '',
});

/**
 * Device entry from a server entry with its bag lines and shares (shares carry the
 * labourer's stable local id). `localId` is the phone id to use; `categoryNames` maps work type → name.
 */
export function entryFromServer({ row, details = [], allocations = [] }, { localId, categoryNames = {} }) {
  const unit = UNIT_FROM_SERVER[row.rate_unit_snapshot];
  if (!unit) throw new Error(`Unknown server unit "${row.rate_unit_snapshot}".`);
  const amount = Number(row.calculated_labour_amount) || 0;
  const shares = allocations
    .map(a => ({ labourerId: String(a.labourer_local_id), allocatedAmount: Number(a.allocated_amount) || 0 }))
    .sort((a, b) => (a.labourerId < b.labourerId ? -1 : 1));
  return {
    id: localId,
    date: String(row.work_date).slice(0, 10),
    categoryId: row.work_type,
    categoryName: categoryNames[row.work_type] || row.work_type,
    rate: unit === 'fixed' ? amount : Number(row.rate_snapshot) || 0,
    unit,
    type: TYPE_FOR_UNIT[unit],
    bagLines: details.map(d => ({ bagWeightKg: Number(d.bag_weight_kg) || 0, bagCount: Number(d.bag_count) || 0 })),
    totalBags: Number(row.total_bags) || 0,
    totalKg: Number(row.total_weight_kg) || 0,
    totalBatches: Number(row.total_batches) || 0,
    totalAmount: amount,
    notes: row.notes || '',
    participatingLabourerIds: shares.map(s => s.labourerId),
    allocations: shares,
    createdAt: normalizeTs(row.recorded_at) || undefined,
    workCompletedAt: normalizeTs(row.work_completed_at) || undefined,
    createdBy: row.created_by || null,
    serverId: row.id,
  };
}

const NETWORK_ERROR = /network request failed|failed to fetch|network ?error|timed? ?out|ENOTFOUND|ECONNREFUSED|ERR_INTERNET|offline/i;

/**
 * What the DATABASE confirmed for one entry after a save + sync (LH-REALTIME-WORK-SAVE-03).
 *   database  the server holds exactly this content (persisted id + server time known)
 *   device    saved on this phone only: cloud not set up or not signed in
 *   offline   no connection: kept on the phone, retried automatically
 *   failed    the server refused it (message says why); kept on the phone, retried
 */
export function cloudSaveStatus({ entry, item, outcome, error, configured = true, signedIn = true }) {
  if (!entry) return { state: 'failed', message: 'Entry not found on this phone.' };
  if (!configured || !signedIn) {
    return { state: 'device', message: 'फ़ोन पर सहेजा गया — डेटाबेस में भेजने के लिए सेटिंग्स में साइन इन करें।' };
  }
  if (item && !item.deleted && item.hash === contentHash(entry)) {
    return { state: 'database', message: 'डेटाबेस में सहेजा गया (Saved to database)', serverId: item.serverId,
      serverCreatedAt: item.serverCreatedAt || null, serverUpdatedAt: item.serverUpdatedAt || null };
  }
  const own = outcome?.failed?.find(f => f.localId === entry.id);
  const why = own?.message || error || (outcome ? '' : 'Sync did not run.');
  if (NETWORK_ERROR.test(why)) {
    return { state: 'offline', message: 'सिंक नहीं — कनेक्शन की प्रतीक्षा (Not synced — waiting for connection). फ़ोन पर सुरक्षित है, अपने-आप दोबारा भेजा जाएगा।' };
  }
  return { state: 'failed', message: `डेटाबेस ने सहेजने से मना किया: ${why || 'unknown error'}. फ़ोन पर सुरक्षित है, दोबारा कोशिश करें।` };
}

/** 'device' (not signed in), 'pending', 'synced' or 'failed' for one entry. */
export function entrySyncStatus(entry, stateItem, failedIds, signedIn) {
  if (!signedIn) return 'device';
  if (failedIds && failedIds.has(entry.id)) return 'failed';
  return stateItem && !stateItem.deleted && stateItem.hash === contentHash(entry) ? 'synced' : 'pending';
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
    // Phone times (IST shown, stored as UTC instants). The server keeps the first recorded_at.
    recorded_at: normalizeTs(entry.createdAt),
    work_completed_at: normalizeTs(entry.workCompletedAt),
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
 * One sync run (both directions). Returns
 *   { uploaded, unchanged, deleted, downloaded, labourersDownloaded, missingOnServer,
 *     failed: [{ localId, message }], contractorId, role, registers }.
 *
 * adapter (all async, throw on failure):
 *   getMembership() → { contractorId, role } | null
 *   upsertLabourers(rows) → [{ id, local_id }]
 *   ensureRate({ contractorId, workType, unit, rate }) → { id, rate, rate_unit, is_editable_rate }
 *   deleteEntry(serverId), deleteAllocations(serverId), upsertEntry(row),
 *   replaceDetails(serverId, rows), insertAllocations(rows)
 *   Optional (shared register, LH-DAILY-REGISTER-APPROVAL-01):
 *   features() → { timestamps, registers }      what the server has installed (proposal 252)
 *   fetchLabourers(contractorId) → server labourer rows
 *   fetchEntries(contractorId) → [{ row, details, allocations: [{ labourer_local_id, allocated_amount }] }]
 *   fetchRegisters(contractorId) → daily register rows
 * store (each update is an atomic read-modify-write, so a delete queued on the phone while a
 * sync is running is never overwritten by the sync's own bookkeeping):
 *   getState() → [], updateState(fn(items) → items), getDeletes() → [], updateDeletes(fn)
 *   getRoster() → [{ id, hash }], updateRoster(fn), setRegisters(rows)          (optional)
 * applyRemote (optional): async ({ entries: [{ entry, expectedHash }], labourers: [lab] })
 *   → { entryIds: [ids saved] }. Saves downloads on the phone; must skip an entry whose
 *   current hash is not expectedHash (null = must not exist yet), so a local edit always wins.
 */
export async function syncAll({ adapter, store, entries: entriesSource, labourers: allLabs, today, random = Math.random, now = () => new Date().toISOString(), applyRemote = null, categoryNames = {}, owns = null }) {
  const membership = await adapter.getMembership();
  if (!membership) throw new Error(NO_MEMBERSHIP_MESSAGE);
  if (!ENTRY_ROLES.includes(membership.role)) throw new Error('इस खाते को केवल देखने की अनुमति है (Viewer)।');
  const { contractorId, role } = membership;
  // Only this contractor's records take part (LH-CONTRACTOR-SELECT-OPEN-07): an item tagged with
  // another contractor is never uploaded here. `owns(item, contractorId)` may resolve untagged
  // older items (the phone's first contractor); default: untagged items belong to this one.
  const mine = (item) => (owns ? owns(item, contractorId) : (!item.contractorId || item.contractorId === contractorId));
  // `entries` may be a function returning the CURRENT device list, re-read at the end so
  // entries deleted on the phone during this run are recognised.
  const readEntries = async () => ((typeof entriesSource === 'function' ? await entriesSource() : entriesSource) || []).filter(mine);
  const labourers = (allLabs || []).filter(mine);
  const features = adapter.features ? await adapter.features() : { timestamps: false, registers: false };
  const shared = Boolean(applyRemote && adapter.fetchLabourers && adapter.fetchEntries && store.getRoster);
  const result = { uploaded: 0, unchanged: 0, deleted: 0, downloaded: 0, labourersDownloaded: 0, missingOnServer: 0,
    failed: [], contractorId, role, registers: null };

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

  // 1b. Entries synced with the previous hash formula and unchanged since: re-label, don't re-send.
  {
    const current = new Map((await readEntries()).map(e => [e.id, e]));
    await store.updateState(list => list.map(s => {
      if (!s.hash || s.hv === HASH_VERSION) return s;
      const e = current.get(s.id);
      return e && legacyContentHash(e) === s.hash ? { ...s, hash: contentHash(e), hv: HASH_VERSION } : { ...s, hv: HASH_VERSION };
    }));
  }

  // 2. Roster (labourers referenced by entries must exist on the server).
  //    Shared mode: a labourer is uploaded only if it is new to the server or was changed on
  //    this phone since its last sync; otherwise the server copy wins (another phone may have
  //    renamed it, and a fresh phone's default roster must never overwrite real names).
  const labourerIds = {};
  const remoteLabs = shared ? await adapter.fetchLabourers(contractorId) : [];
  remoteLabs.forEach(r => { labourerIds[String(r.local_id)] = r.id; });
  const remoteLabById = new Map(remoteLabs.map(r => [String(r.local_id), r]));
  const rosterSynced = shared ? new Map((await store.getRoster()).map(r => [r.id, r.hash])) : new Map();
  const toUpload = [];
  const adopted = [];
  const rosterMarks = [];
  // A labourer new to the server is sent only if this contractor's work uses it or it was added
  // on the phone — the app's built-in sample roster is never uploaded as real people.
  const usedIds = new Set((await readEntries()).flatMap(e => [
    ...(e.participatingLabourerIds || []), ...(e.allocations || []).map(a => a.labourerId)]).map(String));
  for (const lab of labourers || []) {
    const id = String(lab.id);
    const remote = remoteLabById.get(id);
    const localHash = labourerHash(lab);
    if (!shared) { toUpload.push(lab); continue; }
    if (!remote) { if (usedIds.has(id) || lab.addedOnPhone) toUpload.push(lab); continue; }
    const remoteLab = { ...labourerFromServer(remote), contractorId };
    const remoteHash = labourerHash(remoteLab);
    const changedHere = rosterSynced.has(id) && rosterSynced.get(id) !== localHash;
    if (changedHere) toUpload.push(lab);
    else if (remoteHash !== localHash) { adopted.push(remoteLab); rosterMarks.push({ id, hash: remoteHash }); }
    else rosterMarks.push({ id, hash: localHash });
  }
  if (shared) {
    const localIds = new Set((labourers || []).map(l => String(l.id)));
    remoteLabs.filter(r => !localIds.has(String(r.local_id))).forEach(r => {
      const lab = { ...labourerFromServer(r), contractorId };
      adopted.push(lab);
      rosterMarks.push({ id: lab.id, hash: labourerHash(lab) });
    });
  }
  const rows = toUpload.map(l => labourerRow(contractorId, l, today));
  const saved = rows.length ? await adapter.upsertLabourers(rows) : [];
  saved.forEach(r => { labourerIds[String(r.local_id)] = r.id; });
  toUpload.forEach(l => rosterMarks.push({ id: String(l.id), hash: labourerHash(l) }));

  // 3. Download (shared mode): entries other phones added or changed. A phone's own pending
  //    edit always wins; the server's copy replaces only entries unchanged on this phone.
  //    Nothing is deleted on the phone: a synced entry missing on the server is only counted.
  let remoteEntries = [];
  if (shared) {
    remoteEntries = await adapter.fetchEntries(contractorId);
    const state = await store.getState();
    const byServer = new Map(state.filter(s => s.serverId).map(s => [s.serverId, s]));
    const pendingDel = new Set((await store.getDeletes()).map(d => d.id));
    const local = new Map((await readEntries()).map(e => [e.id, e]));
    const downloads = [];
    const forceUpload = [];
    for (const rem of remoteEntries) {
      const serverId = rem.row.id;
      const s = byServer.get(serverId);
      if (pendingDel.has(serverId) || (s && s.deleted)) continue;
      let remoteEntry;
      try {
        remoteEntry = { ...entryFromServer(rem, { localId: s ? s.id : `WE_srv_${serverId}`, categoryNames }), contractorId };
      } catch (e) {
        result.failed.push({ localId: `download:${serverId}`, message: e.message || String(e) });
        continue;
      }
      if (!s) {
        if (local.has(remoteEntry.id)) continue;
        downloads.push({ entry: remoteEntry, expectedHash: null, serverId, hash: contentHash(remoteEntry) });
        continue;
      }
      const mine = local.get(s.id);
      if (!mine || contentHash(mine) !== s.hash) continue;             // pending local edit wins
      // Times the server does not have yet are kept from the phone (never dropped).
      const filled = { ...mine, ...remoteEntry, id: s.id,
        createdAt: remoteEntry.createdAt || mine.createdAt, workCompletedAt: remoteEntry.workCompletedAt || mine.workCompletedAt };
      if (features.timestamps && ((mine.createdAt && !remoteEntry.createdAt) || (mine.workCompletedAt && !remoteEntry.workCompletedAt))) {
        forceUpload.push(s.id);                                       // back-fill the server's times
      }
      if (contentHash(filled) === s.hash) continue;
      downloads.push({ entry: filled, expectedHash: s.hash, serverId, hash: contentHash(filled) });
    }
    const remoteIds = new Set(remoteEntries.map(r => r.row.id));
    result.missingOnServer = state.filter(s => s.serverId && s.hash && !s.deleted && local.has(s.id) && !remoteIds.has(s.serverId)).length;

    const applied = (downloads.length || adopted.length)
      ? await applyRemote({ entries: downloads.map(d => ({ entry: d.entry, expectedHash: d.expectedHash })), labourers: adopted })
      : { entryIds: [] };
    const savedIds = new Set(applied.entryIds || []);
    const syncedAt = now();
    await store.updateState(list => {
      let next = list.map(x => (forceUpload.includes(x.id) ? { ...x, hash: null } : x));
      for (const d of downloads) {
        if (!savedIds.has(d.entry.id)) continue;
        const item = { id: d.entry.id, serverId: d.serverId, hash: d.hash, hv: HASH_VERSION, syncedAt };
        next = next.some(x => x.id === d.entry.id) ? next.map(x => (x.id === d.entry.id && !x.deleted ? item : x)) : [...next, item];
      }
      return next;
    });
    result.downloaded = savedIds.size;
    result.labourersDownloaded = adopted.length;
  }
  if (shared && rosterMarks.length) {
    await store.updateRoster(list => {
      const m = new Map(list.map(r => [r.id, r]));
      rosterMarks.forEach(r => m.set(r.id, r));
      return [...m.values()];
    });
  }
  const entries = await readEntries();

  // 4. Server ids for new entries are assigned and SAVED before any upload (idempotent retries).
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
      if (!features.timestamps) { delete plan.entryRow.recorded_at; delete plan.entryRow.work_completed_at; }
      await adapter.deleteAllocations(s.serverId);   // lets an edit lower the amount
      const persisted = await adapter.upsertEntry(plan.entryRow);
      await adapter.replaceDetails(s.serverId, plan.details);
      if (plan.allocations.length) await adapter.insertAllocations(plan.allocations);
      if (persisted && persisted.id && persisted.id !== s.serverId) throw new Error('Server returned a different entry id.');
      const syncedAt = now();
      const serverTimes = persisted ? { serverCreatedAt: persisted.created_at || null, serverUpdatedAt: persisted.updated_at || null } : {};
      // A tombstone written during the upload is kept (never turned back into a live record).
      await store.updateState(list => list.map(x => (x.id === e.id && !x.deleted ? { ...x, serverId: s.serverId, hash, hv: HASH_VERSION, syncedAt, ...serverTimes } : x)));
      result.uploaded += 1;
    } catch (err) {
      result.failed.push({ localId: e.id, message: err.message || String(err) });
    }
  }

  // 6. Daily register approval status (read-only here; decided in the CRM).
  if (features.registers && adapter.fetchRegisters) {
    try {
      result.registers = await adapter.fetchRegisters(contractorId);
      if (store.setRegisters) await store.setRegisters(result.registers);
    } catch (e) {
      result.failed.push({ localId: 'registers', message: e.message || String(e) });
    }
  }

  // 7. Drop tombstones that are finished: server delete done and entry gone from the phone.
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
    getRoster: () => locked(() => read(SYNC_KEYS.roster)),
    updateRoster: update(SYNC_KEYS.roster),
    getRegisters: () => locked(() => read(SYNC_KEYS.registers)),
    setRegisters: (rows) => update(SYNC_KEYS.registers)(() => rows || []),
  };
}

/** Entries whose current content has not been uploaded yet. */
export function pendingCount(entries, stateItems) {
  const byLocal = new Map((stateItems || []).map(s => [s.id, s]));
  return (entries || []).filter(e => !byLocal.get(e.id)?.deleted && byLocal.get(e.id)?.hash !== contentHash(e)).length;
}
