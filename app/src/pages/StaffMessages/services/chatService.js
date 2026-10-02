import { supabase } from '../../../lib/supabase';

const MESSAGE_PAGE_SIZE = 50;

/**
 * Fetch all conversations for an admin user.
 * Optimized: single join for participants + batched user lookup.
 * Returns conversations sorted by updated_at desc.
 */
export async function fetchConversations(currentUserId) {
  // 1. Get all conversations with their participants
  const { data: convData, error: convError } = await supabase
    .from('chat_conversations')
    .select(`
      id,
      type,
      title,
      updated_at,
      chat_participants (
        user_id
      )
    `)
    .order('updated_at', { ascending: false });

  if (convError) throw convError;
  if (!convData || convData.length === 0) return [];

  // 2. Batch-fetch all unique user IDs in one query
  const userIds = new Set();
  convData.forEach((conv) => {
    conv.chat_participants.forEach((p) => userIds.add(p.user_id));
  });

  const { data: usersData, error: usersError } = await supabase
    .from('app_users')
    .select('id, display_name, role')
    .in('id', Array.from(userIds));

  if (usersError) throw usersError;

  const userMap = {};
  (usersData || []).forEach((u) => (userMap[u.id] = u));

  // 3. Batch-fetch latest message per conversation using a single query
  const convIds = convData.map((c) => c.id);
  const { data: latestMsgs } = await supabase
    .from('chat_messages')
    .select('id, message_text, created_at, read_at, sender_id, conversation_id')
    .in('conversation_id', convIds)
    .order('created_at', { ascending: false });

  // Build a map of latest message per conversation
  const latestMsgMap = {};
  if (latestMsgs) {
    latestMsgs.forEach((msg) => {
      if (!latestMsgMap[msg.conversation_id]) {
        latestMsgMap[msg.conversation_id] = msg;
      }
    });
  }

  // 4. Build formatted conversations
  return convData.map((conv) => {
    const staffUsers = conv.chat_participants
      .filter((p) => p.user_id !== currentUserId)
      .map((p) => userMap[p.user_id])
      .filter(Boolean);

    const isGroup = conv.chat_participants.length > 2;

    let names = staffUsers.map((u) => u.display_name || 'Unknown').join(' & ');
    if (isGroup) {
      names = conv.title || `Group (${conv.chat_participants.length} members)`;
    }

    let roles = staffUsers.map((u) => u.role || 'Staff').join(', ');
    if (isGroup) {
      roles = 'Team Chat';
    }

    const staffUserIds = staffUsers.map((u) => u.id);

    // Determine type based on participants
    const hasAdmin = conv.chat_participants.some((p) => {
      const r = userMap[p.user_id]?.role;
      return r === 'Admin' || r === 'Owner' || r === 'Superadmin';
    });

    let type = conv.type;
    
    // Fix: all 1:1 chats are DIRECT_CHAT. Groups are TEAM or ADMIN_STAFF based on admins present.
    if (!isGroup) {
      type = 'DIRECT_CHAT';
    } else if (type !== 'TEAM_GROUP') {
      type = hasAdmin ? 'ADMIN_STAFF' : 'TEAM';
    }

    // Map TEAM_GROUP to TEAM so it correctly matches the 'TEAM' filter in useStaffMessages
    if (type === 'TEAM_GROUP') {
      type = 'TEAM';
    }

    return {
      id: conv.id,
      updated_at: conv.updated_at,
      participants: conv.chat_participants,
      staffUserIds,
      participantNames: names,
      participantRoles: roles,
      latestMessage: latestMsgMap[conv.id] || null,
      type,
    };
  });
}

/**
 * Fetch a page of messages for a conversation.
 * Uses cursor-based pagination (before_id) for infinite scroll.
 * @param {string} conversationId
 * @param {string|null} beforeId - fetch messages older than this ID
 * @returns {{ messages: Array, hasMore: boolean }}
 */
export async function fetchMessages(conversationId, beforeId = null) {
  let query = supabase
    .from('chat_messages')
    .select('id, message_text, created_at, read_at, sender_id, conversation_id')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(MESSAGE_PAGE_SIZE + 1);

  if (beforeId) {
    // Fetch messages older than the given message's created_at
    const { data: anchor } = await supabase
      .from('chat_messages')
      .select('created_at')
      .eq('id', beforeId)
      .single();
    if (anchor) {
      query = query.lt('created_at', anchor.created_at);
    }
  }

  const { data: msgData, error } = await query;
  if (error) throw error;

  const hasMore = (msgData?.length || 0) > MESSAGE_PAGE_SIZE;
  const pageMessages = hasMore ? msgData.slice(0, MESSAGE_PAGE_SIZE) : msgData || [];

  // Batch-fetch senders
  const senderIds = new Set(pageMessages.map((m) => m.sender_id));
  const { data: sendersData } = await supabase
    .from('app_users')
    .select('id, display_name, role')
    .in('id', Array.from(senderIds));

  const senderMap = {};
  (sendersData || []).forEach((u) => (senderMap[u.id] = u));

  const enriched = pageMessages
    .map((msg) => ({
      ...msg,
      app_users: senderMap[msg.sender_id] || { display_name: 'Unknown', role: 'Staff' },
    }))
    .reverse(); // Restore chronological order

  return { messages: enriched, hasMore };
}

/**
 * Mark all unread incoming messages in a conversation as read.
 * Also clears active CHAT_MESSAGE notifications for the user.
 */
export async function markMessagesAsRead(conversationId, userId) {
  await supabase
    .from('chat_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .is('read_at', null);

  await supabase
    .from('crm_notifications')
    .update({ is_read: true })
    .eq('entity_type', 'CHAT_MESSAGE')
    .eq('entity_id', conversationId)
    .eq('user_id', userId)
    .eq('is_read', false);
}

/**
 * Send a message and dispatch notifications to other participants.
 * SECURITY: sender_id is NOT passed from frontend — enforced by DB trigger.
 * We pass sender_id as the authenticated user from userProfile to build local
 * optimistic state only. The DB ignores any client-supplied sender_id via trigger.
 */
export async function sendMessage(conversationId, senderId, senderProfile, messageText, otherParticipants) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert([
      {
        conversation_id: conversationId,
        sender_id: senderId,
        message_text: messageText,
      },
    ])
    .select();

  if (error) throw error;

  const newMsg = data[0];

  // Build complete local message for optimistic state
  const completeMsg = {
    ...newMsg,
    app_users: {
      display_name: senderProfile.display_name,
      role: senderProfile.role,
    },
  };

  // Notify other participants (fire-and-forget, don't block send UX)
  const preview = messageText.length > 50 ? messageText.substring(0, 50) + '...' : messageText;
  Promise.all(
    otherParticipants.map((p) =>
      supabase.from('crm_notifications').insert([
        {
          user_id: p.user_id,
          entity_type: 'CHAT_MESSAGE',
          entity_id: conversationId,
          notification_type: 'CHAT',
          title: senderProfile.display_name,
          message: preview,
          link_url: `/chat/${conversationId}`,
        },
      ])
    )
  ).catch((err) => console.warn('Notification insert failed (non-critical):', err));

  return completeMsg;
}

/**
 * Find or create a 1:1 conversation between the current user and a staff member.
 * Safe against race conditions via Postgres RPC and transaction lock.
 */
export async function findOrCreateConversation(currentUserId, staffUserId) {
  // Call the atomic RPC to get or create the direct chat.
  // The RPC verifies auth.uid() automatically. We do not pass currentUserId to the DB.
  const { data, error } = await supabase.rpc('get_or_create_direct_chat', {
    target_user_id: staffUserId,
  });

  if (error) {
    console.error("RPC Error:", error);
    throw error;
  }

  // The RPC returns JSONB: { conversation_id: UUID, is_new: BOOLEAN }
  return {
    conversationId: data.conversation_id,
    isNew: data.is_new,
  };
}

/**
 * Fetch staff context (today's stats + recent activity) for a given staff member.
 */
export async function fetchStaffContext(staffId) {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();
  const dateStr = startOfDay.split('T')[0];

  const [
    { count: visitsCount },
    { count: ordersCount },
    { count: followUpsCount },
    { data: recentReqs },
    { data: recentVisits },
    { data: todaysFollowups },
  ] = await Promise.all([
    supabase.from('crm_visits').select('*', { count: 'exact', head: true }).eq('staff_id', staffId).gte('started_at', startOfDay).lte('started_at', endOfDay),
    supabase.from('requirements').select('*', { count: 'exact', head: true }).eq('assigned_to', staffId).gte('created_at', startOfDay).lte('created_at', endOfDay),
    supabase.from('follow_ups').select('*', { count: 'exact', head: true }).eq('assigned_to', staffId).eq('follow_up_date', dateStr),
    supabase.from('requirements').select('id, product_type, customer_name, party_id, created_at').eq('assigned_to', staffId).order('created_at', { ascending: false }).limit(5),
    supabase.from('crm_visits').select('id, crm_parties(id, display_name), created_at').eq('staff_id', staffId).order('created_at', { ascending: false }).limit(5),
    supabase.from('follow_ups').select('id, reason, crm_parties(display_name), created_at').eq('assigned_to', staffId).order('created_at', { ascending: false }).limit(5),
  ]);

  const workItems = [];
  if (recentReqs) recentReqs.forEach((r) => workItems.push({ type: 'Order', id: r.id, created_at: r.created_at, party_id: r.party_id, party_name: r.customer_name, label: `${r.product_type} — ${r.customer_name}`, link: `/requirements/${r.id}` }));
  if (recentVisits) recentVisits.forEach((v) => workItems.push({ type: 'Visit', id: v.id, created_at: v.created_at, party_id: v.crm_parties?.id, party_name: v.crm_parties?.display_name, label: v.crm_parties?.display_name || 'Customer', link: `/customers/${v.crm_parties?.id || ''}` }));
  if (todaysFollowups) todaysFollowups.forEach((f) => workItems.push({ type: 'Follow-up', id: f.id, created_at: f.created_at, party_id: f.crm_parties?.id, party_name: f.crm_parties?.display_name, label: f.crm_parties?.display_name || 'Customer', link: `/follow-ups/${f.id}/edit`, status: 'Pending' }));

  workItems.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return {
    visits: visitsCount || 0,
    orders: ordersCount || 0,
    followUps: followUpsCount || 0,
    recentWork: workItems.slice(0, 6),
  };
}

/**
 * Fetch all active staff members (excluding current user).
 */
export async function fetchStaffList(currentUserId) {
  const { data, error } = await supabase
    .from('app_users')
    .select('id, display_name, role, is_active')
    .eq('is_active', true)
    .neq('id', currentUserId);
  if (error) throw error;
  return data || [];
}

/**
 * Search messages across authorized conversations.
 * Only called after debounce. Returns max 20 results.
 */
export async function searchMessages(query, conversationIds) {
  if (!query || query.trim().length < 3 || conversationIds.length === 0) return [];

  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, message_text, created_at, conversation_id, sender_id, app_users:sender_id(display_name)')
    .ilike('message_text', `%${query}%`)
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
}
