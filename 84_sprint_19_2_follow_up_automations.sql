-- MICRO-SPRINT 19.2: FOLLOW-UP AUTOMATION RULES
-- Inserts deterministic seed rules and creates the execution engine function.

-- 1. Insert Seed Rules
INSERT INTO public.crm_automation_rules (name, description, trigger_event, conditions, action_type, action_payload, is_active, cooldown_minutes)
VALUES 
(
    'Unresolved Requirement Escalation',
    'Generates a high priority follow-up for requirements open longer than 14 days.',
    'SCHEDULED_DAILY',
    '{"entity_type": "requirements", "status": "Open", "age_days_min": 14}'::jsonb,
    'CREATE_FOLLOWUP',
    '{"reason": "Requirement open for >14 days", "priority": "High", "due_days": 1}'::jsonb,
    true,
    10080 -- 7 days cooldown before nagging again about the same requirement
),
(
    'Overdue Task Escalation',
    'Escalates follow-ups that are pending and >7 days overdue.',
    'SCHEDULED_DAILY',
    '{"entity_type": "follow_ups", "status": "Pending", "overdue_days_min": 7}'::jsonb,
    'CREATE_FOLLOWUP',
    '{"reason": "Overdue Task Escalation", "priority": "High", "due_days": 0}'::jsonb,
    true,
    10080 -- 7 days cooldown
),
(
    'Dormant Customer Review',
    'Schedules a review for dormant customers with no interaction for 90 days.',
    'SCHEDULED_DAILY',
    '{"entity_type": "crm_parties", "status": "Dormant", "last_interaction_days_min": 90}'::jsonb,
    'CREATE_FOLLOWUP',
    '{"reason": "Scheduled Review: Dormant Customer", "priority": "Normal", "due_days": 3}'::jsonb,
    true,
    43200 -- 30 days cooldown (approx 43200 mins) to prevent spamming
);

-- 2. Execution Engine Function
CREATE OR REPLACE FUNCTION public.fn_execute_scheduled_followups() 
RETURNS void AS $$
DECLARE
    rule_record RECORD;
    req_record RECORD;
    fu_record RECORD;
    party_record RECORD;
    action_reason VARCHAR;
    action_priority VARCHAR;
    action_due_days INTEGER;
    new_due_at TIMESTAMP WITH TIME ZONE;
    safe_to_run BOOLEAN;
    existing_pending_count INTEGER;
BEGIN
    -- Loop through active SCHEDULED_DAILY rules that create follow-ups
    FOR rule_record IN 
        SELECT * FROM public.crm_automation_rules 
        WHERE is_active = true 
          AND system_kill_switch = false 
          AND trigger_event = 'SCHEDULED_DAILY' 
          AND action_type = 'CREATE_FOLLOWUP'
    LOOP
        
        -- Parse action payload
        action_reason := rule_record.action_payload->>'reason';
        action_priority := COALESCE(rule_record.action_payload->>'priority', 'Normal');
        action_due_days := COALESCE((rule_record.action_payload->>'due_days')::int, 1);
        new_due_at := CURRENT_TIMESTAMP + (action_due_days || ' days')::interval;

        -- CASE A: Requirements Escalation
        IF rule_record.conditions->>'entity_type' = 'requirements' THEN
            FOR req_record IN 
                SELECT r.id, r.party_id, c.assigned_owner_id
                FROM public.requirements r
                JOIN public.crm_parties c ON r.party_id = c.id
                WHERE r.status NOT IN ('Closed', 'Lost')
                  AND r.created_at < (CURRENT_DATE - (rule_record.conditions->>'age_days_min')::int)
            LOOP
                -- Check cooldown
                safe_to_run := public.fn_check_automation_cooldown(rule_record.id, 'requirements', req_record.id, rule_record.cooldown_minutes);
                
                IF safe_to_run THEN
                    -- Prevent duplicate active follow-ups for the exact same reason
                    SELECT COUNT(*) INTO existing_pending_count 
                    FROM public.follow_ups 
                    WHERE party_id = req_record.party_id AND status = 'Pending' AND reason = action_reason;

                    IF existing_pending_count = 0 THEN
                        -- Execute action
                        INSERT INTO public.follow_ups (party_id, reason, due_at, priority, assigned_to, status, notes)
                        VALUES (req_record.party_id, action_reason, new_due_at, action_priority, req_record.assigned_owner_id, 'Pending', 'System Automated Follow-up');
                        
                        -- Log Success
                        INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details)
                        VALUES (rule_record.id, 'requirements', req_record.id, 'SUCCESS', '{"action": "Created follow-up"}'::jsonb);
                    ELSE
                        -- Log Skipped
                        INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details)
                        VALUES (rule_record.id, 'requirements', req_record.id, 'SKIPPED', '{"reason": "Active duplicate follow-up exists"}'::jsonb);
                    END IF;
                END IF;
            END LOOP;

        -- CASE B: Follow-ups Escalation
        ELSIF rule_record.conditions->>'entity_type' = 'follow_ups' THEN
            FOR fu_record IN 
                SELECT f.id, f.party_id, c.assigned_owner_id
                FROM public.follow_ups f
                JOIN public.crm_parties c ON f.party_id = c.id
                WHERE f.status = 'Pending'
                  AND f.due_at < (CURRENT_DATE - (rule_record.conditions->>'overdue_days_min')::int)
            LOOP
                safe_to_run := public.fn_check_automation_cooldown(rule_record.id, 'follow_ups', fu_record.id, rule_record.cooldown_minutes);
                
                IF safe_to_run THEN
                    SELECT COUNT(*) INTO existing_pending_count 
                    FROM public.follow_ups 
                    WHERE party_id = fu_record.party_id AND status = 'Pending' AND reason = action_reason;

                    IF existing_pending_count = 0 THEN
                        INSERT INTO public.follow_ups (party_id, reason, due_at, priority, assigned_to, status, notes)
                        VALUES (fu_record.party_id, action_reason, new_due_at, action_priority, fu_record.assigned_owner_id, 'Pending', 'System Automated Follow-up');
                        
                        INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details)
                        VALUES (rule_record.id, 'follow_ups', fu_record.id, 'SUCCESS', '{"action": "Created follow-up"}'::jsonb);
                    ELSE
                        INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details)
                        VALUES (rule_record.id, 'follow_ups', fu_record.id, 'SKIPPED', '{"reason": "Active duplicate follow-up exists"}'::jsonb);
                    END IF;
                END IF;
            END LOOP;

        -- CASE C: Dormant Customer Review
        ELSIF rule_record.conditions->>'entity_type' = 'crm_parties' THEN
            FOR party_record IN 
                SELECT id, assigned_owner_id
                FROM public.crm_parties
                WHERE crm_status = 'Dormant'
                  AND last_interaction_date < (CURRENT_DATE - (rule_record.conditions->>'last_interaction_days_min')::int)
            LOOP
                safe_to_run := public.fn_check_automation_cooldown(rule_record.id, 'crm_parties', party_record.id, rule_record.cooldown_minutes);
                
                IF safe_to_run THEN
                    SELECT COUNT(*) INTO existing_pending_count 
                    FROM public.follow_ups 
                    WHERE party_id = party_record.id AND status = 'Pending' AND reason = action_reason;

                    IF existing_pending_count = 0 THEN
                        INSERT INTO public.follow_ups (party_id, reason, due_at, priority, assigned_to, status, notes)
                        VALUES (party_record.id, action_reason, new_due_at, action_priority, party_record.assigned_owner_id, 'Pending', 'System Automated Follow-up');
                        
                        INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details)
                        VALUES (rule_record.id, 'crm_parties', party_record.id, 'SUCCESS', '{"action": "Created follow-up"}'::jsonb);
                    ELSE
                        INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details)
                        VALUES (rule_record.id, 'crm_parties', party_record.id, 'SKIPPED', '{"reason": "Active duplicate follow-up exists"}'::jsonb);
                    END IF;
                END IF;
            END LOOP;
        
        END IF;

    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
