-- 251_sprint_LH_ACCESS_MODEL_02.sql
-- PROPOSAL — NOT APPLIED. Requires 249 (and 250 if settlements are installed). Apply after PO approval.
--
-- Access model (per contractor, via contractor_members; CRM admin via the existing is_admin()):
--   Owner     read; add/update/delete labour records; manage members; close + correct months (250)
--   Manager   read; add/update/delete labour records; close months (250)
--   Operator  read; ADD and UPDATE labour records (work, bag lines, shares, labourers, payments,
--             expenses, new rate periods). No deletes of entries, payments, expenses or rates;
--             no member management; no month closing. (NEW in 251)
--   Viewer    read only
--   CRM admin read only, across contractors (unchanged from 249: lh_can_read → is_admin()).
--   Anyone else (authenticated or anon): nothing.
--
-- Changes:
--   1. contractor_members.role accepts 'Operator'.
--   2. lh_can_enter(contractor): Owner/Manager/Operator of an ACTIVE contractor. lh_can_write
--      (Owner/Manager) is unchanged, so 250's lh_close_month keeps its Owner/Manager rule.
--   3. INSERT/UPDATE policies on the data-entry tables use lh_can_enter. DELETE stays lh_can_write,
--      except bag lines and labourer shares of an entry (daily_work_details, labour_work_allocations),
--      which are replaced as a whole when an entry is updated, so lh_can_enter may delete them.
--      The 250 closed-month guard still blocks every change to a closed month.
--   4. Audit: created_by / updated_by (auth user ids) on labourers, daily_work_entries,
--      labour_payments, service_expenses, set by trigger from auth.uid(); clients cannot forge them.
--      Existing rows keep NULL (unknown) — nothing is back-filled or invented.
--   5. Onboarding: lh_add_member_by_email(contractor, email, role) for the Owner or a CRM admin.
--      The operator must already have signed up; nobody is linked automatically, no contractor is created.
--   6. lh_rename_contractor(contractor, name): Owner/Manager/Operator may rename their contractor.
--      Archiving/reactivating stays Owner-only (249 policy unchanged).
--
-- No rows are inserted, updated or deleted by this migration. No grants are widened; anon stays closed.
-- Re-running 249 recreates its Owner/Manager-only policies: re-run 251 after any 249 re-run.
-- Rollback: 251_rollback_sprint_LH_ACCESS_MODEL_02.sql

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.contractor_members') IS NULL OR to_regprocedure('public.lh_can_write(uuid)') IS NULL
       OR to_regprocedure('public.lh_member_role(uuid)') IS NULL OR to_regprocedure('public.is_admin()') IS NULL THEN
        RAISE EXCEPTION '251 requires proposal 249 (contractor_members, lh_can_write, lh_member_role) and public.is_admin()';
    END IF;
END $$;

-- ── 1. Operator role ───────────────────────────────────────────────────────
DO $$
DECLARE c record;
BEGIN
    FOR c IN SELECT conname FROM pg_constraint
              WHERE conrelid = 'public.contractor_members'::regclass AND contype = 'c'
                AND pg_get_constraintdef(oid) ILIKE '%role%' LOOP
        EXECUTE format('ALTER TABLE public.contractor_members DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;
ALTER TABLE public.contractor_members ADD CONSTRAINT contractor_members_role_check
    CHECK (role IN ('Owner', 'Manager', 'Operator', 'Viewer'));

-- ── 2. Data-entry permission ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.lh_can_enter(p_contractor uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT COALESCE(auth.uid() IS NOT NULL
       AND COALESCE(public.lh_member_role(p_contractor), '') IN ('Owner', 'Manager', 'Operator')
       AND EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = p_contractor AND c.is_active), false);
$$;
REVOKE ALL ON FUNCTION public.lh_can_enter(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lh_can_enter(uuid) TO authenticated;

-- ── 3. Policies ────────────────────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['labourers','labour_rates','daily_work_entries','daily_work_details',
                             'labour_work_allocations','labour_payments','service_expenses','service_expense_allocations'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS lh_insert ON public.%I', t);
        EXECUTE format('CREATE POLICY lh_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.lh_can_enter(contractor_id))', t);
    END LOOP;

    -- Rate periods are pricing: Operators may add a period for a new work type, but only
    -- Owner/Manager may change one (the 249 rate guard also blocks re-pricing a used rate).
    FOREACH t IN ARRAY ARRAY['labourers','daily_work_entries','daily_work_details','labour_work_allocations',
                             'labour_payments','service_expenses','service_expense_allocations'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS lh_update ON public.%I', t);
        EXECUTE format('CREATE POLICY lh_update ON public.%I FOR UPDATE TO authenticated USING (public.lh_can_enter(contractor_id)) WITH CHECK (public.lh_can_enter(contractor_id))', t);
    END LOOP;

    FOREACH t IN ARRAY ARRAY['daily_work_details','labour_work_allocations'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS lh_delete ON public.%I', t);
        EXECUTE format('CREATE POLICY lh_delete ON public.%I FOR DELETE TO authenticated USING (public.lh_can_enter(contractor_id))', t);
    END LOOP;
END $$;

-- ── 4. Audit columns ───────────────────────────────────────────────────────
ALTER TABLE public.labourers          ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.daily_work_entries ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.labour_payments    ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS updated_by uuid;
ALTER TABLE public.service_expenses   ADD COLUMN IF NOT EXISTS created_by uuid, ADD COLUMN IF NOT EXISTS updated_by uuid;

CREATE OR REPLACE FUNCTION public.lh_audit_row()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_by := auth.uid();
    ELSE
        NEW.created_by := OLD.created_by;           -- the creator never changes
    END IF;
    NEW.updated_by := auth.uid();
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.lh_audit_row() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['labourers','daily_work_entries','labour_payments','service_expenses'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS lh_80_audit ON public.%I', t);
        EXECUTE format('CREATE TRIGGER lh_80_audit BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.lh_audit_row()', t);
    END LOOP;
END $$;

-- ── 5. Onboarding by email ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.lh_add_member_by_email(p_contractor uuid, p_email text, p_role varchar)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_user uuid;
BEGIN
    IF NOT (public.lh_is_owner(p_contractor) OR COALESCE(public.is_admin(), false)) THEN
        RAISE EXCEPTION 'Only the contractor owner or a CRM admin can add members' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = p_contractor AND c.is_active) THEN
        RAISE EXCEPTION 'Contractor not found or archived' USING ERRCODE = '23514';
    END IF;
    IF p_role NOT IN ('Owner', 'Manager', 'Operator', 'Viewer') THEN
        RAISE EXCEPTION 'Unknown role "%"', p_role USING ERRCODE = '23514';
    END IF;
    SELECT u.id INTO v_user FROM auth.users u WHERE lower(u.email) = lower(trim(p_email));
    IF v_user IS NULL THEN
        RAISE EXCEPTION 'No account with that email. The operator must create an account and sign in first.' USING ERRCODE = 'P0002';
    END IF;
    IF v_user = auth.uid() AND NOT COALESCE(public.is_admin(), false) THEN
        RAISE EXCEPTION 'Owners cannot change their own membership' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.contractor_members (contractor_id, user_id, role, is_active)
    VALUES (p_contractor, v_user, p_role, true)
    ON CONFLICT (contractor_id, user_id) DO UPDATE SET role = EXCLUDED.role, is_active = true;
    RETURN v_user;
END;
$$;
REVOKE ALL ON FUNCTION public.lh_add_member_by_email(uuid, text, varchar) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lh_add_member_by_email(uuid, text, varchar) TO authenticated;

-- ── 6. Rename contractor: any Owner/Manager/Operator of it (archive/reactivate stays Owner-only) ──
CREATE OR REPLACE FUNCTION public.lh_rename_contractor(p_contractor uuid, p_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_name text := btrim(p_name);
BEGIN
    IF NOT public.lh_can_enter(p_contractor) THEN
        RAISE EXCEPTION 'Only members who enter data for this contractor can rename it' USING ERRCODE = '42501';
    END IF;
    IF v_name IS NULL OR v_name = '' OR length(v_name) > 255 THEN
        RAISE EXCEPTION 'Contractor name must be 1–255 characters' USING ERRCODE = '23514';
    END IF;
    UPDATE public.contractors SET name = v_name WHERE id = p_contractor;
END;
$$;
REVOKE ALL ON FUNCTION public.lh_rename_contractor(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lh_rename_contractor(uuid, text) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
