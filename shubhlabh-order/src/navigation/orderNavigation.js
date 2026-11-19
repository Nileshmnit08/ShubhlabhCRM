/**
 * SL-ORDER-NEW-ORDER-CONSISTENCY-01 — the ONE way to start an order.
 *
 * Pure JavaScript (no React Native imports) so exactly this code is unit-tested in Node against
 * the real React Navigation routers. Screens use it through `useOrderNavigation()`.
 *
 * Architecture it respects (App.js):
 *   root Stack
 *     ├─ MainTabs (Home / Products / My Orders / Profile — persistent bottom navigation)
 *     └─ NewOrderTab → NewOrderStackNavigator: NewOrderMain → OrderReview → OrderSuccess
 *        (the deliberate full-screen checkout exception; NOT a screen inside MainTabs)
 *
 * Why every button used to behave differently:
 *   - Some buttons navigated 'NewOrderTab' directly (works), some without params (no fresh-session
 *     marker), and some via ('MainTabs', { screen: 'NewOrderTab' }) — NewOrderTab is not a tab, so
 *     React Navigation rejected it and the tap did NOTHING (My Orders, Order Detail).
 *   - React Navigation 7 `navigate` only reuses the CURRENT screen; from anywhere else it PUSHES, so
 *     after finishing an order a second New Order flow (and a second MainTabs) piled up.
 * This module always targets the root flow route and uses `pop: true`, so there is exactly one New
 * Order flow, whatever the stack looked like before.
 */

export const ORDER_FLOW_ROUTE = 'NewOrderTab';
export const ORDER_SCREEN = 'NewOrderMain';
// 'NewOrderStack' is an alias registered on the root stack in App.js for the same navigator.
const ORDER_FLOW_ROUTE_NAMES = ['NewOrderTab', 'NewOrderStack'];

// RESUME re-opens a saved Repeat Order draft that was restored after an app restart: the cart is left as is.
export const ORDER_KINDS = Object.freeze({ NEW: 'new', REORDER: 'reorder', EDIT: 'edit', RESUME: 'resume' });
const KIND_TO_MODE = { new: 'create', reorder: 'reorder', edit: 'edit', resume: 'resume' };

let lastSessionTs = 0;
/**
 * Marker of one order session. NewOrderScreen starts a fresh cart whenever it changes. Strictly
 * increasing, so two requests in the same millisecond still count as two sessions.
 */
export function nextSessionTs(now = Date.now()) {
  lastSessionTs = Math.max(now, lastSessionTs + 1);
  return lastSessionTs;
}

/**
 * Ignores a repeat trigger inside `windowMs`: a double tap (or two different order buttons tapped
 * together) starts ONE order. `release()` re-arms it (e.g. after the customer cancels a prompt).
 */
export function createTapGuard({ windowMs = 800, now = Date.now } = {}) {
  let last = -Infinity;
  return {
    tryEnter() {
      const t = now();
      if (t - last < windowMs) return false;
      last = t;
      return true;
    },
    release() { last = -Infinity; },
    isBusy() { return now() - last < windowMs; },
  };
}
export const sharedTapGuard = createTapGuard();

/** True when a navigation action name (e.g. a Help FAQ "Go" target) means "start an order". */
export const isOrderStartAction = (action) => ORDER_FLOW_ROUTE_NAMES.includes(action);

/** The route of the New Order flow in a root navigation state, or null. */
export function findOrderFlowRoute(rootState) {
  const routes = rootState && Array.isArray(rootState.routes) ? rootState.routes : [];
  for (let i = routes.length - 1; i >= 0; i -= 1) {
    if (ORDER_FLOW_ROUTE_NAMES.includes(routes[i].name)) return routes[i];
  }
  return null;
}

/** Root navigation state from a screen's navigation prop or from the container ref. */
export function getRootState(navigation) {
  if (!navigation) return null;
  if (typeof navigation.getRootState === 'function') {
    try {
      const state = navigation.getRootState();
      if (state) return state;
    } catch (e) { /* container not ready: fall through */ }
  }
  let nav = navigation;
  while (typeof nav.getParent === 'function' && nav.getParent()) nav = nav.getParent();
  return typeof nav.getState === 'function' ? nav.getState() : null;
}

/** The arguments of the single navigate call that opens the order flow. null = nothing to open. */
export function buildOrderFlowNavigation({ kind = ORDER_KINDS.NEW, order = null, ts } = {}) {
  const mode = KIND_TO_MODE[kind];
  if (!mode) return null;
  // Reorder/Edit need the previous order (an Edit without an id would create a duplicate order).
  const needsOrder = kind === ORDER_KINDS.REORDER || kind === ORDER_KINDS.EDIT;
  if (needsOrder && !(order && typeof order === 'object' && order.id)) return null;
  const params = { mode, ts: ts ?? nextSessionTs() };
  if (needsOrder) params.previousOrder = order;
  return {
    name: ORDER_FLOW_ROUTE,
    // `pop: true` (root) reuses an existing flow instead of pushing a second one; `pop: true` (nested)
    // returns that flow to its first screen, so a leftover Review/Success screen is never reused.
    params: { screen: ORDER_SCREEN, params, pop: true },
    options: { pop: true },
  };
}

/**
 * SL-ORDER-REPEAT-ORDER-03 — the ONLY way out of Order Success.
 * `navigate` pushes a second MainTabs on top of the finished flow, so Back used to land on the
 * obsolete Review/Success screens. `pop: true` returns to the ORIGINAL MainTabs and removes the whole
 * New Order flow from the stack. Returns false when there is nothing to navigate with.
 */
export const SUCCESS_EXITS = Object.freeze({ ORDERS: 'orders', HOME: 'home', DETAIL: 'detail' });
export function buildSuccessExit(exit = SUCCESS_EXITS.ORDERS, orderId = null) {
  let params;
  if (exit === SUCCESS_EXITS.HOME) params = { screen: 'HomeTab' };
  else if (exit === SUCCESS_EXITS.DETAIL && orderId) params = { screen: 'OrdersTab', params: { screen: 'OrderDetail', params: { orderId } } };
  else params = { screen: 'OrdersTab', params: { screen: 'MyOrders' } };
  return { name: 'MainTabs', params: { ...params, pop: true }, options: { pop: true } };
}
export function leaveOrderSuccess(navigation, exit = SUCCESS_EXITS.ORDERS, orderId = null) {
  if (!navigation || typeof navigation.navigate !== 'function') return false;
  const nav = buildSuccessExit(exit, orderId);
  navigation.navigate(nav.name, nav.params, nav.options);
  return true;
}

/**
 * What NewOrderScreen must do with its cart when it receives route params (its init effect).
 *   'keep'          same session as before → leave the cart exactly as it is (returning to a draft)
 *   'fresh'         new 'create' session → empty cart
 *   'load-edit' / 'load-reorder'   new session → load that order's items (once products are loaded)
 *   'wait'          edit/reorder requested but the product list is not loaded yet
 *   'mark'          unknown mode: just remember the session
 * `initializedTs` starts as null, so a screen opened without a marker (legacy callers) starts fresh once.
 */
export function planSessionInit({ mode, ts, initializedTs, productsReady }) {
  if (initializedTs === ts) return 'keep';
  if (mode === 'resume') return 'mark'; // a restored draft: never reset, never reload
  if (!mode || mode === 'create') return 'fresh';
  if (!productsReady) return 'wait';
  if (mode === 'edit') return 'load-edit';
  if (mode === 'reorder') return 'load-reorder';
  return 'mark';
}

/** Opens the order flow in the requested mode (always a fresh session). */
export function openOrderFlow(navigation, request = {}) {
  const nav = buildOrderFlowNavigation(request);
  if (!nav || !navigation || typeof navigation.navigate !== 'function') return false;
  navigation.navigate(nav.name, nav.params, nav.options);
  return true;
}

/**
 * Goes back to the order the customer was already building, exactly as they left it: params are
 * merged unchanged, so NewOrderScreen sees the same session and keeps the cart.
 */
export function resumeOrderFlow(navigation) {
  if (!navigation || typeof navigation.navigate !== 'function') return false;
  navigation.navigate(ORDER_FLOW_ROUTE, undefined, { pop: true, merge: true });
  return true;
}

/**
 * The shared action behind every "Place New Order" / "Reorder" / "Edit order" button.
 *
 * deps.hasDraft   true when the cart holds items that were never placed.
 * deps.askDraft   async (kind) → 'continue' | 'new' | 'cancel'; only asked when an unfinished order
 *                 is still open in the navigation stack (so the cart is never cleared blindly).
 * Resolves with: 'started' | 'resumed' | 'cancelled' | 'ignored'.
 */
export async function requestOrderStart(navigation, request = {}, deps = {}) {
  const { hasDraft = false, hasSavedDraft = false, askDraft = null, guard = sharedTapGuard } = deps;
  if (!navigation || typeof navigation.navigate !== 'function') return 'ignored';
  if (!guard.tryEnter()) return 'ignored';

  // hasSavedDraft: a Repeat Order draft that is stored on the device. It is asked about even when its screen
  // is no longer open (e.g. after an app restart), because replacing it would delete the saved order.
  const flowOpen = !!findOrderFlowRoute(getRootState(navigation));
  if (request.kind !== ORDER_KINDS.RESUME && hasDraft && typeof askDraft === 'function' && (flowOpen || hasSavedDraft)) {
    const choice = await askDraft(request.kind || ORDER_KINDS.NEW);
    if (choice === 'continue') {
      if (flowOpen) resumeOrderFlow(navigation);
      else openOrderFlow(navigation, { kind: ORDER_KINDS.RESUME });
      return 'resumed';
    }
    if (choice !== 'new') {
      guard.release();
      return 'cancelled';
    }
  }
  if (!openOrderFlow(navigation, request)) {
    guard.release();
    return 'ignored';
  }
  return 'started';
}
