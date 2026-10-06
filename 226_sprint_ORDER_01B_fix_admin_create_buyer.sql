-- ============================================================
-- MIGRATION: 226_sprint_ORDER_01B_fix_admin_create_buyer.sql
-- Sprint: SL-ORDER-AUTH-LOGIN-ROOT-CAUSE
-- Date: 2026-10-06
--
-- ROOT CAUSE:
-- admin_create_buyer() inserts auth.identities with:
--   provider_id = new_user_id::text   (UUID string)
--
-- Supabase GoTrue v2 requires for email provider:
--   provider_id = email               (the email address)
--
-- When GoTrue attempts to look up the identity on login, it finds
-- a mismatched provider_id and crashes with:
--   "Database error querying schema" (HTTP 500)
--
-- FIX:
-- 1. Fix admin_create_buyer() so future accounts are created correctly.
-- 2. Fix the existing malformed babulal@shubhlabh.com identity row.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- STEP 1: Fix admin_create_buyer() — correct auth.identities insertion
-- Change: provider_id = new_user_id::text  →  provider_id = new_email
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_create_buyer(
    new_email TEXT,
    new_password TEXT,
    new_display_name TEXT,
    new_crm_party_id UUID,
    new_is_active BOOLEAN DEFAULT true
) RETURNS uuid AS $$
DECLARE
    new_user_id uuid;
BEGIN
    -- Only admins can call this
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can create Buyer accounts';
    END IF;

    -- Check for duplicate email
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email) THEN
        RAISE EXCEPTION 'A user with this Login ID already exists: %', new_email;
    END IF;

    -- Check if this customer already has a Buyer account
    IF new_crm_party_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.app_users
        WHERE crm_party_id = new_crm_party_id AND role = 'Buyer'
    ) THEN
        RAISE EXCEPTION 'This customer already has a Buyer account';
    END IF;

    new_user_id := gen_random_uuid();

    -- Insert into auth.users with email_confirmed_at set (bypass email confirmation)
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        new_email,
        crypt(new_password, gen_salt('bf')),
        now(),  -- email pre-confirmed; no email required
        now(),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        false
    );

    -- FIX: provider_id must be the EMAIL address for email provider (not the UUID)
    -- GoTrue v2 uses provider_id to look up identities; using UUID causes 500 on login
    INSERT INTO auth.identities (
        id, user_id,
        provider_id,   -- CORRECT: must be email for email provider
        identity_data,
        provider,
        created_at, updated_at,
        last_sign_in_at
    ) VALUES (
        new_user_id,
        new_user_id,
        new_email,     -- FIXED: was new_user_id::text (UUID) — WRONG
        jsonb_build_object('sub', new_user_id::text, 'email', new_email),
        'email',
        now(),
        now(),
        now()
    );

    -- handle_new_user trigger auto-creates an app_users row on auth.users INSERT.
    -- Update it to set Buyer role and crm_party_id.
    UPDATE public.app_users
    SET
        display_name = new_display_name,
        role         = 'Buyer',
        crm_party_id = new_crm_party_id,
        is_active    = new_is_active
    WHERE id = new_user_id;

    -- If trigger didn't fire (e.g. trigger missing), insert the row directly
    IF NOT FOUND THEN
        INSERT INTO public.app_users (id, email, display_name, role, crm_party_id, is_active)
        VALUES (new_user_id, new_email, new_display_name, 'Buyer', new_crm_party_id, new_is_active)
        ON CONFLICT (id) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            role         = EXCLUDED.role,
            crm_party_id = EXCLUDED.crm_party_id,
            is_active    = EXCLUDED.is_active;
    END IF;

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_create_buyer(TEXT, TEXT, TEXT, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_buyer(TEXT, TEXT, TEXT, UUID, BOOLEAN) TO service_role;


-- ────────────────────────────────────────────────────────────
-- STEP 2: Fix the EXISTING malformed babulal@shubhlabh.com row
--
-- The existing identity row has provider_id = UUID (wrong).
-- Update it to provider_id = email.
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_user_id uuid;
BEGIN
    -- Find the user
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'babulal@shubhlabh.com'
    LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'babulal@shubhlabh.com: auth.users row NOT FOUND — account was never created';
        RETURN;
    END IF;

    RAISE NOTICE 'babulal@shubhlabh.com found: user_id = %', v_user_id;

    -- Check current identities
    IF EXISTS (
        SELECT 1 FROM auth.identities
        WHERE user_id = v_user_id AND provider = 'email'
    ) THEN
        -- Fix the malformed provider_id (update UUID → email)
        UPDATE auth.identities
        SET
            provider_id    = 'babulal@shubhlabh.com',
            identity_data  = jsonb_build_object('sub', v_user_id::text, 'email', 'babulal@shubhlabh.com'),
            updated_at     = now()
        WHERE user_id = v_user_id AND provider = 'email';

        RAISE NOTICE 'Fixed: auth.identities.provider_id updated to email for babulal';
    ELSE
        -- Identity row missing entirely — insert it
        INSERT INTO auth.identities (
            id, user_id, provider_id, identity_data, provider,
            created_at, updated_at, last_sign_in_at
        ) VALUES (
            v_user_id,
            v_user_id,
            'babulal@shubhlabh.com',
            jsonb_build_object('sub', v_user_id::text, 'email', 'babulal@shubhlabh.com'),
            'email',
            now(), now(), now()
        );
        RAISE NOTICE 'Fixed: auth.identities row created for babulal';
    END IF;

    -- Ensure email is confirmed (admin_create_buyer should have set this, but verify)
    UPDATE auth.users
    SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at = now()
    WHERE id = v_user_id;

    RAISE NOTICE 'babulal@shubhlabh.com remediation complete.';
END $$;


-- ────────────────────────────────────────────────────────────
-- STEP 3: Verify app_users mapping for babulal
-- Reports the current state without changing valid data
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_user_id uuid;
    v_role TEXT;
    v_crm_party_id uuid;
    v_is_active boolean;
    v_display_name text;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'babulal@shubhlabh.com' LIMIT 1;
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'VERIFY: babulal auth.users not found';
        RETURN;
    END IF;

    SELECT role, crm_party_id, is_active, display_name
    INTO v_role, v_crm_party_id, v_is_active, v_display_name
    FROM public.app_users WHERE id = v_user_id;

    IF NOT FOUND THEN
        RAISE NOTICE 'VERIFY: app_users row MISSING for babulal (user_id: %)', v_user_id;
        -- Auto-insert with Buyer role; crm_party_id must be set separately via CRM
        INSERT INTO public.app_users (id, email, display_name, role, is_active)
        VALUES (v_user_id, 'babulal@shubhlabh.com', 'Babulal', 'Buyer', true)
        ON CONFLICT (id) DO NOTHING;
        RAISE NOTICE 'VERIFY: app_users row created with Buyer role. Set crm_party_id via CRM App Access tab.';
    ELSE
        RAISE NOTICE 'VERIFY: app_users OK — role=%, crm_party_id=%, is_active=%, display_name=%',
            v_role, v_crm_party_id, v_is_active, v_display_name;
    END IF;
END $$;


-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
