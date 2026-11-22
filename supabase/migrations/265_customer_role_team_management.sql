-- MIGRATION: 265_customer_role_team_management.sql
-- Sprint: CRM-CUSTOMER-ROLE-ORDER-LOGIN-01
-- Objective: Support 'Customer' role alongside 'Buyer' across authentication & RLS security functions.
-- Allows customer accounts provisioned from CRM Team Management to authenticate in Shubh Labh Order App.

-- ============================================================================
-- 1. Redefine is_buyer() to support both 'Buyer' and 'Customer'
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_buyer()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE id = auth.uid()
      AND role IN ('Buyer', 'Customer')
      AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.is_buyer() IS 'Returns TRUE if the authenticated user is an active Buyer or Customer (Order App user).';

-- ============================================================================
-- 2. Redefine is_active_user() to exclude both 'Buyer' and 'Customer' from staff RLS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE id = auth.uid()
      AND role NOT IN ('Buyer', 'Customer')
      AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.is_active_user() IS 'Returns TRUE for active internal CRM staff (excludes Order App Buyer/Customer accounts).';

-- ============================================================================
-- 3. Redefine get_auth_crm_party_id() to support both 'Buyer' and 'Customer'
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_auth_crm_party_id()
RETURNS uuid AS $$
  SELECT crm_party_id FROM public.app_users
  WHERE id = auth.uid()
    AND role IN ('Buyer', 'Customer')
    AND is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION public.get_auth_crm_party_id() IS 'Returns linked crm_party_id for authenticated Buyer or Customer.';

-- ============================================================================
-- 4. Overload admin_create_user() to support optional crm_party_id & GoTrue v2
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_create_user(
    new_email TEXT,
    new_password TEXT,
    new_display_name TEXT,
    new_role TEXT,
    new_whatsapp TEXT,
    new_contact_details TEXT,
    new_is_active BOOLEAN,
    new_crm_party_id UUID DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
    new_user_id uuid;
    assigned_role TEXT;
BEGIN
    -- Check if admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can create users';
    END IF;

    -- Normalize role
    IF new_role = 'Customer' THEN
        assigned_role := 'Buyer';
        IF new_crm_party_id IS NULL THEN
            RAISE EXCEPTION 'Customer accounts must be linked to a customer party (new_crm_party_id is required)';
        END IF;
    ELSE
        assigned_role := new_role;
    END IF;

    -- Check if email exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = new_email) THEN
        RAISE EXCEPTION 'A user with this email/login ID already exists: %', new_email;
    END IF;

    -- Check if customer party already has an order account
    IF new_crm_party_id IS NOT NULL AND assigned_role = 'Buyer' AND EXISTS (
        SELECT 1 FROM public.app_users WHERE crm_party_id = new_crm_party_id AND role IN ('Buyer', 'Customer')
    ) THEN
        RAISE EXCEPTION 'This customer already has an active order account';
    END IF;

    new_user_id := gen_random_uuid();

    -- Insert into auth.users (email pre-confirmed)
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
        now(),
        now(),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        false
    );

    -- Insert into auth.identities with provider_id = new_email (GoTrue v2 compliant)
    INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at
    ) VALUES (
        new_user_id,
        new_user_id,
        new_email,
        jsonb_build_object('sub', new_user_id::text, 'email', new_email),
        'email',
        now(),
        now(),
        now()
    );

    -- Update app_users row created by handle_new_user trigger
    UPDATE public.app_users
    SET
        display_name    = new_display_name,
        role            = assigned_role,
        whatsapp        = new_whatsapp,
        contact_details = new_contact_details,
        crm_party_id    = new_crm_party_id,
        is_active       = new_is_active
    WHERE id = new_user_id;

    -- If trigger was bypassed or didn't fire, insert directly
    IF NOT FOUND THEN
        INSERT INTO public.app_users (id, email, display_name, role, whatsapp, contact_details, crm_party_id, is_active)
        VALUES (new_user_id, new_email, new_display_name, assigned_role, new_whatsapp, new_contact_details, new_crm_party_id, new_is_active)
        ON CONFLICT (id) DO UPDATE SET
            display_name    = EXCLUDED.display_name,
            role            = EXCLUDED.role,
            whatsapp        = EXCLUDED.whatsapp,
            contact_details = EXCLUDED.contact_details,
            crm_party_id    = EXCLUDED.crm_party_id,
            is_active       = EXCLUDED.is_active;
    END IF;

    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Forwarding overload for legacy 7-parameter calls
CREATE OR REPLACE FUNCTION public.admin_create_user(
    new_email TEXT,
    new_password TEXT,
    new_display_name TEXT,
    new_role TEXT,
    new_whatsapp TEXT,
    new_contact_details TEXT,
    new_is_active BOOLEAN
) RETURNS uuid AS $$
BEGIN
    RETURN public.admin_create_user(
        new_email,
        new_password,
        new_display_name,
        new_role,
        new_whatsapp,
        new_contact_details,
        new_is_active,
        NULL::UUID
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissions
GRANT EXECUTE ON FUNCTION public.is_buyer() TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_crm_party_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated, service_role;
