/**
 * SL-ORDER-REPEAT-ORDER-03 — local persistence of a Repeat Order draft (survives an app restart).
 *
 * Pure JavaScript; the storage is INJECTED (the app passes AsyncStorage, tests pass an in-memory fake), so
 * exactly this code is unit-tested in Node. Explicit ".js" imports.
 *
 * What is stored: one slot per customer (key includes the customer's party id), holding the repeat draft's
 * lines exactly as built (product, grade, quantity, packaging, gifts), its client_reference_id, the delivery
 * address and the order it was based on. Nothing about the original order's identity beyond its id / number.
 *
 * Rules
 *   - only REPEAT drafts are stored; a normal cart and an Edit session keep their existing in-memory behaviour
 *   - a stored draft is restored only when the cart is empty, so an active draft is never overwritten
 *   - a draft belonging to another customer, an old version, an expired or a damaged draft is ignored (and removed)
 *   - removed on: successful submission, an explicit replacement ("Start new order"), the customer emptying it
 *   - NOT removed on logout (it is that customer's draft); a different customer never sees it
 */
import { matchCatalogueProduct, lineProblems } from './repeatOrder.js';

export const DRAFT_STORAGE_VERSION = 1;
export const DRAFT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const draftKey = (partyId) => `sl_order_draft_v${DRAFT_STORAGE_VERSION}:${partyId}`;

const isLine = (l) => l && typeof l === 'object' && !Array.isArray(l) && typeof l.product_name === 'string' && l.product_name !== '' && typeof l.id === 'string';

/** The text to store, or null when this cart is not a restorable repeat draft. */
export function serializeDraft({ partyId, items, meta, now = Date.now }) {
  if (!partyId || !meta || meta.kind !== 'repeat' || !meta.clientReferenceId) return null;
  if (!Array.isArray(items) || items.length === 0) return null;
  return JSON.stringify({
    version: DRAFT_STORAGE_VERSION,
    partyId,
    savedAt: now(),
    items,
    meta: {
      kind: 'repeat',
      clientReferenceId: meta.clientReferenceId,
      deliveryAddress: meta.deliveryAddress || '',
      source: meta.source || null,
      unavailableCount: meta.unavailableCount || 0,
      priceChangeCount: meta.priceChangeCount || 0,
    },
  });
}

/** { ok:true, items, meta } or { ok:false, reason } — never throws on bad input. */
export function parseDraft(raw, partyId, now = Date.now) {
  if (raw === null || raw === undefined || raw === '') return { ok: false, reason: 'empty' };
  let data;
  try { data = JSON.parse(raw); } catch (e) { return { ok: false, reason: 'corrupt' }; }
  if (!data || typeof data !== 'object') return { ok: false, reason: 'corrupt' };
  if (data.version !== DRAFT_STORAGE_VERSION) return { ok: false, reason: 'version' };
  if (!partyId || data.partyId !== partyId) return { ok: false, reason: 'other-customer' };
  if (!Number.isFinite(data.savedAt) || now() - data.savedAt > DRAFT_MAX_AGE_MS) return { ok: false, reason: 'expired' };
  if (!Array.isArray(data.items) || data.items.length === 0 || !data.items.every(isLine)) return { ok: false, reason: 'corrupt' }; // never restore a partial order
  if (!data.meta || data.meta.kind !== 'repeat' || typeof data.meta.clientReferenceId !== 'string' || !data.meta.clientReferenceId) return { ok: false, reason: 'corrupt' };
  return { ok: true, items: data.items, meta: { ...data.meta, restored: true } };
}

export async function saveDraft(storage, args) {
  const text = serializeDraft(args);
  if (text === null) return false;
  try { await storage.setItem(draftKey(args.partyId), text); return true; } catch (e) { return false; }
}

export async function clearDraft(storage, partyId) {
  if (!partyId) return;
  try { await storage.removeItem(draftKey(partyId)); } catch (e) { /* nothing to do */ }
}

/** Reads the customer's stored repeat draft; unusable drafts are deleted so they are not retried forever. */
export async function loadDraft(storage, partyId, now = Date.now) {
  if (!partyId) return { ok: false, reason: 'no-customer' };
  let raw;
  try { raw = await storage.getItem(draftKey(partyId)); } catch (e) { return { ok: false, reason: 'read-failed' }; }
  const result = parseDraft(raw, partyId, now);
  if (!result.ok && result.reason !== 'empty') await clearDraft(storage, partyId);
  return result;
}

/**
 * After a restart the catalogue may have changed: re-check every restored line against the CURRENT product
 * list (exact name + category, active only). A line whose product disappeared loses its product link — it is
 * shown with the usual warning and blocks submission, never substituted; a line that still exists is
 * re-linked to its live product. Quantities, packaging and gifts are never touched.
 */
export function revalidateDraftItems(items, catalogue) {
  if (!Array.isArray(items) || !Array.isArray(catalogue) || catalogue.length === 0) return items;
  return items.map((item) => {
    const { product: live, nameWeight } = matchCatalogueProduct(catalogue, item.product_name, item.category);
    const next = { ...item, product_id: live ? live.id : null };
    if (live) {
      next.product = live;
      next.product_name = live.name; // identity only; quantity / packaging / gifts stay as they are
      next.category = live.category;
      if ((next.weight === null || next.weight === undefined) && nameWeight) next.weight = nameWeight;
    } else delete next.product;
    return next;
  });
}

export const draftNeedsAttention = (items) => (items || []).some((i) => lineProblems(i).length > 0);
