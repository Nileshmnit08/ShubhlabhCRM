import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

export function useSignaling(currentUserId, onSignal) {
  const channelRef = useRef(null);

  useEffect(() => {
    if (!currentUserId) return;

    // Listen on a personal channel for this user
    const channelName = `call_signals:${currentUserId}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'call_event' }, (payload) => {
        if (onSignal) onSignal(payload.payload);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [currentUserId, onSignal]);

  const sendSignal = useCallback(async (targetUserId, signalData) => {
    if (!targetUserId) return;
    
    // Using a temporary channel to send broadcast to the target user
    const targetChannelName = `call_signals:${targetUserId}`;
    const channel = supabase.channel(targetChannelName);
    
    // Supabase broadcast requires subscription first
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.send({
          type: 'broadcast',
          event: 'call_event',
          payload: { ...signalData, senderId: currentUserId }
        });
        
        // Remove channel after a short delay to ensure transmission
        setTimeout(() => {
          supabase.removeChannel(channel);
        }, 500);
      }
    });
  }, [currentUserId]);

  return { sendSignal };
}
