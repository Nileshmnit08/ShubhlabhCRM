-- ============================================================
-- MIGRATION: 227_sprint_ORDER_01B_fix_test_user.sql
-- Sprint: SL-ORDER-AUTH-LOGIN-ROOT-CAUSE
-- Date: 2026-10-06
--
-- ROOT CAUSE:
-- test@shubhlabh.com was created with the old broken admin_create_buyer()
-- and has a malformed auth.identities row (provider_id = UUID instead of email).
-- This causes a 500 Database error querying schema upon login.
--
-- FIX:
-- Update the existing malformed test@shubhlabh.com row to use the correct email format.
-- ============================================================

DO $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Find the user
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'test@shubhlabh.com'
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'test@shubhlabh.com: auth.users row NOT FOUND — account was never created';
        RETURN;
    END IF;

    RAISE NOTICE 'test@shubhlabh.com found: user_id = %', v_user_id;

    -- Check current identities
    IF EXISTS (
        SELECT 1 FROM auth.identities
        WHERE user_id = v_user_id AND provider = 'email'
    ) THEN
        -- Fix the malformed provider_id (update UUID → email)
        UPDATE auth.identities
        SET
            provider_id    = 'test@shubhlabh.com',
            identity_data  = jsonb_build_object('sub', v_user_id::text, 'email', 'test@shubhlabh.com'),
            updated_at     = now()
        WHERE user_id = v_user_id AND provider = 'email';

        RAISE NOTICE 'Fixed: auth.identities.provider_id updated to email for test user';
    ELSE
        -- Identity row missing entirely — insert it
        INSERT INTO auth.identities (
            id, user_id, provider_id, identity_data, provider,
            created_at, updated_at, last_sign_in_at
        ) VALUES (
            v_user_id,
            v_user_id,
            'test@shubhlabh.com',
            jsonb_build_object('sub', v_user_id::text, 'email', 'test@shubhlabh.com'),
            'email',
            now(), now(), now()
        );
        RAISE NOTICE 'Fixed: auth.identities row created for test user';
    END IF;

    -- Ensure email is confirmed
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = v_user_id;

    RAISE NOTICE 'test@shubhlabh.com remediation complete.';
END $$;
