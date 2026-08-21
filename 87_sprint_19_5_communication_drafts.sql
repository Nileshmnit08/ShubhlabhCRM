-- MICRO-SPRINT 19.5: COMMUNICATION PREPARATION LAYER
-- Schema and execution engine for drafting outbound communications deterministically.

-- Ensure party-level DNC exists
ALTER TABLE public.crm_parties ADD COLUMN IF NOT EXISTS do_not_contact BOOLEAN DEFAULT false;

-- 1. Communication Drafts Table
CREATE TABLE IF NOT EXISTS public.crm_communication_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES public.crm_automation_rules(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL DEFAULT 'WhatsApp',
    template_name VARCHAR(100),
    suggested_message TEXT NOT NULL,
    reason TEXT,
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Sent', 'Discarded'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES auth.users(id),
    acted_upon_at TIMESTAMP WITH TIME ZONE,
    acted_upon_by UUID REFERENCES auth.users(id)
);

-- RLS
ALTER TABLE public.crm_communication_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view drafts for assigned accounts" ON public.crm_communication_drafts
    FOR SELECT TO authenticated
    USING ((SELECT role FROM public.app_users WHERE id = auth.uid()) = 'Admin' 
        OR party_id IN (SELECT id FROM public.crm_parties WHERE assigned_owner_id = auth.uid()));

CREATE POLICY "Users can act on drafts" ON public.crm_communication_drafts
    FOR UPDATE TO authenticated
    USING ((SELECT role FROM public.app_users WHERE id = auth.uid()) = 'Admin' 
        OR party_id IN (SELECT id FROM public.crm_parties WHERE assigned_owner_id = auth.uid()))
    WITH CHECK (true);

CREATE POLICY "System can insert drafts" ON public.crm_communication_drafts
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- 2. Seed Rules
INSERT INTO public.crm_automation_rules (name, description, trigger_event, conditions, action_type, action_payload, is_active, cooldown_minutes)
VALUES 
(
    'Follow-up WhatsApp Reminder',
    'Drafts a WhatsApp check-in message for customers with a pending follow-up today.',
    'SCHEDULED_DAILY',
    '{"entity_type": "follow_ups", "status": "Pending", "due_today": true}'::jsonb,
    'PREPARE_COMMUNICATION',
    '{"channel": "WhatsApp", "template_name": "Check-in", "suggested_message": "Hi, just checking in on our pending discussion. Are you available for a quick chat today?", "reason": "Pending Follow-up Today"}'::jsonb,
    true,
    1440 -- 1 day cooldown
),
(
    'Replenishment WhatsApp Prompt',
    'Drafts a WhatsApp re-order prompt for purchase gaps.',
    'SCHEDULED_DAILY',
    '{"entity_type": "v_customer_opportunities", "opportunity_type": "Purchase Gap"}'::jsonb,
    'PREPARE_COMMUNICATION',
    '{"channel": "WhatsApp", "template_name": "Re-order", "suggested_message": "Hi, we noticed it might be time for your next order. Can we help you restock your inventory this week?", "reason": "Historical Purchase Gap Detected"}'::jsonb,
    true,
    10080 -- 7 days cooldown
);

-- 3. Execution Engine
CREATE OR REPLACE FUNCTION public.fn_execute_scheduled_communications() 
RETURNS void AS $$
DECLARE
    rule_record RECORD;
    fu_record RECORD;
    opp_record RECORD;
    channel_val VARCHAR;
    template_val VARCHAR;
    message_val TEXT;
    reason_val TEXT;
    safe_to_run BOOLEAN;
    dnc_check BOOLEAN;
    existing_pending_count INTEGER;
BEGIN
    FOR rule_record IN 
        SELECT * FROM public.crm_automation_rules 
        WHERE is_active = true 
          AND system_kill_switch = false 
          AND trigger_event = 'SCHEDULED_DAILY' 
          AND action_type = 'PREPARE_COMMUNICATION'
    LOOP
        
        channel_val := COALESCE(rule_record.action_payload->>'channel', 'WhatsApp');
        template_val := rule_record.action_payload->>'template_name';
        message_val := rule_record.action_payload->>'suggested_message';
        reason_val := rule_record.action_payload->>'reason';

        -- CASE A: Follow-ups
        IF rule_record.conditions->>'entity_type' = 'follow_ups' AND (rule_record.conditions->>'due_today')::boolean = true THEN
            FOR fu_record IN 
                SELECT f.id, f.party_id
                FROM public.follow_ups f
                WHERE f.status = 'Pending'
                  AND f.due_at::DATE = CURRENT_DATE
            LOOP
                -- DNC Safeguard
                SELECT do_not_contact INTO dnc_check FROM public.crm_parties WHERE id = fu_record.party_id;
                
                IF dnc_check = true THEN
                    INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details) VALUES (rule_record.id, 'follow_ups', fu_record.id, 'SKIPPED', '{"reason": "DNC Active"}'::jsonb);
                    CONTINUE;
                END IF;

                safe_to_run := public.fn_check_automation_cooldown(rule_record.id, 'follow_ups', fu_record.id, rule_record.cooldown_minutes);
                
                IF safe_to_run THEN
                    SELECT COUNT(*) INTO existing_pending_count FROM public.crm_communication_drafts WHERE party_id = fu_record.party_id AND status = 'Pending' AND reason = reason_val;

                    IF existing_pending_count = 0 THEN
                        INSERT INTO public.crm_communication_drafts (party_id, rule_id, channel, template_name, suggested_message, reason)
                        VALUES (fu_record.party_id, rule_record.id, channel_val, template_val, message_val, reason_val);
                        
                        INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details)
                        VALUES (rule_record.id, 'follow_ups', fu_record.id, 'SUCCESS', '{"action": "Created draft communication"}'::jsonb);
                    ELSE
                        INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details)
                        VALUES (rule_record.id, 'follow_ups', fu_record.id, 'SKIPPED', '{"reason": "Active duplicate draft exists"}'::jsonb);
                    END IF;
                END IF;
            END LOOP;

        -- CASE B: Purchase Gap
        ELSIF rule_record.conditions->>'entity_type' = 'v_customer_opportunities' AND rule_record.conditions->>'opportunity_type' = 'Purchase Gap' THEN
            FOR opp_record IN 
                SELECT party_id 
                FROM public.v_customer_opportunities
                WHERE opportunity_type = 'Purchase Gap'
            LOOP
                -- DNC Safeguard
                SELECT do_not_contact INTO dnc_check FROM public.crm_parties WHERE id = opp_record.party_id;
                
                IF dnc_check = true THEN
                    INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details) VALUES (rule_record.id, 'crm_parties', opp_record.party_id, 'SKIPPED', '{"reason": "DNC Active"}'::jsonb);
                    CONTINUE;
                END IF;

                safe_to_run := public.fn_check_automation_cooldown(rule_record.id, 'crm_parties', opp_record.party_id, rule_record.cooldown_minutes);
                
                IF safe_to_run THEN
                    SELECT COUNT(*) INTO existing_pending_count FROM public.crm_communication_drafts WHERE party_id = opp_record.party_id AND status = 'Pending' AND reason = reason_val;

                    IF existing_pending_count = 0 THEN
                        INSERT INTO public.crm_communication_drafts (party_id, rule_id, channel, template_name, suggested_message, reason)
                        VALUES (opp_record.party_id, rule_record.id, channel_val, template_val, message_val, reason_val);
                        
                        INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details)
                        VALUES (rule_record.id, 'crm_parties', opp_record.party_id, 'SUCCESS', '{"action": "Created draft communication"}'::jsonb);
                    ELSE
                        INSERT INTO public.crm_automation_logs (rule_id, entity_type, entity_id, status, details)
                        VALUES (rule_record.id, 'crm_parties', opp_record.party_id, 'SKIPPED', '{"reason": "Active duplicate draft exists"}'::jsonb);
                    END IF;
                END IF;
            END LOOP;
        END IF;

    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
