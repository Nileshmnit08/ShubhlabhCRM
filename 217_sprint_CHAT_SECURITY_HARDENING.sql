-- =================================================================================
-- MIGRATION: 217_sprint_CHAT_SECURITY_HARDENING.sql
-- Description: Enforces sender_id = auth.uid() on chat_messages INSERT via trigger.
--              Prevents any client from inserting messages on behalf of another user.
-- Safe: Does NOT drop tables, disable RLS, or alter existing data.
-- Reversible: DROP TRIGGER + DROP FUNCTION to revert.
-- =================================================================================

-- 1. Function: force sender_id = auth.uid() on INSERT
--    Runs BEFORE INSERT so the value is corrected before the row is stored.
CREATE OR REPLACE FUNCTION public.enforce_chat_sender_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Override whatever sender_id the client passed with the actual authenticated user
  NEW.sender_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Apply trigger to chat_messages
DROP TRIGGER IF EXISTS enforce_sender_identity ON public.chat_messages;
CREATE TRIGGER enforce_sender_identity
BEFORE INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_chat_sender_id();

-- =================================================================================
-- VERIFICATION:
-- After applying, test by inserting a message with a fake sender_id:
--   INSERT INTO chat_messages (conversation_id, sender_id, message_text)
--   VALUES ('<valid_conv_id>', '<other_user_uuid>', 'Test');
-- The stored row should have sender_id = auth.uid(), NOT the passed UUID.
-- =================================================================================

-- 3. (Optional) Existing RLS review note:
-- The existing policies from fix_chat_rls.sql and 213_sprint_fix_chat_rls.sql
-- are preserved and working correctly. The trigger adds a defense-in-depth layer
-- that makes the sender_id enforcement happen at the database level regardless
-- of what the client sends. No existing policies are changed.
