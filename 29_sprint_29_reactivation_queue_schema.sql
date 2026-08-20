-- SPRINT 29: Dormant Reactivation Queue Schema
-- Maps approved dormant candidates into the reactivation workflow.

DROP VIEW IF EXISTS v_reactivation_queue CASCADE;
CREATE OR REPLACE VIEW v_reactivation_queue AS
WITH latest_reactivation_task AS (
    SELECT 
        party_id,
        status,
        outcome_category,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY party_id ORDER BY created_at DESC) as rn
    FROM public.follow_ups
    WHERE follow_up_type = 'Reactivation'
)
SELECT 
    d.*,
    t.status AS latest_task_status,
    t.outcome_category AS latest_task_outcome,
    CASE 
        WHEN t.status = 'Pending' THEN 'IN_PROGRESS'
        WHEN t.status IN ('Completed', 'Cancelled') THEN 'COMPLETED'
        ELSE 'APPROVED'
    END AS reactivation_state
FROM public.v_dormant_candidates d
LEFT JOIN latest_reactivation_task t ON d.party_id = t.party_id AND t.rn = 1
WHERE d.review_state = 'APPROVED_FOR_REACTIVATION';
