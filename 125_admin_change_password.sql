-- CRM-AUTH-02: Admin Change Team Member Password

CREATE OR REPLACE FUNCTION admin_change_user_password(
    target_user_id UUID,
    new_password TEXT
) RETURNS void AS $$
DECLARE
    v_admin_id UUID;
    v_target_name TEXT;
BEGIN
    -- Verify admin authorization
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can change passwords';
    END IF;
    
    v_admin_id := auth.uid();
    
    -- Verify target user exists in app_users
    SELECT display_name INTO v_target_name FROM public.app_users WHERE id = target_user_id;
    
    IF v_target_name IS NULL THEN
        RAISE EXCEPTION 'Target user not found';
    END IF;
    
    -- Update auth.users encrypted_password using pgcrypto
    UPDATE auth.users 
    SET encrypted_password = crypt(new_password, gen_salt('bf')),
        updated_at = now()
    WHERE id = target_user_id;
    
    -- Insert Security Audit log
    INSERT INTO public.activity_logs (
        actor_id,
        module,
        action_type,
        entity_type,
        entity_id,
        summary
    ) VALUES (
        v_admin_id,
        'Security',
        'SECURITY_EVENT',
        'User',
        target_user_id,
        'Admin changed password for team member ' || v_target_name
    );
    
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
