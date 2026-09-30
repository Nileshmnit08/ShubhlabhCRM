-- =================================================================================
-- SPRINT 213: FIX CHAT RLS RECURSION AND CONVERSATION INSERT
-- =================================================================================

-- 1. Redefine get_my_conversation_ids securely (just in case it was missing or altered)
CREATE OR REPLACE FUNCTION public.get_my_conversation_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT conversation_id FROM public.chat_participants WHERE user_id = auth.uid();
$$;

-- 2. Drop existing problematic policies
DROP POLICY IF EXISTS "Users can insert conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can insert conversations securely" ON public.chat_conversations;

DROP POLICY IF EXISTS "Users can insert participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can insert participants securely" ON public.chat_participants;

-- 3. Create secure non-recursive INSERT policy for chat_conversations
-- Permits any authenticated user to create a conversation header they own.
CREATE POLICY "Users can insert conversations securely" ON public.chat_conversations
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        -- If created_by is provided, it must match the current user
        AND (created_by IS NULL OR created_by = auth.uid())
    );

-- 4. Create secure non-recursive INSERT policy for chat_participants
-- Uses the SECURITY DEFINER function to prevent 42P17 infinite recursion.
CREATE POLICY "Users can insert participants securely" ON public.chat_participants
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            -- Condition 1: The user is adding themselves (fallback for legacy sync)
            user_id = auth.uid()
            OR
            -- Condition 2: The user is the creator of the conversation
            EXISTS (
                SELECT 1 FROM public.chat_conversations c
                WHERE c.id = public.chat_participants.conversation_id
                AND (c.created_by = auth.uid() OR c.created_by IS NULL)
            )
            OR
            -- Condition 3: The user is already an established participant.
            -- This explicitly calls the SECURITY DEFINER helper to prevent infinite recursion
            -- instead of doing a direct recursive SELECT on chat_participants.
            public.chat_participants.conversation_id IN (SELECT public.get_my_conversation_ids())
        )
    );
