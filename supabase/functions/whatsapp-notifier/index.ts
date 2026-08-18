import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

// Initialize Supabase Client with service role to update the notification table safely
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    // Read the Webhook Payload
    const payload = await req.json();
    console.log("Received Webhook Payload:", payload);

    // Filter for INSERT operations on the owner_whatsapp_notifications table
    if (payload.type !== 'INSERT' || payload.table !== 'owner_whatsapp_notifications') {
      return new Response(JSON.stringify({ message: "Ignored: not an insert on owner_whatsapp_notifications" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    const notificationRecord = payload.record;

    // We only process PENDING notifications
    if (notificationRecord.delivery_status !== 'PENDING') {
      return new Response(JSON.stringify({ message: "Ignored: delivery_status is not PENDING" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 1. Fetch the owner's WhatsApp number (it is not in the notification record, it's in app_users)
    const { data: owner, error: ownerErr } = await supabase
      .from('app_users')
      .select('whatsapp')
      .eq('id', notificationRecord.owner_id)
      .single();

    if (ownerErr || !owner?.whatsapp) {
      // Mark as skipped if no number found
      await supabase
        .from('owner_whatsapp_notifications')
        .update({ delivery_status: 'SKIPPED', failure_reason: 'Owner WhatsApp missing at execution time' })
        .eq('id', notificationRecord.id);
      
      return new Response(JSON.stringify({ message: "Skipped: Missing WhatsApp Number" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    const whatsappNumber = owner.whatsapp.replace(/\D/g, ''); // strip non-numeric
    const messageBody = notificationRecord.message_body;

    // 2. Call the WhatsApp Provider API
    // WARNING: Replace this URL and Auth Headers with your actual WhatsApp Provider (e.g. Meta, Twilio, WATI)
    const WHATSAPP_API_URL = Deno.env.get('WHATSAPP_API_URL') || 'https://api.mock-provider.com/v1/messages';
    const WHATSAPP_API_TOKEN = Deno.env.get('WHATSAPP_API_TOKEN') || 'mock-token';

    console.log(`Sending WhatsApp message to ${whatsappNumber}...`);

    const apiResponse = await fetch(WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`
      },
      body: JSON.stringify({
        to: whatsappNumber,
        text: messageBody
        // Depending on your provider, you may need a template_name and template_params instead of free text.
      })
    });

    const providerResponseJson = await apiResponse.json().catch(() => ({}));

    // 3. Update the tracking table based on provider response
    if (apiResponse.ok) {
      await supabase
        .from('owner_whatsapp_notifications')
        .update({
          delivery_status: 'SENT',
          sent_at: new Date().toISOString(),
          provider_message_id: providerResponseJson.message_id || 'mock_message_id',
          provider_response_json: providerResponseJson
        })
        .eq('id', notificationRecord.id);
      
      return new Response(JSON.stringify({ success: true, message: "WhatsApp message dispatched." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      await supabase
        .from('owner_whatsapp_notifications')
        .update({
          delivery_status: 'FAILED',
          failure_reason: `API returned ${apiResponse.status}: ${apiResponse.statusText}`,
          provider_response_json: providerResponseJson
        })
        .eq('id', notificationRecord.id);
      
      return new Response(JSON.stringify({ error: "Failed to dispatch WhatsApp message." }), {
        headers: { "Content-Type": "application/json" },
        status: 502,
      });
    }

  } catch (err) {
    console.error("Function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
