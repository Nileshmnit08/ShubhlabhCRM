-- ============================================================================
-- STATUS: RETIRED (Product Owner decision, 2026-11-03) — DO NOT APPLY.
-- Superseded by 247_sprint_LH_DATABASE_FOUNDATION_01.sql + 248_sprint_LH_SETTLEMENT_01.sql.
-- Must never be combined with the FOUNDATION schema. Kept for history only.
-- See supabase/proposals/LH-MIGRATION-REVIEW-01.md.
-- ============================================================================
-- SPRINT: LH-DB-01 / LH-LEDGER-01: Shubh Labh Labour Hisab Database Schema
-- Description: Schema for Labour Management, Work Entries, Allocations, Payments,
--              Service Expenses, and Daily Ledger.
-- ============================================================================

-- 1. Labourers Master Table
CREATE TABLE IF NOT EXISTS public.lh_labourers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    local_id VARCHAR(50) UNIQUE NOT NULL, -- Stable local ID (e.g. LH_LAB_001)
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(100) DEFAULT 'सामान्य मजदूर',
    is_active BOOLEAN NOT NULL DEFAULT true,
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    avatar_color VARCHAR(20) DEFAULT '#F28C28',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Work Rates Master Table
CREATE TABLE IF NOT EXISTS public.lh_work_rates (
    id VARCHAR(50) PRIMARY KEY, -- 'mix', 'pallet', 'maize_daliya', etc.
    name VARCHAR(255) NOT NULL,
    hindi_name VARCHAR(255) NOT NULL,
    rate NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL, -- 'per_100_kg', 'per_bag', 'per_batch', 'fixed'
    unit_label VARCHAR(100) NOT NULL,
    unit_short VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'weight', 'bag', 'batch', 'fixed'
    is_editable_rate BOOLEAN NOT NULL DEFAULT false,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Daily Work Entries Table
CREATE TABLE IF NOT EXISTS public.lh_work_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    category_id VARCHAR(50) NOT NULL REFERENCES public.lh_work_rates(id),
    category_name VARCHAR(255) NOT NULL,
    rate_snapshot NUMERIC(10, 2) NOT NULL, -- Stored rate snapshot effective on work date
    rate_unit VARCHAR(50) NOT NULL,
    work_type VARCHAR(20) NOT NULL,
    bag_lines JSONB NOT NULL DEFAULT '[]'::jsonb, -- Multi-weight rows [{bagWeightKg, bagCount, lineKg}]
    total_bags INT NOT NULL DEFAULT 0,
    total_weight_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_batches INT NOT NULL DEFAULT 0,
    total_amount NUMERIC(12, 2) NOT NULL,
    notes TEXT,
    idempotency_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Work Allocations to Labourers Table
CREATE TABLE IF NOT EXISTS public.lh_work_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_entry_id UUID NOT NULL REFERENCES public.lh_work_entries(id) ON DELETE CASCADE,
    labourer_id UUID NOT NULL REFERENCES public.lh_labourers(id) ON DELETE RESTRICT,
    allocated_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_work_labourer UNIQUE (work_entry_id, labourer_id)
);

-- 5. Daily Payments Table
CREATE TABLE IF NOT EXISTS public.lh_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    labourer_id UUID NOT NULL REFERENCES public.lh_labourers(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash', -- 'Cash', 'Other' (UPI/Bank)
    notes TEXT,
    idempotency_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Service Expenses Table
CREATE TABLE IF NOT EXISTS public.lh_service_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'food_meals', 'tea_breakfast', 'transportation', 'accommodation', 'other'
    expense_name VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    description TEXT,
    allocation_type VARCHAR(50) NOT NULL DEFAULT 'contractor_expense', -- 'contractor_expense', 'individual', 'group'
    idempotency_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Service Expense Allocations Table (Deductions from Labourers)
CREATE TABLE IF NOT EXISTS public.lh_service_expense_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES public.lh_service_expenses(id) ON DELETE CASCADE,
    labourer_id UUID NOT NULL REFERENCES public.lh_labourers(id) ON DELETE RESTRICT,
    deduction_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_expense_labourer UNIQUE (expense_id, labourer_id)
);

-- 8. Indexes for Rapid Querying & Date Filtering
CREATE INDEX IF NOT EXISTS idx_lh_work_entries_date ON public.lh_work_entries(date);
CREATE INDEX IF NOT EXISTS idx_lh_work_allocations_work ON public.lh_work_allocations(work_entry_id);
CREATE INDEX IF NOT EXISTS idx_lh_work_allocations_labourer ON public.lh_work_allocations(labourer_id);
CREATE INDEX IF NOT EXISTS idx_lh_payments_date ON public.lh_payments(date);
CREATE INDEX IF NOT EXISTS idx_lh_payments_labourer ON public.lh_payments(labourer_id);
CREATE INDEX IF NOT EXISTS idx_lh_service_expenses_date ON public.lh_service_expenses(date);
CREATE INDEX IF NOT EXISTS idx_lh_service_expense_allocations_expense ON public.lh_service_expense_allocations(expense_id);
CREATE INDEX IF NOT EXISTS idx_lh_service_expense_allocations_labourer ON public.lh_service_expense_allocations(labourer_id);

-- 9. Consolidated Daily Labour Ledger View
CREATE OR REPLACE VIEW public.lh_daily_ledger_view AS
WITH work_summary AS (
    SELECT
        wa.labourer_id,
        we.date,
        SUM(wa.allocated_amount) AS total_earned
    FROM public.lh_work_allocations wa
    JOIN public.lh_work_entries we ON wa.work_entry_id = we.id
    GROUP BY wa.labourer_id, we.date
),
payment_summary AS (
    SELECT
        p.labourer_id,
        p.date,
        SUM(p.amount) AS total_paid
    FROM public.lh_payments p
    GROUP BY p.labourer_id, p.date
),
deduction_summary AS (
    SELECT
        sea.labourer_id,
        se.date,
        SUM(sea.deduction_amount) AS total_deductions
    FROM public.lh_service_expense_allocations sea
    JOIN public.lh_service_expenses se ON sea.expense_id = se.id
    GROUP BY sea.labourer_id, se.date
),
all_dates AS (
    SELECT labourer_id, date FROM work_summary
    UNION
    SELECT labourer_id, date FROM payment_summary
    UNION
    SELECT labourer_id, date FROM deduction_summary
)
SELECT
    d.labourer_id,
    l.local_id,
    l.name AS labourer_name,
    l.phone AS labourer_phone,
    l.is_active AS labourer_is_active,
    d.date,
    COALESCE(w.total_earned, 0) AS total_earned,
    COALESCE(p.total_paid, 0) AS total_paid,
    COALESCE(ded.total_deductions, 0) AS total_deductions,
    (COALESCE(w.total_earned, 0) - COALESCE(p.total_paid, 0) - COALESCE(ded.total_deductions, 0)) AS remaining_balance
FROM all_dates d
JOIN public.lh_labourers l ON d.labourer_id = l.id
LEFT JOIN work_summary w ON d.labourer_id = w.labourer_id AND d.date = w.date
LEFT JOIN payment_summary p ON d.labourer_id = p.labourer_id AND d.date = p.date
LEFT JOIN deduction_summary ded ON d.labourer_id = ded.labourer_id AND d.date = ded.date;

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.lh_labourers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lh_work_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lh_work_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lh_work_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lh_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lh_service_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lh_service_expense_allocations ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies for Contractor Access
CREATE POLICY "Allow contractor all operations on lh_labourers"
    ON public.lh_labourers FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow contractor all operations on lh_work_rates"
    ON public.lh_work_rates FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow contractor all operations on lh_work_entries"
    ON public.lh_work_entries FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow contractor all operations on lh_work_allocations"
    ON public.lh_work_allocations FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow contractor all operations on lh_payments"
    ON public.lh_payments FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow contractor all operations on lh_service_expenses"
    ON public.lh_service_expenses FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow contractor all operations on lh_service_expense_allocations"
    ON public.lh_service_expense_allocations FOR ALL USING (true) WITH CHECK (true);

-- Initial Work Rates Seed
INSERT INTO public.lh_work_rates (id, name, hindi_name, rate, unit, unit_label, unit_short, type, is_editable_rate)
VALUES
('mix', 'Mix (मिक्स)', 'मिक्सिंग कार्य', 21, 'per_100_kg', '₹21 / 100 कि.ग्रा.', '/ 100 kg', 'weight', false),
('pallet', 'Pallet (पैलेट)', 'पैलेट पैकिंग', 21, 'per_100_kg', '₹21 / 100 कि.ग्रा.', '/ 100 kg', 'weight', false),
('maize_daliya', 'Maize Daliya (मक्का दलिया)', 'मक्का दलिया कार्य', 15, 'per_100_kg', '₹15 / 100 कि.ग्रा.', '/ 100 kg', 'weight', false),
('maize_flour', 'Maize Flour (मक्का आटा)', 'मक्का आटा पिसाई/पैकिंग', 15, 'per_100_kg', '₹15 / 100 कि.ग्रा.', '/ 100 kg', 'weight', false),
('chana_churi', 'Chana Churi (चना चूरी)', 'चना चूरी हैंडलिंग', 15, 'per_100_kg', '₹15 / 100 कि.ग्रा.', '/ 100 kg', 'weight', false),
('unloading_weight', 'Unloading (वजन अनलोडिंग)', 'ट्रक अनलोडिंग (वजन अनुसार)', 45, 'per_100_kg', '₹45 / 100 कि.ग्रा.', '/ 100 kg', 'weight', false),
('unloading_bag', 'Unloading per bag (प्रति बोरी अनलोडिंग)', 'बोरी अनलोडिंग', 2, 'per_bag', '₹2 / बोरी', '/ bag', 'bag', false),
('bag_stitching', 'Bag stitching (बोरी सिलाई)', 'बोरी सिलाई कार्य', 0.30, 'per_bag', '₹0.30 / बोरी', '/ bag', 'bag', true),
('material_transfer', 'Material transfer (माल ट्रांसफर)', 'गोदाम माल ट्रांसफर', 2, 'per_bag', '₹2 / बोरी', '/ bag', 'bag', false),
('premix', 'Premix (प्रीमिक्स)', 'प्रीमिक्स बैचिंग', 300, 'per_batch', '₹300 / बैच', '/ batch', 'batch', false),
('paddy_labour', 'Paddy labour (धान लेबर)', 'धान मजदूरी कार्य', 25, 'per_100_kg', '₹25 / 100 कि.ग्रा.', '/ 100 kg', 'weight', true)
ON CONFLICT (id) DO NOTHING;
