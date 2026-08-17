-- SPRINT 7: Tally Voucher-Level Business Intelligence Schema

-- 1. Tally Raw Transactions Staging
-- Captures the exact CSV output from Tally Voucher Register / Daybook
CREATE TABLE tally_raw_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    import_id UUID NOT NULL REFERENCES tally_imports(id) ON DELETE CASCADE,
    voucher_date DATE,
    particulars TEXT NOT NULL,          -- The ledger name in Tally
    voucher_type TEXT,                  -- Sales, Receipt, Payment, Purchase, Journal
    voucher_no TEXT,
    debit_amount DECIMAL(15, 2) DEFAULT 0,
    credit_amount DECIMAL(15, 2) DEFAULT 0,
    raw_data JSONB,                     -- Complete row data for auditing
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Cleaned Tally Transactions linked to CRM
CREATE TABLE tally_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    crm_party_id UUID REFERENCES crm_parties(id) ON DELETE CASCADE,
    import_id UUID REFERENCES tally_imports(id) ON DELETE SET NULL,
    
    voucher_date DATE NOT NULL,
    tally_ledger_name TEXT NOT NULL,
    voucher_type TEXT NOT NULL,
    voucher_no TEXT,
    
    amount DECIMAL(15, 2) NOT NULL,
    is_credit BOOLEAN NOT NULL DEFAULT false, -- True if Credit, False if Debit
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicate imports of the exact same voucher
    UNIQUE(tally_ledger_name, voucher_type, voucher_no, voucher_date)
);

-- RLS Policies
ALTER TABLE tally_raw_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tally_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on tally_raw_transactions" ON tally_raw_transactions FOR ALL USING (true);
CREATE POLICY "Allow all on tally_transactions" ON tally_transactions FOR ALL USING (true);

-- Dummy Seed Data for Testing Financial Intel BI
-- We assume "Shree Venkateshwara Poultry" is one of our parties.
-- You can safely run this; if the CRM parties don't exist it just won't link, but we'll try to find one.

DO $$
DECLARE
    sv_party_id UUID;
BEGIN
    SELECT id INTO sv_party_id FROM crm_parties LIMIT 1;
    
    IF sv_party_id IS NOT NULL THEN
        INSERT INTO tally_transactions (crm_party_id, voucher_date, tally_ledger_name, voucher_type, voucher_no, amount, is_credit)
        VALUES 
        (sv_party_id, CURRENT_DATE - INTERVAL '5 days', 'Test Poultry Farm', 'Sales', 'V-1001', 54000.00, false),
        (sv_party_id, CURRENT_DATE - INTERVAL '15 days', 'Test Poultry Farm', 'Sales', 'V-0942', 32000.00, false),
        (sv_party_id, CURRENT_DATE - INTERVAL '25 days', 'Test Poultry Farm', 'Sales', 'V-0899', 45000.00, false),
        (sv_party_id, CURRENT_DATE - INTERVAL '3 days', 'Test Poultry Farm', 'Receipt', 'R-0231', 50000.00, true);
    END IF;
END $$;
