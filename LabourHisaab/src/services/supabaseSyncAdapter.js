// Supabase implementation of the CloudSync adapter (LH-CLOUD-SYNC-01).
// Talks only to the secure 249 tables as the signed-in user; the database's access rules
// decide what this user may write (Owner/Manager of their own contractor only).
import { SYNC_RATE_EFFECTIVE_FROM } from './CloudSync';

const fail = (error, what) => {
  if (!error) return;
  const msg = error.message || String(error);
  throw new Error(`${what}: ${msg}`);
};

export function createSupabaseSyncAdapter(supabase) {
  if (!supabase) throw new Error('Cloud is not configured.');

  return {
    async getMembership() {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid) throw new Error('पहले साइन इन करें।');
      const { data, error } = await supabase
        .from('contractor_members')
        .select('contractor_id, role, is_active')
        .eq('user_id', uid)
        .eq('is_active', true);
      fail(error, 'Membership');
      const rows = data || [];
      const writer = rows.find(r => r.role === 'Owner') || rows.find(r => r.role === 'Manager') || rows[0];
      return writer ? { contractorId: writer.contractor_id, role: writer.role } : null;
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
      const { error } = await supabase.from('daily_work_entries').delete().eq('id', serverId);
      fail(error, 'Delete');
    },

    async deleteAllocations(serverId) {
      const { error } = await supabase.from('labour_work_allocations').delete().eq('work_entry_id', serverId);
      fail(error, 'Allocations reset');
    },

    async upsertEntry(row) {
      const { error } = await supabase.from('daily_work_entries').upsert(row, { onConflict: 'id' });
      fail(error, 'Work entry');
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
