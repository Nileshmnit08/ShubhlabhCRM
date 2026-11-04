// LabourHisaab Central Application Context
// Implements LH-LEDGER-01: Full ledger integration, work allocations with exact penny rounding,
// rate snapshotting, CRUD operations, idempotent submissions, and daily/monthly reconciliations.

import React, { createContext, useContext, useState, useMemo, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { deviceStore } from '../services/deviceStorage';
import { STORAGE_KEYS, makeEntryId, makeLabourerId } from '../services/LocalPersistence';
import { createWorkEntryRepository, LOAD_FAILED_MESSAGE } from '../services/WorkEntryRepository';
import { supabase, isCloudConfigured } from '../services/supabase';
import { syncAll, queueServerDelete, pendingCount, createSyncStore, contentHash, cloudSaveStatus, readSelection, writeSelection, SELECTION_GONE_MESSAGE, DELETE_ROLES, OPERATOR_DELETE_MESSAGE } from '../services/CloudSync';
import { createSupabaseSyncAdapter } from '../services/supabaseSyncAdapter';
import {
  DEFAULT_WORK_RATES,
  INITIAL_LABOURERS,
} from '../constants/initialData';
import { todayYmd } from '../utils/dates';
import {
  calculateDailyMetrics,
  calculateLabourerStatement,
  calculatePeriodReport,
  calculateWorkEntry,
} from '../utils/calculations';
import {
  distributeWorkAllocation,
  distributeExpenseDeduction,
  labourDatabaseService,
} from '../services/LabourDatabaseService';

const LabourHisaabContext = createContext(null);

export function LabourHisaabProvider({ children }) {
  // Application Data States
  // Full lists on this phone (all contractors). Screens get the SELECTED contractor's part
  // (`workEntries` / `labourers` below) — LH-CONTRACTOR-SELECT-OPEN-07.
  const [allLabourers, setLabourers] = useState(INITIAL_LABOURERS);
  const [workRates, setWorkRates] = useState(DEFAULT_WORK_RATES);
  // LH-HOME-TOTAL-DATE-01: the app starts with no sample work, payments or expenses, so
  // demo amounts (e.g. the old ₹5,808 day) are never shown as live data. The sample
  // labourer roster is kept until the persistence sprint (there is no storage yet).
  const [allWorkEntries, setWorkEntries] = useState([]);

  // Contractor context. Each entry/labourer carries contractorId; older ones without it belong
  // to the contractor this phone first synced with (boundId) — so 2/3 Nov stay with Ajay.
  const [scope, setScope] = useState({ activeId: null, boundId: null });
  const ownerOf = (item) => item.contractorId || scope.boundId || null;
  const inScope = (item) => !scope.activeId || ownerOf(item) === scope.activeId || ownerOf(item) === null;
  const workEntries = useMemo(() => allWorkEntries.filter(inScope), [allWorkEntries, scope]);
  const labourers = useMemo(() => allLabourers.filter(inScope), [allLabourers, scope]);
  const [payments, setPayments] = useState([]);
  const [serviceExpenses, setServiceExpenses] = useState([]);

  // Global filters
  // The device's real date, not the fixed demo date (TODAY_DATE).
  const [selectedDate, setSelectedDate] = useState(() => todayYmd());
  const [selectedMonth, setSelectedMonth] = useState('2026-10');
  const [contractorName, setContractorName] = useState('शुभ लाभ लेबर कांट्रेक्टर');

  // UI state tracking
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // -------------------------------------------------------------
  // 0. DURABLE STORAGE (LH-PERSISTENCE-FIX-01, LH-PERSISTENCE-REPAIR-02)
  //    Work entries live in WorkEntryRepository (device storage). It loads before any write
  //    is allowed, refuses writes if loading failed (so history is never replaced by an
  //    empty list), serialises writes and updates only after storage confirms them.
  //    The labourer roster is saved alongside. `[LH-STORAGE]` logs are count-only.
  // -------------------------------------------------------------
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState(null);
  const repoRef = useRef(null);
  if (!repoRef.current) repoRef.current = createWorkEntryRepository(deviceStore);
  const repo = repoRef.current;
  const rosterChain = useRef(Promise.resolve());
  const labourersHydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const [savedEntries, savedLabourers] = await Promise.all([
          repo.init(),
          deviceStore.loadList(STORAGE_KEYS.labourers),
        ]);
        if (cancelled) return;
        console.log(`[LH-STORAGE] loaded entries=${savedEntries.length} labourers=${savedLabourers ? savedLabourers.length : 'none'}`);
        setWorkEntries(savedEntries);
        // First launch has no saved roster: start from the default roster and save it once changed.
        if (savedLabourers && savedLabourers.length > 0) setLabourers(savedLabourers);
        setStorageReady(true);
      } catch (e) {
        console.log(`[LH-STORAGE] load FAILED: ${e?.message || e}`);
        if (!cancelled) setStorageError(LOAD_FAILED_MESSAGE);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Apply a list that storage has confirmed, then show it, then push it to the cloud (if signed in).
  const showSaved = (list) => {
    console.log(`[LH-STORAGE] saved entries=${list.length}`);
    setWorkEntries(list);
    runSync();
    return list;
  };

  // -------------------------------------------------------------
  // 0b. CLOUD SYNC (LH-CLOUD-SYNC-01)
  //    Optional: when the user signs in (Supabase Auth) and their account is an Owner/Manager
  //    of a contractor, device entries are uploaded to the secure LabourHisaab tables so the
  //    CRM can show them. Device storage remains the record on the phone. One sync at a time;
  //    a change during a run schedules one more run. `[LH-SYNC]` logs are count-only.
  // -------------------------------------------------------------
  const syncStoreRef = useRef(null);
  if (!syncStoreRef.current) syncStoreRef.current = createSyncStore(deviceStore);
  const syncStore = syncStoreRef.current;
  const [cloudUser, setCloudUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState({ running: false, lastSyncAt: null, lastError: null, failed: [], pending: 0 });
  const syncRunning = useRef(false);
  const cloudUserRef = useRef(null);
  const cloudRoleRef = useRef(null); // role from the last successful sync (Owner/Manager/Operator)
  const cloudContractorRef = useRef(null); // server contractor id from the last successful sync
  const allLabourersRef = useRef(allLabourers);
  allLabourersRef.current = allLabourers;
  const workRatesRef = useRef(workRates);
  workRatesRef.current = workRates;

  // -------------------------------------------------------------
  // Contractor selection (LH-CONTRACTOR-SELECT-SAVE-VERIFY-06). Saved per signed-in user on this
  // phone. It only CHOOSES among the account's real memberships — the database decides who is a
  // member (Owner / CRM admin onboarding); the phone can never grant itself one.
  // -------------------------------------------------------------
  const SELECTION_KEY = '@labourhisaab/v1/contractor_selection'; // [{ userId, contractorId, name }]
  const BOUND_KEY = '@labourhisaab/v1/bound_contractor';         // [{ contractorId }] contractor of this phone's synced entries
  const selectedContractorRef = useRef(null);
  const [contractorState, setContractorState] = useState({ status: 'idle', memberships: [], selectedId: null, selectedName: null, error: null });

  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const inScopeNow = (item) => {
    const { activeId, boundId } = scopeRef.current;
    const owner = item.contractorId || boundId || null;
    return !activeId || owner === activeId || owner === null;
  };

  // Contractor list: every ACTIVE contractor for approved operators (proposal 254), else — on a
  // server without 254 — only the account's memberships. The database authorises the choice.
  const loadContractors = async () => {
    const bound = ((await deviceStore.loadList(BOUND_KEY)) || [])[0]?.contractorId || null;
    if (!supabase || !cloudUserRef.current) {
      setScope({ activeId: null, boundId: bound });
      setContractorState({ status: 'signed_out', memberships: [], selectedId: null, selectedName: null, error: null, mode: null });
      return null;
    }
    const uid = cloudUserRef.current.id;
    const saved = readSelection(await deviceStore.loadList(SELECTION_KEY), uid);
    selectedContractorRef.current = saved ? saved.contractorId : null;
    // The saved choice applies straight away (works offline); the list refreshes below.
    setScope({ activeId: saved ? saved.contractorId : null, boundId: bound });
    setContractorState(s => ({ ...s, status: 'loading', error: null }));
    try {
      const { items, mode } = await createSupabaseSyncAdapter(supabase).listContractors();
      const selected = saved ? items.find(m => m.contractor_id === saved.contractorId) : null;
      // No choice saved yet: the account's only membership (what sync would use) is the context.
      const members = items.filter(m => m.role);
      const onlyMember = members.length === 1 ? members[0] : null;
      const activeId = saved ? saved.contractorId : (onlyMember ? onlyMember.contractor_id : null);
      setScope({ activeId, boundId: bound });
      setContractorState({
        status: items.length ? 'ready' : 'empty', memberships: items, mode,
        selectedId: saved ? saved.contractorId : null,
        selectedName: selected ? selected.name : (saved ? saved.name : null),
        error: saved && !selected ? SELECTION_GONE_MESSAGE : null,
      });
      return items;
    } catch (e) {
      setContractorState(s => ({ ...s, status: 'error', error: e?.message || String(e) }));
      return null;
    }
  };

  // Select / switch contractor at any time. The DATABASE authorises it (lh_select_contractor:
  // approved operator → Operator membership; never Owner/Admin). Entries of other contractors
  // stay on the phone under their own contractor and sync when that contractor is selected.
  const selectContractor = async (item) => {
    if (!cloudUserRef.current) throw new Error('पहले साइन इन करें।');
    if (!item?.contractor_id) throw new Error('ठेकेदार चुनें।');
    const role = await createSupabaseSyncAdapter(supabase).selectContractor(item.contractor_id, item);
    const uid = cloudUserRef.current.id;
    await deviceStore.saveList(SELECTION_KEY, writeSelection(await deviceStore.loadList(SELECTION_KEY), uid, item));
    selectedContractorRef.current = item.contractor_id;
    const bound = ((await deviceStore.loadList(BOUND_KEY)) || [])[0]?.contractorId || null;
    setScope({ activeId: item.contractor_id, boundId: bound });
    scopeRef.current = { activeId: item.contractor_id, boundId: bound };
    setContractorState(s => ({ ...s, selectedId: item.contractor_id, selectedName: item.name, error: null,
      memberships: s.memberships.map(m => (m.contractor_id === item.contractor_id ? { ...m, role } : m)) }));
    setRegisters([]); // the next sync loads this contractor's approval status
    console.log(`[LH-CONTRACTOR] selected contractor=${item.contractor_id} role=${role}`);
    return runSync();
  };

  // Per-entry sync records and the CRM approval status of each day (shown in Settings).
  const [syncItems, setSyncItems] = useState([]);
  const [registers, setRegisters] = useState([]);

  const refreshPending = async () => {
    try {
      const items = await syncStore.getState();
      setSyncItems(items);
      setSyncStatus(s => ({ ...s, pending: pendingCount(repo.list().filter(inScopeNow), items) }));
    } catch (e) { /* bookkeeping read failed; next sync retries */ }
  };

  // Saved approval status is shown immediately on launch (refreshed by every sync).
  useEffect(() => {
    syncStore.getRegisters().then(setRegisters, () => {});
  }, []);

  // Saves entries/labourers downloaded from other phones. An entry is written only if the phone
  // copy is still the one the sync compared against (a local edit made meanwhile wins).
  const applyRemote = async ({ entries: downloads, labourers: labs }) => {
    const wanted = new Map(downloads.map(d => [d.entry.id, d.expectedHash]));
    const { list: downloadedList, savedIds } = await repo.upsertManyIf(downloads.map(d => d.entry), (item, current) => {
      const expected = wanted.get(item.id);
      return expected === null ? !current : Boolean(current) && contentHash(current) === expected;
    });
    if (savedIds.length) setWorkEntries(downloadedList); // storage-confirmed write, like showSaved
    if (labs && labs.length) {
      // Keyed by contractor + id: two contractors may both have an LH_LAB_001.
      const key = (l) => `${l.contractorId || scopeRef.current.boundId || ''}|${l.id}`;
      setLabourers(prev => {
        const byKey = new Map(prev.map(l => [key(l), l]));
        labs.forEach(l => byKey.set(key(l), { ...(byKey.get(key(l)) || { avatarColor: '#F28C28' }), ...l }));
        return [...byKey.values()];
      });
    }
    return { entryIds: savedIds };
  };

  // One sync at a time. A call made while a run is in progress queues ONE more run (calls made
  // meanwhile share it) and resolves with THAT run's outcome, so a caller awaiting runSync()
  // right after a save gets a run that includes the saved entry.
  const lastDateRefresh = useRef(0);
  const syncChain = useRef(Promise.resolve());
  const queuedRun = useRef(null);
  const lastSyncError = useRef(null);
  const runSync = () => {
    if (queuedRun.current) return queuedRun.current;
    const run = syncChain.current.then(() => { queuedRun.current = null; return syncOnce(); });
    queuedRun.current = run;
    syncChain.current = run.catch(() => {});
    return run;
  };

  const syncOnce = async () => {
    if (!supabase || !cloudUserRef.current || !repo.isReady()) { lastSyncError.current = null; await refreshPending(); return null; }
    syncRunning.current = true;
    setSyncStatus(s => ({ ...s, running: true }));
    let outcome = null;
    lastSyncError.current = null;
    try {
      outcome = await syncAll({
        adapter: createSupabaseSyncAdapter(supabase, { selectedContractorId: selectedContractorRef.current }),
        store: syncStore,
        entries: () => repo.list(),
        labourers: allLabourersRef.current,
        // Untagged older records belong to this phone's first contractor (2/3 Nov → Ajay).
        owns: (item, cid) => (item.contractorId || scopeRef.current.boundId || cid) === cid,
        today: todayYmd(),
        applyRemote,
        categoryNames: Object.fromEntries(workRatesRef.current.map(r => [r.id, r.name])),
      });
      console.log(`[LH-SYNC] uploaded=${outcome.uploaded} unchanged=${outcome.unchanged} deleted=${outcome.deleted} downloaded=${outcome.downloaded} labourersDownloaded=${outcome.labourersDownloaded} missingOnServer=${outcome.missingOnServer} registers=${outcome.registers ? outcome.registers.length : 'n/a'} failed=${outcome.failed.length}`);
      if (outcome.registers) setRegisters(outcome.registers);
      cloudRoleRef.current = outcome.role || null;
      cloudContractorRef.current = outcome.contractorId || null;
      // Remember which contractor this phone's entries belong to (first successful sync).
      if (outcome.contractorId && !((await deviceStore.loadList(BOUND_KEY)) || []).length) {
        await deviceStore.saveList(BOUND_KEY, [{ contractorId: outcome.contractorId }]);
        setScope(s => ({ ...s, boundId: outcome.contractorId }));
      }
      setSyncStatus(s => ({ ...s, lastSyncAt: new Date().toISOString(), failed: outcome.failed, role: outcome.role || null,
        lastError: outcome.failed.length ? outcome.failed[0].message : null }));
    } catch (e) {
      lastSyncError.current = e?.message || String(e);
      console.log(`[LH-SYNC] FAILED: ${lastSyncError.current}`);
      setSyncStatus(s => ({ ...s, lastError: lastSyncError.current }));
    } finally {
      syncRunning.current = false;
      setSyncStatus(s => ({ ...s, running: false }));
      await refreshPending();
    }
    return outcome;
  };

  /**
   * Database-first confirmation for one saved entry (LH-REALTIME-WORK-SAVE-03): runs a sync that
   * includes it and reports what the DATABASE confirmed — never success on a local save alone.
   * → { state: 'database' | 'device' | 'offline' | 'failed', message, serverId, serverCreatedAt }
   */
  const confirmCloudSave = async (entryId) => {
    const outcome = await runSync();
    const entry = repo.get(entryId);
    const items = await syncStore.getState();
    return cloudSaveStatus({
      entry, item: items.find(s => s.id === entryId), outcome,
      error: lastSyncError.current, configured: Boolean(supabase), signedIn: Boolean(cloudUserRef.current),
    });
  };

  // Other phones' work appears without a restart: sync when the app returns to the foreground,
  // and every 60 s while it is open (cheap when nothing changed).
  useEffect(() => {
    if (!storageReady || !cloudUser) return undefined;
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active') runSync(); });
    const timer = setInterval(() => { if (AppState.currentState === 'active') runSync(); }, 60000);
    return () => { sub?.remove?.(); clearInterval(timer); };
  }, [storageReady, cloudUser]);

  // Session restore + auth changes.
  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const user = data?.session?.user || null;
      cloudUserRef.current = user;
      setCloudUser(user ? { id: user.id, email: user.email } : null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user || null;
      cloudUserRef.current = user;
      setCloudUser(user ? { id: user.id, email: user.email } : null);
    });
    return () => { active = false; sub?.subscription?.unsubscribe?.(); };
  }, []);

  // Sync once both the device history is loaded and a session exists (after restoring this
  // user's contractor selection, so the first sync already uses it).
  useEffect(() => {
    if (storageReady && cloudUser) loadContractors().finally(() => runSync());
    else if (storageReady) { refreshPending(); loadContractors(); }
  }, [storageReady, cloudUser]);

  const cloudSignIn = async (email, password) => {
    if (!supabase) throw new Error('क्लाउड सेटअप उपलब्ध नहीं है (Supabase कॉन्फ़िगर नहीं)।');
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: String(email || '').trim(), password });
    if (authError) throw new Error(authError.message);
    cloudUserRef.current = data.user;
    setCloudUser({ id: data.user.id, email: data.user.email });
    return runSync();
  };

  const cloudSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    cloudUserRef.current = null;
    cloudRoleRef.current = null;
    cloudContractorRef.current = null;
    selectedContractorRef.current = null; // the saved choice stays with that user for next sign-in
    setContractorState({ status: 'signed_out', memberships: [], selectedId: null, selectedName: null, error: null, mode: null });
    setScope(s => ({ ...s, activeId: null }));
    setCloudUser(null);
    setSyncStatus(s => ({ ...s, role: null }));
  };

  // Renames the contractor on the server (proposal 251: Owner/Manager/Operator). Returns false
  // when there is no cloud session or no sync has identified the contractor yet.
  const renameCloudContractor = async (name) => {
    if (!supabase || !cloudUserRef.current || !cloudContractorRef.current) return false;
    const { error: rpcError } = await supabase.rpc('lh_rename_contractor', { p_contractor: cloudContractorRef.current, p_name: name });
    if (rpcError) throw new Error(rpcError.message);
    return true;
  };

  // The roster is saved whenever it changes after loading (add / rename / activate).
  useEffect(() => {
    if (!storageReady) return;
    if (!labourersHydrated.current) { labourersHydrated.current = true; return; }
    // The FULL roster (every contractor's labourers) is saved, never only the selected part.
    const run = rosterChain.current.then(() => deviceStore.saveList(STORAGE_KEYS.labourers, allLabourers));
    rosterChain.current = run.catch(() => {});
    run.then(() => runSync(), () => setError('मजदूर सूची सहेजी नहीं जा सकी। कृपया दोबारा प्रयास करें।'));
  }, [allLabourers, storageReady]);

  // -------------------------------------------------------------
  // 1. LABOURER CRUD OPERATIONS (Preserve Stable Local IDs)
  // -------------------------------------------------------------
  const addLabourer = ({ name, phone = '', role = 'सामान्य मजदूर', notes = '' }) => {
    if (!name || !name.trim()) throw new Error('मजदूर का नाम आवश्यक है।');
    const nextNum = labourers.length + 1;
    const newId = makeLabourerId(); // unique across phones (shared roster)
    const newLabourer = {
      id: newId,
      // Belongs to the contractor selected now; marked as a real person added on this phone.
      ...(scope.activeId ? { contractorId: scope.activeId } : {}),
      addedOnPhone: true,
      name: name.trim(),
      phone: phone.trim(),
      role: role.trim(),
      notes: notes.trim(),
      joinDate: selectedDate,
      isActive: true,
      avatarColor: ['#F28C28', '#137A38', '#2563EB', '#9333EA', '#D97706'][nextNum % 5],
    };

    setLabourers(prev => [...prev, newLabourer]);
    labourDatabaseService.addLabourer(newLabourer).catch(() => {});
    return newLabourer;
  };

  const renameLabourer = (id, newName) => {
    if (!newName || !newName.trim()) return false;
    setLabourers(prev =>
      prev.map(lab => (lab.id === id && inScopeNow(lab) ? { ...lab, name: newName.trim() } : lab))
    );
    labourDatabaseService.renameLabourer(id, newName).catch(() => {});
    return true;
  };

  const toggleLabourerStatus = (id) => {
    setLabourers(prev =>
      prev.map(lab => (lab.id === id && inScopeNow(lab) ? { ...lab, isActive: !lab.isActive } : lab))
    );
    labourDatabaseService.toggleLabourerActive(id).catch(() => {});
  };

  const updateLabourer = (id, updates) => {
    setLabourers(prev =>
      prev.map(lab => (lab.id === id && inScopeNow(lab) ? { ...lab, ...updates } : lab))
    );
  };

  // -------------------------------------------------------------
  // 2. RATE REVISION OPERATIONS (Immutable Historical Snapshots)
  // -------------------------------------------------------------
  const updateWorkRate = (rateId, newRate, newUnit = null) => {
    setWorkRates(prev =>
      prev.map(r => {
        if (r.id === rateId) {
          const updatedRate = Number(newRate) || r.rate;
          const updatedUnit = newUnit || r.unit;
          let unitLabel = r.unitLabel;
          let unitShort = r.unitShort;

          if (updatedUnit === 'per_100_kg') {
            unitLabel = `₹${updatedRate} / 100 kg`;
            unitShort = '/ 100 kg';
          } else if (updatedUnit === 'per_bag') {
            unitLabel = `₹${updatedRate} / बैग`;
            unitShort = '/ बैग';
          } else if (updatedUnit === 'per_batch') {
            unitLabel = `₹${updatedRate} / बैच`;
            unitShort = '/ बैच';
          } else if (updatedUnit === 'fixed') {
            unitLabel = `₹${updatedRate} फिक्स`;
            unitShort = 'fixed';
          }

          return {
            ...r,
            rate: updatedRate,
            unit: updatedUnit,
            unitLabel,
            unitShort,
          };
        }
        return r;
      })
    );
    labourDatabaseService.reviseWorkRate(rateId, newRate, newUnit).catch(() => {});
    return true;
  };

  const resetWorkRates = () => {
    setWorkRates(DEFAULT_WORK_RATES);
  };

  // -------------------------------------------------------------
  // 3. DAILY WORK ENTRY & ALLOCATION OPERATIONS
  // -------------------------------------------------------------
  // Async: resolves with the saved entry only after storage confirms the write; rejects
  // (and leaves the screen unchanged) if the write fails. Re-sending the same id (retry,
  // double tap) replaces that record instead of creating a duplicate.
  const addWorkEntry = async (entryData) => {
    const rateInfo = workRates.find(r => r.id === entryData.categoryId) || {
      rate: entryData.rate || 0,
      unit: entryData.unit || 'per_100_kg',
      type: entryData.type || 'weight',
      name: entryData.categoryName || 'General Work',
    };

    const calculated = calculateWorkEntry({
      rate: entryData.rate ?? rateInfo.rate,
      unit: rateInfo.unit,
      type: rateInfo.type,
      bagLines: entryData.bagLines || [],
      totalBags: entryData.totalBags || 0,
      totalBatches: entryData.totalBatches || 0,
      fixedAmount: entryData.fixedAmount, // undefined = use the rate; 0 stays 0
    });

    const participants = entryData.participatingLabourerIds || [];
    const allocations = distributeWorkAllocation(calculated.totalAmount, participants);

    const entryId = entryData.id || makeEntryId();
    const previous = repo.get(entryId);
    const newEntry = {
      id: entryId,
      date: entryData.date || selectedDate,
      categoryId: entryData.categoryId,
      categoryName: rateInfo.name,
      rate: calculated.rate,
      unit: calculated.unit,
      type: calculated.type,
      bagLines: calculated.bagLines,
      totalBags: calculated.totalBags,
      totalKg: calculated.totalKg,
      totalBatches: calculated.totalBatches,
      totalAmount: calculated.totalAmount,
      notes: entryData.notes || '',
      participatingLabourerIds: participants,
      allocations, // Store calculated allocations directly
      // Entry recorded at: first save on this phone; never changed by edits or sync.
      createdAt: previous?.createdAt || new Date().toISOString(),
      // Work completed at: chosen by the operator (defaults to the save time on the form).
      workCompletedAt: entryData.workCompletedAt ?? previous?.workCompletedAt,
      ...(previous ? { updatedAt: new Date().toISOString() } : {}),
      ...(previous?.createdBy ? { createdBy: previous.createdBy } : {}),
      // Contractor: an edit keeps the entry's own contractor; a new entry takes the selected one.
      ...((previous?.contractorId || (!previous && scope.activeId)) ? { contractorId: previous?.contractorId || scope.activeId } : {}),
    };

    showSaved(await repo.upsert(newEntry));

    // Keep the in-memory report service in step (best effort; storage above is the record).
    if (!previous) {
      labourDatabaseService.saveWorkEntry({
        ...newEntry,
        rate: calculated.rate,
        unit: calculated.unit,
        type: calculated.type,
      }).catch(() => {});
    }

    return newEntry;
  };

  // Async: edits the record with this id in storage, then on screen. Never creates a new record.
  const updateWorkEntry = async (id, updates) => {
    const entry = repo.get(id);
    if (!entry) throw new Error('यह कार्य प्रविष्टि नहीं मिली। कृपया सूची ताज़ा करें।');

    const merged = { ...entry, ...updates, id };
    const calculated = calculateWorkEntry({
      rate: merged.rate,
      unit: merged.unit,
      type: merged.type,
      bagLines: merged.bagLines || [],
      totalBags: merged.totalBags || 0,
      totalBatches: merged.totalBatches || 0,
      fixedAmount: updates.totalAmount ?? merged.totalAmount,
    });

    const participants = merged.participatingLabourerIds || [];
    const allocations = distributeWorkAllocation(calculated.totalAmount, participants);

    const updated = {
      ...merged,
      totalBags: calculated.totalBags,
      totalKg: calculated.totalKg,
      totalBatches: calculated.totalBatches,
      totalAmount: calculated.totalAmount,
      allocations,
      updatedAt: new Date().toISOString(),
    };

    showSaved(await repo.upsert(updated));
    labourDatabaseService.updateWorkEntry(id, updated).catch(() => {});
    return updated;
  };

  // Async: removes the record from storage, then from the screen. If it was synced, the cloud
  // copy is queued for deletion FIRST (tombstone), so a running sync cannot re-upload it.
  const deleteWorkEntry = async (id) => {
    if (repo.hasLoadFailed()) throw new Error(LOAD_FAILED_MESSAGE);
    if (!repo.isReady()) throw new Error('डेटा अभी लोड हो रहा है, कृपया एक क्षण बाद दोबारा प्रयास करें।');
    // An Operator cannot delete on the server; removing a synced entry only from this phone
    // would leave the CRM and other devices showing it, so it is refused here.
    if (cloudRoleRef.current && !DELETE_ROLES.includes(cloudRoleRef.current)
        && (await syncStore.getState()).some(x => x.id === id && x.serverId)) {
      throw new Error(OPERATOR_DELETE_MESSAGE);
    }
    await queueServerDelete(syncStore, id);
    try {
      showSaved(await repo.remove(id));
    } catch (e) {
      // The phone still has the entry: undo the tombstone so it keeps syncing normally.
      // (A queued server delete, if any, is cancelled too.)
      const s = (await syncStore.getState()).find(x => x.id === id);
      await syncStore.updateState(list => list.map(x => (x.id === id ? { ...x, deleted: false, hash: null } : x)));
      if (s?.serverId) await syncStore.updateDeletes(list => list.filter(d => d.id !== s.serverId));
      throw e;
    }
    labourDatabaseService.deleteWorkEntry(id).catch(() => {});
  };

  // -------------------------------------------------------------
  // 4. DAILY PAYMENT OPERATIONS (Cash, Other, Partial, Advance)
  // -------------------------------------------------------------
  const addPayment = ({ date, labourerId, amount, paymentMethod = 'Cash', notes = '' }) => {
    const lab = labourers.find(l => l.id === labourerId);
    const newPayment = {
      id: `PAY_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      date: date || selectedDate,
      labourerId,
      labourerName: lab ? lab.name : 'Unknown',
      amount: Number(amount) || 0,
      paymentMethod,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    setPayments(prev => [newPayment, ...prev]);
    labourDatabaseService.savePayment(newPayment).catch(() => {});
    return newPayment;
  };

  const addBulkPayments = ({ date, paymentItems = [] }) => {
    const newPayments = paymentItems.map((item, idx) => {
      const lab = labourers.find(l => l.id === item.labourerId);
      return {
        id: `PAY_${Date.now()}_${idx}`,
        date: date || selectedDate,
        labourerId: item.labourerId,
        labourerName: lab ? lab.name : 'Unknown',
        amount: Number(item.amount) || 0,
        paymentMethod: item.paymentMethod || 'Cash',
        notes: (item.notes || '').trim(),
        createdAt: new Date().toISOString(),
      };
    });

    setPayments(prev => [...newPayments, ...prev]);
    newPayments.forEach(p => labourDatabaseService.savePayment(p).catch(() => {}));
    return newPayments;
  };

  const updatePayment = (id, updates) => {
    setPayments(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p))
    );
    labourDatabaseService.updatePayment(id, updates).catch(() => {});
  };

  const deletePayment = (id) => {
    setPayments(prev => prev.filter(p => p.id !== id));
    labourDatabaseService.deletePayment(id).catch(() => {});
  };

  // -------------------------------------------------------------
  // 5. SERVICE EXPENSE OPERATIONS (Contractor vs Deductions)
  // -------------------------------------------------------------
  const addServiceExpense = ({
    date,
    category = 'tea_breakfast',
    expenseName,
    amount,
    description = '',
    allocationType = 'contractor_expense',
    allocatedLabourerIds = [],
  }) => {
    const numericAmount = Number(amount) || 0;
    const deductions = distributeExpenseDeduction(numericAmount, allocationType, allocatedLabourerIds);

    const newExpense = {
      id: `EXP_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      date: date || selectedDate,
      category,
      expenseName: expenseName.trim(),
      amount: numericAmount,
      description: description.trim(),
      allocationType,
      allocatedLabourerIds: allocationType === 'contractor_expense' ? [] : allocatedLabourerIds,
      deductions,
      createdAt: new Date().toISOString(),
    };

    setServiceExpenses(prev => [newExpense, ...prev]);
    labourDatabaseService.saveServiceExpense(newExpense).catch(() => {});
    return newExpense;
  };

  const updateServiceExpense = (id, updates) => {
    setServiceExpenses(prev =>
      prev.map(exp => {
        if (exp.id !== id) return exp;
        const merged = { ...exp, ...updates };
        const deductions = distributeExpenseDeduction(
          Number(merged.amount) || 0,
          merged.allocationType,
          merged.allocatedLabourerIds || []
        );
        return { ...merged, deductions, updatedAt: new Date().toISOString() };
      })
    );
  };

  const deleteServiceExpense = (id) => {
    setServiceExpenses(prev => prev.filter(e => e.id !== id));
    labourDatabaseService.deleteServiceExpense(id).catch(() => {});
  };

  // -------------------------------------------------------------
  // 6. CALCULATED LEDGER SELECTORS (Reconciled from Saved Records)
  // -------------------------------------------------------------
  const todayMetrics = useMemo(() => {
    return calculateDailyMetrics({
      date: selectedDate,
      workEntries,
      payments,
      serviceExpenses,
      labourers,
    });
  }, [selectedDate, workEntries, payments, serviceExpenses, labourers]);

  // Consolidated Daily Ledger for Selected Date
  const getDailyLedger = (date = selectedDate) => {
    const dayWork = workEntries.filter(e => e.date === date);
    const dayPayments = payments.filter(p => p.date === date);
    const dayExpenses = serviceExpenses.filter(e => e.date === date);

    const totalLabourEarned = dayWork.reduce((sum, e) => sum + (Number(e.totalAmount) || 0), 0);
    const totalPayments = dayPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    let totalServiceExpenses = 0;
    let contractorExpenses = 0;
    let allocatedDeductions = 0;

    dayExpenses.forEach(exp => {
      const amt = Number(exp.amount) || 0;
      totalServiceExpenses += amt;
      if (exp.allocationType === 'contractor_expense') {
        contractorExpenses += amt;
      } else {
        allocatedDeductions += amt;
      }
    });

    const remainingPayableToday = Math.round(
      (totalLabourEarned - totalPayments - allocatedDeductions) * 100
    ) / 100;

    // Build labourer-wise entries for this date
    const labourerLedger = labourers.map(lab => {
      // Labourer earned allocations for this date
      let earned = 0;
      dayWork.forEach(entry => {
        const participants = entry.participatingLabourerIds || [];
        if (participants.includes(lab.id)) {
          const share = (entry.allocations?.find(a => a.labourerId === lab.id)?.allocatedAmount)
            || (Number(entry.totalAmount) / (participants.length || 1));
          earned += share;
        }
      });

      // Labourer payments on this date
      const paid = dayPayments
        .filter(p => p.labourerId === lab.id)
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // Labourer deductions on this date
      let deductions = 0;
      dayExpenses.forEach(exp => {
        if (exp.allocationType !== 'contractor_expense' && (exp.allocatedLabourerIds || []).includes(lab.id)) {
          const ded = (exp.deductions?.find(d => d.labourerId === lab.id)?.deductionAmount)
            || (exp.allocationType === 'individual'
              ? Number(exp.amount)
              : Number(exp.amount) / ((exp.allocatedLabourerIds || []).length || 1));
          deductions += ded;
        }
      });

      const remainingBalance = Math.round((earned - paid - deductions) * 100) / 100;

      return {
        labourerId: lab.id,
        labourerName: lab.name,
        labourerPhone: lab.phone,
        isActive: lab.isActive,
        date,
        earned: Math.round(earned * 100) / 100,
        paid: Math.round(paid * 100) / 100,
        deductions: Math.round(deductions * 100) / 100,
        remainingBalance,
      };
    });

    return {
      date,
      totalLabourEarned: Math.round(totalLabourEarned * 100) / 100,
      totalPayments: Math.round(totalPayments * 100) / 100,
      totalServiceExpenses: Math.round(totalServiceExpenses * 100) / 100,
      contractorExpenses: Math.round(contractorExpenses * 100) / 100,
      allocatedDeductions: Math.round(allocatedDeductions * 100) / 100,
      remainingPayableToday,
      labourerLedger,
      workEntries: dayWork,
      payments: dayPayments,
      serviceExpenses: dayExpenses,
    };
  };

  // Reconciled Monthly Summary from Saved Records
  const getMonthlySummary = (yearMonth = selectedMonth, targetLabourerId = null, sortBy = 'default', sortDirection = 'asc') => {
    const monthWork = workEntries.filter(e => (e.date || '').startsWith(yearMonth));
    const monthPayments = payments.filter(p => (p.date || '').startsWith(yearMonth));
    const monthExpenses = serviceExpenses.filter(e => (e.date || '').startsWith(yearMonth));

    const targetLabourers = targetLabourerId
      ? labourers.filter(l => l.id === targetLabourerId)
      : labourers;

    let overallEarned = 0;
    let overallPaid = 0;
    let overallDeductions = 0;
    let overallWeightKg = 0;
    const workingDaysSet = new Set();

    monthWork.forEach(e => {
      overallWeightKg += (Number(e.totalWeightKg || e.totalKg) || 0);
      workingDaysSet.add(e.date);
    });

    const individualSummaries = targetLabourers.map(lab => {
      const labWorkingDays = new Set();

      // Earned from allocations
      let labEarned = 0;
      monthWork.forEach(wEntry => {
        const participants = wEntry.participatingLabourerIds || [];
        if (participants.includes(lab.id)) {
          labWorkingDays.add(wEntry.date);
          const share = (wEntry.allocations?.find(a => a.labourerId === lab.id)?.allocatedAmount)
            || (Number(wEntry.totalAmount) / (participants.length || 1));
          labEarned += share;
        }
      });

      // Payments
      const labPaid = monthPayments
        .filter(p => {
          if (p.labourerId === lab.id) {
            labWorkingDays.add(p.date);
            return true;
          }
          return false;
        })
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // Service Deductions
      let labDeductions = 0;
      monthExpenses.forEach(exp => {
        if (exp.allocationType !== 'contractor_expense' && (exp.allocatedLabourerIds || []).includes(lab.id)) {
          const ded = (exp.deductions?.find(d => d.labourerId === lab.id)?.deductionAmount)
            || (exp.allocationType === 'individual'
              ? Number(exp.amount)
              : Number(exp.amount) / ((exp.allocatedLabourerIds || []).length || 1));
          labDeductions += ded;
        }
      });

      const labBalance = Math.round((labEarned - labPaid - labDeductions) * 100) / 100;

      overallEarned += labEarned;
      overallPaid += labPaid;
      overallDeductions += labDeductions;

      return {
        labourerId: lab.id,
        labourerName: lab.name,
        labourerPhone: lab.phone,
        isActive: lab.isActive,
        yearMonth,
        workingDays: labWorkingDays.size,
        totalLabourEarned: Math.round(labEarned * 100) / 100,
        totalAmountPaid: Math.round(labPaid * 100) / 100,
        totalAllocatedServiceExpenses: Math.round(labDeductions * 100) / 100,
        remainingBalance: labBalance,
      };
    });

    const contractorExpenses = monthExpenses
      .filter(e => e.allocationType === 'contractor_expense')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const totalRemainingBalance = Math.round(
      (overallEarned - overallPaid - overallDeductions) * 100
    ) / 100;

    let sortedSummaries = [...individualSummaries];
    if (sortBy === 'name') {
      sortedSummaries.sort((a, b) => (a.labourerName || '').localeCompare(b.labourerName || '', 'hi'));
    } else if (sortBy === 'earned') {
      sortedSummaries.sort((a, b) => (b.totalLabourEarned || 0) - (a.totalLabourEarned || 0));
    } else if (sortBy === 'paid') {
      sortedSummaries.sort((a, b) => (b.totalAmountPaid || 0) - (a.totalAmountPaid || 0));
    } else if (sortBy === 'balance') {
      sortedSummaries.sort((a, b) => (b.remainingBalance || 0) - (a.remainingBalance || 0));
    }
    if (sortDirection === 'desc' && sortBy === 'name') {
      sortedSummaries.reverse();
    } else if (sortDirection === 'asc' && sortBy !== 'default' && sortBy !== 'name') {
      sortedSummaries.reverse();
    }

    return {
      yearMonth,
      targetLabourerId,
      totalWorkingDays: workingDaysSet.size,
      totalWeightProcessedKg: Math.round(overallWeightKg * 100) / 100,
      totalLabourEarned: Math.round(overallEarned * 100) / 100,
      totalPaymentsMade: Math.round(overallPaid * 100) / 100,
      totalAllocatedServiceExpenses: Math.round(overallDeductions * 100) / 100,
      contractorBorneExpenses: Math.round(contractorExpenses * 100) / 100,
      remainingPayableBalance: totalRemainingBalance,
      individualSummaries: sortedSummaries,
    };
  };

  const getDailyReport = (date = selectedDate) => {
    return labourDatabaseService.getDailyReport(date);
  };

  const getWeeklyReport = (params = {}) => {
    return labourDatabaseService.getWeeklyReport({
      referenceDate: selectedDate,
      ...params,
    });
  };

  const getPaymentLedger = (params = {}) => {
    return labourDatabaseService.getPaymentLedger({
      referenceDate: selectedDate,
      yearMonth: selectedMonth,
      ...params,
    });
  };

  const getServiceExpenseReport = (params = {}) => {
    return labourDatabaseService.getServiceExpenseReport({
      referenceDate: selectedDate,
      yearMonth: selectedMonth,
      ...params,
    });
  };

  const getLabourerStatementMemo = (labourerId, month = selectedMonth) => {
    return calculateLabourerStatement({
      labourerId,
      yearMonth: month,
      workEntries,
      payments,
      serviceExpenses,
      labourers,
    });
  };

  const getPeriodReportMemo = (filterType, refDate = selectedDate) => {
    return calculatePeriodReport({
      filterType,
      referenceDate: refDate,
      workEntries,
      payments,
      serviceExpenses,
      labourers,
    });
  };

  // -------------------------------------------------------------
  // 7. MONTHLY SETTLEMENT & ACCOUNT CLOSING (LH-SETTLEMENT-01)
  // -------------------------------------------------------------
  const getMonthlySettlementMemo = async (month = selectedMonth, targetLabourerId = null) => {
    return await labourDatabaseService.getMonthlySettlement(month, targetLabourerId);
  };

  const confirmSettlementStatusMemo = async (month = selectedMonth, newStatus, notes = '') => {
    return await labourDatabaseService.confirmSettlementStatus(month, newStatus, notes);
  };

  const closeMonthAndCarryForwardMemo = async (month = selectedMonth, closedBy = contractorName) => {
    return await labourDatabaseService.closeMonthAndCarryForward(month, closedBy);
  };

  const recordSettlementCorrectionMemo = async (params) => {
    return await labourDatabaseService.recordSettlementCorrection({
      ...params,
      correctedBy: contractorName,
    });
  };

  const getSettlementCorrectionsMemo = async (month = null) => {
    return await labourDatabaseService.getSettlementCorrections(month);
  };

  // -------------------------------------------------------------
  // 8. BACKUP, RESTORE & OFFLINE PERSISTENCE (LH-QA-01)
  // -------------------------------------------------------------
  const createBackup = async () => {
    return await labourDatabaseService.createBackup(contractorName);
  };

  const restoreBackup = async (backupPayload) => {
    if (repo.hasLoadFailed() || !repo.isReady()) {
      throw new Error(repo.hasLoadFailed() ? LOAD_FAILED_MESSAGE : 'डेटा अभी लोड हो रहा है, कृपया एक क्षण बाद दोबारा प्रयास करें।');
    }
    const res = await labourDatabaseService.restoreBackup(backupPayload);
    // Restored work entries are written to device storage before the screen updates
    // (the roster is saved by the labourers effect).
    showSaved(await repo.replaceAll([...labourDatabaseService.workEntries]));
    setLabourers([...labourDatabaseService.labourers]);
    setWorkRates([...labourDatabaseService.workRates]);
    setPayments([...labourDatabaseService.payments]);
    setServiceExpenses([...labourDatabaseService.serviceExpenses]);
    if (backupPayload.contractorName) {
      setContractorName(backupPayload.contractorName);
    }
    return res;
  };

  const getOfflineDiagnostics = () => {
    return labourDatabaseService.getOfflineDiagnostics();
  };

  const value = {
    // State
    labourers,
    workRates,
    workEntries,
    payments,
    serviceExpenses,
    selectedDate,
    // Choosing a date also refreshes from the database (at most every 15 s).
    setSelectedDate: (d) => {
      setSelectedDate(d);
      if (Date.now() - lastDateRefresh.current > 15000) { lastDateRefresh.current = Date.now(); runSync(); }
    },
    selectedMonth,
    setSelectedMonth,
    contractorName,
    setContractorName,
    isLoading,
    setIsLoading,
    error,
    setError,
    storageReady,
    storageError,
    // Cloud sync
    isCloudConfigured,
    cloudUser,
    syncStatus,
    cloudSignIn,
    cloudSignOut,
    syncNow: runSync,
    confirmCloudSave,
    contractorState,
    loadContractors,
    selectContractor,
    activeContractorId: scope.activeId,
    renameCloudContractor,
    syncItems,
    registers,

    // Operations
    addLabourer,
    renameLabourer,
    toggleLabourerStatus,
    updateLabourer,
    updateWorkRate,
    resetWorkRates,
    addWorkEntry,
    updateWorkEntry,
    deleteWorkEntry,
    addPayment,
    addBulkPayments,
    updatePayment,
    deletePayment,
    addServiceExpense,
    updateServiceExpense,
    deleteServiceExpense,

    // Backup & Offline Operations (LH-QA-01)
    createBackup,
    restoreBackup,
    getOfflineDiagnostics,

    // Settlement Operations (LH-SETTLEMENT-01)
    getMonthlySettlement: getMonthlySettlementMemo,
    confirmSettlementStatus: confirmSettlementStatusMemo,
    closeMonthAndCarryForward: closeMonthAndCarryForwardMemo,
    recordSettlementCorrection: recordSettlementCorrectionMemo,
    getSettlementCorrections: getSettlementCorrectionsMemo,

    // Selectors
    todayMetrics,
    getDailyLedger,
    getMonthlySummary,
    getDailyReport,
    getWeeklyReport,
    getPaymentLedger,
    getServiceExpenseReport,
    getLabourerStatement: getLabourerStatementMemo,
    getPeriodReport: getPeriodReportMemo,
  };

  return (
    <LabourHisaabContext.Provider value={value}>
      {children}
    </LabourHisaabContext.Provider>
  );
}

export function useLabourHisaab() {
  const context = useContext(LabourHisaabContext);
  if (!context) {
    throw new Error('useLabourHisaab must be used within a LabourHisaabProvider');
  }
  return context;
}

export default LabourHisaabContext;
