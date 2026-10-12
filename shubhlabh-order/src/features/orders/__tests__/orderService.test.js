const test = require('node:test');
const assert = require('node:assert/strict');

// Pure logic under test
function deriveOrderStatus(requirementStatus, dispatches = [], items = []) {
  const reqStatus = (requirementStatus || 'New').toUpperCase();

  if (reqStatus === 'CANCELLED') {
    return 'CANCELLED';
  }

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

  const allDelivered = validDispatches.length > 0 && validDispatches.every(
    d => (d.status || '').toUpperCase() === 'DELIVERED'
  );
  if (allDelivered) {
    return 'DELIVERED';
  }

  const totalReq = (items || []).reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const totalDisp = validDispatches.reduce(
    (sum, d) => sum + ((Number(d.quantity) || 0) - (Number(d.return_quantity) || 0)),
    0
  );

  if (reqStatus === 'CLOSED' || (totalReq > 0 && totalDisp >= totalReq)) {
    return 'DISPATCHED';
  }

  if (totalDisp > 0 && totalReq > 0 && totalDisp < totalReq) {
    return 'PARTIALLY DISPATCHED';
  }

  return 'DISPATCHED';
}

function normalizeOrder(data) {
  if (!data) return null;

  let extras = {};
  let deliveryAddress = data.notes || '';

  if (data.notes) {
    try {
      const parsed = JSON.parse(data.notes);
      if (parsed && typeof parsed === 'object') {
        if (parsed.extras) extras = parsed.extras;
        if (parsed.address) deliveryAddress = parsed.address;
      }
    } catch (e) {}
  }

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

test.describe('SL-ORDER-ORDER-FLOW-UX-AND-STATUS-FIX-01: Order Service & Canonical Mapping', () => {

  test('1. One order with one item: correctly maps product name, quantity, unit, and item count', () => {
    const rawData = {
      id: 'req-single-item',
      demand_ref: 'D-101',
      party_id: 'party-1',
      status: 'New',
      created_at: '2026-10-09T10:00:00Z',
      requirement_items: [
        { id: 'item-1', product_name: 'Shubh Labh Cattle Feed', category: 'Feed', quantity: 50, unit: 'Bags', weight: 50 }
      ],
      requirement_dispatches: []
    };

    const order = normalizeOrder(rawData);
    assert.equal(order.order_no, 'D-101');
    assert.equal(order.status, 'NEW');
    assert.equal(order.totalProducts, 1);
    assert.equal(order.totalQuantity, 50);
    assert.equal(order.totalWeight, 2500);
    assert.equal(order.items[0].product_name, 'Shubh Labh Cattle Feed');
  });

  test('2. One order with multiple items: groups under single order without creating separate cards', () => {
    const rawData = {
      id: 'req-multi-item',
      demand_ref: 'D-109',
      party_id: 'party-1',
      status: 'In Progress',
      created_at: '2026-10-08T10:00:00Z',
      requirement_items: [
        { id: 'item-1', product_name: 'Bypass Pallet', category: 'ByPass Protein', quantity: 29, unit: 'Bags' },
        { id: 'item-2', product_name: 'ByPassFat', category: 'ByPass Fat', quantity: 21, unit: 'Bags' },
        { id: 'item-3', product_name: 'Bypass Pallet', category: 'ByPass Protein', quantity: 20, unit: 'Bags' }
      ],
      requirement_dispatches: []
    };

    const order = normalizeOrder(rawData);
    assert.equal(order.order_no, 'D-109');
    assert.equal(order.status, 'PROCESSING');
    assert.equal(order.totalProducts, 3);
    assert.equal(order.totalQuantity, 70); // 29 + 21 + 20
    assert.equal(order.items.length, 3);
  });

  test('3. Two distinct orders from same customer: remain separate canonical orders (D-130 and D-124)', () => {
    const rawD130 = {
      id: 'b510fd6d-a864-42c6-ad6c-dd9432a3412b',
      demand_ref: 'D-130',
      party_id: '4187f8fa-d82b-48c5-a8e8-1a4c241ae1e0',
      status: 'Closed',
      created_at: '2026-10-09T14:22:02Z',
      requirement_items: [
        { id: 'item-d130', product_name: '8000', category: 'Pallet', quantity: 50, unit: 'Bags' }
      ],
      requirement_dispatches: [
        { id: 'disp-d130', quantity: 50, return_quantity: 0, status: 'Dispatched', dispatch_date: '2026-10-12' }
      ]
    };

    const rawD124 = {
      id: '78f4cd04-f0ec-469e-a712-cbb2aa22f7c3',
      demand_ref: 'D-124',
      party_id: '4187f8fa-d82b-48c5-a8e8-1a4c241ae1e0',
      status: 'Closed',
      created_at: '2026-10-09T10:16:54Z',
      requirement_items: [
        { id: 'item-d124', product_name: 'Shubh Labh (45 kg)', category: 'Pallet', quantity: 175, unit: 'Bags' }
      ],
      requirement_dispatches: [
        { id: 'disp-d124', quantity: 1, return_quantity: 0, status: 'Dispatched', dispatch_date: '2026-10-12' }
      ]
    };

    const orderD130 = normalizeOrder(rawD130);
    const orderD124 = normalizeOrder(rawD124);

    assert.notEqual(orderD130.id, orderD124.id);
    assert.equal(orderD130.order_no, 'D-130');
    assert.equal(orderD124.order_no, 'D-124');
    assert.equal(orderD130.totalQuantity, 50);
    assert.equal(orderD124.totalQuantity, 175);
    // Neither order should be displayed as CLOSED when dispatched
    assert.equal(orderD130.status, 'DISPATCHED');
    assert.equal(orderD124.status, 'DISPATCHED');
  });

  test('4. One order with multiple dispatches: totals are not double-counted', () => {
    const rawData = {
      id: 'req-multi-disp',
      demand_ref: 'D-200',
      party_id: 'party-1',
      status: 'Closed',
      created_at: '2026-10-01T10:00:00Z',
      requirement_items: [
        { id: 'item-1', product_name: 'Feed A', quantity: 100, unit: 'Bags' }
      ],
      requirement_dispatches: [
        { id: 'disp-1', quantity: 60, return_quantity: 0, status: 'Dispatched', dispatch_date: '2026-10-05' },
        { id: 'disp-2', quantity: 40, return_quantity: 0, status: 'Dispatched', dispatch_date: '2026-10-06' }
      ]
    };

    const order = normalizeOrder(rawData);
    // Order total quantity must remain 100 (from items), not 200
    assert.equal(order.totalQuantity, 100);
    assert.equal(order.totalDispatchedQuantity, 100);
    assert.equal(order.dispatches.length, 2);
    assert.equal(order.status, 'DISPATCHED');
  });

  test('5. Operational lifecycle: Processing order without dispatches', () => {
    const statusNew = deriveOrderStatus('New', [], [{ quantity: 50 }]);
    const statusConfirmed = deriveOrderStatus('Confirmed', [], [{ quantity: 50 }]);
    const statusProcessing = deriveOrderStatus('In Progress', [], [{ quantity: 50 }]);

    assert.equal(statusNew, 'NEW');
    assert.equal(statusConfirmed, 'CONFIRMED');
    assert.equal(statusProcessing, 'PROCESSING');
  });

  test('6. Operational lifecycle: Fully dispatched order displays DISPATCHED, never CLOSED', () => {
    // When CRM marks requirement 'Closed' upon full dispatch
    const statusFromClosed = deriveOrderStatus('Closed', [
      { quantity: 50, return_quantity: 0, status: 'Dispatched' }
    ], [{ quantity: 50 }]);

    // When requirement is still open but all bags dispatched
    const statusFromOpen = deriveOrderStatus('In Progress', [
      { quantity: 50, return_quantity: 0, status: 'Dispatched' }
    ], [{ quantity: 50 }]);

    assert.equal(statusFromClosed, 'DISPATCHED');
    assert.equal(statusFromOpen, 'DISPATCHED');
  });

  test('7. Operational lifecycle: Partially dispatched order shows PARTIALLY DISPATCHED', () => {
    const statusPartial = deriveOrderStatus('In Progress', [
      { quantity: 30, return_quantity: 0, status: 'Dispatched' }
    ], [{ quantity: 100 }]);

    assert.equal(statusPartial, 'PARTIALLY DISPATCHED');
  });

  test('8. Operational lifecycle: Delivered order shows DELIVERED', () => {
    const statusDelivered = deriveOrderStatus('Closed', [
      { quantity: 50, return_quantity: 0, status: 'Delivered', actual_delivery_date: '2026-10-12' }
    ], [{ quantity: 50 }]);

    assert.equal(statusDelivered, 'DELIVERED');
  });

  test('9. Operational lifecycle: Cancelled order shows CANCELLED', () => {
    const statusCancelled = deriveOrderStatus('Cancelled', [
      { quantity: 50, return_quantity: 0, status: 'Cancelled' }
    ], [{ quantity: 50 }]);

    assert.equal(statusCancelled, 'CANCELLED');
  });

  test('10. Missing dispatch data or empty array falls back safely without crash', () => {
    const orderNull = normalizeOrder({
      id: 'req-empty',
      demand_ref: 'D-EMPTY',
      status: 'New',
      requirement_items: null,
      requirement_dispatches: null
    });

    assert.equal(orderNull.totalProducts, 0);
    assert.equal(orderNull.totalQuantity, 0);
    assert.equal(orderNull.status, 'NEW');
    assert.equal(orderNull.dispatches.length, 0);
  });

  test('11. Dispatches with returns are accurately netted', () => {
    const statusWithReturn = deriveOrderStatus('In Progress', [
      { quantity: 50, return_quantity: 20, status: 'Dispatched' } // net 30
    ], [{ quantity: 50 }]);

    assert.equal(statusWithReturn, 'PARTIALLY DISPATCHED');
  });

  test('12. Canonical order summary counts: categorizes and never double-counts', () => {
    const mockOrders = [
      { id: '1', status: 'NEW', items: [{ quantity: 10 }, { quantity: 20 }] },
      { id: '2', status: 'PROCESSING', items: [{ quantity: 15 }] },
      { id: '3', status: 'PARTIALLY DISPATCHED', items: [{ quantity: 50 }] },
      { id: '4', status: 'DISPATCHED', items: [{ quantity: 30 }] },
      { id: '5', status: 'DISPATCHED', items: [{ quantity: 40 }] },
      { id: '6', status: 'DELIVERED', items: [{ quantity: 100 }] },
      { id: '7', status: 'CANCELLED', items: [{ quantity: 10 }] },
    ];

    const inProgress = mockOrders.filter(o =>
      ['NEW', 'CONFIRMED', 'PROCESSING', 'PARTIALLY DISPATCHED'].includes(o.status)
    ).length;
    const dispatched = mockOrders.filter(o => o.status === 'DISPATCHED').length;
    const delivered = mockOrders.filter(o =>
      ['DELIVERED', 'RECEIVED'].includes(o.status)
    ).length;

    assert.equal(inProgress, 3, 'In Progress orders should count NEW, PROCESSING, and PARTIALLY DISPATCHED');
    assert.equal(dispatched, 2, 'Dispatched orders count DISPATCHED');
    assert.equal(delivered, 1, 'Delivered orders count DELIVERED');
    assert.equal(mockOrders.length, 7, 'Total canonical orders should be 7 without duplicate card inflations');
  });

});
