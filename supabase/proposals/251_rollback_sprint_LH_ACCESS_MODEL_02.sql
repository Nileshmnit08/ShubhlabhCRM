-- 251_rollback_sprint_LH_ACCESS_MODEL_02.sql
-- PROPOSAL — NOT APPLIED. Restores the 249 Owner/Manager-only write policies.
-- Refuses to run while any membership uses 'Operator' (change those roles first; nothing is
-- converted or removed silently). The audit columns and their values are KEPT (no data loss);
-- only the trigger that fills them is removed.

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.contractor_members WHERE role = 'Operator') THEN
        RAISE EXCEPTION 'Rollback blocked: % membership(s) use role Operator. Change them via lh_set_member first.',
            (SELECT count(*) FROM public.contractor_members WHERE role = 'Operator');
    END IF;
END $$;

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['labourers','labour_rates','daily_work_entries','daily_work_details',
                             'labour_work_allocations','labour_payments','service_expenses','service_expense_allocations'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS lh_insert ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS lh_update ON public.%I', t);
        EXECUTE format('CREATE POLICY lh_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.lh_can_write(contractor_id))', t);
        EXECUTE format('CREATE POLICY lh_update ON public.%I FOR UPDATE TO authenticated USING (public.lh_can_write(contractor_id)) WITH CHECK (public.lh_can_write(contractor_id))', t);
    END LOOP;
    FOREACH t IN ARRAY ARRAY['daily_work_details','labour_work_allocations'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS lh_delete ON public.%I', t);
        EXECUTE format('CREATE POLICY lh_delete ON public.%I FOR DELETE TO authenticated USING (public.lh_can_write(contractor_id))', t);
    END LOOP;
    FOREACH t IN ARRAY ARRAY['labourers','daily_work_entries','labour_payments','service_expenses'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS lh_80_audit ON public.%I', t);
    END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.lh_rename_contractor(uuid, text);
DROP FUNCTION IF EXISTS public.lh_add_member_by_email(uuid, text, varchar);
DROP FUNCTION IF EXISTS public.lh_audit_row();
DROP FUNCTION IF EXISTS public.lh_can_enter(uuid);

ALTER TABLE public.contractor_members DROP CONSTRAINT IF EXISTS contractor_members_role_check;
ALTER TABLE public.contractor_members ADD CONSTRAINT contractor_members_role_check
    CHECK (role IN ('Owner', 'Manager', 'Viewer'));

COMMIT;

NOTIFY pgrst, 'reload schema';
