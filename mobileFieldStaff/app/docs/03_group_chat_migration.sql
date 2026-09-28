-- =================================================================================
-- GROUP CHAT MIGRATION & RLS HARDENING (SPRINT 18)
-- =================================================================================

-- 1. Extend chat_conversations
ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'TEAM_GROUP',
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Note: existing 1-to-1 conversations technically need their 'type' backfilled to 'TEAM' or 'ADMIN_STAFF' 
-- based on their participants if strictly required, but the mobile app already handles type inference at runtime.
-- For safety, we can leave the default as 'TEAM_GROUP' for new manual inserts if not specified, 
-- or we can remove the default later.

-- 2. Harden chat_participants RLS
-- Drop the overly permissive insert policy
DROP POLICY IF EXISTS "Users can insert participants" ON public.chat_participants;

-- Create secure insert policy
-- A user can add a participant IF:
-- 1. They are the creator of the conversation (created_by) OR
-- 2. They are already a participant of that conversation
CREATE POLICY "Users can insert participants securely" ON public.chat_participants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_conversations c
            WHERE c.id = public.chat_participants.conversation_id
            AND c.created_by = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.chat_participants cp
            WHERE cp.conversation_id = public.chat_participants.conversation_id
            AND cp.user_id = auth.uid()
        )
    );
