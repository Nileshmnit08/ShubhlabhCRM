-- ============================================================================
-- ROLLBACK for 250_sprint_LH_SETTLEMENT_SECURE_01.sql
-- STATUS: PROPOSED — NOT APPLIED — REQUIRES PRODUCT OWNER APPROVAL
--
-- Run this BEFORE 249's rollback (249's rollback refuses to run while 250 is present).
-- Data is ARCHIVED, never dropped: the three settlement tables are renamed to *_archive_250
-- and closed to API roles. Removes the closed-month lock from 249's tables.
--
-- After rollback: closed months are no longer locked; settlement figures remain readable
-- only by the database owner in the archive tables.
-- Permanent removal (only after export and Product Owner approval) is commented at the end.
-- ============================================================================

BEGIN;

DO $$
DECLARE
    t text;
    p text;
BEGIN
    FOREACH t IN ARRAY ARRAY['daily_work_entries','daily_work_details','labour_work_allocations',
                             'labour_payments','service_expenses','service_expense_allocations'] LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            EXECUTE format('DROP TRIGGER IF EXISTS lh_05_closed_month ON public.%I', t);
        END IF;
    END LOOP;

    IF to_regclass('public.labour_monthly_settlement_items') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS lh_10_settlement_item_guard ON public.labour_monthly_settlement_items;
    END IF;

    FOREACH t IN ARRAY ARRAY['labour_settlement_corrections','labour_monthly_settlement_items','labour_monthly_settlements'] LOOP
        IF to_regclass('public.' || t) IS NOT NULL THEN
            -- Policies reference 249's lh_can_read(); drop them so 249's rollback can remove it.
            FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
                EXECUTE format('DROP POLICY %I ON public.%I', p, t);
            END LOOP;
            EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
            EXECUTE format('ALTER TABLE public.%I RENAME TO %I', t, t || '_archive_250');
        END IF;
    END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.lh_correct_settlement_item(uuid, numeric, text);
DROP FUNCTION IF EXISTS public.lh_close_month(uuid, varchar, text);
DROP FUNCTION IF EXISTS public.lh_settlement_item_guard();
DROP FUNCTION IF EXISTS public.lh_closed_month_guard();
DROP FUNCTION IF EXISTS public.lh_month_closed(uuid, date);

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Permanent removal (DESTRUCTIVE — only after export and explicit approval):
--   DROP TABLE public.labour_settlement_corrections_archive_250,
--              public.labour_monthly_settlement_items_archive_250,
--              public.labour_monthly_settlements_archive_250;
