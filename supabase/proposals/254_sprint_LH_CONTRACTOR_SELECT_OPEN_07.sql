-- 254_sprint_LH_CONTRACTOR_SELECT_OPEN_07.sql
-- PROPOSAL — NOT APPLIED. Requires 249 + 251 (252/253 optional). Apply after PO approval.
--
-- Open contractor selection for LabourHisaab operators, without weakening per-contractor RLS.
--
-- Blocker found: every LabourHisaab policy is membership-based (lh_can_read / lh_can_enter /
-- lh_can_write via contractor_members). An account with no membership cannot even read the
-- contractor list (contractors RLS), so it cannot select one or save work.
-- "Every authenticated user" is NOT a safe test: auth.users also holds CRM salespeople and buyers.
--
-- Smallest safe change:
--   1. lh_operators: the accounts approved as LabourHisaab operators (managed ONLY by a CRM admin
--      with lh_set_operator). Nothing else in the CRM is affected.
--   2. lh_list_active_contractors(): approved operators (and existing members / CRM admins) see
--      every ACTIVE contractor: id, name, business name, and their own role there (if any).
--   3. lh_select_contractor(contractor): the operator's choice is authorised by the database. An
--      existing active membership is used as is (never changed). Otherwise an approved operator
--      gets an 'Operator' membership in that contractor (source 'self_select'), so all existing
--      policies apply unchanged: add/update own contractor's work only, no deletes, no member
--      management, no month closing, no approvals. A membership an Owner/admin DEACTIVATED is
--      never re-activated by the operator.
--   4. contractor_members.source records how each membership was created ('managed' or
--      'self_select') for audit.
-- Implication (accepted by the sprint brief): an approved operator may select ANY active
-- contractor, and after selecting it reads and enters that contractor's labour data.
-- Approvals stay CRM-only and members of a contractor (incl. self-selected operators) still
-- cannot approve that contractor's registers (252/253 lh_decide_daily_register).
-- No existing policy, grant or function is changed. Anon gets nothing.
-- Rollback: 254_rollback_sprint_LH_CONTRACTOR_SELECT_OPEN_07.sql

BEGIN;

DO $$
BEGIN
    IF to_regprocedure('public.lh_can_enter(uuid)') IS NULL OR to_regclass('public.contractor_members') IS NULL
       OR to_regprocedure('public.is_admin()') IS NULL THEN
        RAISE EXCEPTION '254 requires proposals 249 and 251 (contractor_members, lh_can_enter) and public.is_admin()';
    END IF;
END $$;

ALTER TABLE public.contractor_members ADD COLUMN IF NOT EXISTS source varchar(20) NOT NULL DEFAULT 'managed';
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contractor_members_source_check') THEN
        ALTER TABLE public.contractor_members ADD CONSTRAINT contractor_members_source_check CHECK (source IN ('managed', 'self_select'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.lh_operators (
    user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_active  boolean NOT NULL DEFAULT true,
    added_by   uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lh_operators ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE p text;
BEGIN
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'lh_operators' LOOP
        EXECUTE format('DROP POLICY %I ON public.lh_operators', p);
    END LOOP;
END $$;
CREATE POLICY lh_read ON public.lh_operators FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR COALESCE(public.is_admin(), false));
REVOKE ALL ON public.lh_operators FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.lh_operators TO authenticated;            -- writes via lh_set_operator only

CREATE OR REPLACE FUNCTION public.lh_is_operator()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT COALESCE(auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.lh_operators o WHERE o.user_id = auth.uid() AND o.is_active), false);
$$;

-- CRM admin approves / removes a LabourHisaab operator by email (the account must exist).
CREATE OR REPLACE FUNCTION public.lh_set_operator(p_email text, p_active boolean DEFAULT true)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_user uuid;
BEGIN
    IF NOT COALESCE(public.is_admin(), false) THEN
        RAISE EXCEPTION 'Only a CRM admin can approve LabourHisaab operators' USING ERRCODE = '42501';
    END IF;
    SELECT u.id INTO v_user FROM auth.users u WHERE lower(u.email) = lower(trim(p_email));
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'No account with that email. The operator must create an account and sign in first.' USING ERRCODE = 'P0002';
    END IF;
    INSERT INTO public.lh_operators (user_id, is_active, added_by) VALUES (v_user, p_active, auth.uid())
    ON CONFLICT (user_id) DO UPDATE SET is_active = EXCLUDED.is_active, added_by = auth.uid(), updated_at = now();
    RETURN v_user;
END;
$$;

-- Every active contractor, for approved operators, existing members and CRM admins.
CREATE OR REPLACE FUNCTION public.lh_list_active_contractors()
RETURNS TABLE (id uuid, name varchar, business_name varchar, my_role varchar, my_membership_active boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF auth.uid() IS NULL OR NOT (public.lh_is_operator() OR COALESCE(public.is_admin(), false)
        OR EXISTS (SELECT 1 FROM public.contractor_members m WHERE m.user_id = auth.uid() AND m.is_active)) THEN
        RAISE EXCEPTION 'This account is not a LabourHisaab operator. Ask a Shubh Labh CRM admin to approve it.' USING ERRCODE = '42501';
    END IF;
    RETURN QUERY
        SELECT c.id, c.name, c.business_name, m.role, m.is_active
          FROM public.contractors c
          LEFT JOIN public.contractor_members m ON m.contractor_id = c.id AND m.user_id = auth.uid()
         WHERE c.is_active
         ORDER BY c.name, c.id;
END;
$$;

-- Authorise the operator's choice. Returns the role the account now has in that contractor.
CREATE OR REPLACE FUNCTION public.lh_select_contractor(p_contractor uuid)
RETURNS varchar LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE m public.contractor_members%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Sign in first' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = p_contractor AND c.is_active) THEN
        RAISE EXCEPTION 'Contractor not found or archived' USING ERRCODE = 'P0002';
    END IF;
    SELECT * INTO m FROM public.contractor_members WHERE contractor_id = p_contractor AND user_id = auth.uid();
    IF FOUND THEN
        IF NOT m.is_active THEN
            RAISE EXCEPTION 'Your access to this contractor was removed by its owner or a CRM admin' USING ERRCODE = '42501';
        END IF;
        RETURN m.role;                                   -- existing role is never changed here
    END IF;
    IF NOT public.lh_is_operator() THEN
        RAISE EXCEPTION 'This account is not a LabourHisaab operator. Ask a Shubh Labh CRM admin to approve it.' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.contractor_members (contractor_id, user_id, role, is_active, source)
    VALUES (p_contractor, auth.uid(), 'Operator', true, 'self_select');
    RETURN 'Operator';
END;
$$;

REVOKE ALL ON FUNCTION public.lh_is_operator(), public.lh_set_operator(text, boolean),
                       public.lh_list_active_contractors(), public.lh_select_contractor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lh_is_operator(), public.lh_set_operator(text, boolean),
                          public.lh_list_active_contractors(), public.lh_select_contractor(uuid) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
