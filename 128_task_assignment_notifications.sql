-- MICRO-SPRINT CRM-NOTIFY-01
-- Automate CRM internal notifications when a Field Staff is assigned a task

CREATE OR REPLACE FUNCTION public.fn_queue_task_assignment_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_pending_count INTEGER;
BEGIN
    -- Only act if assigned_to is newly set or changed to a non-null user
    IF TG_OP = 'INSERT' THEN
        IF NEW.assigned_to IS NULL THEN
            RETURN NEW;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.assigned_to IS NULL OR NEW.assigned_to IS NOT DISTINCT FROM OLD.assigned_to THEN
            RETURN NEW;
        END IF;
    END IF;

    -- Count pending tasks due today or earlier for this newly assigned user
    SELECT COUNT(*) INTO v_pending_count
    FROM public.follow_ups
    WHERE assigned_to = NEW.assigned_to
      AND status = 'Pending'
      AND COALESCE(due_at::DATE, follow_up_date) <= CURRENT_DATE;

    -- Insert into the authoritative CRM Notifications table
    INSERT INTO public.crm_notifications (
        user_id, 
        party_id, 
        entity_type, 
        entity_id, 
        notification_type, 
        title, 
        message, 
        link_url
    ) VALUES (
        NEW.assigned_to,
        NEW.party_id,
        'follow_ups',
        NEW.id,
        'TASK_ASSIGNED',
        'New Work Assigned',
        'You have ' || v_pending_count || ' task(s) assigned for today.',
        '/my-work'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on follow_ups
DROP TRIGGER IF EXISTS trg_task_assignment_notification ON public.follow_ups;
CREATE TRIGGER trg_task_assignment_notification
AFTER INSERT OR UPDATE ON public.follow_ups
FOR EACH ROW
EXECUTE FUNCTION public.fn_queue_task_assignment_notification();
