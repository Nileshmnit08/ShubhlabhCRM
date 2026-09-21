import { supabase } from '../lib/supabase';

class ChatService {
  /**
   * Fetch all active conversations for the current user.
   */
  async getConversations(userId) {
    if (!userId) return { data: null, error: 'No user ID provided' };

    const { data, error } = await supabase
      .from('chat_participants')
      .select(`
        conversation_id,
        chat_conversations (
          id,
          updated_at
        ),
        other_participants:chat_participants (
          user_id
        )
      `)
      .eq('user_id', userId)
      .order('chat_conversations(updated_at)', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return { data: null, error };
    }

    const otherUserIds = new Set();
    data.forEach(item => {
      const other = item.other_participants?.find(p => p.user_id !== userId);
      if (other) otherUserIds.add(other.user_id);
    });

    const { data: usersData } = await supabase
      .from('app_users')
      .select('id, display_name, role')
      .in('id', Array.from(otherUserIds));

    const userMap = {};
    if (usersData) {
      usersData.forEach(u => {
        userMap[u.id] = { ...u, full_name: u.display_name };
      });
    }

    const formattedData = data.map(item => {
      const otherParticipant = item.other_participants?.find(p => p.user_id !== userId);
      return {
        id: item.conversation_id,
        updated_at: item.chat_conversations?.updated_at,
        otherUser: (otherParticipant && userMap[otherParticipant.user_id]) || { full_name: 'Unknown User', role: 'Staff' }
      };
    }).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    return { data: formattedData, error: null };
  }

  /**
   * Get messages for a specific conversation
   */
  async getMessages(conversationId) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return { data: null, error };
    }

    return { data, error: null };
  }

  /**
   * Send a new message and dispatch in-app notification
   */
  async sendMessage(conversationId, senderId, text, recipientId = null, senderName = 'Staff') {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([
        {
          conversation_id: conversationId,
          sender_id: senderId,
          message_text: text,
        }
      ])
      .select();

    if (!error && recipientId) {
      // Dispatch in-app notification to the recipient
      await supabase
        .from('crm_notifications')
        .insert([
          {
            user_id: recipientId,
            entity_type: 'CHAT_MESSAGE',
            entity_id: conversationId,
            notification_type: 'CHAT',
            title: senderName,
            message: text.length > 50 ? text.substring(0, 50) + '...' : text,
            link_url: `/chat/${conversationId}`
          }
        ]);
    }

    return { data, error };
  }

  /**
   * Mark messages as read in a conversation
   */
  async markMessagesAsRead(conversationId, userId) {
    // We mark messages where sender is NOT the current user and read_at is null
    const { data, error } = await supabase
      .from('chat_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null);

    return { data, error };
  }

  /**
   * Subscribe to new messages for a specific conversation
   */
  subscribeToMessages(conversationId, callback) {
    return supabase
      .channel(`public:chat_messages:conversation_id=eq.${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();
  }

  /**
   * Get all staff members (excluding current user) to start a new chat
   */
  async getStaffDirectory(currentUserId) {
    const { data, error } = await supabase
      .from('app_users')
      .select('id, display_name, role')
      .neq('id', currentUserId)
      .eq('is_active', true);

    if (data) {
      const mapped = data.map(u => ({ ...u, full_name: u.display_name }));
      return { data: mapped, error: null };
    }

    return { data, error };
  }

  /**
   * Create or get an existing conversation between two users
   */
  async getOrCreateConversation(userId1, userId2) {
    // 1. Check if conversation already exists between these two users
    // Since RLS is strict, we might need a stored procedure, but let's try with multiple queries.
    // Find all conversations for user1
    const { data: user1Convs, error: err1 } = await supabase
      .from('chat_participants')
      .select('conversation_id')
      .eq('user_id', userId1);

    if (err1) return { data: null, error: err1 };

    const convIds = user1Convs.map(c => c.conversation_id);

    if (convIds.length > 0) {
      // Find if user2 is in any of these conversations
      const { data: sharedConvs, error: err2 } = await supabase
        .from('chat_participants')
        .select('conversation_id')
        .eq('user_id', userId2)
        .in('conversation_id', convIds);
        
      if (err2) return { data: null, error: err2 };

      if (sharedConvs && sharedConvs.length > 0) {
        return { data: { id: sharedConvs[0].conversation_id }, error: null };
      }
    }

    // 2. If no conversation exists, create a new one
    const { data: newConv, error: createErr } = await supabase
      .from('chat_conversations')
      .insert([{}])
      .select()
      .single();

    if (createErr) return { data: null, error: createErr };

    // 3. Add participants
    const { error: partErr } = await supabase
      .from('chat_participants')
      .insert([
        { conversation_id: newConv.id, user_id: userId1 },
        { conversation_id: newConv.id, user_id: userId2 }
      ]);

    if (partErr) return { data: null, error: partErr };

    return { data: newConv, error: null };
  }
}

export const chatService = new ChatService();
