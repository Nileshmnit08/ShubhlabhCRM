import { supabase } from '../../core/api/supabase';

/**
 * CUSTOMER NOTIFICATION SERVICE
 * 
 * Manages customer notices published by administrators via CRM Customer Updates
 * (https://shubhlabh-crm.vercel.app/customer-updates).
 * 
 * Architecture & Security:
 * - Uses public.business_updates and public.business_update_recipients.
 * - Enforces buyer isolation via RLS policies (au.id = auth.uid()).
 * - Handles both ALL and SELECTED audience updates:
 *   * SELECTED updates have pre-populated recipients with read_at = null.
 *   * ALL updates track read status by inserting a recipient record upon read.
 * - Never requires elevated service-role keys or direct mutations to foreign records.
 */

export const NOTIFICATION_CATEGORIES = {
  PRICE_UPDATE: { label: 'Price Update', color: '#EA580C', bg: '#FFEDD5' },
  RAW_MATERIAL_UPDATE: { label: 'Raw Material', color: '#D97706', bg: '#FEF3C7' },
  SCHEME: { label: 'Scheme', color: '#7C3AED', bg: '#EDE9FE' },
  REWARD: { label: 'Reward', color: '#059669', bg: '#D1FAE5' },
  OFFER: { label: 'Special Offer', color: '#2563EB', bg: '#DBEAFE' },
  PRODUCT_UPDATE: { label: 'Product Update', color: '#0284C7', bg: '#E0F2FE' },
  ANNOUNCEMENT: { label: 'Announcement', color: '#4F46E5', bg: '#EEF2FF' },
  SUPPLY_UPDATE: { label: 'Supply Update', color: '#0D9488', bg: '#CCFBF1' },
  IMPORTANT_NOTICE: { label: 'Important Notice', color: '#DC2626', bg: '#FEE2E2' },
  OTHER: { label: 'General Notice', color: '#4B5563', bg: '#F3F4F6' },
};

/**
 * Returns category metadata (label, colors).
 */
export function getCategoryMeta(type) {
  if (!type) return NOTIFICATION_CATEGORIES.OTHER;
  const key = String(type).toUpperCase().replace(/ /g, '_');
  return NOTIFICATION_CATEGORIES[key] || {
    label: type.replace(/_/g, ' '),
    color: '#4B5563',
    bg: '#F3F4F6',
  };
}

/**
 * Computes unread count for a list of notifications.
 */
export function calculateUnreadCount(notifications = []) {
  if (!Array.isArray(notifications)) return 0;
  return notifications.filter(n => !n.is_read).length;
}

/**
 * Transforms a raw business_updates row into a normalized notification object.
 */
export function sanitizeCustomerNotice(rawUpdate, customerId) {
  if (!rawUpdate) return null;

  const recipients = Array.isArray(rawUpdate.business_update_recipients)
    ? rawUpdate.business_update_recipients
    : [];

  // Find recipient record for this buyer if present
  const myRecipient = customerId
    ? recipients.find(r => r.customer_id === customerId) || recipients[0]
    : recipients[0];

  const isRead = Boolean(myRecipient && myRecipient.read_at);

  const categoryMeta = getCategoryMeta(rawUpdate.type);

  return {
    id: rawUpdate.id,
    title: rawUpdate.title || 'Untitled Notice',
    message: rawUpdate.message || '',
    type: rawUpdate.type || 'OTHER',
    categoryLabel: categoryMeta.label,
    categoryColor: categoryMeta.color,
    categoryBg: categoryMeta.bg,
    audience_type: rawUpdate.audience_type || 'ALL',
    published_at: rawUpdate.published_at || rawUpdate.created_at || new Date().toISOString(),
    image_url: rawUpdate.image_url || null,
    attachment_url: rawUpdate.attachment_url || null,
    is_read: isRead,
    read_at: myRecipient?.read_at || null,
    recipient_id: myRecipient?.id || null,
  };
}

/**
 * Fetches all published notices for the authenticated customer.
 */
export async function fetchCustomerNotifications(customerId) {
  try {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData?.session) {
      return {
        success: false,
        errorCode: 'UNAUTHENTICATED',
        error: 'No active session found.',
        data: [],
      };
    }

    // RLS policy "Buyers view published updates" ensures only PUBLISHED notices
    // where audience_type = 'ALL' or buyer is in business_update_recipients are returned.
    const { data, error } = await supabase
      .from('business_updates')
      .select(`
        id,
        title,
        message,
        type,
        status,
        audience_type,
        published_at,
        created_at,
        image_url,
        attachment_url,
        business_update_recipients (
          id,
          customer_id,
          read_at,
          delivered_at
        )
      `)
      .eq('status', 'PUBLISHED')
      .order('published_at', { ascending: false });

    if (error) {
      console.warn('Error fetching customer notifications:', error);
      return {
        success: false,
        errorCode: 'QUERY_ERROR',
        error: error.message,
        data: [],
      };
    }

    const formatted = (data || []).map(item => sanitizeCustomerNotice(item, customerId));

    return {
      success: true,
      data: formatted,
    };
  } catch (err) {
    console.warn('Network exception fetching customer notifications:', err);
    return {
      success: false,
      errorCode: 'NETWORK_ERROR',
      error: err.message || 'Network error fetching notifications.',
      data: [],
    };
  }
}

/**
 * Marks a specific notice as read for the authenticated customer.
 */
export async function markNoticeAsRead(updateId, customerId) {
  if (!updateId || !customerId) {
    return { success: false, error: 'Missing updateId or customerId.' };
  }

  try {
    // 1. Check if recipient record exists for this buyer
    const { data: existing, error: selectErr } = await supabase
      .from('business_update_recipients')
      .select('id, read_at')
      .eq('update_id', updateId)
      .eq('customer_id', customerId)
      .maybeSingle();

    if (selectErr) {
      console.warn('Error checking existing recipient record:', selectErr);
    }

    const nowIso = new Date().toISOString();

    if (existing) {
      if (!existing.read_at) {
        const { error: updateErr } = await supabase
          .from('business_update_recipients')
          .update({ read_at: nowIso })
          .eq('id', existing.id);

        if (updateErr) {
          console.warn('Error updating read_at:', updateErr);
          return { success: false, error: updateErr.message };
        }
      }
    } else {
      // For 'ALL' audience updates, insert recipient tracking record
      const { error: insertErr } = await supabase
        .from('business_update_recipients')
        .insert({
          update_id: updateId,
          customer_id: customerId,
          read_at: nowIso,
          delivered_at: nowIso,
        });

      if (insertErr) {
        console.warn('Error inserting recipient read record:', insertErr);
        return { success: false, error: insertErr.message };
      }
    }

    return { success: true };
  } catch (err) {
    console.warn('Exception marking notice as read:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Marks all unread notices as read for the authenticated customer.
 */
export async function markAllNoticesAsRead(notifications = [], customerId) {
  if (!customerId || !Array.isArray(notifications)) {
    return { success: false, count: 0 };
  }

  const unreadItems = notifications.filter(n => !n.is_read);
  if (unreadItems.length === 0) {
    return { success: true, count: 0 };
  }

  const results = await Promise.allSettled(
    unreadItems.map(item => markNoticeAsRead(item.id, customerId))
  );

  const successfulCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  return { success: true, count: successfulCount };
}
