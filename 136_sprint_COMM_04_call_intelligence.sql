-- 136_sprint_COMM_04_call_intelligence.sql
-- Views for deterministic reporting of CRM Call Intelligence

-- 1. Repeated Communication Summary
-- Identifies multiple calls made by the same staff to the same normalized phone on the same UTC reporting date.
CREATE OR REPLACE VIEW public.v_repeated_communication_summary WITH (security_invoker = true) AS
SELECT
    staff_id,
    normalized_phone,
    party_id,
    (started_at AT TIME ZONE 'UTC')::DATE AS reporting_date,
    COUNT(*) AS call_count,
    SUM(duration_seconds) AS total_duration_seconds,
    MIN(started_at) AS first_call_at,
    MAX(started_at) AS last_call_at
FROM public.crm_call_events
GROUP BY staff_id, normalized_phone, party_id, (started_at AT TIME ZONE 'UTC')::DATE
HAVING COUNT(*) > 1;

GRANT SELECT ON public.v_repeated_communication_summary TO authenticated;
GRANT SELECT ON public.v_repeated_communication_summary TO anon;

-- 2. Staff Communication Summary
-- Aggregates overall call activity for each staff member by date.
CREATE OR REPLACE VIEW public.v_staff_communication_summary WITH (security_invoker = true) AS
WITH daily_phone_stats AS (
    SELECT 
        staff_id,
        (started_at AT TIME ZONE 'UTC')::DATE AS reporting_date,
        normalized_phone,
        COUNT(*) AS phone_call_count
    FROM public.crm_call_events
    GROUP BY staff_id, (started_at AT TIME ZONE 'UTC')::DATE, normalized_phone
),
daily_repeated_contacts AS (
    SELECT 
        staff_id,
        reporting_date,
        COUNT(*) AS repeated_contacts
    FROM daily_phone_stats
    WHERE phone_call_count > 1
    GROUP BY staff_id, reporting_date
)
SELECT
    c.staff_id,
    (c.started_at AT TIME ZONE 'UTC')::DATE AS reporting_date,
    COUNT(*) AS total_calls,
    COUNT(*) FILTER (WHERE c.call_type = 'ANSWERED') AS answered_calls,
    COUNT(*) FILTER (WHERE c.call_type = 'MISSED') AS missed_calls,
    COUNT(*) FILTER (WHERE c.direction = 'INCOMING') AS incoming_calls,
    COUNT(*) FILTER (WHERE c.direction = 'OUTGOING') AS outgoing_calls,
    SUM(c.duration_seconds) AS total_talk_seconds,
    COUNT(*) FILTER (WHERE c.match_status = 'matched' AND c.party_id IS NOT NULL) AS known_customer_calls,
    COUNT(*) FILTER (WHERE c.match_status = 'unknown' AND c.party_id IS NULL) AS unknown_calls,
    COUNT(*) FILTER (WHERE c.match_status = 'ambiguous' AND c.party_id IS NULL) AS ambiguous_calls,
    COUNT(DISTINCT c.party_id) AS customers_contacted,
    COALESCE(MAX(drc.repeated_contacts), 0) AS repeated_contacts
FROM public.crm_call_events c
LEFT JOIN daily_repeated_contacts drc 
  ON c.staff_id = drc.staff_id 
 AND (c.started_at AT TIME ZONE 'UTC')::DATE = drc.reporting_date
GROUP BY c.staff_id, (c.started_at AT TIME ZONE 'UTC')::DATE;

GRANT SELECT ON public.v_staff_communication_summary TO authenticated;
GRANT SELECT ON public.v_staff_communication_summary TO anon;

-- 3. Customer Communication Summary
-- Aggregates call activity against known matching CRM customers.
CREATE OR REPLACE VIEW public.v_customer_communication_summary WITH (security_invoker = true) AS
SELECT
    party_id,
    COUNT(*) AS total_calls,
    COUNT(*) FILTER (WHERE direction = 'INCOMING') AS incoming_calls,
    COUNT(*) FILTER (WHERE direction = 'OUTGOING') AS outgoing_calls,
    COUNT(*) FILTER (WHERE call_type = 'MISSED') AS missed_calls,
    SUM(duration_seconds) AS total_talk_seconds,
    MIN(started_at) AS first_call_at,
    MAX(started_at) AS last_call_at,
    COUNT(*) FILTER (WHERE (started_at AT TIME ZONE 'UTC')::DATE = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::DATE) AS calls_today,
    COUNT(*) FILTER (WHERE (started_at AT TIME ZONE 'UTC')::DATE >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::DATE - INTERVAL '7 days') AS calls_last_7_days,
    COUNT(*) FILTER (WHERE (started_at AT TIME ZONE 'UTC')::DATE >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::DATE - INTERVAL '30 days') AS calls_last_30_days,
    COUNT(DISTINCT staff_id) AS distinct_staff_count
FROM public.crm_call_events
WHERE match_status = 'matched' AND party_id IS NOT NULL
GROUP BY party_id;

GRANT SELECT ON public.v_customer_communication_summary TO authenticated;
GRANT SELECT ON public.v_customer_communication_summary TO anon;

-- 4. Unknown Communication Summary
-- Aggregates call activity from numbers not linked to a customer, masking the phone number for presentation.
CREATE OR REPLACE VIEW public.v_unknown_communication_summary WITH (security_invoker = true) AS
SELECT
    normalized_phone,
    CONCAT(SUBSTRING(normalized_phone, 1, 4), '*****', SUBSTRING(normalized_phone, length(normalized_phone) - 2, 3)) AS masked_phone,
    COUNT(*) AS total_calls,
    COUNT(*) FILTER (WHERE direction = 'INCOMING') AS incoming_calls,
    COUNT(*) FILTER (WHERE direction = 'OUTGOING') AS outgoing_calls,
    COUNT(*) FILTER (WHERE call_type = 'MISSED') AS missed_calls,
    SUM(duration_seconds) AS total_talk_seconds,
    MIN(started_at) AS first_seen_at,
    MAX(started_at) AS last_seen_at,
    COUNT(*) FILTER (WHERE (started_at AT TIME ZONE 'UTC')::DATE = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::DATE) AS calls_today,
    COUNT(*) FILTER (WHERE (started_at AT TIME ZONE 'UTC')::DATE >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::DATE - INTERVAL '7 days') AS calls_last_7_days,
    COUNT(*) FILTER (WHERE (started_at AT TIME ZONE 'UTC')::DATE >= (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::DATE - INTERVAL '30 days') AS calls_last_30_days,
    COUNT(DISTINCT staff_id) AS distinct_staff_count
FROM public.crm_call_events
WHERE match_status = 'unknown' AND party_id IS NULL
GROUP BY normalized_phone;

GRANT SELECT ON public.v_unknown_communication_summary TO authenticated;
GRANT SELECT ON public.v_unknown_communication_summary TO anon;
