-- =================================================================================
-- MIGRATION: 218_sprint_CHAT_GET_OR_CREATE.sql
-- Description: Race-safe RPC to get or create a 1:1 direct conversation.
-- =================================================================================

-- Drop the function first to allow changing the return type from UUID to JSONB
DROP FUNCTION IF EXISTS public.get_or_create_direct_chat(UUID);

CREATE OR REPLACE FUNCTION public.get_or_create_direct_chat(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER 
-- Prevent search_path shadowing attacks by prioritizing pg_catalog
SET search_path = pg_catalog, public
AS $$
DECLARE
    current_user_id UUID;
    lock_key INT;
    existing_conv_id UUID;
    new_conv_id UUID;
    target_exists BOOLEAN;
BEGIN
    -- 1. AUTHENTICATED USER ID (Never trust the client)
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthenticated request';
    END IF;

    -- 2. SELF-CHAT VALIDATION
    IF current_user_id = target_user_id THEN
        RAISE EXCEPTION 'Self-chat is not supported';
    END IF;

    -- 3. TARGET USER AUTHORIZATION
    -- Verify the target user exists AND is active in our app_users table.
    SELECT EXISTS (
        SELECT 1 FROM public.app_users WHERE id = target_user_id AND is_active = true
    ) INTO target_exists;

    IF NOT target_exists THEN
        RAISE EXCEPTION 'Target user is unauthorized or inactive';
    END IF;

    -- 4. ADVISORY LOCK
    lock_key := hashtext(
        least(current_user_id::text, target_user_id::text) || '_' ||
        greatest(current_user_id::text, target_user_id::text)
    );
    PERFORM pg_advisory_xact_lock(lock_key);

    -- 5 & 6. FIND EXISTING 1:1 CONVERSATION (EXACTLY 2 PARTICIPANTS)
    SELECT c.id INTO existing_conv_id
    FROM public.chat_conversations c
    JOIN public.chat_participants p1 ON c.id = p1.conversation_id AND p1.user_id = current_user_id
    JOIN public.chat_participants p2 ON c.id = p2.conversation_id AND p2.user_id = target_user_id
    WHERE (
        SELECT COUNT(*) 
        FROM public.chat_participants cp 
        WHERE cp.conversation_id = c.id
    ) = 2
    ORDER BY c.updated_at DESC
    LIMIT 1;

    IF existing_conv_id IS NOT NULL THEN
        RETURN jsonb_build_object('conversation_id', existing_conv_id, 'is_new', false);
    END IF;

    -- 7. CREATE NEW 1:1 CONVERSATION
    -- Bypasses RLS atomically. Safe because current_user_id and target_user_id are validated.
    INSERT INTO public.chat_conversations (type, created_by)
    VALUES ('ADMIN_STAFF', current_user_id)
    RETURNING id INTO new_conv_id;

    INSERT INTO public.chat_participants (conversation_id, user_id)
    VALUES 
        (new_conv_id, current_user_id),
        (new_conv_id, target_user_id);

    RETURN jsonb_build_object('conversation_id', new_conv_id, 'is_new', true);
END;
$$;

-- Restrict execution to authenticated users
REVOKE EXECUTE ON FUNCTION public.get_or_create_direct_chat(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_chat(UUID) TO authenticated;
