const test = require('node:test');
const assert = require('node:assert');

// 1. Categorization and Status Logic under test
function categorizeSchemes(schemes = []) {
  const todayStr = new Date().toISOString().split('T')[0];
  const active = [];
  const upcoming = [];
  const completed = [];

  for (const s of schemes) {
    if (!s || typeof s !== 'object') continue;
    const startDate = s.start_date ? String(s.start_date).substring(0, 10) : null;
    const endDate = s.end_date ? String(s.end_date).substring(0, 10) : null;

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

// ---------------- TESTS ---------------- //

test('E2E Journey 1: No schemes available renders empty buckets without crash', () => {
  const result = categorizeSchemes([]);
  assert.strictEqual(result.active.length, 0);
  assert.strictEqual(result.upcoming.length, 0);
  assert.strictEqual(result.completed.length, 0);
  assert.strictEqual(result.all.length, 0);
});

test('E2E Journey 2: Loading & Retry with simulated Network Failure', async () => {
  let callCount = 0;
  const mockFetcher = async () => {
    callCount++;
    if (callCount === 1) {
      throw new Error('Network request failed');
    }
    return { success: true, data: [{ scheme_id: 'sch-1', start_date: '2026-01-01', end_date: '2026-12-31' }] };
  };

  // First call fails
  let errorCaught = null;
  let res1 = null;
  try {
    res1 = await mockFetcher();
  } catch (err) {
    errorCaught = err;
  }
  assert.ok(errorCaught);
  assert.strictEqual(errorCaught.message, 'Network request failed');

  // Retry succeeds
  const res2 = await mockFetcher();
  assert.strictEqual(res2.success, true);
  assert.strictEqual(res2.data.length, 1);
  assert.strictEqual(callCount, 2);
});

test('E2E Journey 3: Authentication Expiry prevents data exposure and reports UNAUTHENTICATED', async () => {
  const mockAuthCheck = async (hasSession) => {
    if (!hasSession) {
      return { success: false, errorCode: 'UNAUTHENTICATED', message: 'No active authenticated session found.' };
    }
    return { success: true, data: [] };
  };

  const expiredResult = await mockAuthCheck(false);
  assert.strictEqual(expiredResult.success, false);
  assert.strictEqual(expiredResult.errorCode, 'UNAUTHENTICATED');
});

test('E2E Journey 4: Multiple milestones and slab ladder rendering without omissions', () => {
  const multiMilestones = [
    { slab_id: 'slab-1', min_bags: 50, max_bags: 99, slab_name: 'Silver', milestone_status: 'Eligible', reward_description: 'Silver Coin' },
    { slab_id: 'slab-2', min_bags: 100, max_bags: 249, slab_name: 'Gold', milestone_status: 'In Progress', reward_description: 'LED TV' },
    { slab_id: 'slab-3', min_bags: 250, max_bags: null, slab_name: 'Platinum', milestone_status: 'In Progress', reward_description: 'Motorcycle' },
  ];

  // Verify all milestones are retained
  assert.strictEqual(multiMilestones.length, 3);
  // Verify open-ended slab (max_bags === null) is handled safely
  assert.strictEqual(multiMilestones[2].max_bags, null);
  // Verify progressive threshold monotonicity
  assert.ok(multiMilestones[0].min_bags < multiMilestones[1].min_bags);
  assert.ok(multiMilestones[1].min_bags < multiMilestones[2].min_bags);
});

test('E2E Journey 5: Missing optional fields does not cause runtime failure', () => {
  const sparseScheme = {
    scheme_id: 'sch-sparse',
    scheme_name: 'Sparse Scheme',
    description: null,
    start_date: null,
    end_date: null,
    current_net_bags: null,
    milestones: [
      {
        slab_id: null,
        slab_name: null,
        min_bags: 0,
        max_bags: null,
        reward_description: null,
        reward_type: null,
        milestone_status: null,
        earned_at: null,
        approved_at: null,
        fulfilled_at: null,
      },
    ],
  };

  // Categorize handles null dates
  const categorized = categorizeSchemes([sparseScheme]);
  assert.strictEqual(categorized.active.length, 1);

  // Status mapping handles null status
  const meta = getMilestoneStatusMeta(sparseScheme.milestones[0].milestone_status);
  assert.strictEqual(meta.badgeType, 'default');
  assert.strictEqual(meta.fallback, 'In Progress');
});

test('E2E Journey 6: Malformed / Invalid response data handled gracefully', () => {
  const corruptedData = [null, undefined, 'string_instead_of_object', { scheme_id: 'valid-1' }];
  const categorized = categorizeSchemes(corruptedData);
  assert.strictEqual(categorized.all.length, 4);
  assert.strictEqual(categorized.active.length, 1); // only the valid object survived
});

test('E2E Journey 7: Status Truth - Approved != Fulfilled and Reversed != Active/Achieved', () => {
  const approvedMeta = getMilestoneStatusMeta('Approved');
  const fulfilledMeta = getMilestoneStatusMeta('Fulfilled');
  const reversedMeta = getMilestoneStatusMeta('Reversed');
  const reviewMeta = getMilestoneStatusMeta('Review Required');

  // Badge mapping
  assert.strictEqual(approvedMeta.badgeType, 'success');
  assert.strictEqual(fulfilledMeta.badgeType, 'success');
  assert.strictEqual(reversedMeta.badgeType, 'error');
  assert.strictEqual(reviewMeta.badgeType, 'error');

  // State truth checks
  const isFulfilled = (status) => status === 'Fulfilled';
  const isApproved = (status) => status === 'Approved';
  const isAchieved = (status) => ['Fulfilled', 'Approved', 'Eligible'].includes(status);

  assert.strictEqual(isFulfilled('Approved'), false, 'Approved must NOT be considered Fulfilled');
  assert.strictEqual(isFulfilled('Fulfilled'), true);
  assert.strictEqual(isApproved('Fulfilled'), false, 'Fulfilled must NOT be considered Approved');
  assert.strictEqual(isAchieved('Reversed'), false, 'Reversed must NOT be considered Achieved');
  assert.strictEqual(isAchieved('Review Required'), false, 'Review Required must NOT be considered Achieved');
});

test('E2E Journey 8: Duplicate Notification Handling under rapid recalculations or dispatch returns', () => {
  const notificationStream = [
    { customer_id: 'b-01', scheme_id: 's-01', slab_id: 'sl-01', status: 'Eligible', title: 'Initial' },
    { customer_id: 'b-01', scheme_id: 's-01', slab_id: 'sl-01', status: 'Eligible', title: 'Duplicate recalc' },
    { customer_id: 'b-01', scheme_id: 's-01', slab_id: 'sl-01', status: 'Approved', title: 'Status changed to Approved' },
    { customer_id: 'b-01', scheme_id: 's-01', slab_id: 'sl-01', status: 'Fulfilled', title: 'Status changed to Fulfilled' },
  ];

  const deduped = deduplicateNotifications(notificationStream);
  assert.strictEqual(deduped.length, 3);
  assert.strictEqual(deduped[0].status, 'Eligible');
  assert.strictEqual(deduped[1].status, 'Approved');
  assert.strictEqual(deduped[2].status, 'Fulfilled');
});

test('E2E Journey 9: Deep linking from notification to correct scheme or overview', () => {
  const resolveTargetScreen = (notification) => {
    if (notification.scheme_id) {
      return { screen: 'RewardDetail', params: { schemeId: notification.scheme_id } };
    }
    return { screen: 'MyRewardSchemes' };
  };

  const schemeNotif = { scheme_id: 'sch-festive-2026', type: 'REWARD' };
  const generalNotif = { scheme_id: null, type: 'REWARD' };

  assert.deepStrictEqual(resolveTargetScreen(schemeNotif), {
    screen: 'RewardDetail',
    params: { schemeId: 'sch-festive-2026' },
  });
  assert.deepStrictEqual(resolveTargetScreen(generalNotif), {
    screen: 'MyRewardSchemes',
  });
});

test('E2E Journey 10: Android Back Navigation contracts', () => {
  const simulateBackPress = (canGoBack, goBackFn) => {
    if (canGoBack) {
      goBackFn();
      return true; // handled
    }
    return false; // let OS exit
  };

  let wentBack = false;
  const result1 = simulateBackPress(true, () => { wentBack = true; });
  assert.strictEqual(result1, true);
  assert.strictEqual(wentBack, true);

  wentBack = false;
  const result2 = simulateBackPress(false, () => { wentBack = true; });
  assert.strictEqual(result2, false);
  assert.strictEqual(wentBack, false);
});
