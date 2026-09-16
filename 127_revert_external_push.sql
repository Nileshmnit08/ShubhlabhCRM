-- MICRO-SPRINT CRM-NOTIFY-01
-- Revert the external Push Notification architecture introduced in CRM-PUSH-02

DROP TRIGGER IF EXISTS trigger_notify_push_service ON public.crm_notifications;
DROP FUNCTION IF EXISTS notify_push_service();

DROP TABLE IF EXISTS public.user_push_tokens CASCADE;
