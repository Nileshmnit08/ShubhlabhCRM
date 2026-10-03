/**
 * Supabase Edge Function: notify-incoming-call
 * 
 * Called when a call is initiated from the Web CRM or mobile app.
 * Sends a high-priority FCM push notification to the Staff member's active device(s).
 *
 * Setup:
 *   1. Store Firebase service account JSON in Supabase secrets: FCM_SERVICE_ACCOUNT
 *   2. Store device push tokens in the `user_push_tokens` table.
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { JWT } from 'https://esm.sh/google-auth-library@8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getFcmAccessToken(serviceAccountJson: any) {
  const jwtClient = new JWT({
    email: serviceAccountJson.client_email,
    key: serviceAccountJson.private_key,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
  });
  const tokens = await jwtClient.authorize();
  return tokens.access_token;
}

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Supabase env variables missing' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // Fetch the receiver's active push tokens from the new multi-device table
    const { data: tokensData } = await supabase
      .from('user_push_tokens')
      .select('id, fcm_token')
      .eq('user_id', receiverId)
      .eq('is_active', true);

    if (!tokensData || tokensData.length === 0) {
      return new Response(JSON.stringify({ sent: false, reason: 'No active push tokens for receiver' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceAccountStr = Deno.env.get('FCM_SERVICE_ACCOUNT');
    if (!serviceAccountStr) {
      return new Response(JSON.stringify({ error: 'FCM Service Account not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceAccount = JSON.parse(serviceAccountStr);
    const projectId = serviceAccount.project_id;
    const accessToken = await getFcmAccessToken(serviceAccount);
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    
    const fcmResults = [];

    // Send FCM push notification to all active devices
    for (const tokenRow of tokensData) {
      const fcmPayload = {
        message: {
          token: tokenRow.fcm_token,
          data: {
            type: 'CALL_INITIATED',
            callId: callSessionId,
            callerId: callerData.user.id,
            callerName: callerName,
            callType: callType || 'AUDIO',
          },
          android: {
            priority: 'high',
          }
        }
      };

      const fcmResponse = await fetch(fcmUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fcmPayload),
      });

      const fcmResult = await fcmResponse.json();
      fcmResults.push({ token_id: tokenRow.id, result: fcmResult });

      // Clean up stale tokens
      if (fcmResult.error && (fcmResult.error.status === 'NOT_FOUND' || fcmResult.error.details?.some((d: any) => d.errorCode === 'UNREGISTERED'))) {
         await supabase.from('user_push_tokens').update({ is_active: false }).eq('id', tokenRow.id);
      }
    }

    return new Response(JSON.stringify({ sent: true, fcm: fcmResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
