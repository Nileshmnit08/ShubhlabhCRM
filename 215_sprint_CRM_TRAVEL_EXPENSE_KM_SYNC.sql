-- ============================================================================
-- Migration: 215_sprint_CRM_TRAVEL_EXPENSE_KM_SYNC.sql
-- Sprint: CRM-TRAVEL-EXPENSE-KM-SYNC-01
-- Description:
--   1. Creates vw_get_verified_travel_km — the single authoritative KM source
--      shared by Field Mobility and Travel Expenses.
--   2. Bridges distance_km column between field_travel_segments (FM engine)
--      and the calculate_daily_travel_expense function which previously read
--      total_distance_km from staff_tracking_sessions.
--   3. Re-runs calculate_daily_travel_expense for all existing sessions so
--      daily_travel_expenses.total_distance_km reflects the FM-verified KM.
--   4. Does NOT touch Field Visit, Order, Chat, Auth, Notification, Product,
--      Dispatch logic.
-- ============================================================================


-- ============================================================================
-- STEP 1: Single Source of Truth View
--
-- vw_get_verified_travel_km
--
-- Summarises verified KM per staff per business_date.
-- Consumed by:
--   - Travel Expenses (fetchAggregatedExpenses via daily_travel_expenses)
--   - Field Mobility Staff Summary
--   - Field Mobility Staff Detail
--
-- The authoritative distance is staff_tracking_sessions.total_distance_km
-- which is now written by recalculate_session_distance (214_sprint_FM_KM_FIX)
-- from the unified GPS point stream.
-- ============================================================================

CREATE OR REPLACE VIEW public.vw_get_verified_travel_km AS
SELECT
    s.staff_id,
    s.business_date,

    -- Aggregate all sessions for the same staff+date
    COUNT(s.id)                                             AS session_count,
    SUM(s.verified_distance_meters)                         AS total_verified_meters,
    ROUND(SUM(s.verified_distance_meters) / 1000.0, 3)     AS total_verified_km,

    -- Expose the written total_distance_km (kept in sync by KM FIX engine)
    ROUND(COALESCE(SUM(s.total_distance_km), 0), 3)        AS total_distance_km,

    -- GPS data quality / availability status
    CASE
        WHEN COUNT(s.id) = 0                             THEN 'NO_SESSION'
        WHEN SUM(s.verified_distance_meters) IS NULL     THEN 'GPS_DATA_UNAVAILABLE'
        WHEN SUM(s.verified_distance_meters) = 0        THEN 'INSUFFICIENT_GPS_DATA'
        ELSE                                                  'VERIFIED'
    END AS gps_availability_status,

    -- Calculation source
    'FM_UNIFIED_GPS_JOURNEY'                               AS calculation_source,

    -- Session statuses (open sessions mean calculation is still in progress)
    BOOL_OR(s.status = 'OPEN')                             AS has_open_sessions,
    MIN(s.started_at)                                      AS day_started_at,
    MAX(s.ended_at)                                        AS day_ended_at

FROM public.staff_tracking_sessions s
GROUP BY s.staff_id, s.business_date;


-- ============================================================================
-- STEP 2: Re-sync daily_travel_expenses from FM-verified KM
--
-- The calculate_daily_travel_expense function reads SUM(total_distance_km)
-- from staff_tracking_sessions. The KM FIX engine (214) now writes this
-- correctly. We re-run the calculation for all closed sessions so
-- daily_travel_expenses is in sync.
-- ============================================================================

DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT DISTINCT staff_id, business_date
        FROM public.staff_tracking_sessions
        WHERE status = 'CLOSED'
        ORDER BY business_date
    LOOP
        PERFORM public.calculate_daily_travel_expense(rec.staff_id, rec.business_date);
    END LOOP;
    RAISE NOTICE 'Re-ran expense calculation for all closed sessions.';
END;
$$;


-- ============================================================================
-- STEP 3: Unified segment view
--
-- The existing TravelExpenses page drill-down queries staff_travel_segments
-- (FA engine, keyed on tracking_session_id). The FM engine uses
-- field_travel_segments (keyed on session_id). We create a unified view so
-- the React component can query one place.
-- ============================================================================

CREATE OR REPLACE VIEW public.vw_unified_travel_segments AS

-- FM-04 field_travel_segments (authoritative for KM calculation)
SELECT
    fts.id,
    fts.session_id                      AS tracking_session_id,
    fts.session_id,
    fts.staff_id,
    fts.started_at                      AS from_timestamp,
    fts.ended_at                        AS to_timestamp,
    fts.start_latitude                  AS from_latitude,
    fts.start_longitude                 AS from_longitude,
    fts.end_latitude                    AS to_latitude,
    fts.end_longitude                   AS to_longitude,
    ROUND(fts.distance_meters / 1000.0, 3) AS distance_km,
    fts.distance_meters,
    fts.duration_seconds,
    fts.point_count,
    fts.status,
    'FM_ENGINE'                         AS segment_source,
    NULL::VARCHAR(50)                   AS from_type,
    NULL::UUID                          AS from_reference_id,
    NULL::VARCHAR(50)                   AS to_type,
    NULL::UUID                          AS to_reference_id
FROM public.field_travel_segments fts

UNION ALL

-- FA-TRAVEL-03 staff_travel_segments (legacy segments, only when FM has none)
SELECT
    sts.id,
    sts.tracking_session_id,
    sts.tracking_session_id             AS session_id,
    sts.staff_id,
    sts.from_timestamp,
    sts.to_timestamp,
    sts.from_latitude,
    sts.from_longitude,
    sts.to_latitude,
    sts.to_longitude,
    sts.distance_km,
    ROUND(sts.distance_km * 1000)::INT  AS distance_meters,
    NULL::INT                           AS duration_seconds,
    NULL::INT                           AS point_count,
    sts.status,
    'FA_ENGINE'                         AS segment_source,
    sts.from_type,
    sts.from_reference_id,
    sts.to_type,
    sts.to_reference_id
FROM public.staff_travel_segments sts
WHERE NOT EXISTS (
    SELECT 1 FROM public.field_travel_segments fts2
    WHERE fts2.session_id = sts.tracking_session_id
);


-- ============================================================================
-- STEP 4: Validation query (commented, safe to uncomment and run)
-- ============================================================================

-- SELECT
--     v.staff_id,
--     v.business_date,
--     v.total_verified_km      AS field_mobility_km,
--     d.total_distance_km      AS travel_expenses_km,
--     ABS(v.total_verified_km - COALESCE(d.total_distance_km, 0)) AS km_delta,
--     v.gps_availability_status,
--     d.status                 AS expense_status,
--     d.calculated_amount
-- FROM public.vw_get_verified_travel_km v
-- LEFT JOIN public.daily_travel_expenses d
--     ON d.staff_id = v.staff_id AND d.business_date = v.business_date
-- ORDER BY v.business_date DESC, v.staff_id;
