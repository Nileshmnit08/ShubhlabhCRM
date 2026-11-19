import { supabase } from '../../core/api/supabase';

import { deriveOrderStatus, normalizeOrder } from './orderNormalizer.js';

// Re-exported: every existing import from './OrderService' keeps working unchanged.
export { deriveOrderStatus, normalizeOrder };


/**
 * Fetches a single canonical order by requirement ID.
 */
export async function getOrderById(requirementId) {
  const { data, error } = await supabase
    .from('requirements')
    .select('*, requirement_items(*), requirement_dispatches(*), crm_parties(display_name)')
    .eq('id', requirementId)
    .single();

  if (error) {
    throw error;
  }
  return normalizeOrder(data);
}

/**
 * Fetches all canonical orders for a party.
 */
export async function getOrdersByParty(partyId) {
  const { data, error } = await supabase
    .from('requirements')
    .select('*, requirement_items(*), requirement_dispatches(*), crm_parties(display_name)')
    .eq('party_id', partyId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }
  return data.map(normalizeOrder);
}

/**
 * Fetches the latest canonical order for a party.
 */
export async function getLatestOrder(partyId) {
  const { data, error } = await supabase
    .from('requirements')
    .select('*, requirement_items(*), requirement_dispatches(*), crm_parties(display_name)')
    .eq('party_id', partyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = No rows returned
    throw error;
  }
  return normalizeOrder(data);
}

/**
 * Calculates canonical order summary counts for an authenticated party.
 * Groups orders by canonical operational status:
 * - inProgress: NEW, CONFIRMED, PROCESSING, PARTIALLY DISPATCHED
 * - dispatched: DISPATCHED
 * - delivered: DELIVERED, RECEIVED
 *
 * @param {string} partyId Customer crm_party_id
 * @returns {Promise<{inProgress: number, dispatched: number, delivered: number, total: number}>}
 */
export async function getOrderSummaryCounts(partyId) {
  if (!partyId) {
    return { inProgress: 0, dispatched: 0, delivered: 0, total: 0 };
  }
  const orders = await getOrdersByParty(partyId);
  const inProgress = orders.filter(o =>
    ['NEW', 'CONFIRMED', 'PROCESSING', 'PARTIALLY DISPATCHED'].includes(o.status)
  ).length;
  const dispatched = orders.filter(o => o.status === 'DISPATCHED').length;
  const delivered = orders.filter(o =>
    ['DELIVERED', 'RECEIVED'].includes(o.status)
  ).length;

  return {
    inProgress,
    dispatched,
    delivered,
    total: orders.length,
  };
}
