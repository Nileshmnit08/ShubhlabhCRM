-- SPRINT 13: Customer Master V2 Schema Updates

-- 1. Add Business & Owner Fields to crm_parties
ALTER TABLE public.crm_parties 
ADD COLUMN IF NOT EXISTS gst_number VARCHAR(15),
ADD COLUMN IF NOT EXISTS assigned_owner_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(15,2);

-- 2. Create Financials View based on Tally Transactions
DROP VIEW IF EXISTS v_customer_financials CASCADE;
CREATE OR REPLACE VIEW v_customer_financials AS
SELECT 
    p.id AS party_id,
    COALESCE(SUM(CASE WHEN t.is_credit = false THEN t.amount ELSE 0 END), 0) AS total_billed,
    COALESCE(SUM(CASE WHEN t.is_credit = true THEN t.amount ELSE 0 END), 0) AS total_received,
    COALESCE(SUM(CASE WHEN t.is_credit = false THEN t.amount ELSE -t.amount END), 0) AS outstanding_balance,
    MAX(CASE WHEN t.is_credit = true THEN t.voucher_date ELSE NULL END) AS last_payment_date,
    MAX(CASE WHEN t.is_credit = false THEN t.voucher_date ELSE NULL END) AS last_order_date
FROM public.crm_parties p
LEFT JOIN public.tally_transactions t ON p.id = t.crm_party_id
GROUP BY p.id;

-- 3. Create Master View for Customer Listing
DROP VIEW IF EXISTS v_customer_master CASCADE;
CREATE OR REPLACE VIEW v_customer_master AS
SELECT 
    c.*,
    u.display_name AS owner_name,
    f.total_billed,
    f.total_received,
    f.outstanding_balance,
    f.last_payment_date,
    f.last_order_date,
    (
        (CASE WHEN c.display_name IS NOT NULL AND c.display_name != '' THEN 20 ELSE 0 END) +
        (CASE WHEN c.mobile IS NOT NULL AND c.mobile != '' THEN 20 ELSE 0 END) +
        (CASE WHEN c.city IS NOT NULL AND c.city != '' THEN 20 ELSE 0 END) +
        (CASE WHEN c.gst_number IS NOT NULL AND c.gst_number != '' THEN 20 ELSE 0 END) +
        (CASE WHEN c.assigned_owner_id IS NOT NULL THEN 20 ELSE 0 END)
    ) AS profile_completeness
FROM public.crm_parties c
LEFT JOIN public.app_users u ON c.assigned_owner_id = u.id
LEFT JOIN v_customer_financials f ON c.id = f.party_id;

-- 4. Create Merge RPC Function
-- This allows safely merging duplicate customers in a single database transaction.
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

    -- 6. Copy missing data from duplicate to primary (optional simplistic merge)
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

    -- 7. Delete the duplicate (this works because we dropped CASCADE and re-linked everything)
    DELETE FROM crm_parties WHERE id = duplicate_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
