-- ============================================================================
-- PROPOSED MIGRATION: 249_sprint_LH_FOUNDATION_SECURE_01.sql
-- SPRINT: LH-MIGRATION-REVISION-01 — LabourHisaab foundation (revised 247)
--
-- STATUS: PROPOSED — NOT APPLIED — REQUIRES PRODUCT OWNER APPROVAL
-- Lives in supabase/proposals/ so `supabase db push` cannot pick it up.
-- Supersedes: 247_sprint_LH_DATABASE_FOUNDATION_01.sql (do not apply 247 or the retired lh_ file).
-- Rollback:   249_rollback_sprint_LH_FOUNDATION_SECURE_01.sql (archives, never drops data).
-- Next:       250_sprint_LH_SETTLEMENT_SECURE_01.sql (depends on this file).
-- Review:     supabase/proposals/LH-MIGRATION-REVIEW-01.md
-- Demo data:  249_dev_seed_LH_DEMO_DATA.sql (development only; refuses to run without an opt-in flag).
--
-- WHAT CHANGED FROM 247 (review ids in brackets)
--   Access   [B1,B2] Supabase Auth + contractor_members. Members read their contractor's data;
--                    Owner/Manager write; Viewer reads. CRM admins (public.is_admin()) READ ONLY.
--                    anon has no grants on any table, view or function.
--   Seed     [B3]    No demo data in this file.
--   Views    [B4]    security_invoker = true, so RLS applies to whoever queries them.
--   Deductions [C1]  Only service_expense_allocations count as labourer deductions.
--   Weight   [C2]    Labourer weight is pro-rata to their share of the entry amount.
--   Days     [C3]    Working days count work dates only (payments are not work).
--   Amount   [C4]    calculated_labour_amount must equal rate × quantity (±₹0.01), rate taken
--                    from the labour_rates row valid on work_date.
--   Rates    [C5]    No overlapping rate periods per contractor + work type; a rate row that
--                    work entries use cannot be re-priced, only closed (effective_until).
--   Allocation [C6]  Parent row is locked before the sum check (no concurrent over-allocation);
--                    an entry's amount cannot drop below what is already allocated.
--   Delete   [S1]    contractors and labourers cannot be deleted (archive/deactivate instead);
--                    all child FKs are RESTRICT, so history can never be cascaded away.
--   Re-run   [S2,S5] One transaction; IF NOT EXISTS / DROP ... IF EXISTS throughout.
--   search_path [S4] Every function pins search_path.
--   Integrity        Child rows carry contractor_id (forced from the parent) so every policy is
--                    a direct check; contractor_id can never be changed on update; a labourer
--                    must belong to the same contractor as the entry/payment/expense.
--
-- PRECONDITIONS (verify read-only before applying; NOT verified by this sprint):
--   P1. None of the tables/views/functions below exist live (repo search found none).
--   P2. public.is_admin() exists (root 08_sprint_8_fixes_schema.sql / staging bootstrap).
--   P3. Supabase Auth is enabled; LabourHisaab users will sign in (persistence sprint).
--
-- Read-only preflight:
--   SELECT to_regclass('public.contractors'), to_regclass('public.labourers'),
--          to_regclass('public.daily_work_entries'), to_regclass('public.labour_payments');
--   SELECT proname FROM pg_proc WHERE proname IN ('is_admin','is_active_user');
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 0. Upgrade from the legacy install (247 FOUNDATION + 248 + retired lh_ schema)
--    Live inventory 2026-11-03: all three are applied and contain ONLY 247's demo seed
--    (1 contractor, 6 labourers, 1 entry, 1 payment, 1 expense; 0 settlements; lh_* empty).
--    Legacy tables are ARCHIVED (renamed *_legacy, closed to API roles), not dropped, and
--    their indexes renamed so 249's index/constraint names do not collide. Legacy views,
--    triggers and policies are removed. The step refuses to run if more than the demo-sized
--    data is present, so real data can never be archived away by accident.
--    Runs only when legacy is detected (contractors exists, contractor_members does not).
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_legacy  boolean := to_regclass('public.contractors') IS NOT NULL AND to_regclass('public.contractor_members') IS NULL;
    v_lh      boolean := to_regclass('public.lh_labourers') IS NOT NULL;
    t         text;
    r         record;
    v_n       bigint;
    v_limit   int;
    v_new     text;
BEGIN
    IF NOT v_legacy AND NOT v_lh THEN
        RETURN;
    END IF;

    -- Safety: only demo-sized content may be archived by this step.
    FOR t, v_limit IN SELECT * FROM (VALUES
        ('contractors', 1), ('labourers', 6), ('labour_rates', 11), ('daily_work_entries', 1), ('daily_work_details', 2),
        ('labour_work_allocations', 3), ('labour_payments', 1), ('service_expenses', 1), ('service_expense_allocations', 2),
        ('labour_monthly_settlements', 0), ('labour_monthly_settlement_items', 0), ('labour_settlement_corrections', 0),
        ('lh_labourers', 0), ('lh_work_rates', 1000), ('lh_work_entries', 0), ('lh_work_allocations', 0), ('lh_payments', 0),
        ('lh_service_expenses', 0), ('lh_service_expense_allocations', 0)) AS x(t, n)
    LOOP
        IF (t LIKE 'lh\_%' AND v_lh) OR (t NOT LIKE 'lh\_%' AND v_legacy) THEN
            IF to_regclass('public.' || t) IS NOT NULL THEN
                EXECUTE format('SELECT count(*) FROM public.%I', t) INTO v_n;
                IF v_n > v_limit THEN
                    RAISE EXCEPTION 'Legacy table % has % rows (more than the 247 demo seed). Real data needs a migration, not an archive. Nothing was changed.', t, v_n;
                END IF;
            END IF;
        END IF;
    END LOOP;
    IF v_legacy AND EXISTS (SELECT 1 FROM public.contractors WHERE id <> 'c0000000-0000-0000-0000-000000000001') THEN
        RAISE EXCEPTION 'Legacy contractors contain a non-demo contractor. Real data needs a migration. Nothing was changed.';
    END IF;

    -- Legacy views first (249 recreates its own with new columns).
    DROP VIEW IF EXISTS public.v_individual_monthly_statement, public.v_monthly_contractor_summary,
                        public.v_weekly_contractor_summary, public.v_daily_contractor_summary, public.lh_daily_ledger_view;

    FOREACH t IN ARRAY ARRAY[
        'labour_settlement_corrections','labour_monthly_settlement_items','labour_monthly_settlements',
        'service_expense_allocations','service_expenses','labour_payments','labour_work_allocations',
        'daily_work_details','daily_work_entries','labour_rates','labourers','contractors',
        'lh_service_expense_allocations','lh_service_expenses','lh_payments','lh_work_allocations',
        'lh_work_entries','lh_work_rates','lh_labourers']
    LOOP
        CONTINUE WHEN to_regclass('public.' || t) IS NULL;
        CONTINUE WHEN t NOT LIKE 'lh\_%' AND NOT v_legacy;
        FOR r IN SELECT tgname FROM pg_trigger WHERE tgrelid = ('public.' || t)::regclass AND NOT tgisinternal LOOP
            EXECUTE format('DROP TRIGGER %I ON public.%I', r.tgname, t);
        END LOOP;
        FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
            EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, t);
        END LOOP;
        -- Renaming an index also renames the constraint it backs (PK / UNIQUE).
        FOR r IN SELECT c.relname AS idx FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
                  WHERE i.indrelid = ('public.' || t)::regclass LOOP
            v_new := left(r.idx, 54) || '_legacy' || substr(md5(r.idx), 1, 2);
            EXECUTE format('ALTER INDEX public.%I RENAME TO %I', r.idx, v_new);
        END LOOP;
        EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
        EXECUTE format('ALTER TABLE public.%I RENAME TO %I', t, t || '_legacy');
        EXECUTE format('COMMENT ON TABLE public.%I IS %L', t || '_legacy',
            'Archived by 249 (legacy 247/248/lh_ install; demo seed only). Owner-only. Safe to drop after Product Owner review.');
    END LOOP;

    DROP FUNCTION IF EXISTS public.fn_check_work_allocation_limit();
    DROP FUNCTION IF EXISTS public.fn_carry_forward_monthly_settlement(uuid, varchar);
    DROP FUNCTION IF EXISTS public.fn_calculate_work_amount(numeric, varchar, numeric, int, int);
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Tables
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contractors (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name          varchar(255) NOT NULL,
    phone         varchar(20),
    business_name varchar(255),
    is_active     boolean NOT NULL DEFAULT true,
    archived_at   timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT contractors_archive_consistency CHECK ((archived_at IS NULL) = is_active)
);

CREATE TABLE IF NOT EXISTS public.contractor_members (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE RESTRICT,
    user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role          varchar(20) NOT NULL DEFAULT 'Manager' CHECK (role IN ('Owner', 'Manager', 'Viewer')),
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_contractor_member UNIQUE (contractor_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.labourers (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE RESTRICT,
    local_id      varchar(50) NOT NULL,
    name          varchar(255) NOT NULL,
    phone         varchar(20),
    role          varchar(100) DEFAULT 'सामान्य मजदूर',
    active_status boolean NOT NULL DEFAULT true,
    join_date     date NOT NULL DEFAULT CURRENT_DATE,
    notes         text,
    avatar_color  varchar(20) DEFAULT '#F28C28',
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_contractor_labourer_local_id UNIQUE (contractor_id, local_id),
    CONSTRAINT uq_labourer_contractor UNIQUE (id, contractor_id)
);

CREATE TABLE IF NOT EXISTS public.labour_rates (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id    uuid NOT NULL REFERENCES public.contractors(id) ON DELETE RESTRICT,
    work_type        varchar(100) NOT NULL,
    rate             numeric(10, 2) NOT NULL CHECK (rate >= 0),
    rate_unit        varchar(50) NOT NULL CHECK (rate_unit IN ('Per 100 kg', 'Per bag', 'Per batch', 'Fixed amount')),
    is_editable_rate boolean NOT NULL DEFAULT false, -- app may enter a different rate per entry
    effective_from   date NOT NULL DEFAULT CURRENT_DATE,
    effective_until  date, -- NULL = open-ended (current rate)
    created_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT labour_rates_period CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

CREATE TABLE IF NOT EXISTS public.daily_work_entries (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id            uuid NOT NULL REFERENCES public.contractors(id) ON DELETE RESTRICT,
    work_date                date NOT NULL,
    work_type                varchar(100) NOT NULL,
    rate_id                  uuid NOT NULL REFERENCES public.labour_rates(id) ON DELETE RESTRICT,
    rate_snapshot            numeric(10, 2) NOT NULL CHECK (rate_snapshot >= 0),
    rate_unit_snapshot       varchar(50) NOT NULL,
    quantity                 numeric(12, 2) NOT NULL DEFAULT 0,
    total_weight_kg          numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total_weight_kg >= 0),
    total_bags               int NOT NULL DEFAULT 0 CHECK (total_bags >= 0),
    total_batches            int NOT NULL DEFAULT 0 CHECK (total_batches >= 0),
    calculated_labour_amount numeric(12, 2) NOT NULL CHECK (calculated_labour_amount >= 0),
    notes                    text,
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_work_details (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    work_entry_id   uuid NOT NULL REFERENCES public.daily_work_entries(id) ON DELETE CASCADE,
    contractor_id   uuid NOT NULL REFERENCES public.contractors(id) ON DELETE RESTRICT,
    bag_weight_kg   numeric(10, 2) NOT NULL CHECK (bag_weight_kg > 0),
    bag_count       int NOT NULL CHECK (bag_count > 0),
    total_weight_kg numeric(12, 2) GENERATED ALWAYS AS (bag_weight_kg * bag_count) STORED,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.labour_work_allocations (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    work_entry_id     uuid NOT NULL REFERENCES public.daily_work_entries(id) ON DELETE CASCADE,
    contractor_id     uuid NOT NULL REFERENCES public.contractors(id) ON DELETE RESTRICT,
    labourer_id       uuid NOT NULL REFERENCES public.labourers(id) ON DELETE RESTRICT,
    allocated_amount  numeric(12, 2) NOT NULL CHECK (allocated_amount >= 0),
    allocation_method varchar(50) NOT NULL DEFAULT 'Equal' CHECK (allocation_method IN ('Equal', 'Individual')),
    created_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_work_entry_labourer UNIQUE (work_entry_id, labourer_id)
);

CREATE TABLE IF NOT EXISTS public.labour_payments (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(), -- client UUID = idempotency key
    contractor_id  uuid NOT NULL REFERENCES public.contractors(id) ON DELETE RESTRICT,
    labourer_id    uuid NOT NULL REFERENCES public.labourers(id) ON DELETE RESTRICT,
    payment_date   date NOT NULL,
    amount         numeric(12, 2) NOT NULL CHECK (amount > 0),
    payment_method varchar(50) NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Other', 'Bank', 'UPI')),
    notes          text,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_expenses (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id    uuid NOT NULL REFERENCES public.contractors(id) ON DELETE RESTRICT,
    expense_date     date NOT NULL,
    expense_category varchar(50) NOT NULL CHECK (expense_category IN ('Food / Meals', 'Tea / Breakfast', 'Transportation', 'Accommodation', 'Other')),
    expense_name     varchar(255) NOT NULL,
    amount           numeric(12, 2) NOT NULL CHECK (amount > 0),
    allocation_scope varchar(50) NOT NULL CHECK (allocation_scope IN ('Contractor expense', 'Labourer expense', 'Group expense')),
    notes            text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_expense_allocations (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id       uuid NOT NULL REFERENCES public.service_expenses(id) ON DELETE CASCADE,
    contractor_id    uuid NOT NULL REFERENCES public.contractors(id) ON DELETE RESTRICT,
    labourer_id      uuid NOT NULL REFERENCES public.labourers(id) ON DELETE RESTRICT,
    allocated_amount numeric(12, 2) NOT NULL CHECK (allocated_amount >= 0),
    created_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_expense_labourer UNIQUE (expense_id, labourer_id)
);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Indexes
-- ────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_members_user          ON public.contractor_members(user_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_labourers_contractor  ON public.labourers(contractor_id, active_status);
CREATE INDEX IF NOT EXISTS idx_labour_rates_lookup   ON public.labour_rates(contractor_id, work_type, effective_from);
CREATE INDEX IF NOT EXISTS idx_work_entries_date     ON public.daily_work_entries(contractor_id, work_date);
CREATE INDEX IF NOT EXISTS idx_work_details_entry    ON public.daily_work_details(work_entry_id);
CREATE INDEX IF NOT EXISTS idx_work_alloc_entry      ON public.labour_work_allocations(work_entry_id);
CREATE INDEX IF NOT EXISTS idx_work_alloc_labourer   ON public.labour_work_allocations(labourer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date         ON public.labour_payments(contractor_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_labourer     ON public.labour_payments(labourer_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date         ON public.service_expenses(contractor_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expense_alloc_exp     ON public.service_expense_allocations(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_alloc_lab     ON public.service_expense_allocations(labourer_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Access helpers (SECURITY DEFINER so policies never recurse into contractor_members RLS)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.lh_member_role(p_contractor uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT m.role FROM public.contractor_members m
     WHERE m.contractor_id = p_contractor AND m.user_id = auth.uid() AND m.is_active
     LIMIT 1;
$$;

-- Every helper returns a definite true/false (never NULL): callers use `IF NOT helper(...)`,
-- and NOT NULL is NULL, which would silently skip the check.
-- Read: any active member of the contractor, or a CRM admin (read-only).
CREATE OR REPLACE FUNCTION public.lh_can_read(p_contractor uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT COALESCE(auth.uid() IS NOT NULL
       AND (public.lh_member_role(p_contractor) IS NOT NULL OR COALESCE(public.is_admin(), false)), false);
$$;

-- Write: Owner/Manager of an ACTIVE (not archived) contractor. CRM admin role grants no writes.
CREATE OR REPLACE FUNCTION public.lh_can_write(p_contractor uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT COALESCE(auth.uid() IS NOT NULL
       AND COALESCE(public.lh_member_role(p_contractor), '') IN ('Owner', 'Manager')
       AND EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = p_contractor AND c.is_active), false);
$$;

CREATE OR REPLACE FUNCTION public.lh_is_owner(p_contractor uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT COALESCE(auth.uid() IS NOT NULL AND public.lh_member_role(p_contractor) = 'Owner', false);
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Calculation + integrity triggers
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_calculate_work_amount(
    p_rate numeric, p_unit varchar, p_weight_kg numeric, p_bags int, p_batches int
) RETURNS numeric LANGUAGE plpgsql IMMUTABLE SET search_path = public, pg_temp AS $$
BEGIN
    IF p_unit = 'Per 100 kg' THEN RETURN ROUND((COALESCE(p_weight_kg, 0) / 100.0) * p_rate, 2);
    ELSIF p_unit = 'Per bag' THEN RETURN ROUND(COALESCE(p_bags, 0) * p_rate, 2);
    ELSIF p_unit = 'Per batch' THEN RETURN ROUND(COALESCE(p_batches, 0) * p_rate, 2);
    ELSE RETURN ROUND(p_rate, 2);
    END IF;
END;
$$;

-- updated_at + contractor_id immutability for every table that has them.
CREATE OR REPLACE FUNCTION public.lh_touch_row()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.contractor_id IS DISTINCT FROM OLD.contractor_id THEN
            RAISE EXCEPTION 'contractor_id cannot be changed' USING ERRCODE = '23514';
        END IF;
        IF TG_TABLE_NAME IN ('contractors', 'contractor_members', 'labourers', 'daily_work_entries', 'labour_payments', 'service_expenses') THEN
            NEW.updated_at := now();
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- contractors: id is the contractor id; separate immutability/archival rules.
CREATE OR REPLACE FUNCTION public.lh_contractor_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Contractors cannot be deleted; archive them instead (is_active = false)' USING ERRCODE = '23514';
    END IF;
    NEW.id := OLD.id;
    NEW.created_at := OLD.created_at;
    NEW.archived_at := CASE WHEN NEW.is_active THEN NULL ELSE COALESCE(OLD.archived_at, now()) END;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.lh_labourer_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    RAISE EXCEPTION 'Labourers cannot be deleted; deactivate them instead (active_status = false)' USING ERRCODE = '23514';
END;
$$;

-- [C5] No overlapping rate periods; a used rate row can only be closed, never re-priced.
CREATE OR REPLACE FUNCTION public.lh_rate_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    v_last_used date;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended('lh_rate:' || NEW.contractor_id::text || ':' || NEW.work_type, 0));

    IF TG_OP = 'UPDATE' THEN
        SELECT max(work_date) INTO v_last_used FROM public.daily_work_entries WHERE rate_id = OLD.id;
        IF v_last_used IS NOT NULL THEN
            IF NEW.rate <> OLD.rate OR NEW.rate_unit <> OLD.rate_unit OR NEW.work_type <> OLD.work_type
               OR NEW.effective_from <> OLD.effective_from OR NEW.is_editable_rate <> OLD.is_editable_rate THEN
                RAISE EXCEPTION 'Rate is used by work entries; add a new rate period instead of changing it' USING ERRCODE = '23514';
            END IF;
            IF NEW.effective_until IS NOT NULL AND NEW.effective_until < v_last_used THEN
                RAISE EXCEPTION 'Rate period cannot end before its last use (%)', v_last_used USING ERRCODE = '23514';
            END IF;
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.labour_rates r
         WHERE r.contractor_id = NEW.contractor_id AND r.work_type = NEW.work_type AND r.id <> NEW.id
           AND daterange(r.effective_from, r.effective_until, '[]') && daterange(NEW.effective_from, NEW.effective_until, '[]')
    ) THEN
        RAISE EXCEPTION 'Rate period overlaps an existing period for "%"', NEW.work_type USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

-- [C4] Rate from the period valid on work_date; amount must equal rate × quantity (±₹0.01).
-- [C6] An entry's amount cannot drop below what is already allocated.
CREATE OR REPLACE FUNCTION public.lh_work_entry_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    v_rate     public.labour_rates%ROWTYPE;
    v_expected numeric;
    v_alloc    numeric;
BEGIN
    SELECT * INTO v_rate FROM public.labour_rates WHERE id = NEW.rate_id;
    IF NOT FOUND OR v_rate.contractor_id <> NEW.contractor_id THEN
        RAISE EXCEPTION 'Rate does not belong to this contractor' USING ERRCODE = '23514';
    END IF;
    IF v_rate.work_type <> NEW.work_type THEN
        RAISE EXCEPTION 'Rate is for "%", not "%"', v_rate.work_type, NEW.work_type USING ERRCODE = '23514';
    END IF;
    IF NEW.work_date < v_rate.effective_from OR (v_rate.effective_until IS NOT NULL AND NEW.work_date > v_rate.effective_until) THEN
        RAISE EXCEPTION 'Rate is not valid on %', NEW.work_date USING ERRCODE = '23514';
    END IF;
    IF NEW.rate_unit_snapshot <> v_rate.rate_unit THEN
        RAISE EXCEPTION 'Rate unit snapshot "%" does not match the rate ("%")', NEW.rate_unit_snapshot, v_rate.rate_unit USING ERRCODE = '23514';
    END IF;
    IF NOT v_rate.is_editable_rate AND NEW.rate_snapshot <> v_rate.rate THEN
        RAISE EXCEPTION 'Rate snapshot ₹% does not match the rate ₹% valid on %', NEW.rate_snapshot, v_rate.rate, NEW.work_date USING ERRCODE = '23514';
    END IF;

    v_expected := public.fn_calculate_work_amount(NEW.rate_snapshot, NEW.rate_unit_snapshot, NEW.total_weight_kg, NEW.total_bags, NEW.total_batches);
    IF abs(NEW.calculated_labour_amount - v_expected) > 0.01 THEN
        RAISE EXCEPTION 'Labour amount ₹% does not match rate × quantity (₹%)', NEW.calculated_labour_amount, v_expected USING ERRCODE = '23514';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        SELECT COALESCE(sum(allocated_amount), 0) INTO v_alloc FROM public.labour_work_allocations WHERE work_entry_id = NEW.id;
        IF NEW.calculated_labour_amount < v_alloc THEN
            RAISE EXCEPTION 'Labour amount ₹% is below the ₹% already allocated', NEW.calculated_labour_amount, v_alloc USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- Child rows inherit contractor_id from their parent; the labourer must belong to it.
CREATE OR REPLACE FUNCTION public.lh_work_detail_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    SELECT contractor_id INTO NEW.contractor_id FROM public.daily_work_entries WHERE id = NEW.work_entry_id;
    RETURN NEW;
END;
$$;

-- [C6] Lock the parent entry before summing, so concurrent inserts cannot over-allocate.
CREATE OR REPLACE FUNCTION public.lh_work_allocation_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    v_entry public.daily_work_entries%ROWTYPE;
    v_sum   numeric;
BEGIN
    SELECT * INTO v_entry FROM public.daily_work_entries WHERE id = NEW.work_entry_id FOR UPDATE;
    NEW.contractor_id := v_entry.contractor_id;
    IF NOT EXISTS (SELECT 1 FROM public.labourers l WHERE l.id = NEW.labourer_id AND l.contractor_id = v_entry.contractor_id) THEN
        RAISE EXCEPTION 'Labourer does not belong to this contractor' USING ERRCODE = '23514';
    END IF;
    SELECT COALESCE(sum(allocated_amount), 0) + NEW.allocated_amount INTO v_sum
      FROM public.labour_work_allocations
     WHERE work_entry_id = NEW.work_entry_id AND id <> NEW.id;
    IF v_sum > v_entry.calculated_labour_amount THEN
        RAISE EXCEPTION 'कुल आवंटन (₹%) कार्य राशि (₹%) से अधिक नहीं हो सकता।', v_sum, v_entry.calculated_labour_amount USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.lh_payment_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.labourers l WHERE l.id = NEW.labourer_id AND l.contractor_id = NEW.contractor_id) THEN
        RAISE EXCEPTION 'Labourer does not belong to this contractor' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

-- [C1] Contractor expenses are never labourer deductions; allocations ≤ expense amount;
-- a 'Labourer expense' goes to exactly one labourer.
CREATE OR REPLACE FUNCTION public.lh_expense_allocation_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    v_exp   public.service_expenses%ROWTYPE;
    v_sum   numeric;
    v_count int;
BEGIN
    SELECT * INTO v_exp FROM public.service_expenses WHERE id = NEW.expense_id FOR UPDATE;
    NEW.contractor_id := v_exp.contractor_id;
    IF v_exp.allocation_scope = 'Contractor expense' THEN
        RAISE EXCEPTION 'A contractor expense cannot be allocated to labourers' USING ERRCODE = '23514';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.labourers l WHERE l.id = NEW.labourer_id AND l.contractor_id = v_exp.contractor_id) THEN
        RAISE EXCEPTION 'Labourer does not belong to this contractor' USING ERRCODE = '23514';
    END IF;
    SELECT COALESCE(sum(allocated_amount), 0) + NEW.allocated_amount, count(*) + 1 INTO v_sum, v_count
      FROM public.service_expense_allocations WHERE expense_id = NEW.expense_id AND id <> NEW.id;
    IF v_sum > v_exp.amount THEN
        RAISE EXCEPTION 'Allocated deductions (₹%) exceed the expense (₹%)', v_sum, v_exp.amount USING ERRCODE = '23514';
    END IF;
    IF v_exp.allocation_scope = 'Labourer expense' AND v_count > 1 THEN
        RAISE EXCEPTION 'A labourer expense is allocated to exactly one labourer' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

-- An expense can't shrink below its allocations or become a contractor expense while allocated.
CREATE OR REPLACE FUNCTION public.lh_expense_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    v_sum numeric;
BEGIN
    SELECT COALESCE(sum(allocated_amount), 0) INTO v_sum FROM public.service_expense_allocations WHERE expense_id = NEW.id;
    IF v_sum > NEW.amount THEN
        RAISE EXCEPTION 'Expense amount ₹% is below the ₹% already allocated', NEW.amount, v_sum USING ERRCODE = '23514';
    END IF;
    IF NEW.allocation_scope = 'Contractor expense' AND v_sum > 0 THEN
        RAISE EXCEPTION 'Remove labourer allocations before making this a contractor expense' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger bindings (re-runnable). Names sort so lh_10_* (guards) run before lh_90_touch.
DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['contractor_members','labourers','labour_rates','daily_work_entries','daily_work_details',
                             'labour_work_allocations','labour_payments','service_expenses','service_expense_allocations'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS lh_90_touch ON public.%I', t);
        EXECUTE format('CREATE TRIGGER lh_90_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.lh_touch_row()', t);
    END LOOP;
END $$;

DROP TRIGGER IF EXISTS lh_10_contractor_guard ON public.contractors;
CREATE TRIGGER lh_10_contractor_guard BEFORE UPDATE OR DELETE ON public.contractors
    FOR EACH ROW EXECUTE FUNCTION public.lh_contractor_guard();
DROP TRIGGER IF EXISTS lh_10_labourer_guard ON public.labourers;
CREATE TRIGGER lh_10_labourer_guard BEFORE DELETE ON public.labourers
    FOR EACH ROW EXECUTE FUNCTION public.lh_labourer_guard();
DROP TRIGGER IF EXISTS lh_10_rate_guard ON public.labour_rates;
CREATE TRIGGER lh_10_rate_guard BEFORE INSERT OR UPDATE ON public.labour_rates
    FOR EACH ROW EXECUTE FUNCTION public.lh_rate_guard();
DROP TRIGGER IF EXISTS lh_10_work_entry_guard ON public.daily_work_entries;
CREATE TRIGGER lh_10_work_entry_guard BEFORE INSERT OR UPDATE ON public.daily_work_entries
    FOR EACH ROW EXECUTE FUNCTION public.lh_work_entry_guard();
DROP TRIGGER IF EXISTS lh_10_work_detail_guard ON public.daily_work_details;
CREATE TRIGGER lh_10_work_detail_guard BEFORE INSERT ON public.daily_work_details
    FOR EACH ROW EXECUTE FUNCTION public.lh_work_detail_guard();
DROP TRIGGER IF EXISTS lh_10_work_allocation_guard ON public.labour_work_allocations;
CREATE TRIGGER lh_10_work_allocation_guard BEFORE INSERT OR UPDATE ON public.labour_work_allocations
    FOR EACH ROW EXECUTE FUNCTION public.lh_work_allocation_guard();
DROP TRIGGER IF EXISTS lh_10_payment_guard ON public.labour_payments;
CREATE TRIGGER lh_10_payment_guard BEFORE INSERT OR UPDATE ON public.labour_payments
    FOR EACH ROW EXECUTE FUNCTION public.lh_payment_guard();
DROP TRIGGER IF EXISTS lh_10_expense_guard ON public.service_expenses;
CREATE TRIGGER lh_10_expense_guard BEFORE UPDATE ON public.service_expenses
    FOR EACH ROW EXECUTE FUNCTION public.lh_expense_guard();
DROP TRIGGER IF EXISTS lh_10_expense_allocation_guard ON public.service_expense_allocations;
CREATE TRIGGER lh_10_expense_allocation_guard BEFORE INSERT OR UPDATE ON public.service_expense_allocations
    FOR EACH ROW EXECUTE FUNCTION public.lh_expense_allocation_guard();

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Administration functions (membership is managed only here; no direct writes)
-- ────────────────────────────────────────────────────────────────────────────
-- CRM admin provisions a contractor and its first Owner (labour records stay read-only for admins).
CREATE OR REPLACE FUNCTION public.lh_admin_create_contractor(
    p_name varchar, p_owner_user_id uuid, p_phone varchar DEFAULT NULL, p_business_name varchar DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid;
BEGIN
    IF NOT COALESCE(public.is_admin(), false) THEN
        RAISE EXCEPTION 'Only a CRM admin can create contractors' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.contractors (name, phone, business_name) VALUES (p_name, p_phone, p_business_name) RETURNING id INTO v_id;
    INSERT INTO public.contractor_members (contractor_id, user_id, role) VALUES (v_id, p_owner_user_id, 'Owner');
    RETURN v_id;
END;
$$;

-- Owner (or CRM admin) adds, changes or deactivates a member. Members are never deleted.
CREATE OR REPLACE FUNCTION public.lh_set_member(
    p_contractor uuid, p_user_id uuid, p_role varchar, p_is_active boolean DEFAULT true
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF NOT (public.lh_is_owner(p_contractor) OR COALESCE(public.is_admin(), false)) THEN
        RAISE EXCEPTION 'Only the contractor owner or a CRM admin can manage members' USING ERRCODE = '42501';
    END IF;
    IF p_user_id = auth.uid() AND NOT COALESCE(public.is_admin(), false) THEN
        RAISE EXCEPTION 'Owners cannot change their own membership' USING ERRCODE = '42501';
    END IF;
    INSERT INTO public.contractor_members (contractor_id, user_id, role, is_active)
    VALUES (p_contractor, p_user_id, p_role, p_is_active)
    ON CONFLICT (contractor_id, user_id) DO UPDATE SET role = EXCLUDED.role, is_active = EXCLUDED.is_active;
END;
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Reporting views — security_invoker: RLS of the querying user applies [B4]
-- ────────────────────────────────────────────────────────────────────────────
-- Per-labourer work lines: the row-level source for the Labour Summary page.
-- Weight is the labourer's pro-rata share of the entry [C2].
CREATE OR REPLACE VIEW public.v_labour_work_lines WITH (security_invoker = true) AS
SELECT
    lwa.id                    AS allocation_id,
    dwe.id                    AS work_entry_id,
    dwe.contractor_id,
    dwe.work_date,
    dwe.work_type,
    lwa.labourer_id,
    l.name                    AS labourer_name,
    l.local_id                AS labourer_local_id,
    dwe.rate_snapshot,
    dwe.rate_unit_snapshot,
    dwe.total_weight_kg       AS entry_weight_kg,
    dwe.total_bags            AS entry_bags,
    dwe.total_batches         AS entry_batches,
    dwe.calculated_labour_amount AS entry_amount,
    lwa.allocated_amount,
    ROUND(CASE WHEN dwe.calculated_labour_amount > 0
               THEN dwe.total_weight_kg * lwa.allocated_amount / dwe.calculated_labour_amount
               ELSE dwe.total_weight_kg / NULLIF(count(*) OVER (PARTITION BY dwe.id), 0) END, 2) AS allocated_weight_kg
FROM public.labour_work_allocations lwa
JOIN public.daily_work_entries dwe ON dwe.id = lwa.work_entry_id
JOIN public.labourers l ON l.id = lwa.labourer_id;

CREATE OR REPLACE VIEW public.v_daily_contractor_summary WITH (security_invoker = true) AS
WITH daily_work AS (
    SELECT contractor_id, work_date, count(*) AS work_entries_count,
           sum(total_weight_kg) AS total_weight_kg, sum(calculated_labour_amount) AS total_labour_earned
      FROM public.daily_work_entries GROUP BY contractor_id, work_date
),
daily_alloc AS (
    SELECT contractor_id, work_date, sum(allocated_amount) AS total_allocated_earnings
      FROM public.v_labour_work_lines GROUP BY contractor_id, work_date
),
daily_pays AS (
    SELECT contractor_id, payment_date, sum(amount) AS total_payments
      FROM public.labour_payments GROUP BY contractor_id, payment_date
),
daily_exps AS (
    SELECT contractor_id, expense_date,
           sum(amount) AS total_service_expenses,
           sum(amount) FILTER (WHERE allocation_scope = 'Contractor expense') AS contractor_borne_expenses
      FROM public.service_expenses GROUP BY contractor_id, expense_date
),
daily_deduct AS ( -- [C1] only what is actually allocated to labourers
    SELECT sea.contractor_id, se.expense_date, sum(sea.allocated_amount) AS labourer_allocated_deductions
      FROM public.service_expense_allocations sea
      JOIN public.service_expenses se ON se.id = sea.expense_id
     GROUP BY sea.contractor_id, se.expense_date
),
all_dates AS (
    SELECT contractor_id, work_date AS d FROM daily_work
    UNION SELECT contractor_id, payment_date FROM daily_pays
    UNION SELECT contractor_id, expense_date FROM daily_exps
)
SELECT
    a.contractor_id,
    c.name AS contractor_name,
    a.d AS report_date,
    COALESCE(w.work_entries_count, 0) AS work_entries_count,
    COALESCE(w.total_weight_kg, 0) AS total_weight_kg,
    COALESCE(w.total_labour_earned, 0) AS total_labour_earned,
    COALESCE(al.total_allocated_earnings, 0) AS total_allocated_earnings,
    COALESCE(p.total_payments, 0) AS total_payments,
    COALESCE(e.total_service_expenses, 0) AS total_service_expenses,
    COALESCE(e.contractor_borne_expenses, 0) AS contractor_borne_expenses,
    COALESCE(dd.labourer_allocated_deductions, 0) AS labourer_allocated_deductions,
    COALESCE(e.total_service_expenses, 0) - COALESCE(e.contractor_borne_expenses, 0)
        - COALESCE(dd.labourer_allocated_deductions, 0) AS unallocated_labour_expenses,
    COALESCE(al.total_allocated_earnings, 0) - COALESCE(p.total_payments, 0)
        - COALESCE(dd.labourer_allocated_deductions, 0) AS outstanding_payable_balance
FROM all_dates a
JOIN public.contractors c ON c.id = a.contractor_id
LEFT JOIN daily_work w    ON w.contractor_id = a.contractor_id AND w.work_date = a.d
LEFT JOIN daily_alloc al  ON al.contractor_id = a.contractor_id AND al.work_date = a.d
LEFT JOIN daily_pays p    ON p.contractor_id = a.contractor_id AND p.payment_date = a.d
LEFT JOIN daily_exps e    ON e.contractor_id = a.contractor_id AND e.expense_date = a.d
LEFT JOIN daily_deduct dd ON dd.contractor_id = a.contractor_id AND dd.expense_date = a.d;

CREATE OR REPLACE VIEW public.v_weekly_contractor_summary WITH (security_invoker = true) AS
SELECT contractor_id, contractor_name,
       date_trunc('week', report_date)::date AS week_start_date,
       (date_trunc('week', report_date) + interval '6 days')::date AS week_end_date,
       count(DISTINCT report_date) FILTER (WHERE work_entries_count > 0) AS active_working_days,
       sum(work_entries_count) AS total_work_count,
       sum(total_weight_kg) AS total_weight_kg,
       sum(total_labour_earned) AS total_labour_earned,
       sum(total_allocated_earnings) AS total_allocated_earnings,
       sum(total_payments) AS total_payments,
       sum(total_service_expenses) AS total_service_expenses,
       sum(contractor_borne_expenses) AS contractor_borne_expenses,
       sum(labourer_allocated_deductions) AS labourer_allocated_deductions,
       sum(unallocated_labour_expenses) AS unallocated_labour_expenses,
       sum(outstanding_payable_balance) AS total_outstanding_balance
  FROM public.v_daily_contractor_summary
 GROUP BY contractor_id, contractor_name, date_trunc('week', report_date);

CREATE OR REPLACE VIEW public.v_monthly_contractor_summary WITH (security_invoker = true) AS
SELECT contractor_id, contractor_name,
       to_char(report_date, 'YYYY-MM') AS month_str,
       count(DISTINCT report_date) FILTER (WHERE work_entries_count > 0) AS total_working_days,
       sum(total_weight_kg) AS total_weight_processed_kg,
       sum(total_labour_earned) AS total_labour_earned,
       sum(total_allocated_earnings) AS total_allocated_earnings,
       sum(total_payments) AS total_payments,
       sum(total_service_expenses) AS total_service_expenses,
       sum(contractor_borne_expenses) AS contractor_borne_expenses,
       sum(labourer_allocated_deductions) AS total_allocated_service_deductions,
       sum(unallocated_labour_expenses) AS unallocated_labour_expenses,
       sum(outstanding_payable_balance) AS remaining_payable_balance
  FROM public.v_daily_contractor_summary
 GROUP BY contractor_id, contractor_name, to_char(report_date, 'YYYY-MM');

CREATE OR REPLACE VIEW public.v_individual_monthly_statement WITH (security_invoker = true) AS
WITH lab_work AS (
    SELECT labourer_id, to_char(work_date, 'YYYY-MM') AS month_str,
           count(DISTINCT work_date) AS work_days,             -- [C3] work dates only
           count(DISTINCT work_entry_id) AS total_work_entries,
           sum(allocated_weight_kg) AS total_weight_kg,        -- [C2] pro-rata share
           sum(allocated_amount) AS total_earned
      FROM public.v_labour_work_lines GROUP BY labourer_id, to_char(work_date, 'YYYY-MM')
),
lab_pays AS (
    SELECT labourer_id, to_char(payment_date, 'YYYY-MM') AS month_str, sum(amount) AS total_paid
      FROM public.labour_payments GROUP BY labourer_id, to_char(payment_date, 'YYYY-MM')
),
lab_deductions AS (
    SELECT sea.labourer_id, to_char(se.expense_date, 'YYYY-MM') AS month_str, sum(sea.allocated_amount) AS allocated_deductions
      FROM public.service_expense_allocations sea
      JOIN public.service_expenses se ON se.id = sea.expense_id
     GROUP BY sea.labourer_id, to_char(se.expense_date, 'YYYY-MM')
),
all_months AS (
    SELECT labourer_id, month_str FROM lab_work
    UNION SELECT labourer_id, month_str FROM lab_pays
    UNION SELECT labourer_id, month_str FROM lab_deductions
)
SELECT
    m.labourer_id, l.contractor_id, c.name AS contractor_name, l.local_id,
    l.name AS labourer_name, l.phone AS labourer_phone, l.role AS labourer_role, l.active_status,
    m.month_str,
    COALESCE(w.work_days, 0) AS working_days,
    COALESCE(w.total_work_entries, 0) AS total_work_entries,
    COALESCE(w.total_weight_kg, 0) AS total_weight_kg,
    COALESCE(w.total_earned, 0) AS total_earned,
    COALESCE(p.total_paid, 0) AS total_paid,
    COALESCE(d.allocated_deductions, 0) AS allocated_service_expenses,
    COALESCE(w.total_earned, 0) - COALESCE(p.total_paid, 0) - COALESCE(d.allocated_deductions, 0) AS remaining_balance,
    '📋 *लेबर हिसाब पर्ची — ' || c.name || '*' || E'\n' ||
    '━━━━━━━━━━━━━━━━━━━━━━━━━━' || E'\n' ||
    '👤 मज़दूर: *' || l.name || '*' || E'\n' ||
    '🆔 कोड: ' || l.local_id || E'\n' ||
    '📅 महीना: *' || m.month_str || '*' || E'\n' ||
    '━━━━━━━━━━━━━━━━━━━━━━━━━━' || E'\n' ||
    '👷 कुल कार्य दिवस: ' || COALESCE(w.work_days, 0) || ' दिन' || E'\n' ||
    '💰 कुल मजदूरी कमाई: ₹' || to_char(COALESCE(w.total_earned, 0), 'FM999,999,990.00') || E'\n' ||
    '💵 दिया गया भुगतान: ₹' || to_char(COALESCE(p.total_paid, 0), 'FM999,999,990.00') || E'\n' ||
    '☕ सेवा कटौती: ₹' || to_char(COALESCE(d.allocated_deductions, 0), 'FM999,999,990.00') || E'\n' ||
    '━━━━━━━━━━━━━━━━━━━━━━━━━━' || E'\n' ||
    '🔴 *देय बकाया राशि: ₹' || to_char(COALESCE(w.total_earned, 0) - COALESCE(p.total_paid, 0) - COALESCE(d.allocated_deductions, 0), 'FM999,999,990.00') || '*' || E'\n' ||
    '━━━━━━━━━━━━━━━━━━━━━━━━━━' || E'\n' ||
    '📲 LabourHisaab App' AS whatsapp_share_text
FROM all_months m
JOIN public.labourers l   ON l.id = m.labourer_id
JOIN public.contractors c ON c.id = l.contractor_id
LEFT JOIN lab_work w       ON w.labourer_id = m.labourer_id AND w.month_str = m.month_str
LEFT JOIN lab_pays p       ON p.labourer_id = m.labourer_id AND p.month_str = m.month_str
LEFT JOIN lab_deductions d ON d.labourer_id = m.labourer_id AND d.month_str = m.month_str;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Row Level Security [B1, B2]
--    SELECT: members + CRM admins. INSERT/UPDATE/DELETE: Owner/Manager of an active
--    contractor. No policy mentions anon, and anon has no grants at all.
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    t text;
    p text;
BEGIN
    FOREACH t IN ARRAY ARRAY['contractors','contractor_members','labourers','labour_rates','daily_work_entries',
                             'daily_work_details','labour_work_allocations','labour_payments','service_expenses',
                             'service_expense_allocations'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        -- Drop every existing policy on the table (including the 247 USING(true) ones) for a clean re-run.
        FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
            EXECUTE format('DROP POLICY %I ON public.%I', p, t);
        END LOOP;
    END LOOP;

    FOREACH t IN ARRAY ARRAY['labourers','labour_rates','daily_work_entries','daily_work_details',
                             'labour_work_allocations','labour_payments','service_expenses','service_expense_allocations'] LOOP
        EXECUTE format('CREATE POLICY lh_read ON public.%I FOR SELECT TO authenticated USING (public.lh_can_read(contractor_id))', t);
        EXECUTE format('CREATE POLICY lh_insert ON public.%I FOR INSERT TO authenticated WITH CHECK (public.lh_can_write(contractor_id))', t);
        EXECUTE format('CREATE POLICY lh_update ON public.%I FOR UPDATE TO authenticated USING (public.lh_can_write(contractor_id)) WITH CHECK (public.lh_can_write(contractor_id))', t);
    END LOOP;

    -- Deletes: only rows that are corrections of mistakes (closed months are locked by 250).
    -- Never contractors/labourers (guards above) and never members.
    FOREACH t IN ARRAY ARRAY['labour_rates','daily_work_entries','daily_work_details','labour_work_allocations',
                             'labour_payments','service_expenses','service_expense_allocations'] LOOP
        EXECUTE format('CREATE POLICY lh_delete ON public.%I FOR DELETE TO authenticated USING (public.lh_can_write(contractor_id))', t);
    END LOOP;
END $$;

-- [C4/C5 for child rows] work details may not reference another contractor's entry
-- (contractor_id is forced from the parent in the guard trigger above).

CREATE POLICY lh_read ON public.contractors FOR SELECT TO authenticated USING (public.lh_can_read(id));
CREATE POLICY lh_update ON public.contractors FOR UPDATE TO authenticated
    USING (public.lh_is_owner(id)) WITH CHECK (public.lh_is_owner(id));       -- rename / archive / reactivate
CREATE POLICY lh_read ON public.contractor_members FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.lh_is_owner(contractor_id) OR COALESCE(public.is_admin(), false));

-- ────────────────────────────────────────────────────────────────────────────
-- 8. Grants: authenticated only; anon nothing.
-- ────────────────────────────────────────────────────────────────────────────
REVOKE ALL ON public.contractors, public.contractor_members, public.labourers, public.labour_rates,
              public.daily_work_entries, public.daily_work_details, public.labour_work_allocations,
              public.labour_payments, public.service_expenses, public.service_expense_allocations,
              public.v_labour_work_lines, public.v_daily_contractor_summary, public.v_weekly_contractor_summary,
              public.v_monthly_contractor_summary, public.v_individual_monthly_statement
    FROM PUBLIC, anon, authenticated;

GRANT SELECT, UPDATE ON public.contractors TO authenticated;           -- no INSERT (admin function), no DELETE
GRANT SELECT ON public.contractor_members TO authenticated;            -- writes via lh_set_member only
GRANT SELECT, INSERT, UPDATE ON public.labourers TO authenticated;     -- no DELETE (deactivate)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.labour_rates, public.daily_work_entries, public.daily_work_details,
      public.labour_work_allocations, public.labour_payments, public.service_expenses,
      public.service_expense_allocations TO authenticated;
GRANT SELECT ON public.v_labour_work_lines, public.v_daily_contractor_summary, public.v_weekly_contractor_summary,
      public.v_monthly_contractor_summary, public.v_individual_monthly_statement TO authenticated;

REVOKE ALL ON FUNCTION public.lh_member_role(uuid), public.lh_can_read(uuid), public.lh_can_write(uuid),
                       public.lh_is_owner(uuid), public.fn_calculate_work_amount(numeric, varchar, numeric, int, int),
                       public.lh_admin_create_contractor(varchar, uuid, varchar, varchar),
                       public.lh_set_member(uuid, uuid, varchar, boolean)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lh_member_role(uuid), public.lh_can_read(uuid), public.lh_can_write(uuid),
                          public.lh_is_owner(uuid), public.fn_calculate_work_amount(numeric, varchar, numeric, int, int),
                          public.lh_admin_create_contractor(varchar, uuid, varchar, varchar),
                          public.lh_set_member(uuid, uuid, varchar, boolean)
    TO authenticated;
REVOKE ALL ON FUNCTION public.lh_touch_row(), public.lh_contractor_guard(), public.lh_labourer_guard(),
                       public.lh_rate_guard(), public.lh_work_entry_guard(), public.lh_work_detail_guard(),
                       public.lh_work_allocation_guard(), public.lh_payment_guard(), public.lh_expense_guard(),
                       public.lh_expense_allocation_guard()
    FROM PUBLIC, anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
