-- MICRO-SPRINT 19.3: REQUIREMENT & OPPORTUNITY ALERTS
-- Schema and execution engine for generating actionable rep alerts.

CREATE TABLE IF NOT EXISTS public.crm_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL, -- e.g., 'requirements', 'crm_parties'
    entity_id UUID NOT NULL, 
    alert_type VARCHAR(100) NOT NULL, -- e.g., 'Stale Pipeline'
    message TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'Normal',
    is_acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.crm_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read alerts for their assigned accounts" ON public.crm_alerts
    FOR SELECT
    TO authenticated
    USING (
        (SELECT role FROM public.app_users WHERE id = auth.uid()) = 'Admin' 
        OR 
        (party_id IN (SELECT id FROM public.crm_parties WHERE assigned_owner_id = auth.uid()))
    );

CREATE POLICY "Users can acknowledge their own alerts" ON public.crm_alerts
    FOR UPDATE
    TO authenticated
    USING (
        (SELECT role FROM public.app_users WHERE id = auth.uid()) = 'Admin' 
        OR 
        (party_id IN (SELECT id FROM public.crm_parties WHERE assigned_owner_id = auth.uid()))
    )
    WITH CHECK (
        true
    );

-- System can insert alerts (via security definer functions)
CREATE POLICY "System can insert alerts" ON public.crm_alerts
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 1. Insert Seed Rules
INSERT INTO public.crm_automation_rules (name, description, trigger_event, conditions, action_type, action_payload, is_active, cooldown_minutes)
VALUES 
(
    'Stale Open Requirement Alert',
    'Generates a UI alert for requirements open > 7 days.',
    'SCHEDULED_DAILY',
    '{"entity_type": "requirements", "status": "Open", "age_days_min": 7}'::jsonb,
    'CREATE_ALERT',
    '{"alert_type": "Stale Pipeline", "message": "Requirement has been open for over 7 days without action.", "priority": "High"}'::jsonb,
    true,
    14400 -- 10 days cooldown before alerting again
);

-- 2. Execution Engine Function
CREATE OR REPLACE FUNCTION public.fn_execute_scheduled_alerts() 
RETURNS void AS $$
DECLARE
    rule_record RECORD;
    req_record RECORD;
    alert_type_val VARCHAR;
    message_val TEXT;
    priority_val VARCHAR;
    safe_to_run BOOLEAN;
    existing_unacknowledged_count INTEGER;
BEGIN
    FOR rule_record IN 
        SELECT * FROM public.crm_automation_rules 
        WHERE is_active = true 
          AND system_kill_switch = false 
          AND trigger_event = 'SCHEDULED_DAILY' 
          AND action_type = 'CREATE_ALERT'
    LOOP
        
        -- Parse action payload
        alert_type_val := rule_record.action_payload->>'alert_type';
        message_val := rule_record.action_payload->>'message';
        priority_val := COALESCE(rule_record.action_payload->>'priority', 'Normal');

        IF rule_record.conditions->>'entity_type' = 'requirements' THEN
            FOR req_record IN 
                SELECT r.id, r.party_id, r.product_type
                FROM public.requirements r
                WHERE r.status NOT IN ('Closed', 'Lost')
                  AND r.created_at < (CURRENT_DATE - (rule_record.conditions->>'age_days_min')::int)
            LOOP
                safe_to_run := public.fn_check_automation_cooldown(rule_record.id, 'requirements', req_record.id, rule_record.cooldown_minutes);
                
                IF safe_to_run THEN
                    -- Prevent duplicate active (unacknowledged) alerts of the same type for the same entity
                    SELECT COUNT(*) INTO existing_unacknowledged_count 
                    FROM public.crm_alerts 
                    WHERE entity_type = 'requirements' AND entity_id = req_record.id AND alert_type = alert_type_val AND is_acknowledged = false;

                    IF existing_unacknowledged_count = 0 THEN
                        INSERT INTO public.crm_alerts (party_id, entity_type, entity_id, alert_type, message, priority)
                        VALUES (req_record.party_id, 'requirements', req_record.id, alert_type_val, message_val || ' (' || COALESCE(req_record.product_type, 'Unknown') || ')', priority_val);
                        
                        INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details)
                        VALUES (rule_record.id, 'requirements', req_record.id, 'SUCCESS', '{"action": "Created alert"}'::jsonb);
                    ELSE
                        INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details)
                        VALUES (rule_record.id, 'requirements', req_record.id, 'SKIPPED', '{"reason": "Active duplicate alert exists"}'::jsonb);
                    END IF;
                END IF;
            END LOOP;
        END IF;

    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
