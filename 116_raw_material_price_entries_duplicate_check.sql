-- Migration: 116_raw_material_price_entries_duplicate_check.sql
-- Description: Adds a unique index to detect duplicate or near-duplicate quotes from the same broker on the same day for the exact same parameters.

-- 1. Clean up any existing exact duplicates before applying the index
-- (Keeping the most recently created one in case there are any)
DELETE FROM public.raw_material_price_entries a USING (
    SELECT MAX(created_at) as max_created_at, entry_date, raw_material_id, broker_id, 
           COALESCE(quality_grade_id, '00000000-0000-0000-0000-000000000000'::uuid) as q_id, 
           COALESCE(market_location, '') as m_loc, 
           price_type_id
    FROM public.raw_material_price_entries
    WHERE is_deleted = false
    GROUP BY entry_date, raw_material_id, broker_id, q_id, m_loc, price_type_id
    HAVING COUNT(*) > 1
) b
WHERE a.entry_date = b.entry_date 
  AND a.raw_material_id = b.raw_material_id 
  AND a.broker_id = b.broker_id 
  AND COALESCE(a.quality_grade_id, '00000000-0000-0000-0000-000000000000'::uuid) = b.q_id 
  AND COALESCE(a.market_location, '') = b.m_loc 
  AND a.price_type_id = b.price_type_id 
  AND a.created_at < b.max_created_at
  AND a.is_deleted = false;

-- 2. Create the unique index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_price_quote ON public.raw_material_price_entries (
    entry_date, 
    raw_material_id, 
    broker_id, 
    COALESCE(quality_grade_id, '00000000-0000-0000-0000-000000000000'::uuid), 
    COALESCE(market_location, ''), 
    price_type_id
) WHERE is_deleted = false;
