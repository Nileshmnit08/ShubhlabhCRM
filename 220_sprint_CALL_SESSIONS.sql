-- MICRO-SPRINT: SL-CALL-01
-- Create call_sessions table and RLS policies

CREATE TABLE IF NOT EXISTS public.call_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caller_id UUID REFERENCES public.app_users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.app_users(id) ON DELETE CASCADE NOT NULL,
    call_type TEXT NOT NULL CHECK (call_type IN ('AUDIO', 'VIDEO')),
    status TEXT NOT NULL DEFAULT 'INITIATING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ringing_at TIMESTAMPTZ,
    answered_at TIMESTAMPTZ,
    connected_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INT,
    end_reason TEXT
);

-- Enable RLS
ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view calls where they are the caller or receiver
CREATE POLICY "Users can view their own calls" 
ON public.call_sessions 
FOR SELECT 
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Policy: Users can insert calls where they are the caller
CREATE POLICY "Users can create calls" 
ON public.call_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = caller_id);

-- Policy: Users can update calls they are involved in
CREATE POLICY "Users can update their calls" 
ON public.call_sessions 
FOR UPDATE 
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_call_sessions_caller ON public.call_sessions(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_receiver ON public.call_sessions(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON public.call_sessions(status);

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
