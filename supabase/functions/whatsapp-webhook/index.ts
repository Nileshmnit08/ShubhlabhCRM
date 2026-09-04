import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const META_VERIFY_TOKEN = Deno.env.get('META_VERIFY_TOKEN') || 'shubhlabh_webhook_secret';

// Initialize Supabase client with Service Role to bypass RLS for incoming webhooks
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length > 10 && cleaned.startsWith('91')) {
    cleaned = cleaned.substring(2);
  }
  return cleaned;
}

serve(async (req: Request) => {
  const url = new URL(req.url);

  // 1. Meta Webhook Verification (GET request)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === META_VERIFY_TOKEN) {
      console.log('Webhook verified successfully.');
      return new Response(challenge, { status: 200 });
    } else {
      return new Response('Forbidden', { status: 403 });
    }
  }

  // 2. Process Incoming Message (POST request)
  if (req.method === 'POST') {
    try {
      const payload = await req.json();

      // Ensure this is a message event from WhatsApp Business API
      if (payload.object === 'whatsapp_business_account') {
        const entries = payload.entry || [];
        
        for (const entry of entries) {
          const changes = entry.changes || [];
          for (const change of changes) {
            const value = change.value;
            if (value && value.messages && value.messages.length > 0) {
              const message = value.messages[0];
              const contact = value.contacts && value.contacts.length > 0 ? value.contacts[0] : null;
              
              const messageId = message.id;
              const senderPhone = contact?.wa_id || message.from;
              const rawMessage = message.text?.body || '';
              const receivedAt = new Date(parseInt(message.timestamp) * 1000).toISOString();
              
              let mediaType = message.type;
              let mediaUrl = null;
              
              // Handle Media if present (Image, Document, Audio)
              if (['image', 'document', 'audio'].includes(mediaType)) {
                mediaUrl = message[mediaType]?.id; // Storing the media ID as reference for now
              }

              // Capture conversation context if this is a reply
              const context = message.context;
              const conversationId = context?.id || null;

              // Normalizing sender phone to 10 digits for matching
              const normalizedPhone = normalizePhone(senderPhone);

              // Match broker
              const { data: brokerMatch } = await supabase
                .from('brokers')
                .select('id')
                .or(`mobile.eq.${normalizedPhone},whatsapp_number.eq.${normalizedPhone}`)
                .eq('active', true)
                .single();

              let brokerId = null;
              let relatedMaterialId = null;
              let processingStatus = 'Pending';

              if (brokerMatch) {
                brokerId = brokerMatch.id;

                // Try to deduce related_material_id if the broker only handles exactly ONE material
                const { data: brokerMaterials } = await supabase
                  .from('broker_materials')
                  .select('raw_material_id')
                  .eq('broker_id', brokerId);

                if (brokerMaterials && brokerMaterials.length === 1) {
                  relatedMaterialId = brokerMaterials[0].raw_material_id;
                } else if (brokerMaterials && brokerMaterials.length > 1) {
                  // Broker handles multiple materials, cannot deterministically know without NLP parsing
                  processingStatus = 'Needs Review';
                }
              } else {
                processingStatus = 'Needs Review'; // Unknown sender
              }

              if (mediaType !== 'text') {
                processingStatus = 'Needs Review'; // Audio/Image requires human eye
              }

              // Insert raw message
              const { error: insertError } = await supabase
                .from('whatsapp_incoming_messages')
                .insert({
                  provider: 'meta',
                  message_id: messageId,
                  sender_phone: senderPhone,
                  broker_id: brokerId,
                  raw_message: rawMessage,
                  media_url: mediaUrl,
                  media_type: mediaType,
                  conversation_id: conversationId,
                  received_at: receivedAt,
                  processing_status: processingStatus,
                  related_material_id: relatedMaterialId
                });

              // Postgres UNIQUE constraint on message_id will automatically throw an error if it's a duplicate retry from Meta
              if (insertError && !insertError.message.includes('duplicate key value')) {
                console.error('Error inserting webhook data:', insertError);
              }
            }
          }
        }
      }

      return new Response('EVENT_RECEIVED', { status: 200 });
    } catch (error) {
      console.error('Error parsing webhook payload:', error);
      // Return 200 even on error to prevent Meta from indefinitely retrying a malformed payload
      return new Response('EVENT_RECEIVED', { status: 200 });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
});
