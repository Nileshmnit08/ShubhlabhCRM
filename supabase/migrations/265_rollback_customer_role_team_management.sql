-- ROLLBACK: 265_rollback_customer_role_team_management.sql
-- Sprint: CRM-CUSTOMER-ROLE-ORDER-LOGIN-01
-- Reverts is_buyer, is_active_user, get_auth_crm_party_id, and admin_create_user to original 224/15 definitions.

-- 1. Revert is_buyer()
CREATE OR REPLACE FUNCTION public.is_buyer()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE id = auth.uid()
      AND role = 'Buyer'
      AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Revert is_active_user()
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE id = auth.uid()
      AND role != 'Buyer'
      AND is_active = true
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 3. Revert get_auth_crm_party_id()
CREATE OR REPLACE FUNCTION public.get_auth_crm_party_id()
RETURNS uuid AS $$
  SELECT crm_party_id FROM public.app_users
  WHERE id = auth.uid()
    AND role = 'Buyer'
    AND is_active = true;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Drop 8-parameter admin_create_user
DROP FUNCTION IF EXISTS public.admin_create_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, UUID);

-- 5. Revert 7-parameter admin_create_user
CREATE OR REPLACE FUNCTION public.admin_create_user(
    new_email TEXT,
    new_password TEXT,
    new_display_name TEXT,
    new_role TEXT,
    new_whatsapp TEXT,
    new_contact_details TEXT,
    new_is_active BOOLEAN
) RETURNS uuid AS $$
DECLARE
    new_user_id uuid;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can create users';
    END IF;
    
    new_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', new_email, crypt(new_password, gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false
    );
    
    INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, created_at, updated_at
    ) VALUES (
        new_user_id, new_user_id, new_user_id::text, jsonb_build_object('sub', new_user_id, 'email', new_email), 'email', now(), now()
    );
    
    UPDATE public.app_users 
    SET 
        display_name = new_display_name,
        role = new_role,
        whatsapp = new_whatsapp,
        contact_details = new_contact_details,
        is_active = new_is_active
    WHERE id = new_user_id;
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
