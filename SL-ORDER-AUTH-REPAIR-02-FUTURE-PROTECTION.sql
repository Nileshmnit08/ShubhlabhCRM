-- NOT EXECUTED
-- REQUIRES HUMAN REVIEW

-- PURPOSE: Protect future Buyer accounts from GoTrue crashes by inserting required empty strings.

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
    -- Check if admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can create Buyer accounts';
    END IF;

    new_user_id := gen_random_uuid();

    -- Include empty strings for token columns to prevent GoTrue HTTP 500 error
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        recovery_token, confirmation_token, email_change_token_new, email_change,
        created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated',
        new_email, crypt(new_password, gen_salt('bf')), now(),
        '', '', '', '', -- Fix applied here
        now(), now(), '{"provider":"email","providers":["email"]}', '{}', false
    );

    INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, created_at, updated_at
    ) VALUES (
        new_user_id, new_user_id, new_user_id::text,
        jsonb_build_object('sub', new_user_id, 'email', new_email),
        'email', now(), now()
    );

    -- The handle_new_user trigger creates the app_users row.
    -- Update it to Buyer role and set crm_party_id.
    UPDATE public.app_users
    SET
        display_name   = new_display_name,
        role           = 'Buyer',
        crm_party_id   = new_crm_party_id,
        is_active      = new_is_active
    WHERE id = new_user_id;

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
