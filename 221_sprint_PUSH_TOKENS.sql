-- MICRO-SPRINT: SL-CALL-MOBILE-01
-- Push token table for FCM-based background call notifications

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT DEFAULT 'android', -- 'android' | 'ios'
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own token
CREATE POLICY "push_tokens_own_access"
ON public.push_tokens
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Service role can read all tokens (for Edge Function)
-- The Edge Function uses service role key, so no additional policy needed.

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
