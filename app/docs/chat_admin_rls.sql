-- =================================================================================
-- STAFF CHAT SCHEMA - ADMIN RLS POLICIES
-- =================================================================================

-- Allow Admins to view all conversations
DROP POLICY IF EXISTS "Admins can view all conversations" ON public.chat_conversations;
CREATE POLICY "Admins can view all conversations" ON public.chat_conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.app_users
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Allow Admins to view all participants
DROP POLICY IF EXISTS "Admins can view all participants" ON public.chat_participants;
CREATE POLICY "Admins can view all participants" ON public.chat_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.app_users
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Allow Admins to view all messages
DROP POLICY IF EXISTS "Admins can view all messages" ON public.chat_messages;
CREATE POLICY "Admins can view all messages" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.app_users
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Allow Admins to insert messages into any conversation
DROP POLICY IF EXISTS "Admins can insert messages to any conversation" ON public.chat_messages;
CREATE POLICY "Admins can insert messages to any conversation" ON public.chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.app_users
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );

-- Allow Admins to update messages (for read_at) in any conversation
DROP POLICY IF EXISTS "Admins can update messages in any conversation" ON public.chat_messages;
CREATE POLICY "Admins can update messages in any conversation" ON public.chat_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.app_users
            WHERE id = auth.uid() AND role = 'Admin'
        )
    );
