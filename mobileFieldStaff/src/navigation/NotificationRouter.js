/**
 * NotificationRouter
 * ------------------
 * Single authoritative place that turns a crm_notifications row into
 * a concrete navigation event.
 *
 * Contract:
 *   notification.entity_type === 'CHAT_MESSAGE'  →  ChatConversationScreen(conversationId)
 *   notification.link_url starts with /customers/ →  CustomerProfile
 *   notification.link_url === /my-work            →  My Work tab
 *   (default)                                     →  Notifications screen
 *
 * The conversation_id is sourced from notification.entity_id, which
 * ChatService already writes for every outgoing chat notification.
 * No schema change needed.
 */

import { supabase } from '../lib/supabase';
import { navigate } from './RootNavigation';
import * as Notifications from 'expo-notifications';

function isValidUUID(value) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Fetch the other participant's profile for a given conversation.
 * Returns null safely if offline or not found.
 */
async function resolveOtherUser(conversationId, currentUserId) {
  if (!conversationId || !currentUserId) return null;
  try {
    // 1. Check if conversation is a group
    const { data: convData } = await supabase
      .from('chat_conversations')
      .select('id, type, title')
      .eq('id', conversationId)
      .single();

    if (convData && (convData.type === 'TEAM_GROUP' || Boolean(convData.title))) {
      return {
        id: convData.id,
        full_name: convData.title || 'Group Chat',
        isGroup: true,
      };
    }

    // 2. Direct 1:1 participant lookup
    const { data, error } = await supabase
      .from('chat_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', currentUserId)
      .limit(1)
      .single();

    if (error || !data) return null;

    const otherId = data.user_id;
    const { data: userRow, error: userErr } = await supabase
      .from('app_users')
      .select('id, display_name, role, whatsapp')
      .eq('id', otherId)
      .single();

    if (userErr || !userRow) {
      // Minimal fallback so the screen can at least render
      return { id: otherId, full_name: 'Staff Member', role: 'Staff' };
    }

    return { id: userRow.id, full_name: userRow.display_name, role: userRow.role, whatsapp: userRow.whatsapp };
  } catch {
    return null;
  }
}

/**
 * handleNotificationPress
 *
 * @param {object} notification  - A crm_notifications row
 * @param {string} currentUserId - The authenticated user's UUID
 */
export async function handleNotificationPress(notification, currentUserId) {
  if (!notification) return;

  const { entity_type, entity_id, link_url, title, party_id, notification_type } = notification;

  // ── CHAT MESSAGE ───────────────────────────────────────────────
  if ((entity_type === 'CHAT_MESSAGE' || notification_type === 'CHAT') && entity_id) {
    const conversationId = entity_id;

    // Dismiss tray notification for this conversation immediately upon tapping
    Notifications.dismissNotificationAsync(conversationId).catch(() => {});

    // Resolve other user (may return null if offline — screen will cope)
    const otherUser = await resolveOtherUser(conversationId, currentUserId);

    // Navigate directly to the exact conversation.
    navigate('ChatConversation', {
      conversationId,
      otherUser: otherUser || { full_name: title || 'Staff Member', role: 'Staff' },
    });
    return;
  }

  // ── ORDERS & REQUIREMENTS ──────────────────────────────────────
  if (
    entity_type === 'order' || 
    entity_type === 'orders' || 
    notification_type === 'ORDER_CREATED' ||
    (link_url && (link_url.includes('/requirements/') || link_url.includes('/orders/')))
  ) {
    let targetOrderId = entity_id;
    if (!targetOrderId && link_url) {
      const parts = link_url.split('?')[0].split('/');
      const lastPart = parts[parts.length - 1];
      if (isValidUUID(lastPart)) {
        targetOrderId = lastPart;
      }
    }

    if (targetOrderId && isValidUUID(targetOrderId)) {
      navigate('OrderDetail', { orderId: targetOrderId });
      return;
    }
    navigate('MyOrders');
    return;
  }

  // ── CUSTOMER PROFILE ───────────────────────────────────────────
  if (link_url && link_url.includes('/customers/')) {
    const partyIdFromUrl = link_url.split('/customers/').pop().split('/')[0].split('?')[0];
    if (partyIdFromUrl && isValidUUID(partyIdFromUrl)) {
      navigate('CustomerProfile', { customerId: partyIdFromUrl });
      return;
    }
  }

  // ── MY WORK / TASKS / ASSIGNMENTS / FOLLOW-UPS ─────────────────
  if (
    link_url === '/my-work' || 
    entity_type === 'follow_ups' || 
    notification_type === 'TASK_ASSIGNED' || 
    notification_type === 'Reminder' ||
    notification_type === 'Assignment'
  ) {
    navigate('MainTabs', { screen: 'My Work' });
    return;
  }

  // ── PARTY_ID FALLBACK ──────────────────────────────────────────
  if (party_id && isValidUUID(party_id)) {
    navigate('CustomerProfile', { customerId: party_id });
    return;
  }

  // ── DEFAULT: open notifications list ───────────────────────────
  navigate('Notifications');
}

