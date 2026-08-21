-- MICRO-SPRINT 19.6: NOTIFICATION & REMINDER CENTER
-- Global targeted user notification schema and execution logic.

CREATE TABLE IF NOT EXISTS public.crm_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    party_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE, -- Optional context
    entity_type VARCHAR(100), -- 'follow_ups', 'requirements'
    entity_id UUID,
    notification_type VARCHAR(100) NOT NULL, -- e.g., 'Reminder', 'Assignment'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    link_url VARCHAR(255),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS
ALTER TABLE public.crm_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.crm_notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can mark their own notifications read" ON public.crm_notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (true);
    
CREATE POLICY "System can insert notifications" ON public.crm_notifications
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- 1. Insert Seed Rules
INSERT INTO public.crm_automation_rules (name, description, trigger_event, conditions, action_type, action_payload, is_active, cooldown_minutes)
VALUES 
(
    'Overdue High-Priority Reminder',
    'Sends a direct notification to the rep when a high-priority follow-up is 1+ days overdue.',
    'SCHEDULED_DAILY',
    '{"entity_type": "follow_ups", "status": "Pending", "priority": "High", "overdue_days_min": 1}'::jsonb,
    'CREATE_NOTIFICATION',
    '{"notification_type": "Reminder", "title": "Overdue High Priority Task", "message": "You have a high priority follow-up that is past due.", "link_url_template": "/customers/{party_id}"}'::jsonb,
    true,
    2880 -- 2 days cooldown
);

-- 2. Execution Engine Function
CREATE OR REPLACE FUNCTION public.fn_execute_scheduled_notifications() 
RETURNS void AS $$
DECLARE
    rule_record RECORD;
    fu_record RECORD;
    notif_type VARCHAR;
    title_val VARCHAR;
    message_val TEXT;
    link_val VARCHAR;
    safe_to_run BOOLEAN;
    existing_unread_count INTEGER;
BEGIN
    FOR rule_record IN 
        SELECT * FROM public.crm_automation_rules 
        WHERE is_active = true 
          AND system_kill_switch = false 
          AND trigger_event = 'SCHEDULED_DAILY' 
          AND action_type = 'CREATE_NOTIFICATION'
    LOOP
        
        notif_type := rule_record.action_payload->>'notification_type';
        title_val := rule_record.action_payload->>'title';
        message_val := rule_record.action_payload->>'message';
        link_val := rule_record.action_payload->>'link_url_template';

        -- CASE A: Follow-ups
        IF rule_record.conditions->>'entity_type' = 'follow_ups' THEN
            FOR fu_record IN 
                SELECT f.id, f.party_id, f.assigned_to 
                FROM public.follow_ups f
                WHERE f.status = rule_record.conditions->>'status'
                  AND f.priority = COALESCE(rule_record.conditions->>'priority', f.priority)
                  AND f.due_at < (CURRENT_DATE - (COALESCE(rule_record.conditions->>'overdue_days_min', '0'))::int)
            LOOP
                IF fu_record.assigned_to IS NULL THEN
                    CONTINUE;
                END IF;

                safe_to_run := public.fn_check_automation_cooldown(rule_record.id, 'follow_ups', fu_record.id, rule_record.cooldown_minutes);
                
                IF safe_to_run THEN
                    SELECT COUNT(*) INTO existing_unread_count 
                    FROM public.crm_notifications 
                    WHERE user_id = fu_record.assigned_to AND entity_type = 'follow_ups' AND entity_id = fu_record.id AND is_read = false;

                    IF existing_unread_count = 0 THEN
                        INSERT INTO public.crm_notifications (user_id, party_id, entity_type, entity_id, notification_type, title, message, link_url)
                        VALUES (fu_record.assigned_to, fu_record.party_id, 'follow_ups', fu_record.id, notif_type, title_val, message_val, REPLACE(link_val, '{party_id}', fu_record.party_id::TEXT));
                        
                        INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details)
                        VALUES (rule_record.id, 'follow_ups', fu_record.id, 'SUCCESS', '{"action": "Created notification"}'::jsonb);
                    ELSE
                        INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details)
                        VALUES (rule_record.id, 'follow_ups', fu_record.id, 'SKIPPED', '{"reason": "Active duplicate notification exists"}'::jsonb);
                    END IF;
                END IF;
            END LOOP;
        END IF;

    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
