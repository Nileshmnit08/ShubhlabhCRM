import { supabase } from '../../core/api/supabase';

/**
 * Normalizes raw Supabase requirements data into a standard canonical order object.
 * @param {Object} data Raw data row from `requirements` including `requirement_items`.
 * @returns {Object} Canonical Order object.
 */
export function normalizeOrder(data) {
  if (!data) return null;

  let extras = {};
  let deliveryAddress = data.notes || ''; // Fallback to raw notes

  if (data.notes) {
    try {
      const parsed = JSON.parse(data.notes);
      if (parsed && typeof parsed === 'object') {
        if (parsed.extras) {
          extras = parsed.extras;
        }
        if (parsed.address) {
          deliveryAddress = parsed.address;
        }
      }
    } catch (e) {
      // Not JSON, ignore
    }
  }

  // Parse items
  const rawItems = data.requirement_items || [];
  
  const items = rawItems.map(item => {
    const key = `${item.category}_${item.product_name}`;
    const extra = extras[key] || {};
    return {
      id: item.id,
      product_name: item.product_name || 'Unknown Product',
      category: item.category || 'Unknown',
      quantity: item.quantity || 0,
      unit: item.unit || extra.unit || 'Bags',
      weight: extra.weight || null,
      gift: extra.gift || null,
      other_gift: extra.other_gift || null,
    };
  });

  // Calculate totals
  const totalProducts = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  
  // Assuming weight represents total line weight or per-bag weight based on existing behavior.
  // We'll multiply weight by quantity if weight exists per item.
  // Actually, wait, the rule says: "If weight represents per-bag weight: 29 * 45 KG = 1305 KG"
  // I will multiply item.quantity * item.weight
  let totalWeight = 0;
  items.forEach(item => {
    if (item.weight) {
      // extract numeric part of weight e.g. "50 KG" -> 50
      const w = parseFloat(item.weight);
      if (!isNaN(w)) {
        totalWeight += (item.quantity * w);
      }
    }
  });

  return {
    id: data.id,
    order_no: data.demand_ref || data.id?.substring(0, 6) || 'PENDING',
    party_id: data.party_id,
    created_at: data.created_at,
    status: data.status || 'NEW',
    items,
    totalProducts,
    totalQuantity,
    totalWeight,
    delivery_address: deliveryAddress,
    customer_name: data.crm_parties?.display_name || '',
    // Original raw for backwards compatibility where necessary
    _raw: data,
  };
}

/**
 * Fetches a single canonical order by requirement ID.
 */
export async function getOrderById(requirementId) {
  const { data, error } = await supabase
    .from('requirements')
    .select('*, requirement_items(*), crm_parties(display_name)')
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
    .select('*, requirement_items(*), crm_parties(display_name)')
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
    .select('*, requirement_items(*), crm_parties(display_name)')
    .eq('party_id', partyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = No rows returned
    throw error;
  }
  return normalizeOrder(data);
}
