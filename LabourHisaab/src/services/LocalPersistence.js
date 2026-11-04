// LocalPersistence for LabourHisaab (LH-PERSISTENCE-FIX-01)
// Durable on-device storage for work entries and the labourer roster.
//
// Pure module: the key-value backend is injected (AsyncStorage in the app, an in-memory or
// failing fake in Node tests), so restart/failure behaviour is unit-tested.
// Records are device-local: they are not shared across devices or with the CRM.

export const STORAGE_KEYS = {
  workEntries: '@labourhisaab/v1/work_entries',
  labourers: '@labourhisaab/v1/labourers',
};

const FORMAT_VERSION = 1;

/** Stable, collision-resistant id for a new work entry (created once per form). */
export function makeEntryId(now = Date.now(), random = Math.random) {
  return `WE_${now.toString(36)}_${Math.floor(random() * 1e9).toString(36)}`;
}

/**
 * Stable id for a NEW labourer. Unique across phones (the server matches labourers by this id
 * per contractor), unlike the old count-based LH_LAB_007, which two phones could both create.
 * Existing ids (LH_LAB_001…) are never changed.
 */
export function makeLabourerId(now = Date.now(), random = Math.random) {
  return `LH_LAB_${now.toString(36)}_${Math.floor(random() * 1e9).toString(36)}`;
}

/** Replaces the item with the same id (edit / retry) or prepends it (new). Never duplicates. */
export function upsertById(list, item) {
  const existing = list.findIndex(x => x.id === item.id);
  if (existing === -1) return [item, ...list];
  const next = [...list];
  next[existing] = item;
  return next;
}

export const removeById = (list, id) => list.filter(x => x.id !== id);

/**
 * backend: { getItem(key) → Promise<string|null>, setItem(key, value) → Promise<void> }
 */
export function createLocalStore(backend) {
  if (!backend || typeof backend.getItem !== 'function' || typeof backend.setItem !== 'function') {
    throw new Error('Storage backend is not available.');
  }

  /**
   * Returns the stored array, or null when nothing has been saved yet.
   * Throws when the stored value cannot be read or parsed — callers must then
   * block writes, so a failed load can never overwrite existing history.
   */
  async function loadList(key) {
    const raw = await backend.getItem(key);
    if (raw === null || raw === undefined) return null;
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      throw new Error(`Stored data for ${key} is unreadable.`);
    }
    if (!parsed || !Array.isArray(parsed.items)) {
      throw new Error(`Stored data for ${key} has an unknown format.`);
    }
    return parsed.items;
  }

  /**
   * Writes the full list, then reads it back and checks it. Resolves only when the
   * stored copy matches, so the UI can report success truthfully.
   */
  async function saveList(key, items) {
    const payload = JSON.stringify({ version: FORMAT_VERSION, savedAt: new Date().toISOString(), items });
    await backend.setItem(key, payload);
    const check = await loadList(key);
    const same = Array.isArray(check)
      && check.length === items.length
      && check.every((x, i) => x && items[i] && x.id === items[i].id);
    if (!same) throw new Error('Storage did not confirm the write.');
    return true;
  }

  return { loadList, saveList };
}
