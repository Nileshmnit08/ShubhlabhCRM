-- Migration: 117_whatsapp_incoming_schema.sql
-- Description: Creates the secure raw-message layer for capturing incoming WhatsApp broker responses.

CREATE TABLE IF NOT EXISTS public.whatsapp_incoming_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) DEFAULT 'meta',
    message_id VARCHAR(255) UNIQUE NOT NULL,
    sender_phone VARCHAR(50) NOT NULL,
    broker_id UUID REFERENCES public.brokers(id),
    raw_message TEXT,
    media_url TEXT,
    media_type VARCHAR(100),
    conversation_id VARCHAR(255),
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    processing_status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Manual Review', 'Processed', 'Ignored'
    related_material_id UUID REFERENCES public.raw_materials(id),
    error_log TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_whatsapp_incoming_messages_modtime 
BEFORE UPDATE ON public.whatsapp_incoming_messages 
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable RLS
ALTER TABLE public.whatsapp_incoming_messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view and update processing status
CREATE POLICY "Auth users can view incoming messages" 
ON public.whatsapp_incoming_messages FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Auth users can update incoming messages" 
ON public.whatsapp_incoming_messages FOR UPDATE 
USING (auth.role() = 'authenticated') 
WITH CHECK (auth.role() = 'authenticated');

-- Service role keys bypass RLS automatically for inserts from the Edge Function
