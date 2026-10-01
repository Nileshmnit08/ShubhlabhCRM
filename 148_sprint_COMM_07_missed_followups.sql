-- 148_sprint_COMM_07_missed_followups.sql
-- Create view for Missed Follow-ups tab

CREATE OR REPLACE VIEW public.v_missed_followups WITH (security_invoker = true) AS
WITH LatestCall AS (
    SELECT DISTINCT ON (party_id)
        party_id,
        started_at AS latest_call_at,
        direction AS latest_call_type,
        staff_id AS latest_call_staff_id,
        id AS latest_call_id
    FROM public.crm_call_events
    WHERE party_id IS NOT NULL
    ORDER BY party_id, started_at DESC
),
LatestFollowup AS (
    SELECT DISTINCT ON (party_id)
        party_id,
        reason AS latest_followup_reason,
        due_at AS latest_followup_due_at,
        status AS latest_followup_status
    FROM public.follow_ups
    WHERE party_id IS NOT NULL
    ORDER BY party_id, due_at DESC
)
SELECT 
    c.id AS customer_id,
    c.display_name AS customer_name,
    c.mobile,
    c.crm_status,
    c.assigned_owner_id,
    u.display_name AS staff_name,
    lc.latest_call_at,
    lc.latest_call_type,
    lc.latest_call_staff_id,
    lf.latest_followup_reason,
    lf.latest_followup_status,
    lf.latest_followup_due_at
FROM public.crm_parties c
JOIN public.app_users u ON c.assigned_owner_id = u.id
LEFT JOIN LatestCall lc ON c.id = lc.party_id
LEFT JOIN LatestFollowup lf ON c.id = lf.party_id
WHERE c.assigned_owner_id IS NOT NULL;

GRANT SELECT ON public.v_missed_followups TO authenticated;
GRANT SELECT ON public.v_missed_followups TO anon;
