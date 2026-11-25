/**
 * dispatchListGenerator.js
 * 
 * Logic and helpers for MICRO-SPRINT: REQUIREMENTS-SHARE-DISPATCH-LIST-02
 * 
 * Generates consolidated, customer-wise dispatch lists from Requirements Board data:
 * - Respects active board filters
 * - Consolidates multiple products per customer sharing the same transporter/dispatch grouping
 * - Produces separate entries if a customer has different transporters
 * - Computes unit-separated quantity summaries (e.g. "335 Bags + 10 MT")
 * - Formats plain-text export for Copy and WhatsApp click-to-share
 */

import { isRequirementDispatched } from './dispatchedTransportSummary.js';

/**
 * Formats a Date object or date string into "DD MMM YYYY" (e.g. "25 Nov 2026").
 */
export function formatDispatchDate(dateInput = new Date()) {
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}

/**
 * Filters requirements eligible for dispatch list export.
 * Excludes cancelled, deleted, lost records. Excludes dispatched orders unless the current view explicitly asks for them.
 */
export function filterEligibleDispatchRequirements(requirements = [], { statusFilter = 'All Open', includeCompleted = false } = {}) {
  const terminalStatuses = ['Closed', 'Fulfilled', 'Completed', 'Cancelled', 'Lost', 'Won', 'Deleted', 'Voided'];

  return (requirements || []).filter(req => {
    if (!req) return false;
    
    // Check if explicitly cancelled or deleted
    if (['Cancelled', 'Deleted', 'Voided', 'Lost'].includes(req.status)) {
      return false;
    }

    const dispatched = isRequirementDispatched(req);

    // If current view is explicitly Dispatched, only include dispatched records
    if (statusFilter === 'Dispatched') {
      return dispatched;
    }

    // If includeCompleted is checked, allow completed/dispatched
    if (includeCompleted) {
      return true;
    }

    // In normal active dispatch view, do not include already dispatched or closed records
    if (dispatched || terminalStatuses.includes(req.status)) {
      return false;
    }

    return true;
  });
}

/**
 * Normalizes phone number or returns 'Not Available'.
 */
export function normalizeTransporterPhone(phone) {
  if (!phone) return 'Not Available';
  const clean = String(phone).trim();
  if (!clean || clean.toLowerCase() === 'not available' || clean.toLowerCase() === 'null') {
    return 'Not Available';
  }
  // Remove non-digit characters except leading +
  const digits = clean.replace(/[^\d+]/g, '');
  return digits.length >= 7 ? digits : clean;
}

/**
 * Normalizes transporter name or returns 'Not Available'.
 */
export function normalizeTransporterName(name) {
  if (!name) return 'Not Available';
  const clean = String(name).trim();
  if (
    !clean ||
    clean.toLowerCase() === 'not available' ||
    clean.toLowerCase() === 'transport details not available' ||
    clean.toLowerCase() === 'transport details unavailable' ||
    clean.toLowerCase() === 'no transporter history' ||
    clean.toLowerCase() === 'unknown'
  ) {
    return 'Not Available';
  }
  return clean;
}

/**
 * Extracts and consolidates product items for a requirement.
 */
export function extractRequirementItems(req) {
  if (Array.isArray(req.requirement_items) && req.requirement_items.length > 0) {
    return req.requirement_items.map(item => ({
      product: (item.product_name || req.product_type || 'Feed').trim(),
      quantity: Number(item.quantity) || 0,
      unit: (item.unit || req.unit || 'Bags').trim()
    }));
  }

  return [{
    product: (req.product_type || 'Feed').trim(),
    quantity: Number(req.required_quantity || req.quantity) || 0,
    unit: (req.unit || 'Bags').trim()
  }];
}

/**
 * Builds the consolidated customer-wise dispatch entries.
 */
export function buildConsolidatedDispatchData(requirements = [], options = {}) {
  const eligible = filterEligibleDispatchRequirements(requirements, options);
  
  // Group by Customer + Transporter + Mobile
  const groupsMap = new Map();

  for (const req of eligible) {
    const partyId = req.party_id || `cust-${req.customer_name || 'unknown'}`;
    const customerName = (req.customer_name || 'Unknown Customer').trim();
    const rawCity = (req.customer_city || req.crm_parties?.city || '').trim();
    const location = (rawCity && rawCity !== 'Location N/A') ? rawCity : '';

    // Resolve transporter details
    const rawTransName = req.transporter_info?.transporterName || req.transport_details?.transporterName || req.dispatches?.[0]?.transporter_name;
    const rawTransMobile = req.transporter_info?.mobileNumber || req.transport_details?.mobileNumber || req.dispatches?.[0]?.driver_mobile;

    const transporterName = normalizeTransporterName(rawTransName);
    const mobile = (transporterName === 'Not Available') ? 'Not Available' : normalizeTransporterPhone(rawTransMobile);

    const groupKey = `${partyId}:::${transporterName}:::${mobile}`;

    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, {
        partyId,
        customerName,
        location,
        transporterName,
        mobile,
        itemsMap: new Map(), // product + unit -> total qty
        requirementIds: new Set()
      });
    }

    const group = groupsMap.get(groupKey);
    group.requirementIds.add(req.id);

    const items = extractRequirementItems(req);
    for (const item of items) {
      if (item.quantity <= 0 && items.length > 1) continue;
      const itemKey = `${item.product}:::${item.unit}`;
      const currentQty = group.itemsMap.get(itemKey) || 0;
      group.itemsMap.set(itemKey, currentQty + item.quantity);
    }
  }

  // Convert grouped map into structured entries
  const entries = [];
  const unitTotals = {};
  const uniqueCustomers = new Set();
  let totalRequirements = 0;

  for (const group of groupsMap.values()) {
    uniqueCustomers.add(group.partyId);
    totalRequirements += group.requirementIds.size;

    // Build product string: "Diamond – 50 Bags; Naman – 15 Bags; 8000 – 15 Bags"
    const productParts = [];
    for (const [itemKey, qty] of group.itemsMap.entries()) {
      const [productName, unit] = itemKey.split(':::');
      productParts.push(`${productName} – ${qty} ${unit}`);

      // Accumulate unit totals
      unitTotals[unit] = (unitTotals[unit] || 0) + qty;
    }

    const productsLine = productParts.join('; ') || 'General Requirement';

    // Format customer header: "Customer Name – Location" or "Customer Name"
    const customerTitle = group.location ? `${group.customerName} – ${group.location}` : group.customerName;

    entries.push({
      partyId: group.partyId,
      customerName: group.customerName,
      location: group.location,
      customerTitle,
      productsLine,
      transporterName: group.transporterName,
      mobile: group.mobile,
      requirementCount: group.requirementIds.size
    });
  }

  // Format Total Qty string: e.g. "335 Bags + 10 MT"
  // Never add unlike units together!
  const unitParts = Object.entries(unitTotals).map(([unit, qty]) => `${qty} ${unit}`);
  const totalQtyDisplay = unitParts.length > 0 ? unitParts.join(' + ') : '0 Bags';

  return {
    entries,
    summary: {
      totalCustomers: uniqueCustomers.size,
      totalRequirements,
      totalQtyDisplay,
      unitTotals
    }
  };
}

/**
 * Formats the consolidated dispatch data into the exact raw text structure.
 */
export function generateDispatchListPlainText(dispatchData, dateStr = formatDispatchDate()) {
  const { entries } = dispatchData;
  if (!entries || entries.length === 0) {
    return `Dispatch List – ${dateStr}\n\nNo eligible dispatch requirements available.`;
  }

  const lines = [`Dispatch List – ${dateStr}`, ''];

  entries.forEach((entry, idx) => {
    const num = idx + 1;
    lines.push(`${num}. ${entry.customerTitle}`);
    lines.push(`   ${entry.productsLine}`);
    lines.push(`   Transporter: ${entry.transporterName}`);
    lines.push(`   Mobile: ${entry.mobile}`);
    lines.push(''); // Blank line separator
  });

  return lines.join('\n').trim();
}

/**
 * Builds the WhatsApp web / mobile click-to-share URL.
 */
export function generateWhatsAppShareUrl(plainText) {
  if (!plainText) return '';
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(plainText)}`;
}
