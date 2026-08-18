-- SPRINT 15: Team Management and Customer Assignment

-- 1. Add fields to app_users
ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50),
ADD COLUMN IF NOT EXISTS contact_details TEXT;

-- 2. RPC to create users safely bypassing Supabase Auth limits from client side
-- Note: In production, you would use a secure Edge Function or the Service Role key.
CREATE OR REPLACE FUNCTION admin_create_user(
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
    -- Check if admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can create users';
    END IF;
    
    new_user_id := gen_random_uuid();
    
    -- Insert into auth.users (requires superuser or bypass RLS, but RPC is SECURITY DEFINER)
    INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', new_email, crypt(new_password, gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false
    );
    
    -- Insert into auth.identities
    INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, created_at, updated_at
    ) VALUES (
        new_user_id, new_user_id, new_user_id::text, jsonb_build_object('sub', new_user_id, 'email', new_email), 'email', now(), now()
    );
    
    -- Wait for the trigger handle_new_user to create the app_users row, then update it.
    -- The trigger runs AFTER INSERT on auth.users, so it should exist now.
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

-- 3. RPC to update users
CREATE OR REPLACE FUNCTION admin_update_user(
    u_id UUID,
    u_display_name TEXT,
    u_role TEXT,
    u_whatsapp TEXT,
    u_contact_details TEXT,
    u_is_active BOOLEAN
) RETURNS void AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can update users';
    END IF;
    
    UPDATE public.app_users 
    SET 
        display_name = u_display_name,
        role = u_role,
        whatsapp = u_whatsapp,
        contact_details = u_contact_details,
        is_active = u_is_active
    WHERE id = u_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
