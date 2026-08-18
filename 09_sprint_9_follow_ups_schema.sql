-- SPRINT 9: Follow-ups Engine Schema Updates

-- 1. Add TIMESTAMPTZ columns for accurate scheduling and reminders
ALTER TABLE public.follow_ups 
ADD COLUMN IF NOT EXISTS due_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMP WITH TIME ZONE;

-- 2. Migrate existing data (fallback to 00:00:00 UTC of the follow_up_date)
UPDATE public.follow_ups 
SET due_at = follow_up_date::timestamp AT TIME ZONE 'UTC'
WHERE due_at IS NULL AND follow_up_date IS NOT NULL;

-- 3. Create a trigger function to keep follow_up_date synced with due_at (for backward compatibility)
CREATE OR REPLACE FUNCTION sync_follow_up_date()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.due_at IS NOT NULL THEN
        -- Cast the timezone-aware due_at to a plain DATE
        NEW.follow_up_date = (NEW.due_at AT TIME ZONE 'UTC')::DATE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Apply the trigger
DROP TRIGGER IF EXISTS trg_sync_follow_up_date ON public.follow_ups;
CREATE TRIGGER trg_sync_follow_up_date
BEFORE INSERT OR UPDATE OF due_at ON public.follow_ups
FOR EACH ROW
EXECUTE FUNCTION sync_follow_up_date();
