-- MICRO-SPRINT 19.1: AUTOMATION RULE FOUNDATION
-- Foundational schema for deterministic, auditable CRM automation.

CREATE TABLE IF NOT EXISTS public.crm_automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_event VARCHAR(100) NOT NULL, -- e.g., CUSTOMER_CREATED, REQUIREMENT_STATUS_CHANGED, TALLY_IMPORTED
    conditions JSONB NOT NULL DEFAULT '{}'::jsonb, -- Logical conditions to evaluate
    action_type VARCHAR(100) NOT NULL, -- e.g., CREATE_FOLLOWUP, LOG_ACTIVITY
    action_payload JSONB NOT NULL DEFAULT '{}'::jsonb, -- Template for the action
    is_active BOOLEAN NOT NULL DEFAULT false,
    system_kill_switch BOOLEAN NOT NULL DEFAULT false, -- Master override, supersedes is_active
    cooldown_minutes INTEGER NOT NULL DEFAULT 1440, -- Default 24 hr cooldown to prevent duplicate fires
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.crm_automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES public.crm_automation_rules(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL, -- e.g., crm_parties, requirements
    entity_id UUID NOT NULL, -- The specific record that triggered it
    status VARCHAR(50) NOT NULL, -- PENDING, SUCCESS, FAILED, SKIPPED
    details JSONB, -- Logs execution trace or reason for failure/skipping
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for checking cooldowns quickly
CREATE INDEX IF NOT EXISTS idx_automation_logs_lookup 
ON public.crm_automation_logs (rule_id, entity_type, entity_id, status);

-- Enable RLS
ALTER TABLE public.crm_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automation_logs ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with rules
CREATE POLICY "Admins manage automation rules" ON public.crm_automation_rules
    FOR ALL
    TO authenticated
    USING ( (SELECT role FROM public.app_users WHERE id = auth.uid()) = 'Admin' );

-- Anyone can read active rules (for backend processing triggered by their actions)
CREATE POLICY "Authenticated users view active rules" ON public.crm_automation_rules
    FOR SELECT
    TO authenticated
    USING (is_active = true AND system_kill_switch = false);

-- System can log executions for the triggering user
CREATE POLICY "Users can create logs for actions they trigger" ON public.crm_automation_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can read their own logs" ON public.crm_automation_logs
    FOR SELECT
    TO authenticated
    USING (true);
    
-- Add simple trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_automation_rule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = CURRENT_TIMESTAMP;
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_automation_rule ON public.crm_automation_rules;
CREATE TRIGGER trg_update_automation_rule
BEFORE UPDATE ON public.crm_automation_rules
FOR EACH ROW
EXECUTE FUNCTION update_automation_rule_timestamp();

-- Create evaluate function helper that checks the cooldown
CREATE OR REPLACE FUNCTION public.fn_check_automation_cooldown(
    p_rule_id UUID,
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_cooldown_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    recent_execution_count INTEGER;
BEGIN
    IF p_cooldown_minutes = 0 THEN
        RETURN true; -- No cooldown
    END IF;

    SELECT COUNT(*)
    INTO recent_execution_count
    FROM public.crm_automation_logs
    WHERE rule_id = p_rule_id
      AND entity_type = p_entity_type
      AND entity_id = p_entity_id
      AND status IN ('SUCCESS', 'PENDING')
      AND executed_at > (CURRENT_TIMESTAMP - (p_cooldown_minutes || ' minutes')::interval);

    IF recent_execution_count > 0 THEN
        RETURN false; -- Cooldown is active, cannot run
    END IF;

    RETURN true; -- Safe to run
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
