-- 257_sprint_LH_DAILY_LABOUR_ACTIVE_INACTIVE_01.sql
-- PROPOSAL — Day-wise Active/Inactive status and amount redistribution for labourers (LH-DAILY-LABOUR-ACTIVE-INACTIVE-01).
--
-- 1. Table: public.labour_daily_labourer_status
--    Stores day-wise active/inactive status per labourer per working date.
--    Status is specific to the selected working date, not a permanent change to the labourer's master profile.
-- 2. Function: public.lh_set_labourer_day_status(p_contractor, p_work_date, p_labourer_id, p_is_active, p_reason)
--    Atomically validates that at least one active labourer remains, updates the status,
--    and redistributes the day's calculated labour amounts equally among active labourers in public.labour_work_allocations.
-- 3. Inactive labourers receive ₹0.00 for that day.
-- 4. Calculations always derive from the work entries' original calculated_labour_amount to prevent calculation drift.
-- 5. Rollback: 257_rollback_sprint_LH_DAILY_LABOUR_ACTIVE_INACTIVE_01.sql

BEGIN;

-- ── 1. Create labour_daily_labourer_status ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.labour_daily_labourer_status (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE RESTRICT,
    work_date     date NOT NULL,
    labourer_id   uuid NOT NULL REFERENCES public.labourers(id) ON DELETE RESTRICT,
    is_active     boolean NOT NULL DEFAULT true,
    reason        text,
    updated_by    uuid,
    updated_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_daily_labourer_status UNIQUE (contractor_id, work_date, labourer_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_labourer_status_lookup
    ON public.labour_daily_labourer_status (contractor_id, work_date);

-- ── 2. Row Level Security ───────────────────────────────────────────────────
ALTER TABLE public.labour_daily_labourer_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lh_read ON public.labour_daily_labourer_status;
CREATE POLICY lh_read ON public.labour_daily_labourer_status
    FOR SELECT TO authenticated
    USING (public.lh_can_read(contractor_id));

DROP POLICY IF EXISTS lh_write ON public.labour_daily_labourer_status;
CREATE POLICY lh_write ON public.labour_daily_labourer_status
    FOR ALL TO authenticated
    USING (public.lh_can_enter(contractor_id) OR COALESCE(public.is_admin(), false))
    WITH CHECK (public.lh_can_enter(contractor_id) OR COALESCE(public.is_admin(), false));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.labour_daily_labourer_status TO authenticated;

-- ── 3. Atomic status toggle and redistribution function ─────────────────────
CREATE OR REPLACE FUNCTION public.lh_set_labourer_day_status(
    p_contractor uuid,
    p_work_date date,
    p_labourer_id uuid,
    p_is_active boolean,
    p_reason text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_entry record;
    v_alloc record;
    v_day_labourers uuid[];
    v_active_labourers uuid[];
    v_active_count int;
    v_entry_total numeric;
    v_n int;
    v_share numeric;
    v_sum numeric;
    i int;
    v_current_active boolean;
    v_res jsonb;
BEGIN
    -- 1. Permission check
    IF NOT (COALESCE(public.is_admin(), false) OR public.lh_can_enter(p_contractor)) THEN
        RAISE EXCEPTION 'Permission denied to update labourer daily status' USING ERRCODE = '42501';
    END IF;

    -- 2. Validation
    IF p_contractor IS NULL OR p_work_date IS NULL OR p_labourer_id IS NULL THEN
        RAISE EXCEPTION 'Contractor, work date and labourer id are required' USING ERRCODE = '22023';
    END IF;

    IF p_work_date > (now() AT TIME ZONE 'Asia/Kolkata')::date THEN
        RAISE EXCEPTION 'Work date cannot be in the future' USING ERRCODE = '23514';
    END IF;

    -- Closed month check if settlement proposal 250 is installed
    IF to_regprocedure('public.lh_month_closed(uuid, date)') IS NOT NULL THEN
        IF public.lh_month_closed(p_contractor, p_work_date) THEN
            RAISE EXCEPTION 'Month is closed; labour records are locked' USING ERRCODE = '23514';
        END IF;
    END IF;

    -- Upsert status record
    INSERT INTO public.labour_daily_labourer_status (contractor_id, work_date, labourer_id, is_active, reason, updated_by, updated_at)
    VALUES (p_contractor, p_work_date, p_labourer_id, p_is_active, p_reason, auth.uid(), now())
    ON CONFLICT (contractor_id, work_date, labourer_id)
    DO UPDATE SET is_active = EXCLUDED.is_active,
                  reason = EXCLUDED.reason,
                  updated_by = auth.uid(),
                  updated_at = now();

    -- For each work entry on this date for this contractor
    FOR v_entry IN
        SELECT e.id, e.calculated_labour_amount
          FROM public.daily_work_entries e
         WHERE e.contractor_id = p_contractor AND e.work_date = p_work_date
         FOR UPDATE
    LOOP
        -- Find all labourers assigned to this entry
        SELECT array_agg(lwa.labourer_id)
          INTO v_day_labourers
          FROM public.labour_work_allocations lwa
         WHERE lwa.work_entry_id = v_entry.id;

        IF v_day_labourers IS NULL OR array_length(v_day_labourers, 1) = 0 THEN
            CONTINUE;
        END IF;

        -- Determine active labourers for this entry on this date
        SELECT array_agg(lab_id)
          INTO v_active_labourers
          FROM unnest(v_day_labourers) AS lab_id
         WHERE COALESCE((
             SELECT s.is_active
               FROM public.labour_daily_labourer_status s
              WHERE s.contractor_id = p_contractor
                AND s.work_date = p_work_date
                AND s.labourer_id = lab_id
         ), true) = true;

        v_active_count := COALESCE(array_length(v_active_labourers, 1), 0);

        -- Validation: At least one active labourer must remain
        IF v_active_count = 0 THEN
            RAISE EXCEPTION 'At least one active labourer must remain on this day' USING ERRCODE = '23514';
        END IF;

        v_entry_total := round(v_entry.calculated_labour_amount, 2);
        v_n := v_active_count;
        v_sum := 0;

        -- Update active allocations
        FOR i IN 1..v_n LOOP
            v_share := CASE WHEN i < v_n THEN floor(v_entry_total * 100 / v_n) / 100 ELSE round(v_entry_total - v_sum, 2) END;
            v_sum := v_sum + v_share;

            UPDATE public.labour_work_allocations
               SET allocated_amount = v_share
             WHERE work_entry_id = v_entry.id AND labourer_id = v_active_labourers[i];
        END LOOP;

        -- Set inactive allocations to 0
        UPDATE public.labour_work_allocations
           SET allocated_amount = 0.00
         WHERE work_entry_id = v_entry.id
           AND NOT (labourer_id = ANY(v_active_labourers));
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'contractor_id', p_contractor,
        'work_date', p_work_date,
        'labourer_id', p_labourer_id,
        'is_active', p_is_active
    );
END;
$$;

REVOKE ALL ON FUNCTION public.lh_set_labourer_day_status(uuid, date, uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lh_set_labourer_day_status(uuid, date, uuid, boolean, text) TO authenticated;

COMMIT;

