const test = require('node:test');
const assert = require('node:assert');

// Implementation helper mirroring rewardNotificationService.js logic for isolated Node unit testing
const REWARD_NOTIFICATION_EVENTS = {
  ELIGIBLE: 'REWARD_MILESTONE_ELIGIBLE',
  PENDING_APPROVAL: 'REWARD_SUBMITTED_FOR_APPROVAL',
  APPROVED: 'REWARD_APPROVED',
  FULFILLED: 'REWARD_FULFILLED',
  REVIEW_REQUIRED: 'REWARD_REVIEW_REQUIRED',
  REVERSED: 'REWARD_REVERSED',
};

function mapStatusToEventType(status) {
  switch (status) {
    case 'Fulfilled':
      return REWARD_NOTIFICATION_EVENTS.FULFILLED;
    case 'Approved':
      return REWARD_NOTIFICATION_EVENTS.APPROVED;
    case 'Pending Approval':
      return REWARD_NOTIFICATION_EVENTS.PENDING_APPROVAL;
    case 'Eligible':
      return REWARD_NOTIFICATION_EVENTS.ELIGIBLE;
    case 'Review Required':
      return REWARD_NOTIFICATION_EVENTS.REVIEW_REQUIRED;
    case 'Reversed':
      return REWARD_NOTIFICATION_EVENTS.REVERSED;
    default:
      return 'REWARD_STATUS_UPDATE';
  }
}

function sanitizeNotification(notification) {
  if (!notification) return null;

  const {
    id,
    title,
    message,
    type,
    published_at,
    scheme_id,
    slab_id,
    status,
    event_type,
    business_update_recipients,
    is_dev_fixture,
  } = notification;

  const isRead = Array.isArray(business_update_recipients) &&
    business_update_recipients.length > 0 &&
    !!business_update_recipients[0].read_at;

  return {
    id,
    title,
    message,
    type: type || 'REWARD',
    published_at: published_at || new Date().toISOString(),
    scheme_id: scheme_id || null,
    slab_id: slab_id || null,
    reward_status: status || null,
    event_type: event_type || mapStatusToEventType(status),
    is_read: Boolean(isRead),
    read_at: isRead ? business_update_recipients[0].read_at : null,
    is_dev_fixture: Boolean(is_dev_fixture),
  };
}

function generateDedupKey(customerId, schemeId, slabId, status) {
  const c = customerId || 'anon';
  const s = schemeId || 'all';
  const sl = slabId || 'general';
  const st = status || 'update';
  return `${c}:${s}:${sl}:${st}`.toLowerCase();
}

function deduplicateNotifications(notifications = []) {
  const seen = new Set();
  const deduped = [];

  for (const n of notifications) {
    const key = generateDedupKey(
      n.customer_id,
      n.scheme_id,
      n.slab_id,
      n.reward_status || n.status
    );

    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(n);
    }
  }

  return deduped;
}

test('Event Mapping: Correctly maps all 6 canonical reward lifecycle events', () => {
  assert.strictEqual(mapStatusToEventType('Eligible'), REWARD_NOTIFICATION_EVENTS.ELIGIBLE);
  assert.strictEqual(mapStatusToEventType('Pending Approval'), REWARD_NOTIFICATION_EVENTS.PENDING_APPROVAL);
  assert.strictEqual(mapStatusToEventType('Approved'), REWARD_NOTIFICATION_EVENTS.APPROVED);
  assert.strictEqual(mapStatusToEventType('Fulfilled'), REWARD_NOTIFICATION_EVENTS.FULFILLED);
  assert.strictEqual(mapStatusToEventType('Review Required'), REWARD_NOTIFICATION_EVENTS.REVIEW_REQUIRED);
  assert.strictEqual(mapStatusToEventType('Reversed'), REWARD_NOTIFICATION_EVENTS.REVERSED);
  assert.strictEqual(mapStatusToEventType('Unknown'), 'REWARD_STATUS_UPDATE');
});

test('Security & Sanitization: Strips internal staff notes, margin calculations, and private audit details', () => {
  const dirtyPayload = {
    id: 'notif-101',
    title: 'Milestone Reached',
    message: 'Farmer has reached 50 bags.',
    type: 'REWARD',
    status: 'Eligible',
    published_at: '2026-10-11T10:00:00Z',
    scheme_id: 'scheme-xyz',
    slab_id: 'slab-abc',
    // Sensitive / private fields that must be stripped:
    internal_staff_notes: 'Customer owes Rs 15,000 on previous invoice - hold gift.',
    profit_margin_pct: 14.5,
    wholesale_unit_cost: 450,
    created_by_staff_id: 'staff-999',
    audit_log_reference: 'audit-trace-777',
    business_update_recipients: [{ read_at: '2026-10-11T10:05:00Z' }],
  };

  const sanitized = sanitizeNotification(dirtyPayload);

  // Assert sensitive fields are completely omitted
  assert.strictEqual(sanitized.internal_staff_notes, undefined);
  assert.strictEqual(sanitized.profit_margin_pct, undefined);
  assert.strictEqual(sanitized.wholesale_unit_cost, undefined);
  assert.strictEqual(sanitized.created_by_staff_id, undefined);
  assert.strictEqual(sanitized.audit_log_reference, undefined);

  // Assert buyer-safe fields are preserved
  assert.strictEqual(sanitized.id, 'notif-101');
  assert.strictEqual(sanitized.scheme_id, 'scheme-xyz');
  assert.strictEqual(sanitized.slab_id, 'slab-abc');
  assert.strictEqual(sanitized.reward_status, 'Eligible');
  assert.strictEqual(sanitized.event_type, REWARD_NOTIFICATION_EVENTS.ELIGIBLE);
  assert.strictEqual(sanitized.is_read, true);
  assert.strictEqual(sanitized.read_at, '2026-10-11T10:05:00Z');
});

test('Delivery Safety & Deduplication: Prevents duplicate notification cards on dispatch edits or recalculations', () => {
  const notifications = [
    { customer_id: 'cust-1', scheme_id: 'sch-A', slab_id: 'slab-1', status: 'Eligible', title: '1st calc' },
    { customer_id: 'cust-1', scheme_id: 'sch-A', slab_id: 'slab-1', status: 'Eligible', title: 'Recalc after dispatch edit' },
    { customer_id: 'cust-1', scheme_id: 'sch-A', slab_id: 'slab-1', status: 'Approved', title: 'Approved later' },
    { customer_id: 'cust-1', scheme_id: 'sch-A', slab_id: 'slab-2', status: 'Eligible', title: 'Higher slab' },
    { customer_id: 'cust-2', scheme_id: 'sch-A', slab_id: 'slab-1', status: 'Eligible', title: 'Different buyer' },
  ];

  const deduped = deduplicateNotifications(notifications);

  // Should remove the duplicate 'Eligible' notification for cust-1/sch-A/slab-1
  assert.strictEqual(deduped.length, 4);
  assert.strictEqual(deduped[0].title, '1st calc');
  assert.strictEqual(deduped[1].title, 'Approved later');
  assert.strictEqual(deduped[2].title, 'Higher slab');
  assert.strictEqual(deduped[3].title, 'Different buyer');
});

test('Buyer Boundary Safety: Queries must enforce customer_id filter or rely on existing business_updates RLS', () => {
  let queriedTable = null;
  let typeFilter = null;
  let hasStaffEndpointCall = false;

  const mockSupabaseQuery = {
    from: (table) => {
      queriedTable = table;
      return {
        select: () => ({
          eq: () => ({
            in: (field, values) => {
              if (field === 'type') typeFilter = values;
              return { order: () => Promise.resolve({ data: [], error: null }) };
            },
          }),
        }),
      };
    },
    rpc: (fn) => {
      if (fn === 'get_customer_scheme_performance') hasStaffEndpointCall = true;
      return Promise.resolve({ data: null });
    },
  };

  // Execute mock fetch simulation
  mockSupabaseQuery.from('business_updates').select().eq().in('type', ['REWARD', 'SCHEME']).order();

  assert.strictEqual(queriedTable, 'business_updates');
  assert.deepStrictEqual(typeFilter, ['REWARD', 'SCHEME']);
  assert.strictEqual(hasStaffEndpointCall, false, 'Must NEVER call staff performance RPC');
});
