-- SPRINT 19: Fix Customer Duplicate Handling
-- This script merges existing duplicates based on LOWER(TRIM(display_name)) and blocks future duplicates.

-- 1. Upgrade `merge_customers` RPC to include `owner_whatsapp_notifications`
CREATE OR REPLACE FUNCTION merge_customers(primary_id UUID, duplicate_id UUID) 
RETURNS void AS $$
BEGIN
    -- Ensure both exist
    IF NOT EXISTS (SELECT 1 FROM crm_parties WHERE id = primary_id) OR 
       NOT EXISTS (SELECT 1 FROM crm_parties WHERE id = duplicate_id) THEN
        RAISE EXCEPTION 'One or both customers do not exist.';
    END IF;

    -- 1. Transfer Requirements
    UPDATE requirements SET party_id = primary_id WHERE party_id = duplicate_id;
    
    -- 2. Transfer Interactions
    UPDATE interactions SET party_id = primary_id WHERE party_id = duplicate_id;
    
    -- 3. Transfer Follow-ups
    UPDATE follow_ups SET party_id = primary_id WHERE party_id = duplicate_id;
    
    -- 4. Transfer Tally Transactions
    UPDATE tally_transactions SET crm_party_id = primary_id WHERE crm_party_id = duplicate_id;
    
    -- 5. Transfer Identity Links
    UPDATE party_identity_links SET crm_party_id = primary_id WHERE crm_party_id = duplicate_id;

    -- 6. Transfer Owner Notifications (New from Sprint 16)
    UPDATE owner_whatsapp_notifications SET customer_id = primary_id WHERE customer_id = duplicate_id;

    -- 7. Copy missing data from duplicate to primary
    UPDATE crm_parties p
    SET 
        city = COALESCE(p.city, d.city),
        state = COALESCE(p.state, d.state),
        mobile = COALESCE(p.mobile, d.mobile),
        whatsapp = COALESCE(p.whatsapp, d.whatsapp),
        gst_number = COALESCE(p.gst_number, d.gst_number),
        notes = CONCAT_WS(E'\n', p.notes, d.notes)
    FROM crm_parties d
    WHERE p.id = primary_id AND d.id = duplicate_id;

    -- 8. Delete the duplicate (this cascades to activity_logs)
    DELETE FROM crm_parties WHERE id = duplicate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Automated Deduplication Script
DO $$
DECLARE
    rec RECORD;
    primary_rec RECORD;
    duplicate_rec RECORD;
BEGIN
    -- Iterate over every normalized display name that has more than 1 record
    FOR rec IN (
        SELECT LOWER(TRIM(display_name)) AS norm_name, COUNT(*)
        FROM public.crm_parties
        GROUP BY 1
        HAVING COUNT(*) > 1
    ) LOOP
        
        -- Pick the oldest record as the primary survivor
        SELECT * INTO primary_rec
        FROM public.crm_parties
        WHERE LOWER(TRIM(display_name)) = rec.norm_name
        ORDER BY created_at ASC
        LIMIT 1;

        -- Iterate over all other records in this group and merge them into the primary
        FOR duplicate_rec IN (
            SELECT * 
            FROM public.crm_parties
            WHERE LOWER(TRIM(display_name)) = rec.norm_name
            AND id != primary_rec.id
        ) LOOP
            -- Call the merge RPC
            PERFORM merge_customers(primary_rec.id, duplicate_rec.id);
            RAISE NOTICE 'Merged % into %', duplicate_rec.id, primary_rec.id;
        END LOOP;

    END LOOP;
END;
$$;


-- 3. Add UNIQUE constraint to prevent future duplicates
CREATE UNIQUE INDEX idx_crm_parties_unique_name 
ON public.crm_parties (LOWER(TRIM(display_name)));
