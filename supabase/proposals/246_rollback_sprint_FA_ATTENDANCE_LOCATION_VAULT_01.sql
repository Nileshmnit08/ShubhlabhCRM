-- ============================================================================
-- ROLLBACK for 246_sprint_FA_ATTENDANCE_LOCATION_VAULT_01.sql
-- STATUS: PROPOSED — NOT APPLIED — REQUIRES PRODUCT OWNER APPROVAL
--
-- Restores coordinates onto staff_attendance and the proposal-243 constraints,
-- keeping table-level SELECT (the pre-244 state: employees can read their OWN
-- row's coordinates through the API; nobody else's). Do NOT follow this with
-- 244 as written: that breaks every attendance upload (42501).
--
-- Limitations:
--   - Rows whose vault status is CAPTURED/LOW_ACCURACY get their coordinates
--     back. Vault rows without a matching attendance row are kept in the vault.
--   - The vault table is kept (renamed) as an audit copy, owner-only.
-- ============================================================================

BEGIN;

DROP TRIGGER IF EXISTS trg_fa_attendance_zz_vault_location ON public.staff_attendance;
DROP FUNCTION IF EXISTS public.fa_attendance_vault_location();

ALTER TABLE public.staff_attendance DROP CONSTRAINT IF EXISTS staff_attendance_check_in_location_valid;
ALTER TABLE public.staff_attendance DROP CONSTRAINT IF EXISTS staff_attendance_check_out_location_valid;

-- Copy coordinates back (enforce trigger off: its first-wins rule would block the restore).
ALTER TABLE public.staff_attendance DISABLE TRIGGER trg_fa_attendance_enforce;
UPDATE public.staff_attendance a
   SET check_in_latitude = v.latitude, check_in_longitude = v.longitude
  FROM public.staff_attendance_location_vault v
 WHERE v.staff_id = a.staff_id AND v.business_date = a.business_date AND v.event = 'CHECK_IN'
   AND a.check_in_location_status IN ('CAPTURED','LOW_ACCURACY');
UPDATE public.staff_attendance a
   SET check_out_latitude = v.latitude, check_out_longitude = v.longitude
  FROM public.staff_attendance_location_vault v
 WHERE v.staff_id = a.staff_id AND v.business_date = a.business_date AND v.event = 'CHECK_OUT'
   AND a.check_out_location_status IN ('CAPTURED','LOW_ACCURACY');
ALTER TABLE public.staff_attendance ENABLE TRIGGER trg_fa_attendance_enforce;

-- Exact 243 constraints. NOT VALID: rows with a status but no vaulted coordinates
-- (should not exist) would otherwise abort the rollback; validate after review.
ALTER TABLE public.staff_attendance ADD CONSTRAINT staff_attendance_check_in_location_valid CHECK (
    (check_in_location_status IS NULL OR check_in_location_status IN
        ('CAPTURED','LOW_ACCURACY','PERMISSION_DENIED','PERMISSION_BLOCKED','SERVICES_DISABLED','TIMEOUT','STALE','UNAVAILABLE'))
    AND ((check_in_latitude IS NULL) = (check_in_longitude IS NULL))
    AND (check_in_latitude  IS NULL OR (check_in_latitude  BETWEEN -90  AND 90))
    AND (check_in_longitude IS NULL OR (check_in_longitude BETWEEN -180 AND 180))
    AND (check_in_accuracy_m IS NULL OR check_in_accuracy_m >= 0)
    AND ((check_in_latitude IS NOT NULL) = (COALESCE(check_in_location_status, '') IN ('CAPTURED','LOW_ACCURACY')))
    AND (check_in_accuracy_m IS NULL OR check_in_latitude IS NOT NULL)
) NOT VALID;
ALTER TABLE public.staff_attendance ADD CONSTRAINT staff_attendance_check_out_location_valid CHECK (
    (check_out_location_status IS NULL OR check_out_location_status IN
        ('CAPTURED','LOW_ACCURACY','PERMISSION_DENIED','PERMISSION_BLOCKED','SERVICES_DISABLED','TIMEOUT','STALE','UNAVAILABLE'))
    AND ((check_out_latitude IS NULL) = (check_out_longitude IS NULL))
    AND (check_out_latitude  IS NULL OR (check_out_latitude  BETWEEN -90  AND 90))
    AND (check_out_longitude IS NULL OR (check_out_longitude BETWEEN -180 AND 180))
    AND (check_out_accuracy_m IS NULL OR check_out_accuracy_m >= 0)
    AND ((check_out_latitude IS NOT NULL) = (COALESCE(check_out_location_status, '') IN ('CAPTURED','LOW_ACCURACY')))
    AND (check_out_accuracy_m IS NULL OR check_out_latitude IS NOT NULL)
    AND (check_out_location_status IS NULL OR check_out_at IS NOT NULL)
) NOT VALID;

-- Admin function back to reading the row (244 body).
CREATE OR REPLACE FUNCTION public.admin_attendance_locations(p_from date, p_to date, p_staff uuid DEFAULT NULL)
RETURNS TABLE (
    attendance_id uuid, staff_id uuid, business_date date,
    check_in_latitude double precision, check_in_longitude double precision, check_in_accuracy_m real,
    check_in_location_at timestamptz, check_in_location_status text,
    check_out_latitude double precision, check_out_longitude double precision, check_out_accuracy_m real,
    check_out_location_at timestamptz, check_out_location_status text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Not authorised to read attendance locations' USING ERRCODE = '42501';
    END IF;
    IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 92 THEN
        RAISE EXCEPTION 'Date range must be 0-92 days' USING ERRCODE = '22023';
    END IF;
    RETURN QUERY
        SELECT a.id, a.staff_id, a.business_date,
               a.check_in_latitude, a.check_in_longitude, a.check_in_accuracy_m,
               a.check_in_location_at, a.check_in_location_status,
               a.check_out_latitude, a.check_out_longitude, a.check_out_accuracy_m,
               a.check_out_location_at, a.check_out_location_status
          FROM public.staff_attendance a
         WHERE a.business_date BETWEEN p_from AND p_to
           AND (p_staff IS NULL OR a.staff_id = p_staff);
END;
$$;

ALTER TABLE public.staff_attendance_location_vault RENAME TO staff_attendance_location_vault_archive_246;

COMMIT;

NOTIFY pgrst, 'reload schema';
