-- Migration: 92_sprint_20_activity_report_rules.sql

-- 1. Create activity_audit_logs table
CREATE TABLE IF NOT EXISTS public.activity_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by entity
CREATE INDEX IF NOT EXISTS idx_activity_audit_logs_entity ON public.activity_audit_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.activity_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all, others can read for their entities or not at all (we can just allow read to authenticated)
DROP POLICY IF EXISTS "Enable read access for all authenticated users" ON public.activity_audit_logs;
CREATE POLICY "Enable read access for all authenticated users" ON public.activity_audit_logs FOR SELECT TO authenticated USING (true);

-- 2. Create trigger function for follow_ups
CREATE OR REPLACE FUNCTION log_follow_up_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log changes if the OLD status was already 'Completed'
    -- (We don't need audit logs for every edit while it is pending)
    IF OLD.status = 'Completed' THEN
        -- Check outcome_category
        IF OLD.outcome_category IS DISTINCT FROM NEW.outcome_category THEN
            INSERT INTO public.activity_audit_logs(entity_type, entity_id, field_name, old_value, new_value, updated_by)
            VALUES ('follow_ups', NEW.id, 'outcome_category', OLD.outcome_category, NEW.outcome_category, auth.uid());
        END IF;

        -- Check notes
        IF OLD.notes IS DISTINCT FROM NEW.notes THEN
            INSERT INTO public.activity_audit_logs(entity_type, entity_id, field_name, old_value, new_value, updated_by)
            VALUES ('follow_ups', NEW.id, 'notes', OLD.notes, NEW.notes, auth.uid());
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger function for interactions
CREATE OR REPLACE FUNCTION log_interaction_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- We assume interactions are always "completed" logs.
    IF OLD.outcome IS DISTINCT FROM NEW.outcome THEN
        INSERT INTO public.activity_audit_logs(entity_type, entity_id, field_name, old_value, new_value, updated_by)
        VALUES ('interactions', NEW.id, 'outcome', OLD.outcome, NEW.outcome, auth.uid());
    END IF;

    IF OLD.note IS DISTINCT FROM NEW.note THEN
        INSERT INTO public.activity_audit_logs(entity_type, entity_id, field_name, old_value, new_value, updated_by)
        VALUES ('interactions', NEW.id, 'note', OLD.note, NEW.note, auth.uid());
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Drop existing triggers to avoid errors
DROP TRIGGER IF EXISTS trg_audit_follow_ups ON public.follow_ups;
DROP TRIGGER IF EXISTS trg_audit_interactions ON public.interactions;

-- Create triggers
CREATE TRIGGER trg_audit_follow_ups
    AFTER UPDATE ON public.follow_ups
    FOR EACH ROW
    EXECUTE FUNCTION log_follow_up_changes();

CREATE TRIGGER trg_audit_interactions
    AFTER UPDATE ON public.interactions
    FOR EACH ROW
    EXECUTE FUNCTION log_interaction_changes();


-- 4. Create Canonical View `v_follow_up_activity_report`
-- We use follow_ups where status = 'Completed' as the base.
DROP VIEW IF EXISTS v_follow_up_activity_report;
CREATE VIEW v_follow_up_activity_report AS
SELECT 
    f.id,
    f.party_id,
    f.created_at,
    f.completed_at,
    COALESCE(f.completed_at, f.updated_at) AS interaction_date,
    f.follow_up_type,
    f.outcome_category,
    f.status,
    f.assigned_to AS user_id,
    f.notes,
    
    -- Does it require a next action?
    CASE 
        WHEN f.outcome_category IN ('Order Confirmed', 'Order Intention Confirmed', 'Issue Resolved', 'Wrong Number', 'Customer Closed', 'No Further Follow-up Required', 'Lost', 'Lost to competitor', 'Order placed') THEN false
        ELSE true
    END AS requires_next_action,
    
    -- Has valid next action (check interactions for next_action_date)
    i.next_action_date,
    
    CASE 
        WHEN i.next_action_date > CURRENT_DATE THEN true
        ELSE false
    END AS has_valid_next_action,
    
    -- Exclude flags
    -- Exclude if party_id is null
    CASE WHEN f.party_id IS NULL THEN true ELSE false END AS is_unlinked,
    
    p.display_name AS customer_name,
    p.mobile AS customer_mobile,
    
    -- Is Productive?
    CASE 
        WHEN f.outcome_category IN ('Connected', 'Requirement Captured', 'Quotation Discussion', 'Payment Discussion', 'Sending payment today', 'Payment within 2 days', 'Payment within 3 to 5 days', 'Payment next week', 'Payment next month', 'Part payment today') THEN true
        ELSE false
    END AS is_productive
    
FROM public.follow_ups f
LEFT JOIN public.interactions i ON i.related_follow_up_id = f.id
LEFT JOIN public.crm_parties p ON p.id = f.party_id
WHERE f.status = 'Completed'
  AND p.display_name NOT ILIKE '%test%' 
  AND p.display_name NOT ILIKE '%dummy%';
