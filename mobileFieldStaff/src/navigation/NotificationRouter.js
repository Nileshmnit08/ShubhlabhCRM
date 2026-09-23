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

/**
 * Fetch the other participant's profile for a given conversation.
 * Returns null safely if offline or not found.
 */
async function resolveOtherUser(conversationId, currentUserId) {
  if (!conversationId || !currentUserId) return null;
  try {
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
      .select('id, display_name, role')
      .eq('id', otherId)
      .single();

    if (userErr || !userRow) {
      // Minimal fallback so the screen can at least render
      return { id: otherId, full_name: 'Staff Member', role: 'Staff' };
    }

    return { id: userRow.id, full_name: userRow.display_name, role: userRow.role };
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

  const { entity_type, entity_id, link_url, title } = notification;

  // ── CHAT MESSAGE ───────────────────────────────────────────────
  if (entity_type === 'CHAT_MESSAGE' && entity_id) {
    const conversationId = entity_id;

    // Resolve other user (may return null if offline — screen will cope)
    const otherUser = await resolveOtherUser(conversationId, currentUserId);

    // Navigate directly to the exact conversation.
    // If another conversation is already mounted, React Navigation will
    // replace/push the stack to the correct target because we always pass
    // the canonical conversationId.
    navigate('ChatConversation', {
      conversationId,
      otherUser: otherUser || { full_name: title || 'Staff Member', role: 'Staff' },
    });
    return;
  }

  // ── CUSTOMER PROFILE ───────────────────────────────────────────
  if (link_url && link_url.includes('/customers/')) {
    const partyId = link_url.split('/customers/').pop().split('/')[0];
    if (partyId) {
      navigate('CustomerProfile', { customerId: partyId });
      return;
    }
  }

  // ── MY WORK ────────────────────────────────────────────────────
  if (link_url === '/my-work') {
    navigate('MainTabs', { screen: 'My Work' });
    return;
  }

  // ── FOLLOW-UP / REQUIREMENT – entity_id present ────────────────
  if (entity_type === 'follow_ups' && entity_id) {
    // Navigate to My Work with a focus hint; the screen can highlight it
    navigate('MainTabs', { screen: 'My Work' });
    return;
  }

  // ── DEFAULT: open notifications list ───────────────────────────
  navigate('Notifications');
}
