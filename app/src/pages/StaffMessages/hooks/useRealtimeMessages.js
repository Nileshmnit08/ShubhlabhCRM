import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

/**
 * useRealtimeMessages
 *
 * Manages Supabase realtime subscription for a single conversation.
 * Handles:
 *  - Clean unsubscribe when conversationId changes
 *  - Deduplication via pending message ID set (prevents optimistic duplicate)
 *  - Batch-fetches sender info on new message
 */
export function useRealtimeMessages({ conversationId, currentUserId, onNewMessage, onMarkRead }) {
  // Track IDs that were just inserted optimistically so we can skip the realtime echo
  const pendingIds = useRef(new Set());

  const addPendingId = useCallback((id) => {
    pendingIds.current.add(id);
    // Auto-remove after 10 seconds to avoid permanent suppression on retry
    setTimeout(() => pendingIds.current.delete(id), 10000);
  }, []);

  useEffect(() => {
    if (!conversationId) return;

    const channelName = `chat_messages:conv_${conversationId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new;

          // Skip if this is the optimistic echo of our own just-sent message
          if (pendingIds.current.has(newMsg.id)) {
            pendingIds.current.delete(newMsg.id);
            return;
          }

          // Fetch sender display info
          const { data: senderData } = await supabase
            .from('app_users')
            .select('display_name, role')
            .eq('id', newMsg.sender_id)
            .single();

          const completeMsg = {
            ...newMsg,
            app_users: senderData || { display_name: 'Unknown', role: 'Staff' },
          };

          onNewMessage(completeMsg);

          // Auto-mark as read if the message is from someone else
          if (newMsg.sender_id !== currentUserId) {
            onMarkRead(conversationId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, onNewMessage, onMarkRead]);

  return { addPendingId };
}
