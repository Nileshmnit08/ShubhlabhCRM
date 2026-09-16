import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

// Define the payload structure we expect from the Database Webhook
interface WebhookPayload {
  notification_id: string;
  user_id: string;
  title: string;
  message: string;
  link_url?: string;
  entity_type?: string;
}

serve(async (req) => {
  try {
    // Basic CORS and Method handling
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST' } });
    }

    const payload: WebhookPayload = await req.json();

    if (!payload.user_id || !payload.title || !payload.message) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
    }

    // Initialize Supabase Client with Service Role to bypass RLS for reading tokens
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the push tokens for the recipient
    const { data: tokens, error } = await supabase
      .from('user_push_tokens')
      .select('push_token')
      .eq('user_id', payload.user_id);

    if (error) {
      throw new Error(`Failed to fetch push tokens: ${error.message}`);
    }

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No push tokens found for user' }), { status: 200 });
    }

    // Format the messages for Expo Push API
    const messages = tokens.map((t) => ({
      to: t.push_token,
      sound: 'default',
      title: payload.title,
      body: payload.message,
      data: {
        notification_id: payload.notification_id,
        link_url: payload.link_url,
        entity_type: payload.entity_type
      },
    }));

    // Send to Expo Push API
    // Expo Push API is free and doesn't require authentication for basic usage
    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const expoResult = await expoResponse.json();

    return new Response(JSON.stringify({ success: true, expoResult }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (err) {
    console.error("Error sending push notification:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
