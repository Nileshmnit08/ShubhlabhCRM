/**
 * SL-ORDER-REPEAT-ORDER-02 — Repeat Order: a previous order is a TEMPLATE for a brand-new order draft.
 *
 * Pure JavaScript (no React Native, no network client of its own) so the exact code that runs in the app
 * is unit-tested in Node. Internal imports use explicit ".js" for that reason.
 *
 * Data contract (docs/SL-ORDER-SINGLE-SOURCE-OF-TRUTH-01_MAPPING_CONTRACT.md, migrations 224/SSOT-FIX-01):
 *   requirement_items: product_name + category identify the product (there is NO product_id column),
 *                      quantity, unit, weight (= packaging, kg per bag), gift, other_gift.
 *   requirements.notes (JSON text): { address, client_reference_id }.
 *   products has NO price column and the buyer app shows no order totals (docs SL-ORDER-05 / SL-ORDER-06-AUDIT),
 *   so price comparison only happens when both the old line and the live product actually carry a price.
 *
 * Previous order → new draft:
 *   COPIED PER LINE, never merged:  product_name, category, quantity, unit, weight, gift, other_gift
 *   COPIED FROM THE ORDER:          delivery address (read exactly the way the app already reads it)
 *   NEVER COPIED:                   id, order number, status, dispatches / returns, created/updated times,
 *                                   party_id, assigned_to, the old client_reference_id, any price
 *   GENERATED NEW:                  client_reference_id, line ids
 */
import { normalizeOrder } from './orderNormalizer.js';

export const REPEAT_MESSAGE = Object.freeze({
  en: 'Your previous order details have been filled in. Please review the products, quantities, delivery details and current prices before submitting.',
  hi: 'आपके पिछले ऑर्डर का विवरण भर दिया गया है। कृपया सबमिट करने से पहले उत्पाद, मात्रा, डिलीवरी विवरण और वर्तमान मूल्य जाँच लें।',
});

export class RepeatOrderError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RepeatOrderError';
    this.code = code;
  }
}
// NOT_FOUND     the order does not exist or is not this customer's (the two are deliberately indistinguishable)
// NOT_OWNER     the order that came back belongs to another customer
// NO_ITEMS      the order has no lines to repeat
// INVALID_ORDER the order object is unusable
// LOAD_FAILED   the database request failed
// CATALOGUE_UNAVAILABLE  the live product list could not be loaded

export const LINE_PROBLEM = Object.freeze({
  PRODUCT_UNAVAILABLE: 'PRODUCT_UNAVAILABLE',
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  INVALID_PACKAGING: 'INVALID_PACKAGING',
});

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** A fresh idempotency key for one order draft (same format the app has always used). */
export function newClientReferenceId(now = Date.now, random = Math.random) {
  return `ref-${now()}-${Math.floor(random() * 1e6)}`;
}

/**
 * The order the customer picked, fetched again from the database — never trusted from navigation
 * parameters — and filtered by the authenticated customer's id (RLS enforces the same rule server-side).
 */
export async function fetchOrderForRepeat(client, orderId, partyId) {
  if (!orderId || !partyId) throw new RepeatOrderError('NOT_FOUND', 'Order not found.');
  const { data, error } = await client
    .from('requirements')
    .select('*, requirement_items(*)')
    .eq('id', orderId)
    .eq('party_id', partyId)
    .maybeSingle();
  if (error) throw new RepeatOrderError('LOAD_FAILED', error.message || 'Could not load the order.');
  if (!data) throw new RepeatOrderError('NOT_FOUND', 'Order not found.');
  return normalizeOrder(data);
}

/** The delivery address of an old order, or '' when it only holds an unrelated JSON blob. */
export function cleanAddress(raw) {
  if (typeof raw !== 'string') return '';
  const text = raw.trim();
  if (!text || text.startsWith('{') || text.startsWith('[')) return ''; // normalizeOrder falls back to the raw notes JSON
  return text;
}

/** Exact match on name AND category (the contract) — no fuzzy matching, no fallback product. */
export function findProduct(catalogue, name, category) {
  if (!Array.isArray(catalogue)) return null;
  return catalogue.find((p) => p && p.active !== false && p.name === name && p.category === category) || null;
}

// ---- Separating product identity from packaging (SL-ORDER-REPEAT-ORDER-05) -------------------------------
// Orders written by Field Assist / the CRM (and before the `weight` column existed) carry the packaging INSIDE
// the product name: "Shubh Labh (45 kg)". The catalogue holds only "Shubh Labh". The identity of a line is its
// category + base product name; the weight is a separate field. This is a generic rule (a trailing "(<n> kg)"
// suffix), not a list of product names.
const WEIGHT_SUFFIX = /\s*\(\s*(\d+(?:\.\d+)?)\s*kg\s*\)\s*$/i;

/** "Shubh Labh (45 kg)" → { baseName: 'Shubh Labh', weight: 45 };  "Shubh Labh" → { baseName: 'Shubh Labh', weight: null }. */
export function parseProductLabel(label) {
  if (typeof label !== 'string') return { baseName: label, weight: null };
  const m = label.match(WEIGHT_SUFFIX);
  if (!m) return { baseName: label.trim(), weight: null };
  const weight = Number(m[1]);
  return { baseName: label.slice(0, m.index).trim(), weight: Number.isFinite(weight) && weight > 0 ? weight : null };
}

const looseKey = (s) => String(s == null ? '' : s).replace(/^\s*category\./i, '').replace(/[\s_-]+/g, ' ').trim().toLowerCase();

/**
 * The catalogue's real category value for a stored category. An exact value is used as it is; otherwise a
 * display-style label ("CATEGORY.PALLET", "category.Pallet", " pallet ") is mapped to the catalogue category it
 * names. Returns null when nothing matches — a label is never used as an identifier.
 */
export function resolveCategory(raw, catalogue) {
  if (!Array.isArray(catalogue) || raw === null || raw === undefined || raw === '') return null;
  const cats = [...new Set(catalogue.filter((p) => p && p.active !== false).map((p) => p.category).filter(Boolean))];
  if (cats.includes(raw)) return raw;
  const wanted = looseKey(raw);
  const hits = cats.filter((c) => looseKey(c) === wanted);
  return hits.length === 1 ? hits[0] : null;
}

/**
 * Finds the live product for a stored line: its category first, then the product inside that category.
 * Tries the stored name as it is, then the name without its "(<n> kg)" suffix. The same name in another category
 * is never used, and a category that cannot be resolved matches nothing.
 */
export function matchCatalogueProduct(catalogue, rawName, rawCategory) {
  const { baseName, weight } = parseProductLabel(rawName);
  const names = [...new Set([rawName, baseName].filter((n) => typeof n === 'string' && n !== ''))];
  const category = resolveCategory(rawCategory, catalogue);
  let product = null;
  if (category) {
    for (const name of names) { product = findProduct(catalogue, name, category); if (product) break; }
  } // a category that cannot be resolved matches nothing: the line is reported unavailable, never guessed
  return { product, baseName, nameWeight: weight };
}

/** 'bags' / 'BAGS' → 'Bags', 'mt' → 'MT' (the values the form's unit toggle uses); anything else is kept as stored. */
export function canonicalUnit(unit) {
  const key = String(unit == null ? '' : unit).trim().toLowerCase();
  if (key === 'bags' || key === 'bag') return 'Bags';
  if (key === 'mt') return 'MT';
  return unit || 'Bags';
}

/** Problems that must be fixed before the line can be submitted (derived from the line itself). */
export function lineProblems(item) {
  const problems = [];
  if (!item || !item.product_id) problems.push(LINE_PROBLEM.PRODUCT_UNAVAILABLE);
  const q = num(item && item.quantity);
  if (q === null || q <= 0) problems.push(LINE_PROBLEM.INVALID_QUANTITY);
  const w = item ? num(item.weight) : null;
  if (item && item.weight !== null && item.weight !== undefined && item.weight !== '' && (w === null || w <= 0)) {
    problems.push(LINE_PROBLEM.INVALID_PACKAGING);
  }
  return problems;
}

/** [{ index, product_name, problems }] for every line that cannot be submitted yet. */
export function validateDraftItems(items) {
  const out = [];
  (items || []).forEach((item, index) => {
    const problems = lineProblems(item);
    if (problems.length) out.push({ index, product_name: item ? item.product_name : '', problems });
  });
  return out;
}

export const canSubmitDraft = (items) => Array.isArray(items) && items.length > 0 && validateDraftItems(items).length === 0;

/** Customer-readable explanation of one problem (English / Hindi). */
export function describeProblem(problem, name, isHindi = false) {
  const n = name || '—';
  if (problem === LINE_PROBLEM.PRODUCT_UNAVAILABLE) {
    return isHindi
      ? `"${n}" अब उपलब्ध नहीं है (बंद या नाम बदला हो सकता है)। इसे हटाएँ या इस लाइन को छूकर दूसरा उत्पाद चुनें। कोई उत्पाद अपने-आप नहीं बदला गया है।`
      : `"${n}" is not available in the current catalogue (it may have been discontinued or renamed). Remove it, or tap the line to choose another product yourself. Nothing was replaced automatically.`;
  }
  if (problem === LINE_PROBLEM.INVALID_QUANTITY) {
    return isHindi ? `"${n}" की मात्रा सही नहीं है। कृपया मात्रा ठीक करें।` : `The quantity for "${n}" is not valid. Please correct it.`;
  }
  return isHindi ? `"${n}" का पैकिंग वज़न सही नहीं है। कृपया ठीक करें।` : `The packaging weight for "${n}" is not valid. Please correct it.`;
}

// ---- Repeat Order option ordering (SL-ORDER-REPEAT-ORDER-06) --------------------------------------------------
// DISPLAY ONLY: the master catalogue, ids and database ordering are never touched; these functions return new arrays.
const uniq = (list) => [...new Set(list)];
const repeatedLines = (items) => (Array.isArray(items) ? items : []).filter((i) => i && i.source_item_id);

/** Categories of the previous order's lines, in line order. */
export const repeatCategoryPriority = (items) => uniq(repeatedLines(items).map((i) => i.category).filter(Boolean));

/** Products of the previous order's lines inside one category, in line order (packaging variants collapse to one). */
export const repeatProductPriority = (items, category) =>
  uniq(repeatedLines(items).filter((i) => i.category === category).map((i) => i.product_name).filter(Boolean));

/**
 * Puts the previous order's options first (in `priority` order) and the remaining options after them, in their
 * original order. The currently selected option goes very first when it is one of the previous order's options, so
 * it is always visible without scrolling; an option the customer picks that is NOT from the previous order does not
 * move. Options that are not in the current list (e.g. a discontinued product) are ignored.
 */
export function prioritizeOptions(options, priority, selected) {
  const list = Array.isArray(options) ? options : [];
  const wanted = uniq((priority || []).filter((p) => list.includes(p)));
  const head = selected && wanted.includes(selected) ? [selected, ...wanted.filter((p) => p !== selected)] : wanted;
  return [...head, ...list.filter((o) => !head.includes(o))];
}

/** Same ordering for product records (objects with a `name`). */
export function prioritizeProducts(products, priorityNames, selectedName) {
  const list = Array.isArray(products) ? products : [];
  const order = prioritizeOptions(list.map((p) => p.name), priorityNames, selectedName);
  const taken = new Set();
  return order.map((name) => list.find((p) => p.name === name && !taken.has(p))).filter((p) => { if (!p || taken.has(p)) return false; taken.add(p); return true; });
}

/** Index-based removal: removes exactly ONE line (lines of the same product with other packaging stay). */
export function removeLineAt(items, index) {
  if (!Array.isArray(items) || index < 0 || index >= items.length) return items;
  return [...items.slice(0, index), ...items.slice(index + 1)];
}

function mapLine(line, index, catalogue, makeId) {
  const { product, nameWeight } = matchCatalogueProduct(catalogue, line.product_name, line.category);
  const quantity = num(line.quantity);
  // Packaging: the explicit weight of the line wins; a legacy order that only has it inside the product name
  // ("Shubh Labh (45 kg)") supplies it from there. Nothing found → null (no default such as 50 kg is invented).
  const weight = num(line.weight) !== null ? num(line.weight) : nameWeight;
  const item = {
    id: makeId(index),
    product_id: product ? product.id : null,
    // A matched line shows the catalogue's own product and category (identity); an unavailable line keeps the
    // old name exactly as stored — never replaced by another product.
    product_name: product ? product.name : line.product_name,
    category: product ? product.category : line.category,
    quantity: quantity === null ? 0 : quantity,
    unit: canonicalUnit(line.unit),
    weight,
    gift: line.gift || null,
    other_gift: line.other_gift || '',
    source_item_id: line.id || null,         // which old line this came from (for the customer / audit, not submitted)
  };
  if (product) item.product = product;
  const notices = [];
  const previous = num(line.price);
  const current = product ? num(product.price !== undefined ? product.price : product.rate) : null;
  if (previous !== null && current !== null && previous !== current) {
    notices.push({ code: 'PRICE_CHANGED', previous, current });
  }
  item.notices = notices;
  return item;
}

/**
 * Builds the new order draft from a VERIFIED previous order (already fetched for this customer).
 *
 * @param order          normalized previous order (see orderNormalizer.normalizeOrder)
 * @param customerProfile the authenticated customer's current profile (crm_parties row)
 * @param catalogue      the CURRENT active product list
 */
export function buildRepeatDraft({ order, customerProfile, catalogue, now = Date.now, random = Math.random }) {
  if (!order || typeof order !== 'object' || !Array.isArray(order.items)) {
    throw new RepeatOrderError('INVALID_ORDER', 'The previous order could not be read.');
  }
  if (!customerProfile || !customerProfile.id || order.party_id !== customerProfile.id) {
    throw new RepeatOrderError('NOT_OWNER', 'This order does not belong to your account.');
  }
  if (order.items.length === 0) throw new RepeatOrderError('NO_ITEMS', 'The previous order has no products to repeat.');

  const stamp = now();
  const base = Math.floor(random() * 1e6);
  const makeId = (i) => `repeat-${stamp}-${base}-${i}`;
  const items = order.items.map((line, index) => mapLine(line, index, catalogue, makeId));
  const issues = validateDraftItems(items);
  return {
    items,
    issues,
    unavailableCount: issues.filter((x) => x.problems.includes(LINE_PROBLEM.PRODUCT_UNAVAILABLE)).length,
    priceChangeCount: items.filter((i) => i.notices.length > 0).length,
    deliveryAddress: cleanAddress(order.delivery_address),
    clientReferenceId: newClientReferenceId(now, random),
    source: { id: order.id, order_no: order.order_no },
  };
}
