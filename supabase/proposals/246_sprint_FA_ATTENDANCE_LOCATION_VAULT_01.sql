-- ============================================================================
-- PROPOSED MIGRATION: 246_sprint_FA_ATTENDANCE_LOCATION_VAULT_01.sql
-- SPRINT: FA-ATTENDANCE-PERMISSION-RECOVERY-01 — coordinate privacy that works
--         with the existing Field Assist upsert
--
-- STATUS: PROPOSED — NOT APPLIED — REQUIRES PRODUCT OWNER APPROVAL
-- Lives in supabase/proposals/ so `supabase db push` cannot pick it up.
-- Rollback: supabase/proposals/246_rollback_sprint_FA_ATTENDANCE_LOCATION_VAULT_01.sql
-- Supersedes: proposal 244 (do NOT apply 244 as written).
--
-- PROBLEM
--   244 hides coordinates with column-level SELECT grants. Every Field Assist
--   build writes attendance with
--     INSERT ... ON CONFLICT (staff_id, business_date) DO UPDATE SET col = EXCLUDED.col
--   and PostgreSQL requires SELECT on every column read through EXCLUDED. With
--   244's grants every check-in/check-out fails with
--     42501 permission denied for table staff_attendance
--   (reproduced locally against the real 242/243/244 files, see the report).
--
-- DESIGN: keep coordinates out of the employee-readable row instead of hiding columns.
--   - New table staff_attendance_location_vault: one row per (staff, day, event)
--     with latitude/longitude/accuracy/fix time/status. RLS on, no policies, no
--     grants to API roles: only SECURITY DEFINER code can read or write it.
--   - A BEFORE INSERT/UPDATE trigger on staff_attendance, ordered after
--     fa_attendance_enforce, copies the accepted coordinates into the vault
--     (first value wins, matching the 243 rule) and stores NULL coordinates on
--     staff_attendance. Status, accuracy and fix time stay on the row (243/244
--     treated those as non-precise).
--   - Table-level SELECT on staff_attendance is (re)granted to authenticated, so
--     the existing upsert works for EVERY installed APK, with no client change.
--     Employees can read their own row, whose coordinate columns are always NULL.
--   - admin_attendance_locations() keeps 244's exact signature and is_admin()
--     guard, reading coordinates from the vault: the CRM Attendance Register
--     needs no change.
--   - Existing coordinates are moved into the vault (data migration) and NULLed
--     on staff_attendance. The rollback moves them back.
--
-- WORKS IN EITHER LIVE STATE: whether or not 244 is currently applied.
--
-- PRECONDITIONS (verify read-only first; not verified by this sprint):
--   P1. 242 and 243 are applied; fa_attendance_enforce() matches 243.
--   P2. The role running this file owns staff_attendance (so the SECURITY DEFINER
--       trigger and function bypass RLS on the vault).
--   P3. No other code reads coordinates from staff_attendance directly
--       (repo search: only admin_attendance_locations / CRM register).
--   P4. Proposal 245, if later approved, must be revised to read legacy-mirrored
--       coordinates from the vault (its daily-row copy will be vaulted too).
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Vault table (admin-only through SECURITY DEFINER functions)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_attendance_location_vault (
    staff_id       uuid NOT NULL,
    business_date  date NOT NULL,
    event          text NOT NULL,
    attendance_id  uuid,
    latitude       double precision,
    longitude      double precision,
    accuracy_m     real,
    location_at    timestamptz,
    status         text NOT NULL,
    recorded_at    timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT salv_pk PRIMARY KEY (staff_id, business_date, event),
    CONSTRAINT salv_event_check CHECK (event IN ('CHECK_IN', 'CHECK_OUT')),
    CONSTRAINT salv_status_check CHECK (status IN
        ('CAPTURED','LOW_ACCURACY','PERMISSION_DENIED','PERMISSION_BLOCKED','SERVICES_DISABLED','TIMEOUT','STALE','UNAVAILABLE')),
    CONSTRAINT salv_coords_pair CHECK ((latitude IS NULL) = (longitude IS NULL)),
    CONSTRAINT salv_coords_range CHECK (
        (latitude IS NULL OR latitude BETWEEN -90 AND 90)
        AND (longitude IS NULL OR longitude BETWEEN -180 AND 180)),
    -- Coordinates only for real fixes. (A CAPTURED status without coordinates can
    -- only come from a row written before 243's constraint; it is kept as evidence.)
    CONSTRAINT salv_coords_status CHECK (latitude IS NULL OR status IN ('CAPTURED','LOW_ACCURACY')),
    CONSTRAINT salv_accuracy CHECK (accuracy_m IS NULL OR accuracy_m >= 0)
);
COMMENT ON TABLE public.staff_attendance_location_vault IS
  'FA-ATTENDANCE-LOCATION-VAULT-01: precise attendance coordinates. No API-role access; read via admin_attendance_locations() only. First value per (staff, day, event) wins.';

ALTER TABLE public.staff_attendance_location_vault ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_attendance_location_vault FROM PUBLIC, anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Trigger: move accepted coordinates into the vault
--    Runs after trg_fa_attendance_enforce (triggers fire in name order), so it
--    vaults exactly what the enforce trigger accepted.
--    Upsert note: for INSERT ... ON CONFLICT, BEFORE INSERT triggers run first and
--    EXCLUDED carries their output into the UPDATE. When the day's row already
--    exists the insert will be diverted, so the INSERT phase leaves coordinates
--    untouched and the UPDATE phase (after enforce's first-wins rules) vaults them.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fa_attendance_vault_location()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND EXISTS (
        SELECT 1 FROM public.staff_attendance a
         WHERE a.staff_id = NEW.staff_id AND a.business_date = NEW.business_date
    ) THEN
        RETURN NEW;  -- will take the ON CONFLICT UPDATE path; vaulted there
    END IF;

    -- First value wins. Already-vaulted events are skipped explicitly (not only via
    -- ON CONFLICT): later row versions carry the status with NULL coordinates.
    IF NEW.check_in_location_status IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.staff_attendance_location_vault v
         WHERE v.staff_id = NEW.staff_id AND v.business_date = NEW.business_date AND v.event = 'CHECK_IN'
    ) THEN
        INSERT INTO public.staff_attendance_location_vault
            (staff_id, business_date, event, attendance_id, latitude, longitude, accuracy_m, location_at, status)
        VALUES (NEW.staff_id, NEW.business_date, 'CHECK_IN', NEW.id,
                NEW.check_in_latitude, NEW.check_in_longitude, NEW.check_in_accuracy_m,
                NEW.check_in_location_at, NEW.check_in_location_status)
        ON CONFLICT (staff_id, business_date, event) DO NOTHING;
    END IF;

    IF NEW.check_out_at IS NOT NULL AND NEW.check_out_location_status IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.staff_attendance_location_vault v
         WHERE v.staff_id = NEW.staff_id AND v.business_date = NEW.business_date AND v.event = 'CHECK_OUT'
    ) THEN
        INSERT INTO public.staff_attendance_location_vault
            (staff_id, business_date, event, attendance_id, latitude, longitude, accuracy_m, location_at, status)
        VALUES (NEW.staff_id, NEW.business_date, 'CHECK_OUT', NEW.id,
                NEW.check_out_latitude, NEW.check_out_longitude, NEW.check_out_accuracy_m,
                NEW.check_out_location_at, NEW.check_out_location_status)
        ON CONFLICT (staff_id, business_date, event) DO NOTHING;
    END IF;

    NEW.check_in_latitude := NULL;
    NEW.check_in_longitude := NULL;
    NEW.check_out_latitude := NULL;
    NEW.check_out_longitude := NULL;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.fa_attendance_vault_location() FROM PUBLIC, anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Move existing coordinates into the vault, then clear them on the row.
--    The enforce trigger is disabled for this one statement because its
--    first-wins rule would otherwise restore the old coordinates.
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO public.staff_attendance_location_vault
    (staff_id, business_date, event, attendance_id, latitude, longitude, accuracy_m, location_at, status)
SELECT staff_id, business_date, 'CHECK_IN', id, check_in_latitude, check_in_longitude,
       check_in_accuracy_m, check_in_location_at, check_in_location_status
  FROM public.staff_attendance WHERE check_in_location_status IS NOT NULL
ON CONFLICT (staff_id, business_date, event) DO NOTHING;

INSERT INTO public.staff_attendance_location_vault
    (staff_id, business_date, event, attendance_id, latitude, longitude, accuracy_m, location_at, status)
SELECT staff_id, business_date, 'CHECK_OUT', id, check_out_latitude, check_out_longitude,
       check_out_accuracy_m, check_out_location_at, check_out_location_status
  FROM public.staff_attendance WHERE check_out_location_status IS NOT NULL
ON CONFLICT (staff_id, business_date, event) DO NOTHING;

-- Row constraints: coordinates are never stored on staff_attendance any more.
ALTER TABLE public.staff_attendance DROP CONSTRAINT IF EXISTS staff_attendance_check_in_location_valid;
ALTER TABLE public.staff_attendance DROP CONSTRAINT IF EXISTS staff_attendance_check_out_location_valid;

ALTER TABLE public.staff_attendance DISABLE TRIGGER trg_fa_attendance_enforce;
UPDATE public.staff_attendance
   SET check_in_latitude = NULL, check_in_longitude = NULL,
       check_out_latitude = NULL, check_out_longitude = NULL
 WHERE check_in_latitude IS NOT NULL OR check_out_latitude IS NOT NULL;
ALTER TABLE public.staff_attendance ENABLE TRIGGER trg_fa_attendance_enforce;

-- CHECK constraints run on the PROPOSED insert row before ON CONFLICT detection,
-- i.e. before the UPDATE-phase trigger has vaulted the coordinates. So these
-- validate shape only; "coordinates are never stored here" is guaranteed by
-- trg_fa_attendance_zz_vault_location, which runs on every stored row version.
ALTER TABLE public.staff_attendance ADD CONSTRAINT staff_attendance_check_in_location_valid CHECK (
    (check_in_location_status IS NULL OR check_in_location_status IN
        ('CAPTURED','LOW_ACCURACY','PERMISSION_DENIED','PERMISSION_BLOCKED','SERVICES_DISABLED','TIMEOUT','STALE','UNAVAILABLE'))
    AND ((check_in_latitude IS NULL) = (check_in_longitude IS NULL))
    AND (check_in_latitude  IS NULL OR (check_in_latitude  BETWEEN -90  AND 90))
    AND (check_in_longitude IS NULL OR (check_in_longitude BETWEEN -180 AND 180))
    AND (check_in_latitude IS NULL OR check_in_location_status IN ('CAPTURED','LOW_ACCURACY'))
    AND (check_in_accuracy_m IS NULL OR check_in_accuracy_m >= 0)
);
ALTER TABLE public.staff_attendance ADD CONSTRAINT staff_attendance_check_out_location_valid CHECK (
    (check_out_location_status IS NULL OR check_out_location_status IN
        ('CAPTURED','LOW_ACCURACY','PERMISSION_DENIED','PERMISSION_BLOCKED','SERVICES_DISABLED','TIMEOUT','STALE','UNAVAILABLE'))
    AND ((check_out_latitude IS NULL) = (check_out_longitude IS NULL))
    AND (check_out_latitude  IS NULL OR (check_out_latitude  BETWEEN -90  AND 90))
    AND (check_out_longitude IS NULL OR (check_out_longitude BETWEEN -180 AND 180))
    AND (check_out_latitude IS NULL OR check_out_location_status IN ('CAPTURED','LOW_ACCURACY'))
    AND (check_out_accuracy_m IS NULL OR check_out_accuracy_m >= 0)
    AND (check_out_location_status IS NULL OR check_out_at IS NOT NULL)
);

DROP TRIGGER IF EXISTS trg_fa_attendance_zz_vault_location ON public.staff_attendance;
CREATE TRIGGER trg_fa_attendance_zz_vault_location
    BEFORE INSERT OR UPDATE ON public.staff_attendance
    FOR EACH ROW EXECUTE FUNCTION public.fa_attendance_vault_location();

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Read access: table-level SELECT for authenticated (undoes 244's column
--    grants if present). Safe because coordinates are always NULL on this table.
--    RLS is unchanged: employees still see only their own rows.
-- ────────────────────────────────────────────────────────────────────────────
REVOKE SELECT ON public.staff_attendance FROM authenticated;
GRANT SELECT ON public.staff_attendance TO authenticated;
REVOKE ALL ON public.staff_attendance FROM anon;

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Admin coordinate path (same signature and guard as 244)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_attendance_locations(
    p_from date,
    p_to date,
    p_staff uuid DEFAULT NULL
)
RETURNS TABLE (
    attendance_id uuid,
    staff_id uuid,
    business_date date,
    check_in_latitude double precision,
    check_in_longitude double precision,
    check_in_accuracy_m real,
    check_in_location_at timestamptz,
    check_in_location_status text,
    check_out_latitude double precision,
    check_out_longitude double precision,
    check_out_accuracy_m real,
    check_out_location_at timestamptz,
    check_out_location_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
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
               vi.latitude, vi.longitude, COALESCE(vi.accuracy_m, a.check_in_accuracy_m),
               COALESCE(vi.location_at, a.check_in_location_at), COALESCE(vi.status, a.check_in_location_status),
               vo.latitude, vo.longitude, COALESCE(vo.accuracy_m, a.check_out_accuracy_m),
               COALESCE(vo.location_at, a.check_out_location_at), COALESCE(vo.status, a.check_out_location_status)
          FROM public.staff_attendance a
          LEFT JOIN public.staff_attendance_location_vault vi
                 ON vi.staff_id = a.staff_id AND vi.business_date = a.business_date AND vi.event = 'CHECK_IN'
          LEFT JOIN public.staff_attendance_location_vault vo
                 ON vo.staff_id = a.staff_id AND vo.business_date = a.business_date AND vo.event = 'CHECK_OUT'
         WHERE a.business_date BETWEEN p_from AND p_to
           AND (p_staff IS NULL OR a.staff_id = p_staff);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_attendance_locations(date, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_attendance_locations(date, date, uuid) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ────────────────────────────────────────────────────────────────────────────
-- Post-apply verification (read-only; staging first)
--   SELECT count(*) FROM staff_attendance WHERE check_in_latitude IS NOT NULL OR check_out_latitude IS NOT NULL; -- 0
--   SELECT count(*) FROM staff_attendance_location_vault;                     -- moved rows
--   employee: select * from staff_attendance  → own rows, coordinate columns NULL
--   employee: select * from staff_attendance_location_vault → 42501
--   employee: rpc admin_attendance_locations  → 42501
--   admin:    rpc admin_attendance_locations(from, to) → coordinates
--   Field Assist check-in / check-out upload → succeeds (Sync Details: 0 failed)
-- ────────────────────────────────────────────────────────────────────────────
