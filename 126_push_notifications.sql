-- CRM-PUSH-02: Device Push Tokens and Webhook Trigger Architecture

-- 1. Create table for storing user device push tokens
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
    push_token TEXT NOT NULL,
    device_model TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, push_token)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON public.user_push_tokens(user_id);

-- Enable RLS
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can read, insert, and update their own tokens
CREATE POLICY "Users can manage their own push tokens" 
ON public.user_push_tokens 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 2. Create the Database Webhook (Trigger) to call the Edge Function
-- This requires the pg_net extension to make HTTP calls from Postgres.
CREATE EXTENSION IF NOT EXISTS "pg_net";

CREATE OR REPLACE FUNCTION notify_push_service()
RETURNS TRIGGER AS $$
DECLARE
  v_payload JSON;
BEGIN
  -- We only fire pushes for new notifications
  IF TG_OP = 'INSERT' THEN
    
    v_payload := json_build_object(
      'notification_id', NEW.id,
      'user_id', NEW.user_id,
      'title', NEW.title,
      'message', NEW.message,
      'link_url', NEW.link_url,
      'entity_type', NEW.entity_type
    );

    -- Call the edge function async using pg_net
    -- The endpoint is assumed to be deployed at /functions/v1/push-notifier
    -- NOTE: In a real Supabase production environment, the URL and Anon Key should be configured.
    -- We assume the URL structure here is correct for the default Supabase project setup.
    PERFORM net.http_post(
        url := current_setting('app.settings.supabase_url', true) || '/functions/v1/push-notifier',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key', true)
        ),
        body := v_payload::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on crm_notifications
DROP TRIGGER IF EXISTS trigger_notify_push_service ON public.crm_notifications;
CREATE TRIGGER trigger_notify_push_service
AFTER INSERT ON public.crm_notifications
FOR EACH ROW
EXECUTE FUNCTION notify_push_service();
