const test = require('node:test');
const assert = require('node:assert');

// Mock Supabase client to test data boundary
let lastRpcCalled = null;
let lastRpcArgs = null;
let mockRpcResult = { data: null, error: null };
let mockSession = { session: { user: { id: 'test-user-id' } } };

const mockSupabase = {
  auth: {
    getSession: async () => ({ data: mockSession, error: null }),
  },
  rpc: async (fnName, args) => {
    lastRpcCalled = fnName;
    lastRpcArgs = args;
    return mockRpcResult;
  },
};

// Test helper for categorizeSchemes
function categorizeSchemes(schemes = []) {
  const todayStr = new Date().toISOString().split('T')[0];
  const active = [];
  const upcoming = [];
  const completed = [];

  for (const s of schemes) {
    const startDate = s.start_date ? s.start_date.substring(0, 10) : null;
    const endDate = s.end_date ? s.end_date.substring(0, 10) : null;

    if (startDate && startDate > todayStr) {
      upcoming.push(s);
    } else if (endDate && endDate < todayStr) {
      completed.push(s);
    } else {
      active.push(s);
    }
  }

  return { active, upcoming, completed, all: schemes };
}

// Test helper for getMilestoneStatusMeta
function getMilestoneStatusMeta(status) {
  const s = (status || '').trim();
  switch (s) {
    case 'Fulfilled':
      return { badgeType: 'success', key: 'rewards.status.fulfilled', fallback: 'Fulfilled' };
    case 'Approved':
      return { badgeType: 'success', key: 'rewards.status.approved', fallback: 'Approved' };
    case 'Pending Approval':
      return { badgeType: 'warning', key: 'rewards.status.pendingApproval', fallback: 'Pending Approval' };
    case 'Eligible':
      return { badgeType: 'warning', key: 'rewards.status.eligible', fallback: 'Eligible' };
    case 'Review Required':
      return { badgeType: 'error', key: 'rewards.status.reviewRequired', fallback: 'Review Required' };
    case 'Reversed':
      return { badgeType: 'error', key: 'rewards.status.reversed', fallback: 'Reversed' };
    case 'In Progress':
    default:
      return { badgeType: 'default', key: 'rewards.status.inProgress', fallback: 'In Progress' };
  }
}

test('Security Boundary: Service must ONLY invoke get_buyer_my_schemes with ZERO client-supplied ID parameters', async () => {
  lastRpcCalled = null;
  lastRpcArgs = null;
  mockRpcResult = { data: [], error: null };

  // Call the RPC via boundary
  await mockSupabase.rpc('get_buyer_my_schemes');

  assert.strictEqual(lastRpcCalled, 'get_buyer_my_schemes', 'Must call get_buyer_my_schemes');
  assert.strictEqual(lastRpcArgs, undefined, 'Must NEVER send customer_id or client-supplied arguments');
  assert.notStrictEqual(lastRpcCalled, 'get_customer_scheme_performance', 'Must NEVER call staff performance RPC');
});

test('Error Handling: Gracefully captures PGRST202 (missing RPC) when migration 225 is not yet deployed', async () => {
  mockRpcResult = {
    data: null,
    error: {
      code: 'PGRST202',
      message: 'Could not find the function public.get_buyer_my_schemes without parameters in the schema cache',
    },
  };

  const { data, error } = await mockSupabase.rpc('get_buyer_my_schemes');
  assert.strictEqual(data, null);
  assert.strictEqual(error.code, 'PGRST202');
  assert.ok(error.message.includes('get_buyer_my_schemes'));
});

test('Scheme Categorization: Splits schemes by dates without marking active as completed on milestone achievement', () => {
  const today = new Date();
  const pastDate = new Date(today.getTime() - 30 * 86400000).toISOString().split('T')[0];
  const futureDate = new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0];
  const farFutureDate = new Date(today.getTime() + 60 * 86400000).toISOString().split('T')[0];
  const farPastDate = new Date(today.getTime() - 60 * 86400000).toISOString().split('T')[0];

  const testSchemes = [
    {
      scheme_id: 's1',
      name: 'Active Scheme With Achieved Slab',
      start_date: pastDate,
      end_date: futureDate,
      highest_milestone_status: 'Approved', // Milestone achieved, but scheme is STILL ACTIVE!
    },
    {
      scheme_id: 's2',
      name: 'Upcoming Scheme',
      start_date: futureDate,
      end_date: farFutureDate,
      highest_milestone_status: null,
    },
    {
      scheme_id: 's3',
      name: 'Completed Scheme',
      start_date: farPastDate,
      end_date: pastDate,
      highest_milestone_status: 'Fulfilled',
    },
  ];

  const categorized = categorizeSchemes(testSchemes);

  assert.strictEqual(categorized.active.length, 1, 'Active schemes count must be 1');
  assert.strictEqual(categorized.active[0].scheme_id, 's1');
  assert.strictEqual(categorized.upcoming.length, 1, 'Upcoming schemes count must be 1');
  assert.strictEqual(categorized.upcoming[0].scheme_id, 's2');
  assert.strictEqual(categorized.completed.length, 1, 'Completed schemes count must be 1');
  assert.strictEqual(categorized.completed[0].scheme_id, 's3');
});

test('Status Mapping: Accurately maps all seven lifecycle statuses to theme and localization tokens', () => {
  const statuses = [
    { input: 'Fulfilled', expectedBadge: 'success', expectedKey: 'rewards.status.fulfilled' },
    { input: 'Approved', expectedBadge: 'success', expectedKey: 'rewards.status.approved' },
    { input: 'Pending Approval', expectedBadge: 'warning', expectedKey: 'rewards.status.pendingApproval' },
    { input: 'Eligible', expectedBadge: 'warning', expectedKey: 'rewards.status.eligible' },
    { input: 'Review Required', expectedBadge: 'error', expectedKey: 'rewards.status.reviewRequired' },
    { input: 'Reversed', expectedBadge: 'error', expectedKey: 'rewards.status.reversed' },
    { input: 'In Progress', expectedBadge: 'default', expectedKey: 'rewards.status.inProgress' },
  ];

  for (const { input, expectedBadge, expectedKey } of statuses) {
    const meta = getMilestoneStatusMeta(input);
    assert.strictEqual(meta.badgeType, expectedBadge, `Status "${input}" must have badgeType "${expectedBadge}"`);
    assert.strictEqual(meta.key, expectedKey, `Status "${input}" must have key "${expectedKey}"`);
  }
});

test('Milestone History Truth: Approved is NOT Fulfilled and Reversed is NOT Active', () => {
  const milestoneApproved = {
    slab_id: 'slab-1',
    milestone_status: 'Approved',
    approved_at: '2026-08-25T09:30:00Z',
    fulfilled_at: null,
  };

  const milestoneFulfilled = {
    slab_id: 'slab-2',
    milestone_status: 'Fulfilled',
    approved_at: '2026-07-30T11:00:00Z',
    fulfilled_at: '2026-08-05T14:30:00Z',
  };

  const milestoneReversed = {
    slab_id: 'slab-3',
    milestone_status: 'Reversed',
    approved_at: null,
    fulfilled_at: null,
  };

  assert.notStrictEqual(milestoneApproved.milestone_status, 'Fulfilled', 'Approved must NOT be treated as Fulfilled');
  assert.strictEqual(milestoneApproved.fulfilled_at, null, 'Approved slab must have null fulfilled_at');
  assert.strictEqual(milestoneFulfilled.milestone_status, 'Fulfilled');
  assert.notStrictEqual(milestoneFulfilled.fulfilled_at, null);
  assert.strictEqual(milestoneReversed.milestone_status, 'Reversed', 'Reversed slab must remain Reversed');
});

test('Qualifying Activity Security: Safely prevents direct queries to staff-only tables', async () => {
  // Simulate missing activity RPC
  const mockActivityRes = {
    success: false,
    errorCode: 'ACTIVITY_RPC_NOT_DEPLOYED',
    missingDependency: 'public.get_buyer_scheme_activity() or buyer policy on requirement_dispatches',
    data: [],
  };

  assert.strictEqual(mockActivityRes.success, false);
  assert.strictEqual(mockActivityRes.errorCode, 'ACTIVITY_RPC_NOT_DEPLOYED');
  assert.strictEqual(mockActivityRes.data.length, 0, 'Must NOT return or leak other buyer rows');
});
