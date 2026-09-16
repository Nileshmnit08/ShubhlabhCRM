-- MICRO-SPRINT CRM-NOTIFY-03
-- Enable Supabase Realtime for crm_notifications

-- This allows Field Assistant mobile apps to instantly receive inserted notifications.
BEGIN;

-- Add the table to the publication used by Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_notifications;

COMMIT;
