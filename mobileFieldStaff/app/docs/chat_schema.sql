-- =================================================================================
-- STAFF CHAT SCHEMA
-- =================================================================================

-- 1. chat_conversations
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. chat_participants
CREATE TABLE IF NOT EXISTS public.chat_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(conversation_id, user_id)
);

-- 3. chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE
);

-- RLS Policies
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- chat_conversations policies
CREATE POLICY "Users can view their conversations" ON public.chat_conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants
            WHERE conversation_id = public.chat_conversations.id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert conversations" ON public.chat_conversations
    FOR INSERT WITH CHECK (true);
    
CREATE POLICY "Users can update their conversations" ON public.chat_conversations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants
            WHERE conversation_id = public.chat_conversations.id
            AND user_id = auth.uid()
        )
    );

-- chat_participants policies
CREATE POLICY "Users can view participants of their conversations" ON public.chat_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants AS cp
            WHERE cp.conversation_id = public.chat_participants.conversation_id
            AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert participants" ON public.chat_participants
    FOR INSERT WITH CHECK (true);

-- chat_messages policies
CREATE POLICY "Users can view messages of their conversations" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants
            WHERE conversation_id = public.chat_messages.conversation_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages to their conversations" ON public.chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_participants
            WHERE conversation_id = public.chat_messages.conversation_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update messages of their conversations (for read_at)" ON public.chat_messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.chat_participants
            WHERE conversation_id = public.chat_messages.conversation_id
            AND user_id = auth.uid()
        )
    );

-- Trigger to update updated_at on conversation
CREATE OR REPLACE FUNCTION update_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.chat_conversations
    SET updated_at = timezone('utc'::text, now())
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_inserted
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_updated_at();

-- Set up Realtime replication
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
