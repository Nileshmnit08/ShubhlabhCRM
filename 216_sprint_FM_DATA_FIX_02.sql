-- ============================================================================
-- Migration: 216_sprint_FM_DATA_FIX_02.sql
-- Sprint: CRM-FIELD-MOBILITY-DATA-FIX-02
-- Description:
--   Fixes vw_field_session_reconciliation to:
--     1. Count actual crm_visits directly (not via segment link table)
--        so CRM Visits is never 0 when real visits exist.
--     2. Surface daily_travel_expenses.calculated_amount as expense_total
--        so Total Expenses reflects the FM KM reimbursement.
-- Root Causes Fixed:
--   A. linked_visit_count relied on field_visit_travel_links (a segment-matching
--      side table) instead of directly counting crm_visits by staff_id + date.
--      If no segments were matched, visits appeared as 0.
--   B. expense_total came from field_expenses (ad-hoc receipt submissions),
--      not from daily_travel_expenses (KM reimbursement). For most staff the
--      field_expenses table is empty → total showed ₹0.
-- ============================================================================

CREATE OR REPLACE VIEW public.vw_field_session_reconciliation AS
SELECT
    s.id                            AS session_id,
    s.staff_id,
    s.business_date,
    s.started_at,
    s.ended_at,
    s.verified_distance_meters,
    s.total_distance_km,

    -- Travel segment counts (FM engine)
    (SELECT COUNT(*)
     FROM public.field_travel_segments ts
     WHERE ts.session_id = s.id)   AS travel_segment_count,

    COALESCE(
        (SELECT SUM(ts.distance_meters)
         FROM public.field_travel_segments ts
         WHERE ts.session_id = s.id),
        0
    )                               AS sum_segment_distance,

    -- -----------------------------------------------------------------------
    -- FIX A: Count actual crm_visits directly by staff_id and date.
    --        The previous query counted via field_visit_travel_links which
    --        requires segment-matching to have run first — causing 0 when
    --        no segments were matched even though visits existed.
    -- -----------------------------------------------------------------------
    (SELECT COUNT(DISTINCT v.id)
     FROM public.crm_visits v
     WHERE v.staff_id = s.staff_id
       AND v.started_at::DATE = s.business_date
    )                               AS linked_visit_count,

    -- Keep legacy segment-linked count as a secondary diagnostic column
    (SELECT COUNT(DISTINCT vl.visit_id)
     FROM public.field_travel_segments ts
     JOIN public.field_visit_travel_links vl ON ts.id = vl.travel_segment_id
     WHERE ts.session_id = s.id)   AS segment_linked_visit_count,

    -- field_expenses (receipt submissions from FA mobile)
    (SELECT COUNT(*)
     FROM public.field_expenses e
     WHERE e.session_id = s.id)    AS field_expense_count,

    COALESCE(
        (SELECT SUM(e.amount)
         FROM public.field_expenses e
         WHERE e.session_id = s.id),
        0
    )                               AS field_expense_total,

    -- -----------------------------------------------------------------------
    -- FIX B: Surface daily_travel_expenses.calculated_amount as expense_total.
    --        The previous query used field_expenses (per-receipt submissions)
    --        which is empty for most staff → showed ₹0 even though daily
    --        KM reimbursement was calculated.
    -- -----------------------------------------------------------------------
    COALESCE(
        (SELECT dte.calculated_amount
         FROM public.daily_travel_expenses dte
         WHERE dte.staff_id = s.staff_id
           AND dte.business_date = s.business_date
         LIMIT 1),
        0
    )                               AS expense_total,

    -- Expense status from daily_travel_expenses
    (SELECT dte.status
     FROM public.daily_travel_expenses dte
     WHERE dte.staff_id = s.staff_id
       AND dte.business_date = s.business_date
     LIMIT 1)                       AS daily_expense_status,

    -- Applicable rate
    (SELECT dte.applicable_rate_per_km
     FROM public.daily_travel_expenses dte
     WHERE dte.staff_id = s.staff_id
       AND dte.business_date = s.business_date
     LIMIT 1)                       AS applicable_rate_per_km,

    -- Evidence quality
    CASE
        WHEN ABS(
            s.verified_distance_meters -
            COALESCE(
                (SELECT SUM(ts.distance_meters)
                 FROM public.field_travel_segments ts
                 WHERE ts.session_id = s.id),
                0
            )
        ) > 15 THEN 'DATA_INCONSISTENCY'
        WHEN s.verified_distance_meters > 0
         AND (SELECT COUNT(*) FROM public.field_expenses e WHERE e.session_id = s.id) > 0
            THEN 'SUPPORTED'
        WHEN s.verified_distance_meters = 0
         AND (SELECT COUNT(*) FROM public.field_expenses e WHERE e.session_id = s.id) > 0
            THEN 'NO_MOBILITY_EVIDENCE'
        WHEN s.verified_distance_meters > 0
            THEN 'PARTIAL'
        ELSE 'AMBIGUOUS'
    END                             AS mobility_evidence_status

FROM public.staff_tracking_sessions s;
