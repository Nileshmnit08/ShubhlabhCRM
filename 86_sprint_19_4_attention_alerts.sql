-- MICRO-SPRINT 19.4: CUSTOMER/DEALER ATTENTION ALERTS
-- Expands the execution engine to evaluate account-level attention signals.

-- 1. Insert Seed Rules
INSERT INTO public.crm_automation_rules (name, description, trigger_event, conditions, action_type, action_payload, is_active, cooldown_minutes)
VALUES 
(
    'Unengaged High-Value Dealer Alert',
    'Generates a UI alert for active dealers with no interaction for > 30 days.',
    'SCHEDULED_DAILY',
    '{"entity_type": "crm_parties", "status": "Active", "relationship": "Dealer", "last_interaction_days_min": 30}'::jsonb,
    'CREATE_ALERT',
    '{"alert_type": "Attention Required", "message": "Dealer has had no interactions in over 30 days.", "priority": "High"}'::jsonb,
    true,
    20160 -- 14 days cooldown before alerting again
),
(
    'Dormant Account Contradiction',
    'Alerts if a dormant account has an open requirement pipeline.',
    'SCHEDULED_DAILY',
    '{"entity_type": "crm_parties", "status": "Dormant", "has_open_requirements": true}'::jsonb,
    'CREATE_ALERT',
    '{"alert_type": "Data Conflict", "message": "Account is Dormant but has an Open Requirement. Please resolve.", "priority": "Medium"}'::jsonb,
    true,
    14400 -- 10 days cooldown
),
(
    'Interrupted Purchase Pattern Alert',
    'Alerts when a purchase gap or dealer replenishment is detected in v_customer_opportunities.',
    'SCHEDULED_DAILY',
    '{"entity_type": "v_customer_opportunities", "opportunity_type": ["Purchase Gap", "Dealer Replenishment"]}'::jsonb,
    'CREATE_ALERT',
    '{"alert_type": "Purchase Gap", "message": "Historical purchase cycle interrupted.", "priority": "High"}'::jsonb,
    true,
    20160 -- 14 days cooldown
);

-- 2. Expand Execution Engine Function
CREATE OR REPLACE FUNCTION public.fn_execute_scheduled_alerts() 
RETURNS void AS $$
DECLARE
    rule_record RECORD;
    req_record RECORD;
    party_record RECORD;
    opp_record RECORD;
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

        -- CASE A: Requirements
        IF rule_record.conditions->>'entity_type' = 'requirements' THEN
            FOR req_record IN 
                SELECT r.id, r.party_id, r.product_type
                FROM public.requirements r
                WHERE r.status NOT IN ('Closed', 'Lost')
                  AND r.created_at < (CURRENT_DATE - (rule_record.conditions->>'age_days_min')::int)
            LOOP
                safe_to_run := public.fn_check_automation_cooldown(rule_record.id, 'requirements', req_record.id, rule_record.cooldown_minutes);
                
                IF safe_to_run THEN
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

        -- CASE B: CRM Parties (Dealers, Dormant Contradictions)
        ELSIF rule_record.conditions->>'entity_type' = 'crm_parties' THEN
            
            -- Sub-case: Unengaged Dealer
            IF rule_record.conditions->>'relationship' = 'Dealer' THEN
                FOR party_record IN 
                    SELECT id 
                    FROM public.crm_parties
                    WHERE crm_status = rule_record.conditions->>'status'
                      AND relationship_type = rule_record.conditions->>'relationship'
                      AND last_interaction_date < (CURRENT_DATE - (rule_record.conditions->>'last_interaction_days_min')::int)
                LOOP
                    safe_to_run := public.fn_check_automation_cooldown(rule_record.id, 'crm_parties', party_record.id, rule_record.cooldown_minutes);
                    IF safe_to_run THEN
                        SELECT COUNT(*) INTO existing_unacknowledged_count FROM public.crm_alerts WHERE entity_type = 'crm_parties' AND entity_id = party_record.id AND alert_type = alert_type_val AND is_acknowledged = false;
                        IF existing_unacknowledged_count = 0 THEN
                            INSERT INTO public.crm_alerts (party_id, entity_type, entity_id, alert_type, message, priority) VALUES (party_record.id, 'crm_parties', party_record.id, alert_type_val, message_val, priority_val);
                            INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details) VALUES (rule_record.id, 'crm_parties', party_record.id, 'SUCCESS', '{"action": "Created alert"}'::jsonb);
                        ELSE
                            INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details) VALUES (rule_record.id, 'crm_parties', party_record.id, 'SKIPPED', '{"reason": "Active duplicate alert exists"}'::jsonb);
                        END IF;
                    END IF;
                END LOOP;

            -- Sub-case: Dormant Contradiction
            ELSIF (rule_record.conditions->>'has_open_requirements')::boolean = true THEN
                FOR party_record IN 
                    SELECT c.id 
                    FROM public.crm_parties c
                    WHERE c.crm_status = rule_record.conditions->>'status'
                      AND EXISTS (SELECT 1 FROM public.requirements r WHERE r.party_id = c.id AND r.status NOT IN ('Closed', 'Lost'))
                LOOP
                    safe_to_run := public.fn_check_automation_cooldown(rule_record.id, 'crm_parties', party_record.id, rule_record.cooldown_minutes);
                    IF safe_to_run THEN
                        SELECT COUNT(*) INTO existing_unacknowledged_count FROM public.crm_alerts WHERE entity_type = 'crm_parties' AND entity_id = party_record.id AND alert_type = alert_type_val AND is_acknowledged = false;
                        IF existing_unacknowledged_count = 0 THEN
                            INSERT INTO public.crm_alerts (party_id, entity_type, entity_id, alert_type, message, priority) VALUES (party_record.id, 'crm_parties', party_record.id, alert_type_val, message_val, priority_val);
                            INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details) VALUES (rule_record.id, 'crm_parties', party_record.id, 'SUCCESS', '{"action": "Created alert"}'::jsonb);
                        ELSE
                            INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details) VALUES (rule_record.id, 'crm_parties', party_record.id, 'SKIPPED', '{"reason": "Active duplicate alert exists"}'::jsonb);
                        END IF;
                    END IF;
                END LOOP;
            END IF;

        -- CASE C: Customer Opportunities (Purchase Gaps)
        ELSIF rule_record.conditions->>'entity_type' = 'v_customer_opportunities' THEN
            FOR opp_record IN 
                SELECT party_id, evidence
                FROM public.v_customer_opportunities
                WHERE opportunity_type IN ('Purchase Gap', 'Dealer Replenishment')
            LOOP
                safe_to_run := public.fn_check_automation_cooldown(rule_record.id, 'crm_parties', opp_record.party_id, rule_record.cooldown_minutes);
                
                IF safe_to_run THEN
                    SELECT COUNT(*) INTO existing_unacknowledged_count 
                    FROM public.crm_alerts 
                    WHERE entity_type = 'crm_parties' AND entity_id = opp_record.party_id AND alert_type = alert_type_val AND is_acknowledged = false;

                    IF existing_unacknowledged_count = 0 THEN
                        INSERT INTO public.crm_alerts (party_id, entity_type, entity_id, alert_type, message, priority)
                        VALUES (opp_record.party_id, 'crm_parties', opp_record.party_id, alert_type_val, message_val || ' ' || COALESCE(opp_record.evidence, ''), priority_val);
                        
                        INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details)
                        VALUES (rule_record.id, 'crm_parties', opp_record.party_id, 'SUCCESS', '{"action": "Created alert"}'::jsonb);
                    ELSE
                        INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details)
                        VALUES (rule_record.id, 'crm_parties', opp_record.party_id, 'SKIPPED', '{"reason": "Active duplicate alert exists"}'::jsonb);
                    END IF;
                END IF;
            END LOOP;

        END IF;

    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
