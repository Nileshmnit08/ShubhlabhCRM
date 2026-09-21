import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { SyncService } from './SyncService';

export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

class ChatService {
  /**
   * Fetch all active conversations for the current user.
   */
  async getConversations(userId) {
    if (!userId) return { data: null, error: 'No user ID provided' };

    const net = await NetInfo.fetch();
    let onlineData = [];
    
    if (net.isConnected) {
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
      } else if (data) {
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

        onlineData = data.map(item => {
          const otherParticipant = item.other_participants?.find(p => p.user_id !== userId);
          return {
            id: item.conversation_id,
            updated_at: item.chat_conversations?.updated_at,
            otherUser: (otherParticipant && userMap[otherParticipant.user_id]) || { full_name: 'Unknown User', role: 'Staff' },
            pending: false
          };
        });
      }
    }

    // Load Cache
    let cachedData = [];
    try {
      const cached = await AsyncStorage.getItem(`@chat_conversations_${userId}`);
      if (cached) cachedData = JSON.parse(cached);
    } catch (e) {
      console.warn('Cache read error:', e);
    }

    // Load Sync Queue for latest messages preview
    let pendingMessages = [];
    try {
      const queue = await SyncService.getQueue(userId);
      if (queue) {
        pendingMessages = queue
          .filter(op => op.table === 'chat_messages' && op.status !== 'SYNCED')
          .map(op => op.payload);
      }
    } catch (e) {}

    // Merge logic: Online > Cache > Queue (for latest messages)
    const mergedMap = new Map();

    // 1. Add all cached data first
    cachedData.forEach(conv => mergedMap.set(conv.id, conv));

    // 2. Overwrite with Online data (clears pending flags for synced convs)
    onlineData.forEach(conv => mergedMap.set(conv.id, conv));

    // 3. Inject latest offline messages into the merged map
    pendingMessages.forEach(msg => {
      const existingConv = mergedMap.get(msg.conversation_id);
      if (existingConv) {
        // Only update if the pending message is newer
        const msgTime = new Date(msg.created_at || new Date()).getTime();
        const convTime = new Date(existingConv.updated_at).getTime();
        if (msgTime > convTime || !existingConv.latest_message) {
           existingConv.updated_at = msg.created_at || new Date().toISOString();
           existingConv.latest_message = msg.message_text;
           existingConv.latest_pending = true;
        }
      }
    });

    const formattedData = Array.from(mergedMap.values())
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    // Save back to cache
    try {
      await AsyncStorage.setItem(`@chat_conversations_${userId}`, JSON.stringify(formattedData));
    } catch(e) {}

    return { data: formattedData, error: null };
  }

  /**
   * Get messages for a specific conversation
   */
  async getMessages(conversationId, userId) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    let finalData = data || [];

    // Inject pending messages from SyncService queue
    if (userId) {
      try {
        const queue = await SyncService.getQueue(userId);
        if (queue) {
          const pendingMessages = queue
            .filter(op => op.table === 'chat_messages' && op.payload.conversation_id === conversationId)
            .map(op => ({
              ...op.payload,
              pending: op.status !== 'SYNCED',
              created_at: op.created_at || new Date().toISOString()
            }));
            
          // Add pending messages that don't already exist in server data
          pendingMessages.forEach(pm => {
             if (!finalData.find(m => m.id === pm.id)) {
                finalData.push(pm);
             }
          });
          
          // Sort again to ensure pending ones sit at the bottom properly
          finalData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        }
      } catch (e) {
        console.warn('Error reading pending messages', e);
      }
    }

    if (error && !data) {
      console.error('Error fetching messages:', error);
      return { data: finalData.length > 0 ? finalData : null, error };
    }

    return { data: finalData, error: null };
  }

  /**
   * Send a new message and dispatch in-app notification (Offline First)
   */
  async sendMessage(conversationId, senderId, text, recipientId = null, senderName = 'Staff', existingId = null) {
    const messageId = existingId || generateUUID();
    
    // 1. Enqueue the chat message
    const messagePayload = {
      id: messageId,
      conversation_id: conversationId,
      sender_id: senderId,
      message_text: text,
    };
    
    await SyncService.enqueueOperation('chat_messages', messagePayload, senderId);

    // 2. Enqueue the notification if recipient is known
    if (recipientId) {
      const notificationPayload = {
        id: generateUUID(),
        user_id: recipientId,
        entity_type: 'CHAT_MESSAGE',
        entity_id: conversationId,
        notification_type: 'CHAT',
        title: senderName,
        message: text.length > 50 ? text.substring(0, 50) + '...' : text,
        link_url: `/chat/${conversationId}`
      };
      await SyncService.enqueueOperation('crm_notifications', notificationPayload, senderId);
    }

    return { data: [messagePayload], error: null };
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
   * Create or get an existing conversation between two users (Offline First)
   */
  async getOrCreateConversation(userId1, userId2, otherUserObj = null) {
    console.log(`[DIAGNOSTIC] getOrCreateConversation started: userId1=${userId1}, userId2=${userId2}`);
    
    // 1. Check local cache first
    try {
      const cached = await AsyncStorage.getItem(`@chat_conversations_${userId1}`);
      if (cached) {
        const convs = JSON.parse(cached);
        const existing = convs.find(c => c.otherUser?.id === userId2);
        if (existing) {
          console.log(`[DIAGNOSTIC] Found conversation in cache:`, existing.id);
          return { data: { id: existing.id }, error: null };
        }
      }
    } catch(e) {
      console.warn('[DIAGNOSTIC] Cache read error:', e);
    }

    // 2. Check Network Status
    const net = await NetInfo.fetch();
    console.log(`[DIAGNOSTIC] Network isConnected: ${net.isConnected}`);
    
    let onlineFailed = false;

    if (net.isConnected) {
      try {
        console.log(`[DIAGNOSTIC] Querying chat_participants for user1...`);
        // Find all conversations for user1
        const { data: user1Convs, error: err1 } = await supabase
          .from('chat_participants')
          .select('conversation_id')
          .eq('user_id', userId1);

        if (err1) {
          console.error('[DIAGNOSTIC] Supabase err1:', err1);
          onlineFailed = true;
        } else {
          const convIds = user1Convs.map(c => c.conversation_id);
          console.log(`[DIAGNOSTIC] user1Convs found:`, convIds.length);

          if (convIds.length > 0) {
            console.log(`[DIAGNOSTIC] Querying shared convs for user2...`);
            // Find if user2 is in any of these conversations
            const { data: sharedConvs, error: err2 } = await supabase
              .from('chat_participants')
              .select('conversation_id')
              .eq('user_id', userId2)
              .in('conversation_id', convIds);
              
            if (err2) {
              console.error('[DIAGNOSTIC] Supabase err2:', err2);
              onlineFailed = true;
            } else if (sharedConvs && sharedConvs.length > 0) {
              console.log(`[DIAGNOSTIC] Shared conversation found online:`, sharedConvs[0].conversation_id);
              return { data: { id: sharedConvs[0].conversation_id }, error: null };
            }
          }

          if (!onlineFailed) {
            console.log(`[DIAGNOSTIC] Creating new conversation online...`);
            // If no conversation exists online, create a new one
            const { data: newConv, error: createErr } = await supabase
              .from('chat_conversations')
              .insert([{}])
              .select()
              .single();

            if (createErr) {
              console.error('[DIAGNOSTIC] Supabase createErr:', createErr);
              onlineFailed = true;
            } else {
              console.log(`[DIAGNOSTIC] newConv created:`, newConv.id);
              // Add participants
              const { error: partErr } = await supabase
                .from('chat_participants')
                .insert([
                  { conversation_id: newConv.id, user_id: userId1 },
                  { conversation_id: newConv.id, user_id: userId2 }
                ]);

              if (partErr) {
                console.error('[DIAGNOSTIC] Supabase partErr:', partErr);
                onlineFailed = true;
              } else {
                console.log(`[DIAGNOSTIC] Participants added online. Returning:`, newConv.id);
                return { data: newConv, error: null };
              }
            }
          }
        }
      } catch (ex) {
        console.error('[DIAGNOSTIC] Unexpected error during online check:', ex);
        onlineFailed = true;
      }
    }

    // 3. OFFLINE FALLBACK: Generate ID and Queue operations
    console.log(`[DIAGNOSTIC] Falling back to OFFLINE generation (net=${net.isConnected}, onlineFailed=${onlineFailed})`);
    const newConvId = generateUUID();
    console.log(`[DIAGNOSTIC] Generated offline UUID:`, newConvId);
    
    try {
      // Queue conversation creation
      await SyncService.enqueueOperation('chat_conversations', { id: newConvId }, userId1);
      console.log(`[DIAGNOSTIC] Enqueued chat_conversations`);
      
      // Queue participant links
      await SyncService.enqueueOperation('chat_participants', { 
        id: generateUUID(),
        conversation_id: newConvId, 
        user_id: userId1 
      }, userId1);
      console.log(`[DIAGNOSTIC] Enqueued chat_participant user1`);
      
      await SyncService.enqueueOperation('chat_participants', { 
        id: generateUUID(),
        conversation_id: newConvId, 
        user_id: userId2 
      }, userId1);
      console.log(`[DIAGNOSTIC] Enqueued chat_participant user2`);

      // 4. Update local cache so it appears in Inbox immediately
      try {
        const cacheKey = `@chat_conversations_${userId1}`;
        const cachedStr = await AsyncStorage.getItem(cacheKey);
        let convs = cachedStr ? JSON.parse(cachedStr) : [];
        
        convs.unshift({
          id: newConvId,
          updated_at: new Date().toISOString(),
          otherUser: otherUserObj || { id: userId2, full_name: 'Pending Sync...', role: 'Staff' },
          pending: true
        });
        
        await AsyncStorage.setItem(cacheKey, JSON.stringify(convs));
      } catch (cacheErr) {
        console.error(`Failed to update local cache:`, cacheErr);
      }

      return { data: { id: newConvId }, error: null };
    } catch (qErr) {
      console.error(`[DIAGNOSTIC] Failed to enqueue offline conversation:`, qErr);
      return { data: null, error: qErr };
    }
  }
}

export const chatService = new ChatService();
