// WorkEntryRepository for LabourHisaab (LH-PERSISTENCE-REPAIR-02)
// The single owner of saved work entries. LabourHisaabContext uses it, and the Node tests
// exercise this same code, so "load before use" and "never overwrite history with an empty
// list" are tested on the real logic rather than on a copy.
//
// Rules:
//  - Nothing can be written until init() has loaded the stored list.
//  - If loading fails, every write is refused for the rest of the session, so a failed or
//    partial load can never replace the saved history.
//  - Writes are serialised and complete in storage before the in-memory list changes.
//  - Saving with an existing id replaces that record (edit, retry, double tap): no duplicates.

import { STORAGE_KEYS, upsertById, removeById } from './LocalPersistence.js';

export const NOT_READY_MESSAGE = 'डेटा अभी लोड हो रहा है, कृपया एक क्षण बाद दोबारा प्रयास करें।';
export const LOAD_FAILED_MESSAGE = 'सहेजा गया डेटा लोड नहीं हो सका। नई प्रविष्टि सहेजना रोका गया है ताकि पुराना डेटा मिटे नहीं।';

export function createWorkEntryRepository(store, key = STORAGE_KEYS.workEntries) {
  let entries = [];
  let ready = false;
  let loadFailed = false;
  let initPromise = null;
  let chain = Promise.resolve();

  const serial = (task) => {
    const run = chain.then(task);
    chain = run.catch(() => {});
    return run;
  };

  const assertWritable = () => {
    if (loadFailed) throw new Error(LOAD_FAILED_MESSAGE);
    if (!ready) throw new Error(NOT_READY_MESSAGE);
  };

  const commit = async (next) => {
    await store.saveList(key, next); // resolves only after the write is read back and matches
    entries = next;
    return [...entries];
  };

  return {
    /** Loads saved entries once. Resolves with the list; rejects (and locks writes) on failure. */
    init() {
      if (!initPromise) {
        initPromise = (async () => {
          try {
            const saved = await store.loadList(key);
            entries = Array.isArray(saved) ? saved : [];
            ready = true;
            return [...entries];
          } catch (e) {
            loadFailed = true;
            throw e;
          }
        })();
      }
      return initPromise;
    },
    isReady: () => ready,
    hasLoadFailed: () => loadFailed,
    list: () => [...entries],
    get: (id) => entries.find(e => e.id === id) || null,
    /** Add or replace (same id) one entry. Resolves with the full saved list. */
    upsert: (entry) => serial(async () => {
      assertWritable();
      if (!entry || !entry.id) throw new Error('Work entry needs a stable id.');
      return commit(upsertById(entries, entry));
    }),
    /** Remove one entry by id. Resolves with the full saved list. */
    remove: (id) => serial(async () => {
      assertWritable();
      return commit(removeById(entries, id));
    }),
    /** Replace the whole list (backup restore only). */
    replaceAll: (list) => serial(async () => {
      assertWritable();
      if (!Array.isArray(list)) throw new Error('Restore needs a list of entries.');
      return commit([...list]);
    }),
  };
}
