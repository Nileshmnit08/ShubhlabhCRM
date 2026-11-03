-- ============================================================================
-- STATUS: SUPERSEDED (2026-11-03) — DO NOT APPLY.
-- Replaced by 249_sprint_LH_FOUNDATION_SECURE_01.sql + 250_sprint_LH_SETTLEMENT_SECURE_01.sql
-- (security blockers and data defects fixed; see LH-MIGRATION-REVIEW-01.md). Kept for history.
-- ============================================================================
-- PROPOSED MIGRATION: 247_sprint_LH_DATABASE_FOUNDATION_01.sql
-- SPRINT: LH-DB-01 — Shubh Labh Labour Hisab Database Foundation
--
-- STATUS: PROPOSED — READY FOR APPOINTED REPOSITORIES
-- Lives in supabase/proposals/ per policy so `supabase db push` cannot auto-apply.
-- Rollback: supabase/proposals/247_rollback_sprint_LH_DATABASE_FOUNDATION_01.sql
--
-- ENTITIES IMPLEMENTED:
--   A. contractors                   (Contractor profile master)
--   B. labourers                     (Labourers with stable IDs, rename safe)
--   C. labour_rates                   (Immutable historical rate versioning)
--   D. daily_work_entries             (Daily production & labour calculation)
--   E. daily_work_details             (Multi-line bag weight breakdown)
--   F. labour_work_allocations        (Equal / individual work allocations)
--   G. labour_payments                (Daily cash/other payments)
--   H. service_expenses               (Food, tea, transport, stay expenses)
--   I. service_expense_allocations    (Deductions assigned to labourers)
--
-- VIEWS IMPLEMENTED:
--   1. v_daily_contractor_summary
--   2. v_weekly_contractor_summary
--   3. v_monthly_contractor_summary
--   4. v_individual_monthly_statement (Includes WhatsApp share-ready text)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CONTRACTORS MASTER TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    business_name VARCHAR(255) DEFAULT 'शुभ लाभ लेबर कांट्रेक्टर',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. LABOURERS MASTER TABLE (Stable IDs, Rename & Deactivation Safe)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.labourers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
    local_id VARCHAR(50) NOT NULL, -- Stable local ID (e.g. LH_LAB_001)
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(100) DEFAULT 'सामान्य मजदूर',
    active_status BOOLEAN NOT NULL DEFAULT true,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    avatar_color VARCHAR(20) DEFAULT '#F28C28',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_contractor_labourer_local_id UNIQUE (contractor_id, local_id)
);

-- ----------------------------------------------------------------------------
-- 3. LABOUR RATES TABLE (Historical Rate Versioning)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.labour_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
    work_type VARCHAR(100) NOT NULL,
    rate NUMERIC(10, 2) NOT NULL CHECK (rate >= 0),
    rate_unit VARCHAR(50) NOT NULL CHECK (rate_unit IN ('Per 100 kg', 'Per bag', 'Per batch', 'Fixed amount')),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_until DATE, -- NULL indicates current active rate
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. DAILY WORK ENTRIES TABLE (Production & Labour Amount Snapshot)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_work_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    work_type VARCHAR(100) NOT NULL,
    rate_id UUID REFERENCES public.labour_rates(id) ON DELETE SET NULL,
    rate_snapshot NUMERIC(10, 2) NOT NULL CHECK (rate_snapshot >= 0),
    rate_unit_snapshot VARCHAR(50) NOT NULL,
    quantity NUMERIC(12, 2) DEFAULT 0,
    total_weight_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_bags INT NOT NULL DEFAULT 0,
    total_batches INT NOT NULL DEFAULT 0,
    calculated_labour_amount NUMERIC(12, 2) NOT NULL CHECK (calculated_labour_amount >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. DAILY WORK DETAILS (Multi-line Bag Weight Breakdown)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_work_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_entry_id UUID NOT NULL REFERENCES public.daily_work_entries(id) ON DELETE CASCADE,
    bag_weight_kg NUMERIC(10, 2) NOT NULL CHECK (bag_weight_kg > 0),
    bag_count INT NOT NULL CHECK (bag_count > 0),
    total_weight_kg NUMERIC(12, 2) GENERATED ALWAYS AS (bag_weight_kg * bag_count) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. LABOUR WORK ALLOCATIONS (Equal / Individual Distribution)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.labour_work_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_entry_id UUID NOT NULL REFERENCES public.daily_work_entries(id) ON DELETE CASCADE,
    labourer_id UUID NOT NULL REFERENCES public.labourers(id) ON DELETE RESTRICT,
    allocated_amount NUMERIC(12, 2) NOT NULL CHECK (allocated_amount >= 0),
    allocation_method VARCHAR(50) NOT NULL DEFAULT 'Equal' CHECK (allocation_method IN ('Equal', 'Individual')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_work_entry_labourer UNIQUE (work_entry_id, labourer_id)
);

-- ----------------------------------------------------------------------------
-- 7. LABOUR PAYMENTS TABLE (Cash / Other Daily Payments)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.labour_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
    labourer_id UUID NOT NULL REFERENCES public.labourers(id) ON DELETE RESTRICT,
    payment_date DATE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Other', 'Bank', 'UPI')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. SERVICE EXPENSES TABLE (Meals, Tea, Transport, Accommodation)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    expense_category VARCHAR(50) NOT NULL CHECK (expense_category IN ('Food / Meals', 'Tea / Breakfast', 'Transportation', 'Accommodation', 'Other')),
    expense_name VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    allocation_scope VARCHAR(50) NOT NULL CHECK (allocation_scope IN ('Contractor expense', 'Labourer expense', 'Group expense')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. SERVICE EXPENSE ALLOCATIONS TABLE (Deductions from Labourers)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_expense_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES public.service_expenses(id) ON DELETE CASCADE,
    labourer_id UUID NOT NULL REFERENCES public.labourers(id) ON DELETE RESTRICT,
    allocated_amount NUMERIC(12, 2) NOT NULL CHECK (allocated_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_expense_labourer UNIQUE (expense_id, labourer_id)
);

-- ----------------------------------------------------------------------------
-- 10. INDEXES FOR PERFORMANCE AND DATE FILTERING
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_labourers_contractor ON public.labourers(contractor_id);
CREATE INDEX IF NOT EXISTS idx_labourers_active ON public.labourers(contractor_id, active_status);
CREATE INDEX IF NOT EXISTS idx_labour_rates_lookup ON public.labour_rates(contractor_id, work_type, effective_from);
CREATE INDEX IF NOT EXISTS idx_work_entries_date ON public.daily_work_entries(contractor_id, work_date);
CREATE INDEX IF NOT EXISTS idx_work_details_entry ON public.daily_work_details(work_entry_id);
CREATE INDEX IF NOT EXISTS idx_work_alloc_entry ON public.labour_work_allocations(work_entry_id);
CREATE INDEX IF NOT EXISTS idx_work_alloc_labourer ON public.labour_work_allocations(labourer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.labour_payments(contractor_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_labourer ON public.labour_payments(labourer_id, payment_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.service_expenses(contractor_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_expense_alloc_exp ON public.service_expense_allocations(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_alloc_lab ON public.service_expense_allocations(labourer_id);

-- ----------------------------------------------------------------------------
-- 11. CALCULATION HELPER FUNCTIONS & INTEGRITY TRIGGERS
-- ----------------------------------------------------------------------------

-- Function: Calculate labour amount based on rate unit
CREATE OR REPLACE FUNCTION public.fn_calculate_work_amount(
    p_rate NUMERIC,
    p_unit VARCHAR,
    p_weight_kg NUMERIC,
    p_bags INT,
    p_batches INT
) RETURNS NUMERIC AS $$
BEGIN
    IF p_unit = 'Per 100 kg' THEN
        RETURN ROUND(((COALESCE(p_weight_kg, 0) / 100.0) * p_rate), 2);
    ELSIF p_unit = 'Per bag' THEN
        RETURN ROUND((COALESCE(p_bags, 0) * p_rate), 2);
    ELSIF p_unit = 'Per batch' THEN
        RETURN ROUND((COALESCE(p_batches, 0) * p_rate), 2);
    ELSE
        RETURN ROUND(p_rate, 2);
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger: Validate that total work allocations do not exceed work entry amount
CREATE OR REPLACE FUNCTION public.fn_check_work_allocation_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_total_work_amount NUMERIC(12, 2);
    v_allocated_sum NUMERIC(12, 2);
BEGIN
    SELECT calculated_labour_amount INTO v_total_work_amount
    FROM public.daily_work_entries
    WHERE id = NEW.work_entry_id;

    SELECT COALESCE(SUM(allocated_amount), 0) + NEW.allocated_amount
    INTO v_allocated_sum
    FROM public.labour_work_allocations
    WHERE work_entry_id = NEW.work_entry_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    -- Allow penny rounding tolerance (0.02)
    IF v_allocated_sum > (v_total_work_amount + 0.02) THEN
        RAISE EXCEPTION 'कुल आवंटन (₹%) कार्य राशि (₹%) से अधिक नहीं हो सकता।',
            v_allocated_sum, v_total_work_amount;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF to_regclass('public.labour_work_allocations') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_check_work_allocation_limit ON public.labour_work_allocations;
    END IF;
END $$;
CREATE TRIGGER trg_check_work_allocation_limit
    BEFORE INSERT OR UPDATE ON public.labour_work_allocations
    FOR EACH ROW EXECUTE FUNCTION public.fn_check_work_allocation_limit();

-- ----------------------------------------------------------------------------
-- 12. REPORTING VIEWS
-- ----------------------------------------------------------------------------

-- View 1: Daily Contractor Summary
CREATE OR REPLACE VIEW public.v_daily_contractor_summary AS
WITH daily_work AS (
    SELECT
        contractor_id,
        work_date,
        COUNT(id) AS work_entries_count,
        SUM(total_weight_kg) AS total_weight_kg,
        SUM(calculated_labour_amount) AS total_labour_earned
    FROM public.daily_work_entries
    GROUP BY contractor_id, work_date
),
daily_pays AS (
    SELECT
        contractor_id,
        payment_date,
        SUM(amount) AS total_payments
    FROM public.labour_payments
    GROUP BY contractor_id, payment_date
),
daily_exps AS (
    SELECT
        contractor_id,
        expense_date,
        SUM(amount) AS total_service_expenses,
        SUM(CASE WHEN allocation_scope = 'Contractor expense' THEN amount ELSE 0 END) AS contractor_borne_expenses,
        SUM(CASE WHEN allocation_scope != 'Contractor expense' THEN amount ELSE 0 END) AS labourer_allocated_deductions
    FROM public.service_expenses
    GROUP BY contractor_id, expense_date
),
all_dates AS (
    SELECT contractor_id, work_date AS date FROM daily_work
    UNION
    SELECT contractor_id, payment_date AS date FROM daily_pays
    UNION
    SELECT contractor_id, expense_date AS date FROM daily_exps
)
SELECT
    d.contractor_id,
    c.name AS contractor_name,
    d.date AS report_date,
    COALESCE(w.work_entries_count, 0) AS work_entries_count,
    COALESCE(w.total_weight_kg, 0) AS total_weight_kg,
    COALESCE(w.total_labour_earned, 0) AS total_labour_earned,
    COALESCE(p.total_payments, 0) AS total_payments,
    COALESCE(e.total_service_expenses, 0) AS total_service_expenses,
    COALESCE(e.contractor_borne_expenses, 0) AS contractor_borne_expenses,
    COALESCE(e.labourer_allocated_deductions, 0) AS labourer_allocated_deductions,
    (COALESCE(w.total_labour_earned, 0) - COALESCE(p.total_payments, 0) - COALESCE(e.labourer_allocated_deductions, 0)) AS outstanding_payable_balance
FROM all_dates d
JOIN public.contractors c ON d.contractor_id = c.id
LEFT JOIN daily_work w ON d.contractor_id = w.contractor_id AND d.date = w.work_date
LEFT JOIN daily_pays p ON d.contractor_id = p.contractor_id AND d.date = p.payment_date
LEFT JOIN daily_exps e ON d.contractor_id = e.contractor_id AND d.date = e.expense_date;

-- View 2: Weekly Contractor Summary
CREATE OR REPLACE VIEW public.v_weekly_contractor_summary AS
SELECT
    contractor_id,
    contractor_name,
    DATE_TRUNC('week', report_date)::DATE AS week_start_date,
    (DATE_TRUNC('week', report_date) + INTERVAL '6 days')::DATE AS week_end_date,
    COUNT(DISTINCT report_date) AS active_working_days,
    SUM(work_entries_count) AS total_work_count,
    SUM(total_weight_kg) AS total_weight_kg,
    SUM(total_labour_earned) AS total_labour_earned,
    SUM(total_payments) AS total_payments,
    SUM(total_service_expenses) AS total_service_expenses,
    SUM(contractor_borne_expenses) AS contractor_borne_expenses,
    SUM(labourer_allocated_deductions) AS labourer_allocated_deductions,
    SUM(outstanding_payable_balance) AS total_outstanding_balance
FROM public.v_daily_contractor_summary
GROUP BY contractor_id, contractor_name, DATE_TRUNC('week', report_date);

-- View 3: Monthly Contractor Summary
CREATE OR REPLACE VIEW public.v_monthly_contractor_summary AS
SELECT
    contractor_id,
    contractor_name,
    TO_CHAR(report_date, 'YYYY-MM') AS month_str,
    COUNT(DISTINCT report_date) AS total_working_days,
    SUM(total_weight_kg) AS total_weight_processed_kg,
    SUM(total_labour_earned) AS total_labour_earned,
    SUM(total_payments) AS total_payments,
    SUM(total_service_expenses) AS total_service_expenses,
    SUM(contractor_borne_expenses) AS contractor_borne_expenses,
    SUM(labourer_allocated_deductions) AS total_allocated_service_deductions,
    SUM(outstanding_payable_balance) AS remaining_payable_balance
FROM public.v_daily_contractor_summary
GROUP BY contractor_id, contractor_name, TO_CHAR(report_date, 'YYYY-MM');

-- View 4: Individual Labourer Monthly Statement (with WhatsApp text)
CREATE OR REPLACE VIEW public.v_individual_monthly_statement AS
WITH lab_work AS (
    SELECT
        lwa.labourer_id,
        TO_CHAR(dwe.work_date, 'YYYY-MM') AS month_str,
        COUNT(DISTINCT dwe.work_date) AS work_days,
        COUNT(dwe.id) AS total_work_entries,
        SUM(dwe.total_weight_kg) AS total_weight_kg,
        SUM(lwa.allocated_amount) AS total_earned
    FROM public.labour_work_allocations lwa
    JOIN public.daily_work_entries dwe ON lwa.work_entry_id = dwe.id
    GROUP BY lwa.labourer_id, TO_CHAR(dwe.work_date, 'YYYY-MM')
),
lab_pays AS (
    SELECT
        lp.labourer_id,
        TO_CHAR(lp.payment_date, 'YYYY-MM') AS month_str,
        COUNT(DISTINCT lp.payment_date) AS pay_days,
        SUM(lp.amount) AS total_paid
    FROM public.labour_payments lp
    GROUP BY lp.labourer_id, TO_CHAR(lp.payment_date, 'YYYY-MM')
),
lab_deductions AS (
    SELECT
        sea.labourer_id,
        TO_CHAR(se.expense_date, 'YYYY-MM') AS month_str,
        SUM(sea.allocated_amount) AS allocated_deductions
    FROM public.service_expense_allocations sea
    JOIN public.service_expenses se ON sea.expense_id = se.id
    GROUP BY sea.labourer_id, TO_CHAR(se.expense_date, 'YYYY-MM')
),
all_months AS (
    SELECT labourer_id, month_str FROM lab_work
    UNION
    SELECT labourer_id, month_str FROM lab_pays
    UNION
    SELECT labourer_id, month_str FROM lab_deductions
)
SELECT
    m.labourer_id,
    l.contractor_id,
    c.name AS contractor_name,
    l.local_id,
    l.name AS labourer_name,
    l.phone AS labourer_phone,
    l.role AS labourer_role,
    l.active_status,
    m.month_str,
    GREATEST(COALESCE(w.work_days, 0), COALESCE(p.pay_days, 0)) AS working_days,
    COALESCE(w.total_work_entries, 0) AS total_work_entries,
    COALESCE(w.total_weight_kg, 0) AS total_weight_kg,
    COALESCE(w.total_earned, 0) AS total_earned,
    COALESCE(p.total_paid, 0) AS total_paid,
    COALESCE(d.allocated_deductions, 0) AS allocated_service_expenses,
    (COALESCE(w.total_earned, 0) - COALESCE(p.total_paid, 0) - COALESCE(d.allocated_deductions, 0)) AS remaining_balance,
    -- Pre-calculated WhatsApp share text
    '📋 *लेबर हिसाब पर्ची — ' || c.name || '*' || E'\n' ||
    '━━━━━━━━━━━━━━━━━━━━━━━━━━' || E'\n' ||
    '👤 मज़दूर: *' || l.name || '*' || E'\n' ||
    '🆔 कोड: ' || l.local_id || E'\n' ||
    '📅 महीना: *' || m.month_str || '*' || E'\n' ||
    '━━━━━━━━━━━━━━━━━━━━━━━━━━' || E'\n' ||
    '👷 कुल कार्य दिवस: ' || GREATEST(COALESCE(w.work_days, 0), COALESCE(p.pay_days, 0)) || ' दिन' || E'\n' ||
    '💰 कुल मजदूरी कमाई: ₹' || TO_CHAR(COALESCE(w.total_earned, 0), 'FM999,999,990.00') || E'\n' ||
    '💵 दिया गया भुगतान: ₹' || TO_CHAR(COALESCE(p.total_paid, 0), 'FM999,999,990.00') || E'\n' ||
    '☕ सेवा कटौती: ₹' || TO_CHAR(COALESCE(d.allocated_deductions, 0), 'FM999,999,990.00') || E'\n' ||
    '━━━━━━━━━━━━━━━━━━━━━━━━━━' || E'\n' ||
    '🔴 *देय बकाया राशि: ₹' || TO_CHAR((COALESCE(w.total_earned, 0) - COALESCE(p.total_paid, 0) - COALESCE(d.allocated_deductions, 0)), 'FM999,999,990.00') || '*' || E'\n' ||
    '━━━━━━━━━━━━━━━━━━━━━━━━━━' || E'\n' ||
    '📲 LabourHisaab App' AS whatsapp_share_text
FROM all_months m
JOIN public.labourers l ON m.labourer_id = l.id
JOIN public.contractors c ON l.contractor_id = c.id
LEFT JOIN lab_work w ON m.labourer_id = w.labourer_id AND m.month_str = w.month_str
LEFT JOIN lab_pays p ON m.labourer_id = p.labourer_id AND m.month_str = p.month_str
LEFT JOIN lab_deductions d ON m.labourer_id = d.labourer_id AND m.month_str = d.month_str;

-- ----------------------------------------------------------------------------
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labourers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labour_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_work_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_work_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labour_work_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labour_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_expense_allocations ENABLE ROW LEVEL SECURITY;

-- Contractors own data isolation policies
CREATE POLICY "contractors_self_access" ON public.contractors
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "labourers_contractor_isolation" ON public.labourers
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "labour_rates_contractor_isolation" ON public.labour_rates
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "work_entries_contractor_isolation" ON public.daily_work_entries
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "work_details_isolation" ON public.daily_work_details
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "work_allocations_isolation" ON public.labour_work_allocations
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "payments_contractor_isolation" ON public.labour_payments
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "expenses_contractor_isolation" ON public.service_expenses
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "expense_allocations_isolation" ON public.service_expense_allocations
    FOR ALL USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 14. INITIAL SEED DATA FOR DEMONSTRATION & PROTOTYPE
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_contractor_id UUID;
    v_lab1 UUID;
    v_lab2 UUID;
    v_lab3 UUID;
    v_lab4 UUID;
    v_rate_mix UUID;
    v_rate_pallet UUID;
    v_rate_daliya UUID;
    v_rate_stitching UUID;
    v_rate_premix UUID;
    v_work1 UUID;
    v_work2 UUID;
    v_exp1 UUID;
BEGIN
    -- 1. Insert default contractor
    INSERT INTO public.contractors (id, name, business_name, phone)
    VALUES ('c0000000-0000-0000-0000-000000000001', 'शुभ लाभ लेबर कांट्रेक्टर', 'शुभ लाभ कांट्रेक्टिंग सर्विस', '9829000001')
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_contractor_id;

    -- 2. Insert standard labour rates (Valid UUID hex: 'a0000000-...')
    INSERT INTO public.labour_rates (id, contractor_id, work_type, rate, rate_unit, effective_from)
    VALUES
    ('a0000000-0000-0000-0000-000000000001', v_contractor_id, 'Mix', 21.00, 'Per 100 kg', '2026-08-01'),
    ('a0000000-0000-0000-0000-000000000002', v_contractor_id, 'Pallet', 21.00, 'Per 100 kg', '2026-08-01'),
    ('a0000000-0000-0000-0000-000000000003', v_contractor_id, 'Maize Daliya', 15.00, 'Per 100 kg', '2026-08-01'),
    ('a0000000-0000-0000-0000-000000000004', v_contractor_id, 'Maize Flour', 15.00, 'Per 100 kg', '2026-08-01'),
    ('a0000000-0000-0000-0000-000000000005', v_contractor_id, 'Chana Churi', 15.00, 'Per 100 kg', '2026-08-01'),
    ('a0000000-0000-0000-0000-000000000006', v_contractor_id, 'Unloading (Weight)', 45.00, 'Per 100 kg', '2026-08-01'),
    ('a0000000-0000-0000-0000-000000000007', v_contractor_id, 'Unloading (Bag)', 2.00, 'Per bag', '2026-08-01'),
    ('a0000000-0000-0000-0000-000000000008', v_contractor_id, 'Bag Stitching', 0.30, 'Per bag', '2026-08-01'),
    ('a0000000-0000-0000-0000-000000000009', v_contractor_id, 'Material Transfer', 2.00, 'Per bag', '2026-08-01'),
    ('a0000000-0000-0000-0000-000000000010', v_contractor_id, 'Premix', 300.00, 'Per batch', '2026-08-01'),
    ('a0000000-0000-0000-0000-000000000011', v_contractor_id, 'Paddy Labour', 25.00, 'Per 100 kg', '2026-08-01')
    ON CONFLICT (id) DO NOTHING;

    -- 3. Insert labourers with stable local IDs (Valid UUID hex: 'b0000000-...')
    INSERT INTO public.labourers (id, contractor_id, local_id, name, phone, role, active_status)
    VALUES
    ('b0000000-0000-0000-0000-000000000001', v_contractor_id, 'LH_LAB_001', 'गोलू', '9829011111', 'मजदूर', true),
    ('b0000000-0000-0000-0000-000000000002', v_contractor_id, 'LH_LAB_002', 'सतीश', '9829022222', 'मजदूर', true),
    ('b0000000-0000-0000-0000-000000000003', v_contractor_id, 'LH_LAB_003', 'आंग्रेश', '9829033333', 'मजदूर', true),
    ('b0000000-0000-0000-0000-000000000004', v_contractor_id, 'LH_LAB_004', 'राहुल', '9829044444', 'मजदूर', true),
    ('b0000000-0000-0000-0000-000000000005', v_contractor_id, 'LH_LAB_005', 'सोनू', '9829055555', 'मजदूर', true),
    ('b0000000-0000-0000-0000-000000000006', v_contractor_id, 'LH_LAB_006', 'आदित्य', '9829066666', 'मजदूर', true)
    ON CONFLICT (id) DO NOTHING;

    -- 4. Sample Work Entry with multi-bag weights (Mix: 160 @ 50kg + 50 @ 40kg = 10,000kg)
    INSERT INTO public.daily_work_entries (
        id, contractor_id, work_date, work_type, rate_snapshot, rate_unit_snapshot,
        total_weight_kg, total_bags, calculated_labour_amount, notes
    ) VALUES (
        'd0000000-0000-0000-0000-000000000001', v_contractor_id, '2026-11-03', 'Mix',
        21.00, 'Per 100 kg', 10000.00, 210, 2100.00, 'सुबह शिफ्ट मिक्सिंग'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.daily_work_details (work_entry_id, bag_weight_kg, bag_count)
    VALUES
    ('d0000000-0000-0000-0000-000000000001', 50.00, 160),
    ('d0000000-0000-0000-0000-000000000001', 40.00, 50)
    ON CONFLICT DO NOTHING;

    -- Equal allocations among Golu, Satish, Rahul (₹700 each)
    INSERT INTO public.labour_work_allocations (work_entry_id, labourer_id, allocated_amount, allocation_method)
    VALUES
    ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 700.00, 'Equal'),
    ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 700.00, 'Equal'),
    ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 700.00, 'Equal')
    ON CONFLICT DO NOTHING;

    -- 5. Sample Payment (Golu: ₹1,000 Cash)
    INSERT INTO public.labour_payments (contractor_id, labourer_id, payment_date, amount, payment_method, notes)
    VALUES (v_contractor_id, 'b0000000-0000-0000-0000-000000000001', '2026-11-03', 1000.00, 'Cash', 'दैनिक भुगतान नकद')
    ON CONFLICT DO NOTHING;

    -- 6. Sample Expense (Group Meals ₹300 split across Golu and Satish)
    INSERT INTO public.service_expenses (id, contractor_id, expense_date, expense_category, expense_name, amount, allocation_scope, notes)
    VALUES ('e0000000-0000-0000-0000-000000000001', v_contractor_id, '2026-11-03', 'Food / Meals', 'दोपहर का भोजन', 300.00, 'Group expense', 'ढाबा भोजन')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.service_expense_allocations (expense_id, labourer_id, allocated_amount)
    VALUES
    ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 150.00),
    ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 150.00)
    ON CONFLICT DO NOTHING;
END $$;
