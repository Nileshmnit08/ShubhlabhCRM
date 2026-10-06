-- NOT EXECUTED
-- REQUIRES HUMAN REVIEW

-- PURPOSE: Fix GoTrue "Database error querying schema" for Buyer accounts
-- This explicitly implements the exact pattern used in Sprint 20 that repaired the working users.
-- GoTrue expects empty strings ('') instead of NULL for these specific token columns.
-- auth.identities (provider_id = UUID) is kept as is because Field Assist working users use the same format.

UPDATE auth.users
SET 
    confirmation_token = COALESCE(confirmation_token, ''),
    recovery_token = COALESCE(recovery_token, ''),
    email_change_token_new = COALESCE(email_change_token_new, ''),
    email_change = COALESCE(email_change, '')
WHERE id IN (
    SELECT id FROM public.app_users WHERE role = 'Buyer'
) AND (
    confirmation_token IS NULL 
    OR recovery_token IS NULL 
    OR email_change_token_new IS NULL 
    OR email_change IS NULL
);
