-- ============================================================================
-- ROLLBACK for PROPOSED 243_sprint_FA_ATTENDANCE_LOCATION_01.sql
-- STATUS: PROPOSED — NOT APPLIED
--
-- WARNING: Dropping the columns deletes all recorded attendance locations.
-- Export them first, e.g.:
--   COPY (SELECT id, staff_id, business_date,
--                check_in_latitude, check_in_longitude, check_in_accuracy_m, check_in_location_at, check_in_location_status,
--                check_out_latitude, check_out_longitude, check_out_accuracy_m, check_out_location_at, check_out_location_status
--         FROM public.staff_attendance) TO STDOUT WITH CSV HEADER;
--
-- ORDER: the Field Assist app probes for the location columns and stops sending
-- them once they are gone, but records already queued offline with location
-- fields would then fail (shown as "Upload failed"). Let queues drain first.
-- Step 1 restores the 242 fa_attendance_enforce() body (incl. the FA-02 fix)
-- BEFORE the columns are dropped, so the trigger never references missing columns.
-- ============================================================================

-- 1. Restore the 242 trigger function (no location fields).
CREATE OR REPLACE FUNCTION public.fa_attendance_enforce()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.business_date := (NEW.check_in_at AT TIME ZONE 'Asia/Kolkata')::date;
        NEW.check_in_server_received_at := now();
        NEW.created_at := now();
        IF EXISTS (
            SELECT 1 FROM public.staff_attendance a
            WHERE a.staff_id = NEW.staff_id AND a.business_date = NEW.business_date
        ) THEN
            NEW.updated_at := now();
            RETURN NEW;
        END IF;
        IF NEW.check_in_at > now() + interval '5 minutes'
           OR NEW.check_in_at < now() - interval '72 hours' THEN
            RAISE EXCEPTION 'Check-in time is outside the accepted window' USING ERRCODE = '23514';
        END IF;
        IF EXISTS (
            SELECT 1 FROM public.staff_leave_requests l
            WHERE l.staff_id = NEW.staff_id AND l.status = 'Approved'
              AND NEW.business_date BETWEEN l.start_date AND l.end_date
        ) THEN
            RAISE EXCEPTION 'Approved leave exists for this date' USING ERRCODE = '23514';
        END IF;
        IF NEW.check_out_at IS NOT NULL THEN
            NEW.check_out_server_received_at := now();
            NEW.status := 'CHECKED_OUT';
        ELSE
            NEW.status := 'CHECKED_IN';
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.id := OLD.id;
        NEW.staff_id := OLD.staff_id;
        NEW.business_date := OLD.business_date;
        NEW.check_in_at := OLD.check_in_at;
        NEW.check_in_server_received_at := OLD.check_in_server_received_at;
        NEW.created_at := OLD.created_at;
        IF OLD.check_out_at IS NOT NULL THEN
            NEW.check_out_at := OLD.check_out_at;
            NEW.check_out_server_received_at := OLD.check_out_server_received_at;
        ELSIF NEW.check_out_at IS NOT NULL THEN
            IF NEW.check_out_at > now() + interval '5 minutes' THEN
                RAISE EXCEPTION 'Check-out time is in the future' USING ERRCODE = '23514';
            END IF;
            NEW.check_out_server_received_at := now();
        END IF;
        NEW.status := CASE WHEN NEW.check_out_at IS NULL THEN 'CHECKED_IN' ELSE 'CHECKED_OUT' END;
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- 2. Drop constraints and columns (data loss — see warning above).
ALTER TABLE public.staff_attendance DROP CONSTRAINT IF EXISTS staff_attendance_check_in_location_valid;
ALTER TABLE public.staff_attendance DROP CONSTRAINT IF EXISTS staff_attendance_check_out_location_valid;

ALTER TABLE public.staff_attendance
    DROP COLUMN IF EXISTS check_in_latitude,
    DROP COLUMN IF EXISTS check_in_longitude,
    DROP COLUMN IF EXISTS check_in_accuracy_m,
    DROP COLUMN IF EXISTS check_in_location_at,
    DROP COLUMN IF EXISTS check_in_location_status,
    DROP COLUMN IF EXISTS check_out_latitude,
    DROP COLUMN IF EXISTS check_out_longitude,
    DROP COLUMN IF EXISTS check_out_accuracy_m,
    DROP COLUMN IF EXISTS check_out_location_at,
    DROP COLUMN IF EXISTS check_out_location_status;

NOTIFY pgrst, 'reload schema';
