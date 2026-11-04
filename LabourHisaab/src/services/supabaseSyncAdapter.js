// Supabase implementation of the CloudSync adapter (LH-CLOUD-SYNC-01).
// Talks only to the secure 249 tables as the signed-in user; the database's access rules
// decide what this user may write (Owner/Manager/Operator of their own contractor only;
// server deletes need Owner/Manager — proposal 251).
import { SYNC_RATE_EFFECTIVE_FROM, pickMembership } from './CloudSync';

const PAGE = 1000;

const fail = (error, what) => {
  if (!error) return;
  const msg = error.message || String(error);
  throw new Error(`${what}: ${msg}`);
};

export function createSupabaseSyncAdapter(supabase, { selectedContractorId = null } = {}) {
  if (!supabase) throw new Error('Cloud is not configured.');

  let featureCache = null;
  const ENTRY_COLS = 'id, work_date, work_type, rate_snapshot, rate_unit_snapshot, total_weight_kg, total_bags, total_batches, calculated_labour_amount, notes, created_by, created_at, updated_at';
  const pageAll = async (build) => {
    const rows = [];
    for (let page = 0; page < 50; page++) {
      const { data, error } = await build().range(page * PAGE, page * PAGE + PAGE - 1);
      if (error) return { error, rows };
      rows.push(...(data || []));
      if (!data || data.length < PAGE) return { rows };
    }
    return { error: new Error('Too many rows to download.'), rows };
  };

  return {
    // Which parts of proposal 252 the server has (absent column/table → older server; sync still works).
    async features() {
      if (featureCache) return featureCache;
      const ts = await supabase.from('daily_work_entries').select('recorded_at, work_completed_at').limit(1);
      const reg = await supabase.from('labour_daily_registers').select('id').limit(1);
      featureCache = { timestamps: !ts.error, registers: !reg.error };
      return featureCache;
    },

    async fetchLabourers(contractorId) {
      const { rows, error } = await pageAll(() => supabase.from('labourers')
        .select('id, local_id, name, phone, role, active_status, join_date, notes')
        .eq('contractor_id', contractorId).order('local_id'));
      fail(error, 'Labourers download');
      return rows;
    },

    async fetchEntries(contractorId) {
      const { timestamps } = await this.features();
      const cols = `${ENTRY_COLS}${timestamps ? ', recorded_at, work_completed_at' : ''}, daily_work_details(bag_weight_kg, bag_count), labour_work_allocations(allocated_amount, labourers(local_id))`;
      const { rows, error } = await pageAll(() => supabase.from('daily_work_entries')
        .select(cols).eq('contractor_id', contractorId).order('work_date').order('id'));
      fail(error, 'Entries download');
      return rows.map(r => ({
        row: r,
        details: r.daily_work_details || [],
        allocations: (r.labour_work_allocations || []).map(a => ({ labourer_local_id: a.labourers?.local_id, allocated_amount: a.allocated_amount })),
      }));
    },

    async fetchRegisters(contractorId) {
      const { rows, error } = await pageAll(() => supabase.from('labour_daily_registers')
        .select('id, work_date, status, revision, rejection_reason, decided_at, updated_at')
        .eq('contractor_id', contractorId).order('work_date'));
      fail(error, 'Approval status');
      return rows;
    },

    /**
     * The signed-in account's ACTIVE memberships of ACTIVE contractors, with names
     * (RLS: a user reads only their own membership rows and the contractors they belong to).
     */
    async listMemberships() {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error('पहले साइन इन करें।');
      const { data, error } = await supabase
        .from('contractor_members')
        .select('contractor_id, role, is_active, contractors(name, is_active)')
        .eq('user_id', uid)
        .eq('is_active', true);
      fail(error, 'Membership');
      return (data || [])
        .filter(r => r.contractors && r.contractors.is_active !== false)
        .map(r => ({ contractor_id: r.contractor_id, role: r.role, name: r.contractors.name }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    },

    async getMembership() {
      return pickMembership(await this.listMemberships(), selectedContractorId);
    },

    async upsertLabourers(rows) {
      const { data, error } = await supabase
        .from('labourers')
        .upsert(rows, { onConflict: 'contractor_id,local_id' })
        .select('id, local_id');
      fail(error, 'Labourers');
      return data || [];
    },

    async ensureRate({ contractorId, workType, unit, rate }) {
      const { data, error } = await supabase
        .from('labour_rates')
        .select('id, rate, rate_unit, is_editable_rate')
        .eq('contractor_id', contractorId)
        .eq('work_type', workType)
        .is('effective_until', null)
        .limit(1);
      fail(error, 'Rate lookup');
      if (data && data.length) {
        if (data[0].rate_unit !== unit) throw new Error(`Rate unit for ${workType} is "${data[0].rate_unit}" on the server.`);
        return data[0];
      }
      // The phone stores each entry's own rate snapshot; the server period is editable so
      // those snapshots are accepted, while amount = rate × quantity is still enforced.
      const { data: created, error: insErr } = await supabase
        .from('labour_rates')
        .insert({ contractor_id: contractorId, work_type: workType, rate, rate_unit: unit, is_editable_rate: true, effective_from: SYNC_RATE_EFFECTIVE_FROM })
        .select('id, rate, rate_unit, is_editable_rate')
        .single();
      fail(insErr, 'Rate create');
      return created;
    },

    async deleteEntry(serverId) {
      const { data, error } = await supabase.from('daily_work_entries').delete().eq('id', serverId).select('id');
      fail(error, 'Delete');
      // Access rules turn a forbidden delete into "0 rows" without an error: confirm it is gone.
      if (!data || !data.length) {
        const { data: still, error: readErr } = await supabase.from('daily_work_entries').select('id').eq('id', serverId);
        fail(readErr, 'Delete check');
        if (still && still.length) throw new Error('Delete: not permitted for this account.');
      }
    },

    async deleteAllocations(serverId) {
      const { error } = await supabase.from('labour_work_allocations').delete().eq('work_entry_id', serverId);
      fail(error, 'Allocations reset');
    },

    // Returns the persisted row (id + server timestamps) — proof the database stored it.
    async upsertEntry(row) {
      const { data, error } = await supabase.from('daily_work_entries').upsert(row, { onConflict: 'id' })
        .select('id, created_at, updated_at').single();
      fail(error, 'Work entry');
      if (!data || data.id !== row.id) throw new Error('Work entry: the database did not return the saved record.');
      return data;
    },

    async replaceDetails(serverId, rows) {
      const { error: delErr } = await supabase.from('daily_work_details').delete().eq('work_entry_id', serverId);
      fail(delErr, 'Bag lines reset');
      if (rows.length) {
        const { error } = await supabase.from('daily_work_details').insert(rows);
        fail(error, 'Bag lines');
      }
    },

    async insertAllocations(rows) {
      const { error } = await supabase.from('labour_work_allocations').insert(rows);
      fail(error, 'Allocations');
    },
  };
}
