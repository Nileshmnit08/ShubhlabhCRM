/**
 * Canonical Requirement Item Normalization Layer (CRM-UNIFIED-REQUIREMENT-SUMMARY-01)
 *
 * Provides a single, authoritative canonical structure for requirement items across:
 * 1. Shubh Labh Order App
 * 2. Field Assist App
 * 3. CRM manual Add Requirement
 * 4. Legacy historical requirements
 *
 * Each canonical item guarantees:
 * - requirement_id
 * - item_id
 * - product_id (if available)
 * - product_name (clean base name)
 * - raw_product_name
 * - category
 * - quantity (number, never guessed)
 * - unit (e.g. 'Bags', 'MT', 'Qtl', 'KG')
 * - bag_weight (packaging kg per bag, or null)
 * - total_weight_kg (computed from quantity and unit/bag_weight, or null)
 * - has_weight (boolean)
 * - formatted_qty_weight
 */

const WEIGHT_SUFFIX_REGEX = /\s*\(\s*(\d+(?:\.\d+)?)\s*kg\s*\)\s*$/i;

/**
 * Extracts packaging/bag weight from explicit weight or product name suffix.
 * Never guesses or infers missing weights.
 */
export function parseProductWeight(rawName, explicitWeight) {
  const direct = explicitWeight !== undefined && explicitWeight !== null && explicitWeight !== ''
    ? Number(explicitWeight)
    : null;
  if (direct !== null && !isNaN(direct) && direct > 0) {
    // If rawName has suffix like "(45 kg)", trim it to get base name
    const match = typeof rawName === 'string' ? rawName.match(WEIGHT_SUFFIX_REGEX) : null;
    const baseName = match ? rawName.slice(0, match.index).trim() : (typeof rawName === 'string' ? rawName.trim() : '');
    return {
      productName: baseName || rawName || 'Feed',
      bagWeight: direct,
    };
  }

  if (typeof rawName === 'string') {
    const match = rawName.match(WEIGHT_SUFFIX_REGEX);
    if (match) {
      const parsed = Number(match[1]);
      if (!isNaN(parsed) && parsed > 0) {
        return {
          productName: rawName.slice(0, match.index).trim(),
          bagWeight: parsed,
        };
      }
    }
    return {
      productName: rawName.trim(),
      bagWeight: null,
    };
  }

  return {
    productName: 'Feed',
    bagWeight: null,
  };
}

/**
 * Calculates total weight in KG for an item based on its quantity, unit, and bag packaging weight.
 * Strictly calculates only when mathematical conversion is exact. Never guesses missing bag weights.
 */
export function calculateItemTotalWeightKg(quantity, unit, bagWeight) {
  const q = Number(quantity);
  if (isNaN(q) || q <= 0) return null;

  const normalizedUnit = (unit || 'Bags').trim();

  // Metric Tonne: 1 MT = 1,000 KG
  if (/^mt$/i.test(normalizedUnit) || /^metric\s*tonne/i.test(normalizedUnit)) {
    return q * 1000;
  }

  // Quintal: 1 Qtl = 100 KG
  if (/^qtl$/i.test(normalizedUnit) || /^quintal/i.test(normalizedUnit)) {
    return q * 100;
  }

  // Kilogram: 1 KG = 1 KG
  if (/^kg$/i.test(normalizedUnit) || /^kilogram/i.test(normalizedUnit)) {
    return q;
  }

  // Bags: Total weight = Quantity * Bag Weight (if bag weight is known)
  if (/^bag/i.test(normalizedUnit)) {
    if (bagWeight !== null && !isNaN(bagWeight) && bagWeight > 0) {
      return q * bagWeight;
    }
    return null;
  }

  return null;
}

/**
 * Formats quantity and weight for clear UI display.
 * Returns { primary, weightSub, fullLabel }.
 * Example:
 * - Bags with weight: primary="100 Bags", weightSub="(40 kg/bag • 4,000 kg)"
 * - MT: primary="3 MT", weightSub="(3,000 kg)"
 * - Bags without weight: primary="70 Bags", weightSub=null
 */
export function formatItemQtyAndWeight(item) {
  if (!item) return { primary: '-', weightSub: null, fullLabel: '-' };

  const qty = Number(item.quantity) || 0;
  const unit = (item.unit || 'Bags').trim();
  const primary = `${qty} ${unit}`;

  let weightSub = null;

  if (/^bag/i.test(unit) && item.bag_weight) {
    if (item.total_weight_kg) {
      weightSub = `(${item.bag_weight} kg/bag • ${item.total_weight_kg.toLocaleString()} kg)`;
    } else {
      weightSub = `(${item.bag_weight} kg/bag)`;
    }
  } else if (/^mt$/i.test(unit) && item.total_weight_kg) {
    weightSub = `(${item.total_weight_kg.toLocaleString()} kg)`;
  } else if ((/^qtl$/i.test(unit) || /^quintal/i.test(unit)) && item.total_weight_kg) {
    weightSub = `(${item.total_weight_kg.toLocaleString()} kg)`;
  }

  const fullLabel = weightSub ? `${primary} ${weightSub}` : primary;
  return { primary, weightSub, fullLabel };
}

/**
 * Converts a raw item or header into a Canonical Requirement Item.
 */
export function normalizeRequirementItem(rawItem, parentReq = {}) {
  const rawName = rawItem?.product_name || rawItem?.product || parentReq?.product_type || 'Feed';
  const rawWeight = rawItem?.weight ?? rawItem?.bag_weight ?? null;
  const { productName, bagWeight } = parseProductWeight(rawName, rawWeight);

  const rawQty = rawItem?.quantity ?? rawItem?.required_quantity ?? parentReq?.required_quantity ?? parentReq?.quantity ?? 0;
  const quantity = Number(rawQty) || 0;
  const unit = (rawItem?.unit || parentReq?.unit || 'Bags').trim();

  const totalWeightKg = calculateItemTotalWeightKg(quantity, unit, bagWeight);

  return {
    id: rawItem?.id || null,
    requirement_id: rawItem?.requirement_id || parentReq?.id || null,
    product_id: rawItem?.product_id || null,
    product_name: productName,
    raw_product_name: rawName,
    category: rawItem?.category || parentReq?.category || 'Product',
    quantity,
    unit,
    bag_weight: bagWeight,
    total_weight_kg: totalWeightKg,
    has_weight: totalWeightKg !== null,
    gift: rawItem?.gift || null,
    other_gift: rawItem?.other_gift || null,
    production_done: Boolean(rawItem?.production_done),
    production_done_at: rawItem?.production_done_at || null,
    production_done_by: rawItem?.production_done_by || null,
    is_fallback_header: Boolean(rawItem?.is_fallback_header),
  };
}

/**
 * Extracts and returns an array of Canonical Requirement Items for any requirement.
 * - If requirement has requirement_items, returns all canonical items.
 * - If requirement is legacy without requirement_items, synthesizes one canonical item from header.
 * - Never combines multi-product items into one string.
 * - Never invents allocations or missing data.
 */
export function getCanonicalRequirementItems(req) {
  if (!req) return [];

  if (Array.isArray(req.requirement_items) && req.requirement_items.length > 0) {
    return req.requirement_items.map(item => normalizeRequirementItem(item, req));
  }

  // Legacy single-product header fallback
  const fallbackItem = {
    id: null,
    requirement_id: req.id,
    product_name: req.product_type === 'General Requirement' ? '-' : (req.product_type || 'Feed'),
    category: 'Product',
    quantity: Number(req.required_quantity ?? req.quantity) || 0,
    unit: req.unit || 'Bags',
    weight: req.weight || null,
    is_fallback_header: true,
  };

  return [normalizeRequirementItem(fallbackItem, req)];
}

/**
 * Formats compatible unit totals across items or requirements without invalid cross-unit addition.
 * Example:
 * - All Bags: "80 Bags"
 * - All MT: "10 MT"
 * - Mixed: "335 Bags + 10 MT"
 */
export function formatCompatibleUnitTotals(itemsOrReqs) {
  if (!Array.isArray(itemsOrReqs) || itemsOrReqs.length === 0) return '0 Bags';

  // Gather canonical items
  const items = itemsOrReqs.flatMap(entry => {
    if (entry.product_name && entry.quantity !== undefined && entry.unit) {
      return [entry]; // already an item
    }
    return getCanonicalRequirementItems(entry);
  });

  const unitTotals = {};
  for (const item of items) {
    const unit = (item.unit || 'Bags').trim();
    unitTotals[unit] = (unitTotals[unit] || 0) + (Number(item.quantity) || 0);
  }

  const parts = Object.entries(unitTotals)
    .filter(([_, qty]) => qty > 0)
    .map(([unit, qty]) => `${qty} ${unit}`);

  return parts.length > 0 ? parts.join(' + ') : '0 Bags';
}

/**
 * Returns distinct clean product names across a requirement or customer group.
 */
export function getDistinctProductNames(itemsOrReqs) {
  if (!Array.isArray(itemsOrReqs) || itemsOrReqs.length === 0) return [];

  const names = new Set();
  const items = itemsOrReqs.flatMap(entry => {
    if (entry.product_name && entry.unit) return [entry];
    return getCanonicalRequirementItems(entry);
  });

  for (const item of items) {
    if (item.product_name && item.product_name !== '-') {
      names.add(item.product_name);
    }
  }

  return Array.from(names);
}
