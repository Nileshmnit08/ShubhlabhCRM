-- 138_sprint_COMM_06_grouped_history.sql
-- RPC for grouping communication history by phone number

CREATE OR REPLACE FUNCTION public.get_communication_dashboard_grouped(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_staff_id UUID DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_sort_key TEXT DEFAULT 'started_at',
    p_sort_direction TEXT DEFAULT 'desc',
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    normalized_phone TEXT,
    party_id UUID,
    party_name TEXT,
    display_phone TEXT,
    total_calls BIGINT,
    incoming_count BIGINT,
    outgoing_count BIGINT,
    missed_count BIGINT,
    talk_seconds BIGINT,
    last_call_at TIMESTAMPTZ,
    last_call_direction TEXT,
    events_json JSONB,
    total_group_count BIGINT,
    grand_total_calls BIGINT,
    grand_incoming BIGINT,
    grand_outgoing BIGINT,
    grand_missed BIGINT,
    grand_talk_seconds BIGINT,
    grand_known BIGINT,
    grand_unknown BIGINT
) AS $$
DECLARE
    v_is_admin BOOLEAN := public.is_admin();
BEGIN
    RETURN QUERY
    WITH FilteredEvents AS (
        SELECT 
            c.*,
            u.display_name AS staff_name,
            p.display_name AS party_name,
            CASE 
                WHEN v_is_admin THEN c.normalized_phone
                ELSE CONCAT(SUBSTRING(c.normalized_phone, 1, 4), '*****', SUBSTRING(c.normalized_phone, length(c.normalized_phone) - 2, 3))
            END AS display_phone
        FROM public.crm_call_events c
        LEFT JOIN public.app_users u ON c.staff_id = u.id
        LEFT JOIN public.crm_parties p ON c.party_id = p.id
        WHERE c.started_at >= p_start_date 
          AND c.started_at <= p_end_date
          AND (p_staff_id IS NULL OR c.staff_id = p_staff_id)
          AND (
              p_search IS NULL 
              OR p_search = '' 
              OR p.display_name ILIKE '%' || p_search || '%'
              OR u.display_name ILIKE '%' || p_search || '%'
              OR c.normalized_phone ILIKE '%' || p_search || '%'
          )
    ),
    GroupedEvents AS (
        SELECT 
            fe.normalized_phone,
            MAX(fe.party_id::TEXT)::UUID AS party_id, 
            MAX(fe.party_name) AS party_name,
            MAX(fe.display_phone) AS display_phone,
            COUNT(*) AS total_calls,
            SUM(CASE WHEN fe.direction = 'INCOMING' THEN 1 ELSE 0 END) AS incoming_count,
            SUM(CASE WHEN fe.direction = 'OUTGOING' THEN 1 ELSE 0 END) AS outgoing_count,
            SUM(CASE WHEN fe.call_type = 'MISSED' THEN 1 ELSE 0 END) AS missed_count,
            SUM(COALESCE(fe.duration_seconds, 0)) AS talk_seconds,
            MAX(fe.started_at) AS last_call_at,
            (
                SELECT direction 
                FROM FilteredEvents fe_sub 
                WHERE fe_sub.normalized_phone = fe.normalized_phone 
                ORDER BY started_at DESC LIMIT 1
            ) AS last_call_direction,
            jsonb_agg(
                jsonb_build_object(
                    'id', fe.id,
                    'started_at', fe.started_at,
                    'ended_at', fe.ended_at,
                    'direction', fe.direction,
                    'call_type', fe.call_type,
                    'duration_seconds', fe.duration_seconds,
                    'staff_name', fe.staff_name,
                    'match_status', fe.match_status
                ) ORDER BY fe.started_at DESC
            ) AS events_json
        FROM FilteredEvents fe
        GROUP BY fe.normalized_phone
    ),
    CountedGroups AS (
        SELECT 
            COUNT(*) OVER() AS total_group_count,
            SUM(ge.total_calls) OVER() AS grand_total_calls,
            SUM(ge.incoming_count) OVER() AS grand_incoming,
            SUM(ge.outgoing_count) OVER() AS grand_outgoing,
            SUM(ge.missed_count) OVER() AS grand_missed,
            SUM(ge.talk_seconds) OVER() AS grand_talk_seconds,
            SUM(CASE WHEN ge.party_id IS NOT NULL THEN ge.total_calls ELSE 0 END) OVER() AS grand_known,
            SUM(CASE WHEN ge.party_id IS NULL THEN ge.total_calls ELSE 0 END) OVER() AS grand_unknown,
            ge.* 
        FROM GroupedEvents ge
    )
    SELECT 
        cg.normalized_phone,
        cg.party_id,
        cg.party_name,
        cg.display_phone,
        cg.total_calls,
        cg.incoming_count,
        cg.outgoing_count,
        cg.missed_count,
        cg.talk_seconds,
        cg.last_call_at,
        cg.last_call_direction,
        cg.events_json,
        cg.total_group_count,
        cg.grand_total_calls,
        cg.grand_incoming,
        cg.grand_outgoing,
        cg.grand_missed,
        cg.grand_talk_seconds,
        cg.grand_known,
        cg.grand_unknown
    FROM CountedGroups cg
    ORDER BY
        CASE WHEN p_sort_key = 'started_at' AND p_sort_direction = 'asc' THEN cg.last_call_at END ASC,
        CASE WHEN p_sort_key = 'started_at' AND p_sort_direction = 'desc' THEN cg.last_call_at END DESC,
        CASE WHEN p_sort_key = 'party_name' AND p_sort_direction = 'asc' THEN cg.party_name END ASC NULLS LAST,
        CASE WHEN p_sort_key = 'party_name' AND p_sort_direction = 'desc' THEN cg.party_name END DESC NULLS FIRST,
        CASE WHEN p_sort_key = 'party_id' AND p_sort_direction = 'asc' THEN cg.party_id END ASC NULLS FIRST,
        CASE WHEN p_sort_key = 'party_id' AND p_sort_direction = 'desc' THEN cg.party_id END DESC NULLS LAST,
        CASE WHEN p_sort_key = 'normalized_phone' AND p_sort_direction = 'asc' THEN cg.normalized_phone END ASC,
        CASE WHEN p_sort_key = 'duration_seconds' AND p_sort_direction = 'desc' THEN cg.talk_seconds END DESC,
        cg.last_call_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
