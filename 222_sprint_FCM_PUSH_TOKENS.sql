-- MICRO-SPRINT: SL-CALL-PUSH-INFRA-01
-- Multi-device FCM push token architecture

CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  device_id TEXT,
  fcm_token TEXT NOT NULL,
  platform TEXT DEFAULT 'android',
  app_version TEXT,
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fcm_token)
);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own tokens
CREATE POLICY "user_push_tokens_own_access"
ON public.user_push_tokens
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Index for fast lookup when sending push notifications
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON public.user_push_tokens(user_id);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
