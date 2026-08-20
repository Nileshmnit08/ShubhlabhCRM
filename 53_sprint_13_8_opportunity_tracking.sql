-- MICRO-SPRINT 13.8: OPPORTUNITY TRACKING
-- Track opportunity -> human action -> outcome using existing Activity, Follow-up and Requirement structures.

-- 1. Create RPC function to close an opportunity follow-up and log the outcome
CREATE OR REPLACE FUNCTION public.rpc_complete_opportunity_follow_up(
    p_follow_up_id UUID,
    p_outcome TEXT,
    p_note TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_party_id UUID;
    v_follow_up_notes TEXT;
BEGIN
    -- Verify follow-up exists and get details
    SELECT party_id, notes INTO v_party_id, v_follow_up_notes 
    FROM public.follow_ups 
    WHERE id = p_follow_up_id AND status = 'Pending';
    
    IF v_party_id IS NULL THEN
        RAISE EXCEPTION 'Follow-up not found or already completed/cancelled.';
    END IF;

    -- Update follow-up status
    UPDATE public.follow_ups 
    SET 
        status = 'Completed',
        completed_at = CURRENT_TIMESTAMP,
        completed_by = v_user_id
    WHERE id = p_follow_up_id;

    -- Insert interaction log for the outcome
    INSERT INTO public.interactions (
        party_id,
        user_id,
        channel,
        interaction_type,
        outcome,
        note,
        created_at
    ) VALUES (
        v_party_id,
        v_user_id,
        'Note',
        'Opportunity Outcome',
        p_outcome,
        'Original Task: ' || v_follow_up_notes || COALESCE(' | Details: ' || p_note, ''),
        CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION public.rpc_complete_opportunity_follow_up TO authenticated;


-- 2. Create tracking view
CREATE OR REPLACE VIEW public.v_opportunity_tracking WITH (security_invoker = true) AS
-- Segment A: Accepted Opportunities (tracked via Follow-ups)
SELECT 
    f.id AS tracking_id,
    f.party_id,
    c.display_name AS customer_name,
    TRIM(SUBSTRING(f.notes FROM 'Opportunity \(([^)]+)\) Accepted')) AS opportunity_type,
    f.created_at AS identified_date,
    'Accepted' AS initial_action,
    f.status AS current_status,
    -- If completed, fetch the most recent Opportunity Outcome interaction for this party
    (
        SELECT outcome 
        FROM public.interactions i 
        WHERE i.party_id = f.party_id 
          AND i.interaction_type = 'Opportunity Outcome' 
          AND i.created_at >= f.created_at 
        ORDER BY i.created_at DESC 
        LIMIT 1
    ) AS final_outcome,
    f.reason AS context,
    f.assigned_to AS assigned_owner_id
FROM public.follow_ups f
JOIN public.crm_parties c ON f.party_id = c.id
WHERE f.notes LIKE 'Opportunity (%) Accepted%'

UNION ALL

-- Segment B: Dismissed Opportunities (tracked via Interactions)
SELECT 
    i.id AS tracking_id,
    i.party_id,
    c.display_name AS customer_name,
    TRIM(SUBSTRING(i.note FROM 'Opportunity: ([^|]+) \| Reason:')) AS opportunity_type,
    i.created_at AS identified_date,
    'Dismissed' AS initial_action,
    'Closed' AS current_status,
    TRIM(SUBSTRING(i.note FROM 'Reason: (.*)')) AS final_outcome,
    'Dismissed without follow-up' AS context,
    i.user_id AS assigned_owner_id
FROM public.interactions i
JOIN public.crm_parties c ON i.party_id = c.id
WHERE i.interaction_type = 'Opportunity Dismissed' AND i.note LIKE 'Opportunity: % | Reason: %';

GRANT SELECT ON public.v_opportunity_tracking TO authenticated;
GRANT SELECT ON public.v_opportunity_tracking TO anon;
