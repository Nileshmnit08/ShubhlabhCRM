-- ============================================================================
-- MIGRATION: 264_sprint_CRM_CUSTOMER_PRESENCE_01.sql
-- SPRINT: CRM-CUSTOMER-PRESENCE-01C
--
-- PURPOSE:
-- Real-time customer online presence, active foreground duration tracking,
-- and last active IST timestamp reporting for Shubh Labh Order App & CRM.
--
-- ROLLBACK: 264_rollback_sprint_CRM_CUSTOMER_PRESENCE_01.sql
-- ============================================================================

-- 1. Create table for customer app sessions
CREATE TABLE IF NOT EXISTS public.customer_app_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crm_party_id UUID NOT NULL REFERENCES public.crm_parties(id) ON DELETE RESTRICT,
    user_id UUID NULL REFERENCES public.app_users(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    app_state TEXT NOT NULL DEFAULT 'active' CHECK (app_state IN ('active', 'background', 'terminated')),
    device_info JSONB DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    foreground_entered_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    foreground_exited_at TIMESTAMPTZ NULL,
    cumulative_foreground_seconds INTEGER NOT NULL DEFAULT 0,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    ended_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_customer_app_sessions_session_id UNIQUE (session_id)
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_customer_app_sessions_party_presence 
    ON public.customer_app_sessions(crm_party_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_app_sessions_active_state 
    ON public.customer_app_sessions(app_state, last_seen_at DESC) 
    WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_customer_app_sessions_user_id 
    ON public.customer_app_sessions(user_id);

-- Ensure full payload broadcast on updates for Supabase Realtime
ALTER TABLE public.customer_app_sessions REPLICA IDENTITY FULL;

-- 3. Trigger: Prevent tampering with immutable session identity
-- Explicitly allows foreign-key cascade (ON DELETE SET NULL: OLD.user_id set, NEW.user_id null)
CREATE OR REPLACE FUNCTION public.trg_fn_protect_session_identity()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Permit foreign key ON DELETE SET NULL cascade while blocking any client re-assignment
    IF (NEW.user_id IS DISTINCT FROM OLD.user_id AND NOT (OLD.user_id IS NOT NULL AND NEW.user_id IS NULL))
       OR NEW.crm_party_id IS DISTINCT FROM OLD.crm_party_id 
       OR NEW.session_id IS DISTINCT FROM OLD.session_id 
       OR NEW.started_at IS DISTINCT FROM OLD.started_at THEN
        RAISE EXCEPTION 'Cannot alter immutable session identity (user_id, crm_party_id, session_id, started_at)'
            USING ERRCODE = '42501';
    END IF;
    NEW.updated_at = clock_timestamp();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_session_identity ON public.customer_app_sessions;
CREATE TRIGGER trg_protect_session_identity
    BEFORE UPDATE ON public.customer_app_sessions
    FOR EACH ROW EXECUTE FUNCTION public.trg_fn_protect_session_identity();

-- 4. Enable RLS
ALTER TABLE public.customer_app_sessions ENABLE ROW LEVEL SECURITY;

-- 5. Revoke direct mutations from client roles; grant SELECT to authenticated
REVOKE ALL ON public.customer_app_sessions FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.customer_app_sessions FROM authenticated;
GRANT SELECT ON public.customer_app_sessions TO authenticated;

-- 6. RLS: SELECT Policies
DROP POLICY IF EXISTS "Buyers can view own sessions" ON public.customer_app_sessions;
CREATE POLICY "Buyers can view own sessions"
    ON public.customer_app_sessions FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        AND public.is_buyer()
    );

DROP POLICY IF EXISTS "Admins can view customer presence sessions" ON public.customer_app_sessions;
CREATE POLICY "Admins can view customer presence sessions"
    ON public.customer_app_sessions FOR SELECT TO authenticated
    USING (
        public.is_admin()
    );

-- 7. Dedicated RPC 1: Start Session
CREATE OR REPLACE FUNCTION public.customer_presence_start(
    p_session_id TEXT,
    p_device_info JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_party_id UUID;
    v_now TIMESTAMPTZ := clock_timestamp();
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
    END IF;

    IF NOT public.is_buyer() THEN
        RAISE EXCEPTION 'Forbidden: only active buyers can register presence' USING ERRCODE = '42501';
    END IF;

    v_party_id := public.get_auth_crm_party_id();
    IF v_party_id IS NULL THEN
        RAISE EXCEPTION 'Forbidden: buyer is not linked to an active CRM customer' USING ERRCODE = '42501';
    END IF;

    IF p_session_id IS NULL OR trim(p_session_id) = '' THEN
        RAISE EXCEPTION 'Invalid session_id' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.customer_app_sessions (
        crm_party_id,
        user_id,
        session_id,
        app_state,
        device_info,
        started_at,
        foreground_entered_at,
        foreground_exited_at,
        cumulative_foreground_seconds,
        last_seen_at,
        ended_at,
        created_at,
        updated_at
    ) VALUES (
        v_party_id,
        v_user_id,
        p_session_id,
        'active',
        coalesce(p_device_info, '{}'::jsonb),
        v_now,
        v_now,
        NULL,
        0,
        v_now,
        NULL,
        v_now,
        v_now
    )
    ON CONFLICT (session_id) DO UPDATE SET
        app_state = 'active',
        foreground_entered_at = v_now,
        foreground_exited_at = NULL,
        last_seen_at = v_now,
        ended_at = NULL,
        device_info = coalesce(EXCLUDED.device_info, customer_app_sessions.device_info),
        updated_at = v_now
    WHERE customer_app_sessions.user_id = v_user_id
      AND customer_app_sessions.crm_party_id = v_party_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'app_state', 'active',
        'server_time', v_now
    );
END;
$$;

-- 8. Dedicated RPC 2: Heartbeat
CREATE OR REPLACE FUNCTION public.customer_presence_heartbeat(
    p_session_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_party_id UUID;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_rows_affected INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL OR NOT public.is_buyer() THEN
        RAISE EXCEPTION 'Unauthorized: active buyer session required' USING ERRCODE = '42501';
    END IF;

    v_party_id := public.get_auth_crm_party_id();

    UPDATE public.customer_app_sessions
    SET 
        last_seen_at = v_now,
        updated_at = v_now
    WHERE session_id = p_session_id
      AND user_id = v_user_id
      AND crm_party_id = v_party_id
      AND ended_at IS NULL
      AND app_state = 'active';

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    IF v_rows_affected = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'reason', 'SESSION_NOT_FOUND_OR_INACTIVE',
            'server_time', v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'server_time', v_now
    );
END;
$$;

-- 9. Dedicated RPC 3: Background Transition
CREATE OR REPLACE FUNCTION public.customer_presence_background(
    p_session_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_party_id UUID;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_sess RECORD;
    v_elapsed INTEGER := 0;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL OR NOT public.is_buyer() THEN
        RAISE EXCEPTION 'Unauthorized: active buyer session required' USING ERRCODE = '42501';
    END IF;

    v_party_id := public.get_auth_crm_party_id();

    SELECT id, foreground_entered_at, cumulative_foreground_seconds, app_state
    INTO v_sess
    FROM public.customer_app_sessions
    WHERE session_id = p_session_id
      AND user_id = v_user_id
      AND crm_party_id = v_party_id
      AND ended_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'SESSION_NOT_FOUND');
    END IF;

    IF v_sess.app_state = 'active' AND v_sess.foreground_entered_at IS NOT NULL THEN
        v_elapsed := GREATEST(0, EXTRACT(EPOCH FROM (v_now - v_sess.foreground_entered_at))::INTEGER);
    END IF;

    UPDATE public.customer_app_sessions
    SET 
        app_state = 'background',
        foreground_exited_at = v_now,
        cumulative_foreground_seconds = v_sess.cumulative_foreground_seconds + v_elapsed,
        last_seen_at = v_now,
        updated_at = v_now
    WHERE id = v_sess.id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'app_state', 'background',
        'server_time', v_now
    );
END;
$$;

-- 10. Dedicated RPC 4: Foreground Transition
CREATE OR REPLACE FUNCTION public.customer_presence_foreground(
    p_session_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_party_id UUID;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_rows_affected INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL OR NOT public.is_buyer() THEN
        RAISE EXCEPTION 'Unauthorized: active buyer session required' USING ERRCODE = '42501';
    END IF;

    v_party_id := public.get_auth_crm_party_id();

    UPDATE public.customer_app_sessions
    SET 
        app_state = 'active',
        foreground_entered_at = v_now,
        foreground_exited_at = NULL,
        last_seen_at = v_now,
        updated_at = v_now
    WHERE session_id = p_session_id
      AND user_id = v_user_id
      AND crm_party_id = v_party_id
      AND ended_at IS NULL;

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    IF v_rows_affected = 0 THEN
        RETURN public.customer_presence_start(p_session_id);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'app_state', 'active',
        'server_time', v_now
    );
END;
$$;

-- 11. Dedicated RPC 5: End Session
CREATE OR REPLACE FUNCTION public.customer_presence_end(
    p_session_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_party_id UUID;
    v_now TIMESTAMPTZ := clock_timestamp();
    v_sess RECORD;
    v_elapsed INTEGER := 0;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
    END IF;

    v_party_id := public.get_auth_crm_party_id();

    SELECT id, foreground_entered_at, cumulative_foreground_seconds, app_state
    INTO v_sess
    FROM public.customer_app_sessions
    WHERE session_id = p_session_id
      AND user_id = v_user_id
      AND crm_party_id = v_party_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'reason', 'SESSION_NOT_FOUND');
    END IF;

    IF v_sess.app_state = 'active' AND v_sess.foreground_entered_at IS NOT NULL THEN
        v_elapsed := GREATEST(0, EXTRACT(EPOCH FROM (v_now - v_sess.foreground_entered_at))::INTEGER);
    END IF;

    UPDATE public.customer_app_sessions
    SET 
        app_state = 'terminated',
        ended_at = v_now,
        cumulative_foreground_seconds = v_sess.cumulative_foreground_seconds + v_elapsed,
        last_seen_at = v_now,
        updated_at = v_now
    WHERE id = v_sess.id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'app_state', 'terminated',
        'server_time', v_now
    );
END;
$$;

-- 12. RPC Execution Grants
REVOKE ALL ON FUNCTION public.customer_presence_start(TEXT, JSONB) FROM public;
GRANT EXECUTE ON FUNCTION public.customer_presence_start(TEXT, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.customer_presence_heartbeat(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.customer_presence_heartbeat(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.customer_presence_background(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.customer_presence_background(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.customer_presence_foreground(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.customer_presence_foreground(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.customer_presence_end(TEXT) FROM public;
GRANT EXECUTE ON FUNCTION public.customer_presence_end(TEXT) TO authenticated;

-- 13. Idempotent Realtime Publication Subscription
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'customer_app_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_app_sessions;
    END IF;
END $$;
