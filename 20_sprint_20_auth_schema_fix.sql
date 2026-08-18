-- SPRINT 20: Fix GoTrue "Database error querying schema"
-- This error occurs when manually inserted auth.users rows have NULL tokens.
-- Supabase Auth (GoTrue) expects empty strings ('') instead of NULL for these specific columns.

UPDATE auth.users
SET 
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change = COALESCE(email_change, '')
WHERE 
    confirmation_token IS NULL 
    OR recovery_token IS NULL 
    OR email_change_token_new IS NULL 
    OR email_change IS NULL;
