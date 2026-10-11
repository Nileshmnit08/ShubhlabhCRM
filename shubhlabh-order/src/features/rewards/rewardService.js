import { supabase } from '../../core/api/supabase';

/**
 * REWARD SERVICE - DATA BOUNDARY
 * 
 * Strict boundary rules:
 * 1. ONLY calls public.get_buyer_my_schemes() (zero-parameter buyer-isolated RPC).
 * 2. NEVER calls get_customer_scheme_performance (staff-only endpoint).
 * 3. NEVER sends customer_id from client; identity is resolved strictly server-side.
 * 4. NEVER calculates eligibility or milestone achievement in client-side code.
 * 5. Explicitly flags RPC_NOT_DEPLOYED when backend migration 225 has not been applied.
 */

export const REWARD_ERROR_CODES = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  RPC_NOT_DEPLOYED: 'RPC_NOT_DEPLOYED',
  ACTIVITY_RPC_NOT_DEPLOYED: 'ACTIVITY_RPC_NOT_DEPLOYED',
  SCHEME_NOT_FOUND: 'SCHEME_NOT_FOUND',
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

/**
 * Categorizes canonical schemes returned by the backend into Active, Upcoming, and Completed lists.
 * Schemes are categorized strictly based on source data start_date and end_date.
 * Note: A scheme is NOT marked completed simply because a milestone was achieved.
 */
export function categorizeSchemes(schemes = []) {
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

  return {
    active,
    upcoming,
    completed,
    all: schemes,
  };
}

/**
 * Maps source milestone status to SLStatusBadge status type and display color.
 * Statuses: 'In Progress', 'Eligible', 'Pending Approval', 'Approved', 'Review Required', 'Fulfilled', 'Reversed'
 */
export function getMilestoneStatusMeta(status) {
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

/**
 * Fetches the authenticated buyer's reward schemes from the backend.
 * Returns { success, data, error, errorCode, missingDependency, isDevFixture }
 */
export async function fetchMyRewardSchemes() {
  try {
    // 1. Session verification
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData?.session) {
      return {
        success: false,
        errorCode: REWARD_ERROR_CODES.UNAUTHENTICATED,
        message: 'No active authenticated session found.',
        data: null,
      };
    }

    // 2. Call canonical zero-argument RPC get_buyer_my_schemes()
    const { data, error } = await supabase.rpc('get_buyer_my_schemes');

    if (error) {
      // Check for PostgREST function not found (PGRST202 or 404)
      if (
        error.code === 'PGRST202' ||
        error.message?.includes('get_buyer_my_schemes') ||
        error.code === '42883'
      ) {
        return {
          success: false,
          errorCode: REWARD_ERROR_CODES.RPC_NOT_DEPLOYED,
          message: 'Backend canonical RPC public.get_buyer_my_schemes() is not deployed on this Supabase project (pending Migration 225).',
          missingDependency: 'public.get_buyer_my_schemes()',
          data: null,
        };
      }

      return {
        success: false,
        errorCode: REWARD_ERROR_CODES.UNKNOWN_ERROR,
        message: error.message || 'Error fetching reward schemes from database.',
        data: null,
      };
    }

    // 3. Process canonical data
    const categorized = categorizeSchemes(data || []);
    return {
      success: true,
      data: categorized,
      raw: data,
      isDevFixture: false,
    };
  } catch (err) {
    return {
      success: false,
      errorCode: REWARD_ERROR_CODES.NETWORK_ERROR,
      message: err.message || 'Network error while retrieving reward schemes.',
      data: null,
    };
  }
}

/**
 * Explicitly labeled development layout fixtures for verifying multi-milestone
 * layouts, error boundaries, and status transitions when backend RPC is pending deployment.
 * Never presented as live customer rewards.
 */
export function getDevLayoutFixtures() {
  const fixtures = [
    {
      scheme_id: 'fix-scheme-001',
      scheme_name: 'Kharif Mega Growth Scheme 2026',
      description: 'Special seasonal milestone reward program for authorized feed dealers. Dispatches between July and October qualify.',
      start_date: '2026-07-01',
      end_date: '2026-10-31',
      days_remaining: 20,
      current_net_bags: 140,
      highest_achieved_slab_id: 'slab-002',
      highest_achieved_slab_name: 'Gold Slab (100 Bags)',
      highest_reward_earned: 'Smart LED TV 43-inch',
      highest_milestone_status: 'Approved',
      next_slab_id: 'slab-003',
      next_slab_name: 'Platinum Slab (250 Bags)',
      potential_next_reward: 'Royal Enfield Bullet 350',
      bags_needed_for_next: 110,
      progress_to_next_percentage: 56.0,
      is_dev_fixture: true,
      milestones: [
        {
          slab_id: 'slab-001',
          slab_name: 'Silver Slab',
          min_bags: 50,
          max_bags: 99,
          reward_description: 'Silver Coin (10 Grams 999 Purity)',
          reward_type: 'Physical Gift',
          reward_value: 1200,
          milestone_status: 'Fulfilled',
          is_achieved: true,
          bags_needed: 0,
          progress_percentage: 100,
          earned_at: '2026-07-28T10:00:00Z',
          approved_at: '2026-07-30T11:00:00Z',
          fulfilled_at: '2026-08-05T14:30:00Z',
        },
        {
          slab_id: 'slab-002',
          slab_name: 'Gold Slab',
          min_bags: 100,
          max_bags: 249,
          reward_description: 'Smart LED TV 43-inch Full HD',
          reward_type: 'Physical Gift',
          reward_value: 22000,
          milestone_status: 'Approved',
          is_achieved: true,
          bags_needed: 0,
          progress_percentage: 100,
          earned_at: '2026-08-20T16:00:00Z',
          approved_at: '2026-08-25T09:30:00Z',
          fulfilled_at: null, // Approved but not fulfilled
        },
        {
          slab_id: 'slab-003',
          slab_name: 'Platinum Slab',
          min_bags: 250,
          max_bags: 499,
          reward_description: 'Royal Enfield Bullet 350',
          reward_type: 'Vehicle',
          reward_value: 190000,
          milestone_status: 'In Progress',
          is_achieved: false,
          bags_needed: 110,
          progress_percentage: 56.0,
          earned_at: null,
          approved_at: null,
          fulfilled_at: null,
        },
        {
          slab_id: 'slab-004',
          slab_name: 'Diamond Tier',
          min_bags: 500,
          max_bags: null,
          reward_description: 'Maruti Suzuki Tour H1 Commercial Vehicle',
          reward_type: 'Vehicle',
          reward_value: 480000,
          milestone_status: 'In Progress',
          is_achieved: false,
          bags_needed: 360,
          progress_percentage: 28.0,
          earned_at: null,
          approved_at: null,
          fulfilled_at: null,
        },
      ],
    },
    {
      scheme_id: 'fix-scheme-002',
      scheme_name: 'Monsoon Volume Accelerator',
      description: 'Monthly boost for consistent weekly orders during heavy monsoon periods.',
      start_date: '2026-09-01',
      end_date: '2026-10-25',
      days_remaining: 14,
      current_net_bags: 85,
      highest_achieved_slab_id: 'slab-m01',
      highest_achieved_slab_name: 'Starter Slab (80 Bags)',
      highest_reward_earned: 'Mixer Grinder 750W',
      highest_milestone_status: 'Pending Approval',
      next_slab_id: 'slab-m02',
      next_slab_name: 'Target Slab (150 Bags)',
      potential_next_reward: 'Refrigerator 260L Double Door',
      bags_needed_for_next: 65,
      progress_to_next_percentage: 56.7,
      is_dev_fixture: true,
      milestones: [
        {
          slab_id: 'slab-m01',
          slab_name: 'Starter Slab',
          min_bags: 80,
          max_bags: 149,
          reward_description: 'Mixer Grinder 750W with 3 Jars',
          reward_type: 'Home Appliance',
          reward_value: 3500,
          milestone_status: 'Pending Approval',
          is_achieved: true,
          bags_needed: 0,
          progress_percentage: 100,
          earned_at: '2026-10-05T12:00:00Z',
          approved_at: null,
          fulfilled_at: null,
        },
        {
          slab_id: 'slab-m02',
          slab_name: 'Target Slab',
          min_bags: 150,
          max_bags: null,
          reward_description: 'Refrigerator 260L Double Door',
          reward_type: 'Home Appliance',
          reward_value: 28000,
          milestone_status: 'In Progress',
          is_achieved: false,
          bags_needed: 65,
          progress_percentage: 56.7,
          earned_at: null,
          approved_at: null,
          fulfilled_at: null,
        },
      ],
    },
    {
      scheme_id: 'fix-scheme-003',
      scheme_name: 'Diwali Dhamaka Advance 2026',
      description: 'Advance announcement for early festive bookings. Dispatches will qualify starting November 1.',
      start_date: '2026-11-01',
      end_date: '2026-11-30',
      days_remaining: 50,
      current_net_bags: 0,
      highest_achieved_slab_id: null,
      highest_achieved_slab_name: null,
      highest_reward_earned: null,
      highest_milestone_status: null,
      next_slab_id: 'slab-d01',
      next_slab_name: 'Festive Bronze (60 Bags)',
      potential_next_reward: 'Gold Coin 1g',
      bags_needed_for_next: 60,
      progress_to_next_percentage: 0,
      is_dev_fixture: true,
      milestones: [
        {
          slab_id: 'slab-d01',
          slab_name: 'Festive Bronze',
          min_bags: 60,
          max_bags: null,
          reward_description: 'Gold Coin 1g 24K Hallmark',
          reward_type: 'Physical Gift',
          reward_value: 7500,
          milestone_status: 'In Progress',
          is_achieved: false,
          bags_needed: 60,
          progress_percentage: 0,
          earned_at: null,
          approved_at: null,
          fulfilled_at: null,
        },
      ],
    },
    {
      scheme_id: 'fix-scheme-004',
      scheme_name: 'Baisakhi Harvest Scheme 2026',
      description: 'Past harvest season performance incentive. Scheme lifecycle concluded.',
      start_date: '2026-03-01',
      end_date: '2026-05-31',
      days_remaining: 0,
      current_net_bags: 220,
      highest_achieved_slab_id: 'slab-b02',
      highest_achieved_slab_name: 'Baisakhi Gold (200 Bags)',
      highest_reward_earned: 'Split AC 1.5 Ton 5-Star',
      highest_milestone_status: 'Fulfilled',
      next_slab_id: null,
      next_slab_name: null,
      potential_next_reward: null,
      bags_needed_for_next: 0,
      progress_to_next_percentage: 100,
      is_dev_fixture: true,
      milestones: [
        {
          slab_id: 'slab-b01',
          slab_name: 'Baisakhi Silver',
          min_bags: 100,
          max_bags: 199,
          reward_description: 'Air Cooler 55L Desert',
          reward_type: 'Home Appliance',
          reward_value: 9500,
          milestone_status: 'Fulfilled',
          is_achieved: true,
          bags_needed: 0,
          progress_percentage: 100,
          earned_at: '2026-04-10T11:00:00Z',
          approved_at: '2026-04-15T15:00:00Z',
          fulfilled_at: '2026-04-20T17:00:00Z',
        },
        {
          slab_id: 'slab-b02',
          slab_name: 'Baisakhi Gold',
          min_bags: 200,
          max_bags: null,
          reward_description: 'Split AC 1.5 Ton 5-Star Inverter',
          reward_type: 'Home Appliance',
          reward_value: 38000,
          milestone_status: 'Fulfilled',
          is_achieved: true,
          bags_needed: 0,
          progress_percentage: 100,
          earned_at: '2026-05-18T10:00:00Z',
          approved_at: '2026-05-22T12:00:00Z',
          fulfilled_at: '2026-06-02T16:00:00Z',
        },
      ],
    },
  ];

  return categorizeSchemes(fixtures);
}

/**
 * Fetches the specific scheme details and milestones by ID.
 */
export async function fetchSchemeDetails(schemeId) {
  if (!schemeId) {
    return {
      success: false,
      errorCode: REWARD_ERROR_CODES.SCHEME_NOT_FOUND,
      message: 'No scheme ID provided.',
      data: null,
    };
  }

  const result = await fetchMyRewardSchemes();
  if (result.success && result.data?.all) {
    const found = result.data.all.find((s) => s.scheme_id === schemeId);
    if (found) {
      return { success: true, data: found, isDevFixture: false };
    }
  }

  // Fallback to dev layout fixtures if live is unavailable or not found
  const devFixtures = getDevLayoutFixtures();
  const devFound = devFixtures.all?.find((s) => s.scheme_id === schemeId);
  if (devFound) {
    return {
      success: true,
      data: devFound,
      isDevFixture: true,
      notice: 'Displaying development layout preview fixture.',
    };
  }

  return {
    success: false,
    errorCode: result.errorCode || REWARD_ERROR_CODES.SCHEME_NOT_FOUND,
    message: result.message || 'Scheme details not found.',
    data: null,
  };
}

/**
 * Checks for buyer-safe qualifying dispatch activity records for a specific scheme.
 * Enforces strict security boundary: Never queries staff tables directly.
 */
export async function fetchSchemeQualifyingActivity(schemeId) {
  try {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData?.session) {
      return {
        success: false,
        errorCode: REWARD_ERROR_CODES.UNAUTHENTICATED,
        message: 'No active authenticated session found.',
        data: [],
      };
    }

    // In current database configuration, requirement_dispatches is restricted to staff
    // and no dedicated buyer RPC is deployed.
    return {
      success: false,
      errorCode: REWARD_ERROR_CODES.ACTIVITY_RPC_NOT_DEPLOYED,
      message: 'Buyer-safe qualifying activity endpoint is not deployed in current database (pending Migration 225).',
      missingDependency: 'public.get_buyer_scheme_activity() or buyer policy on requirement_dispatches',
      data: [],
    };
  } catch (err) {
    return {
      success: false,
      errorCode: REWARD_ERROR_CODES.NETWORK_ERROR,
      message: err.message || 'Network error checking qualifying activity.',
      data: [],
    };
  }
}

/**
 * Returns development layout fixtures for the qualifying activity section.
 * Clearly marked as dev fixtures to demonstrate how chronological dispatches and returns appear.
 */
export function getDevActivityFixtures(schemeId) {
  return [
    {
      dispatch_id: 'act-001',
      dispatch_date: '2026-07-15',
      order_number: 'REQ-2026-0812',
      dispatched_bags: 30,
      returned_bags: 0,
      net_qualifying_bags: 30,
      is_dev_fixture: true,
    },
    {
      dispatch_id: 'act-002',
      dispatch_date: '2026-07-28',
      order_number: 'REQ-2026-0890',
      dispatched_bags: 25,
      returned_bags: 5,
      net_qualifying_bags: 20,
      notes: '5 bags return deducted',
      is_dev_fixture: true,
    },
    {
      dispatch_id: 'act-003',
      dispatch_date: '2026-08-10',
      order_number: 'REQ-2026-0945',
      dispatched_bags: 50,
      returned_bags: 0,
      net_qualifying_bags: 50,
      is_dev_fixture: true,
    },
    {
      dispatch_id: 'act-004',
      dispatch_date: '2026-08-20',
      order_number: 'REQ-2026-1021',
      dispatched_bags: 40,
      returned_bags: 0,
      net_qualifying_bags: 40,
      is_dev_fixture: true,
    },
  ];
}
