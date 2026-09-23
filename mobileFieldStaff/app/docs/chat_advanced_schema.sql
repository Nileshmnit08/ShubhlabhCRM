-- =================================================================================
-- STAFF CHAT SCHEMA - ADVANCED FEATURES MIGRATION
-- =================================================================================

-- 1. ADD NEW COLUMNS TO chat_messages
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_forwarded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- 2. CREATE chat_reactions TABLE
CREATE TABLE IF NOT EXISTS public.chat_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(message_id, user_id)
);

-- 3. RLS POLICIES FOR chat_reactions
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reactions in their conversations" ON public.chat_reactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_messages cm
            JOIN public.chat_participants cp ON cp.conversation_id = cm.conversation_id
            WHERE cm.id = public.chat_reactions.message_id
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can add reactions" ON public.chat_reactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_messages cm
            JOIN public.chat_participants cp ON cp.conversation_id = cm.conversation_id
            WHERE cm.id = public.chat_reactions.message_id
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own reactions" ON public.chat_reactions
    FOR DELETE USING (
        user_id = auth.uid()
    );

-- 4. UPDATE REALTIME PUBLICATION
-- If chat_reactions isn't already in the publication, add it so the app can listen for new reactions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'chat_reactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_reactions;
    END IF;
END
$$;
