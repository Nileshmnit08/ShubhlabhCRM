-- =================================================================================
-- STAFF CHAT SCHEMA - RLS FIX (INFINITE RECURSION RESOLUTION)
-- =================================================================================

-- 1. CLEANUP ALL EXISTING POLICIES TO AVOID "ALREADY EXISTS" ERRORS
DROP POLICY IF EXISTS "Users can view their conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can insert conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.chat_conversations;
DROP POLICY IF EXISTS "Admins can view all conversations" ON public.chat_conversations;

DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can insert participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Admins can view all participants" ON public.chat_participants;

DROP POLICY IF EXISTS "Users can view messages of their conversations" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages to their conversations" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update messages of their conversations (for read_at)" ON public.chat_messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Admins can insert messages to any conversation" ON public.chat_messages;
DROP POLICY IF EXISTS "Admins can update messages in any conversation" ON public.chat_messages;


-- 2. CREATE SECURITY DEFINER FUNCTION TO BREAK RECURSION
-- This function runs as the database owner, bypassing RLS to cleanly fetch
-- the user's authorized conversation IDs without triggering recursive policy loops.
CREATE OR REPLACE FUNCTION public.get_my_conversation_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT conversation_id FROM chat_participants WHERE user_id = auth.uid();
$$;


-- 3. STANDARD USER POLICIES (Using the Security Definer Function)

-- Conversations
CREATE POLICY "Users can view their conversations" ON public.chat_conversations
    FOR SELECT USING ( id IN (SELECT get_my_conversation_ids()) );

CREATE POLICY "Users can insert conversations" ON public.chat_conversations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their conversations" ON public.chat_conversations
    FOR UPDATE USING ( id IN (SELECT get_my_conversation_ids()) );

-- Participants
CREATE POLICY "Users can view participants of their conversations" ON public.chat_participants
    FOR SELECT USING ( conversation_id IN (SELECT get_my_conversation_ids()) );

CREATE POLICY "Users can insert participants" ON public.chat_participants
    FOR INSERT WITH CHECK (true);

-- Messages
CREATE POLICY "Users can view messages of their conversations" ON public.chat_messages
    FOR SELECT USING ( conversation_id IN (SELECT get_my_conversation_ids()) );

CREATE POLICY "Users can insert messages to their conversations" ON public.chat_messages
    FOR INSERT WITH CHECK ( conversation_id IN (SELECT get_my_conversation_ids()) );

CREATE POLICY "Users can update messages of their conversations" ON public.chat_messages
    FOR UPDATE USING ( conversation_id IN (SELECT get_my_conversation_ids()) );


-- 4. ADMIN POLICIES (No Recursion Risk)

-- Helper function for admin check to keep policies clean
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'Admin');
$$;

-- Conversations
CREATE POLICY "Admins can view all conversations" ON public.chat_conversations
    FOR SELECT USING ( is_admin() );

-- Participants
CREATE POLICY "Admins can view all participants" ON public.chat_participants
    FOR SELECT USING ( is_admin() );

-- Messages
CREATE POLICY "Admins can view all messages" ON public.chat_messages
    FOR SELECT USING ( is_admin() );

CREATE POLICY "Admins can insert messages to any conversation" ON public.chat_messages
    FOR INSERT WITH CHECK ( is_admin() );

CREATE POLICY "Admins can update messages in any conversation" ON public.chat_messages
    FOR UPDATE USING ( is_admin() );
