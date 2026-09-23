-- 148_sprint_FA_CHAT_READ_RECEIPTS_schema.sql
-- Description: Adds watermark timestamps to chat_participants to track message delivery and read receipts safely.

-- 1. Add Columns
ALTER TABLE public.chat_participants
ADD COLUMN IF NOT EXISTS last_delivered_at timestamptz NULL,
ADD COLUMN IF NOT EXISTS last_read_at timestamptz NULL;

-- 2. Add RLS Policy for Update
-- Only allow the authenticated user to update their OWN participant row
DROP POLICY IF EXISTS "Users can update their own receipt watermarks" ON public.chat_participants;
CREATE POLICY "Users can update their own receipt watermarks" 
ON public.chat_participants
FOR UPDATE USING (
    user_id = auth.uid()
);

-- 3. Protect Identity Columns
-- Ensures that an UPDATE cannot alter the participant's core identity or conversation binding.
CREATE OR REPLACE FUNCTION public.protect_chat_participant_identity()
RETURNS TRIGGER AS $$
BEGIN
    -- Force protected columns to retain their original values
    NEW.id = OLD.id;
    NEW.conversation_id = OLD.conversation_id;
    NEW.user_id = OLD.user_id;
    NEW.joined_at = OLD.joined_at;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_participant_identity ON public.chat_participants;
CREATE TRIGGER enforce_participant_identity
BEFORE UPDATE ON public.chat_participants
FOR EACH ROW
EXECUTE FUNCTION public.protect_chat_participant_identity();
