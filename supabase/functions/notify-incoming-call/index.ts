/**
 * Supabase Edge Function: notify-incoming-call
 * 
 * Called when a call is initiated from the Web CRM.
 * Sends a high-priority FCM push notification to the Staff member's device
 * so they receive an incoming call alert even when the app is backgrounded or the screen is locked.
 * 
 * Endpoint: POST /functions/v1/notify-incoming-call
 * Body: { receiverId, callSessionId, callerName, callerRole, callType }
 * 
 * Setup:
 *   1. Store FCM Server Key in Supabase secrets: FCM_SERVER_KEY
 *   2. Store device push tokens in a 'push_tokens' table (see SQL below)
 *   3. Call this function from the web CallProvider after initiateCall()
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { receiverId, callSessionId, callerName, callerRole, callType } = await req.json();

    if (!receiverId || !callSessionId || !callerName) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Validate caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: callerData, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !callerData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the call session belongs to this caller
    const { data: session, error: sessionError } = await supabase
      .from('call_sessions')
      .select('id, caller_id, receiver_id')
      .eq('id', callSessionId)
      .single();

    if (sessionError || !session || session.caller_id !== callerData.user.id || session.receiver_id !== receiverId) {
      return new Response(JSON.stringify({ error: 'Invalid call session' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the receiver's push token
    const { data: tokenData } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', receiverId)
      .single();

    if (!tokenData?.token) {
      return new Response(JSON.stringify({ sent: false, reason: 'No push token for receiver' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send FCM push notification
    const fcmKey = Deno.env.get('FCM_SERVER_KEY');
    if (!fcmKey) {
      return new Response(JSON.stringify({ error: 'FCM not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isVideo = callType === 'VIDEO';
    const fcmPayload = {
      to: tokenData.token,
      priority: 'high',
      notification: {
        title: `Incoming ${isVideo ? 'Video' : 'Audio'} Call`,
        body: `${callerName} (${callerRole}) is calling you`,
        sound: 'default',
        android_channel_id: 'incoming_calls',
        priority: 'high',
      },
      data: {
        type: 'incoming_call',
        callSessionId,
        callerName,
        callerRole,
        callType: callType || 'AUDIO',
        senderId: callerData.user.id,
      },
      android: {
        priority: 'high',
        notification: {
          channel_id: 'incoming_calls',
          priority: 'max',
          visibility: 'public',
        },
      },
    };

    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Authorization': `key=${fcmKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fcmPayload),
    });

    const fcmResult = await fcmResponse.json();

    return new Response(JSON.stringify({ sent: true, fcm: fcmResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

/**
 * Required SQL (run in Supabase SQL editor):
 * 
 * CREATE TABLE IF NOT EXISTS public.push_tokens (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
 *   token TEXT NOT NULL,
 *   platform TEXT, -- 'android' | 'ios'
 *   updated_at TIMESTAMPTZ DEFAULT NOW(),
 *   UNIQUE(user_id)
 * );
 * 
 * ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
 * 
 * -- Users can only manage their own token
 * CREATE POLICY "own_token" ON public.push_tokens
 *   USING (auth.uid() = user_id)
 *   WITH CHECK (auth.uid() = user_id);
 */
