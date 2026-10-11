import { supabase } from '../../core/api/supabase';

/**
 * REWARD NOTIFICATION SERVICE
 * 
 * Manages buyer-specific reward notifications using the canonical CRM
 * business_updates and business_update_recipients infrastructure.
 * 
 * Security & Boundary Rules:
 * 1. Uses existing tables (business_updates, business_update_recipients).
 * 2. Enforces buyer isolation via RLS (au.id = auth.uid()).
 * 3. Never calls staff-only endpoints or queries private audit tables directly.
 * 4. Filters out internal staff notes and sensitive calculation metrics.
 * 5. Provides client-side deduplication against rapid recalculation / dispatch edits.
 */

export const REWARD_NOTIFICATION_EVENTS = {
  ELIGIBLE: 'REWARD_MILESTONE_ELIGIBLE',
  PENDING_APPROVAL: 'REWARD_SUBMITTED_FOR_APPROVAL',
  APPROVED: 'REWARD_APPROVED',
  FULFILLED: 'REWARD_FULFILLED',
  REVIEW_REQUIRED: 'REWARD_REVIEW_REQUIRED',
  REVERSED: 'REWARD_REVERSED',
};

/**
 * Sanitizes notification payload to guarantee zero exposure of internal staff notes,
 * margin metrics, or private audit columns.
 */
export function sanitizeNotification(notification) {
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

/**
 * Maps canonical reward milestone status to notification event type.
 */
export function mapStatusToEventType(status) {
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

/**
 * Generates a stable deduplication key to prevent duplicate notifications
 * when dispatches are edited or eligibility is recalculated repeatedly.
 */
export function generateDedupKey(customerId, schemeId, slabId, status) {
  const c = customerId || 'anon';
  const s = schemeId || 'all';
  const sl = slabId || 'general';
  const st = status || 'update';
  return `${c}:${s}:${sl}:${st}`.toLowerCase();
}

/**
 * Deduplicates notification list using a set of stable event signatures.
 */
export function deduplicateNotifications(notifications = []) {
  const seen = new Set();
  const deduped = [];

  for (const n of notifications) {
    const key = generateDedupKey(
      n.customer_id,
      n.scheme_id,
      n.slab_id,
      n.reward_status || n.status
    );

    // If key already seen in the batch, skip duplicate
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(n);
    }
  }

  return deduped;
}

/**
 * Fetches buyer-specific reward notifications from business_updates.
 */
export async function fetchBuyerRewardNotifications(customerId) {
  try {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData?.session) {
      return {
        success: false,
        errorCode: 'UNAUTHENTICATED',
        message: 'No active session found.',
        data: [],
      };
    }

    // Query business_updates where type in ('REWARD', 'SCHEME')
    // RLS ensures only published updates matching audience ALL or customer_id in recipients are visible
    const { data, error } = await supabase
      .from('business_updates')
      .select(`
        id, title, message, type, published_at,
        business_update_recipients ( id, customer_id, read_at, delivered_at )
      `)
      .eq('status', 'PUBLISHED')
      .in('type', ['REWARD', 'SCHEME'])
      .order('published_at', { ascending: false });

    if (error) {
      return {
        success: false,
        errorCode: 'QUERY_ERROR',
        message: error.message,
        data: [],
      };
    }

    const sanitized = (data || []).map(sanitizeNotification);
    const deduped = deduplicateNotifications(sanitized);

    return {
      success: true,
      data: deduped,
      isDevFixture: false,
    };
  } catch (err) {
    return {
      success: false,
      errorCode: 'NETWORK_ERROR',
      message: err.message || 'Network error fetching reward notifications.',
      data: [],
    };
  }
}

/**
 * Marks a notification as read in business_update_recipients.
 */
export async function markRewardNotificationAsRead(updateId, customerId) {
  try {
    if (!updateId || !customerId) return { success: false };

    const { data: existing } = await supabase
      .from('business_update_recipients')
      .select('id, read_at')
      .eq('update_id', updateId)
      .eq('customer_id', customerId)
      .single();

    if (existing) {
      if (!existing.read_at) {
        await supabase
          .from('business_update_recipients')
          .update({ read_at: new Date().toISOString() })
          .eq('id', existing.id);
      }
    } else {
      // Insert tracking record if it was an ALL audience notification
      await supabase
        .from('business_update_recipients')
        .insert({
          update_id: updateId,
          customer_id: customerId,
          read_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
        });
    }

    return { success: true };
  } catch (err) {
    console.warn('Error marking notification as read:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Returns development layout fixtures covering all 6 canonical reward events.
 * Clearly marked as dev fixtures for layout and navigation verification.
 */
export function getDevRewardNotificationFixtures() {
  const fixtures = [
    {
      id: 'notif-fix-001',
      title: 'Milestone Achieved!',
      message: 'You have achieved Silver Slab (50 Bags) in Kharif Mega Growth Scheme 2026! Silver Coin (10g) is now eligible.',
      type: 'REWARD',
      published_at: new Date(Date.now() - 2 * 3600000).toISOString(),
      scheme_id: 'fix-scheme-001',
      slab_id: 'slab-001',
      status: 'Eligible',
      event_type: REWARD_NOTIFICATION_EVENTS.ELIGIBLE,
      business_update_recipients: [{ read_at: null }],
      is_dev_fixture: true,
    },
    {
      id: 'notif-fix-002',
      title: 'Reward Claim in Verification',
      message: 'Your milestone claim for Starter Slab in Monsoon Volume Accelerator has been submitted to management for verification.',
      type: 'REWARD',
      published_at: new Date(Date.now() - 24 * 3600000).toISOString(),
      scheme_id: 'fix-scheme-002',
      slab_id: 'slab-m01',
      status: 'Pending Approval',
      event_type: REWARD_NOTIFICATION_EVENTS.PENDING_APPROVAL,
      business_update_recipients: [{ read_at: null }],
      is_dev_fixture: true,
    },
    {
      id: 'notif-fix-003',
      title: 'Reward Approved!',
      message: 'Congratulations! Your reward for Gold Slab (Smart LED TV 43-inch) has been approved by Shubh Labh management.',
      type: 'REWARD',
      published_at: new Date(Date.now() - 48 * 3600000).toISOString(),
      scheme_id: 'fix-scheme-001',
      slab_id: 'slab-002',
      status: 'Approved',
      event_type: REWARD_NOTIFICATION_EVENTS.APPROVED,
      business_update_recipients: [{ read_at: new Date().toISOString() }],
      is_dev_fixture: true,
    },
    {
      id: 'notif-fix-004',
      title: 'Reward Delivered!',
      message: 'Your reward for Baisakhi Gold (Split AC 1.5 Ton) in Baisakhi Harvest Scheme has been handed over. Thank you for your partnership!',
      type: 'REWARD',
      published_at: new Date(Date.now() - 72 * 3600000).toISOString(),
      scheme_id: 'fix-scheme-004',
      slab_id: 'slab-b02',
      status: 'Fulfilled',
      event_type: REWARD_NOTIFICATION_EVENTS.FULFILLED,
      business_update_recipients: [{ read_at: new Date().toISOString() }],
      is_dev_fixture: true,
    },
    {
      id: 'notif-fix-005',
      title: 'Reward Review Required',
      message: 'A recent dispatch return has reduced qualifying bags below threshold for Monsoon Volume Accelerator. Management review is in progress.',
      type: 'REWARD',
      published_at: new Date(Date.now() - 96 * 3600000).toISOString(),
      scheme_id: 'fix-scheme-002',
      slab_id: 'slab-m02',
      status: 'Review Required',
      event_type: REWARD_NOTIFICATION_EVENTS.REVIEW_REQUIRED,
      business_update_recipients: [{ read_at: null }],
      is_dev_fixture: true,
    },
    {
      id: 'notif-fix-006',
      title: 'Reward Milestone Reversed',
      message: 'The milestone claim for Festival Bronze has been cancelled due to order cancellation.',
      type: 'REWARD',
      published_at: new Date(Date.now() - 120 * 3600000).toISOString(),
      scheme_id: 'fix-scheme-003',
      slab_id: 'slab-d01',
      status: 'Reversed',
      event_type: REWARD_NOTIFICATION_EVENTS.REVERSED,
      business_update_recipients: [{ read_at: new Date().toISOString() }],
      is_dev_fixture: true,
    },
  ];

  return fixtures.map(sanitizeNotification);
}
