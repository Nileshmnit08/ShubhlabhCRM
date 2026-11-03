-- ============================================================================
-- ROLLBACK for 249_sprint_LH_FOUNDATION_SECURE_01.sql
-- STATUS: PROPOSED — NOT APPLIED — REQUIRES PRODUCT OWNER APPROVAL
--
-- Order: run 250's rollback first. This script refuses to run while 250's tables are live.
-- Data is ARCHIVED, never dropped: every LabourHisaab table is renamed to *_archive_249 and
-- closed to API roles. Views, policies, triggers and functions are removed.
--
-- After rollback: LabourHisaab cannot sync (tables gone from the API); CRM pages reading the
-- views will show "not set up". Data remains with the database owner for export or restore.
-- Permanent removal (only after export and Product Owner approval) is commented at the end.
-- ============================================================================

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.labour_monthly_settlements') IS NOT NULL THEN
        RAISE EXCEPTION 'Run 250_rollback_sprint_LH_SETTLEMENT_SECURE_01.sql first';
    END IF;
END $$;

DROP VIEW IF EXISTS public.v_individual_monthly_statement;
DROP VIEW IF EXISTS public.v_monthly_contractor_summary;
DROP VIEW IF EXISTS public.v_weekly_contractor_summary;
DROP VIEW IF EXISTS public.v_daily_contractor_summary;
DROP VIEW IF EXISTS public.v_labour_work_lines;

DO $$
DECLARE
    t   text;
    trg record;
    p   text;
BEGIN
    -- Children first so renamed FKs keep pointing at renamed parents (renames preserve FKs).
    FOREACH t IN ARRAY ARRAY['service_expense_allocations','service_expenses','labour_payments','labour_work_allocations',
                             'daily_work_details','daily_work_entries','labour_rates','labourers','contractor_members','contractors'] LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            FOR trg IN SELECT tgname FROM pg_trigger WHERE tgrelid = ('public.' || t)::regclass AND NOT tgisinternal AND tgname LIKE 'lh\_%' LOOP
                EXECUTE format('DROP TRIGGER %I ON public.%I', trg.tgname, t);
            END LOOP;
            FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
                EXECUTE format('DROP POLICY %I ON public.%I', p, t);
            END LOOP;
            EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
            EXECUTE format('ALTER TABLE public.%I RENAME TO %I', t, t || '_archive_249');
        END IF;
    END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.lh_set_member(uuid, uuid, varchar, boolean);
DROP FUNCTION IF EXISTS public.lh_admin_create_contractor(varchar, uuid, varchar, varchar);
DROP FUNCTION IF EXISTS public.lh_expense_allocation_guard();
DROP FUNCTION IF EXISTS public.lh_expense_guard();
DROP FUNCTION IF EXISTS public.lh_payment_guard();
DROP FUNCTION IF EXISTS public.lh_work_allocation_guard();
DROP FUNCTION IF EXISTS public.lh_work_detail_guard();
DROP FUNCTION IF EXISTS public.lh_work_entry_guard();
DROP FUNCTION IF EXISTS public.lh_rate_guard();
DROP FUNCTION IF EXISTS public.lh_labourer_guard();
DROP FUNCTION IF EXISTS public.lh_contractor_guard();
DROP FUNCTION IF EXISTS public.lh_touch_row();
DROP FUNCTION IF EXISTS public.fn_calculate_work_amount(numeric, varchar, numeric, int, int);
DROP FUNCTION IF EXISTS public.lh_is_owner(uuid);
DROP FUNCTION IF EXISTS public.lh_can_write(uuid);
DROP FUNCTION IF EXISTS public.lh_can_read(uuid);
DROP FUNCTION IF EXISTS public.lh_member_role(uuid);

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Permanent removal (DESTRUCTIVE — only after export and explicit approval):
--   DROP TABLE public.service_expense_allocations_archive_249, public.service_expenses_archive_249,
--              public.labour_payments_archive_249, public.labour_work_allocations_archive_249,
--              public.daily_work_details_archive_249, public.daily_work_entries_archive_249,
--              public.labour_rates_archive_249, public.labourers_archive_249,
--              public.contractor_members_archive_249, public.contractors_archive_249;
