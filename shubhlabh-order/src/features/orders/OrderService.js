import { supabase } from '../../core/api/supabase';

/**
 * Derives the canonical operational customer-facing status from
 * the requirement status, its dispatch records, and line items.
 *
 * @param {string} requirementStatus Status from `requirements` table.
 * @param {Array} dispatches Array of dispatch rows.
 * @param {Array} items Array of requirement_items rows.
 * @returns {string} Normalized status: 'NEW' | 'CONFIRMED' | 'PROCESSING' | 'PARTIALLY DISPATCHED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED' | 'CLOSED'
 */
export function deriveOrderStatus(requirementStatus, dispatches = [], items = []) {
  const reqStatus = (requirementStatus || 'New').toUpperCase();

  if (reqStatus === 'CANCELLED') {
    return 'CANCELLED';
  }

  // Filter valid (non-cancelled) dispatches
  const validDispatches = (dispatches || []).filter(
    d => (d.status || '').toUpperCase() !== 'CANCELLED'
  );

  if (validDispatches.length === 0) {
    if (reqStatus === 'CLOSED') return 'CLOSED';
    if (reqStatus === 'NEW') return 'NEW';
    if (reqStatus === 'CONFIRMED') return 'CONFIRMED';
    if (reqStatus === 'IN PROGRESS' || reqStatus === 'PROCESSING') return 'PROCESSING';
    return reqStatus;
  }

  // If ALL non-cancelled dispatches are Delivered, order is DELIVERED
  const allDelivered = validDispatches.length > 0 && validDispatches.every(
    d => (d.status || '').toUpperCase() === 'DELIVERED'
  );
  if (allDelivered) {
    return 'DELIVERED';
  }

  // Total required bags from items
  const totalReq = (items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  // Total net dispatched bags (subtracting return_quantity)
  const totalDisp = validDispatches.reduce(
    (sum, d) => sum + ((Number(d.quantity) || 0) - (Number(d.return_quantity) || 0)),
    0
  );

  // If requirement is Closed in CRM via full dispatch, or net dispatched meets/exceeds requirement:
  if (reqStatus === 'CLOSED' || (totalReq > 0 && totalDisp >= totalReq)) {
    return 'DISPATCHED';
  }

  // If some quantity has been dispatched but less than total required:
  if (totalDisp > 0 && totalReq > 0 && totalDisp < totalReq) {
    return 'PARTIALLY DISPATCHED';
  }

  return 'DISPATCHED';
}

/**
 * Normalizes raw Supabase requirements data into a standard canonical order object.
 * @param {Object} data Raw data row from `requirements` including `requirement_items` and `requirement_dispatches`.
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
      quantity: Number(item.quantity) || 0,
      unit: item.unit || extra.unit || 'Bags',
      weight: item.weight || extra.weight || null,
      gift: item.gift || extra.gift || null,
      other_gift: item.other_gift || extra.other_gift || null,
      price: item.price || item.rate || extra.price || null,
    };
  });

  // Parse dispatches
  const rawDispatches = data.requirement_dispatches || [];
  const dispatches = rawDispatches.map(d => ({
    id: d.id,
    dispatch_date: d.dispatch_date,
    quantity: Number(d.quantity) || 0,
    unit: d.unit || 'Bags',
    return_quantity: Number(d.return_quantity) || 0,
    net_quantity: (Number(d.quantity) || 0) - (Number(d.return_quantity) || 0),
    status: d.status || 'Dispatched',
    truck_number: d.truck_number || '',
    transporter_name: d.transporter_name || '',
    driver_name: d.driver_name || '',
    driver_mobile: d.driver_mobile || '',
    lr_bilty_number: d.lr_bilty_number || '',
    invoice_number: d.invoice_number || '',
    invoice_date: d.invoice_date || null,
    actual_delivery_date: d.actual_delivery_date || null,
    received_by: d.received_by || null,
    created_at: d.created_at,
  }));

  // Calculate totals from items ONLY to prevent double-counting across multiple dispatches
  const totalProducts = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  
  let totalWeight = 0;
  items.forEach(item => {
    if (item.weight) {
      const w = parseFloat(item.weight);
      if (!isNaN(w)) {
        totalWeight += (item.quantity * w);
      }
    }
  });

  const validDispatches = dispatches.filter(d => (d.status || '').toUpperCase() !== 'CANCELLED');
  const totalDispatchedQuantity = validDispatches.reduce((sum, d) => sum + d.net_quantity, 0);

  const latestDispatch = dispatches.length > 0
    ? [...dispatches].sort((a, b) => new Date(b.dispatch_date || b.created_at) - new Date(a.dispatch_date || a.created_at))[0]
    : null;

  // Derive canonical operational status
  const canonicalStatus = deriveOrderStatus(data.status, dispatches, items);

  return {
    id: data.id,
    order_no: data.demand_ref || data.id?.substring(0, 6) || 'PENDING',
    party_id: data.party_id,
    created_at: data.created_at,
    status: canonicalStatus,
    raw_status: data.status,
    items,
    dispatches,
    latest_dispatch: latestDispatch,
    totalProducts,
    totalQuantity,
    totalWeight,
    totalDispatchedQuantity,
    delivery_address: deliveryAddress,
    customer_name: data.crm_parties?.display_name || '',
    _raw: data,
  };
}

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
