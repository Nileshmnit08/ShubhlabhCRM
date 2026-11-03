-- ============================================================================
-- STATUS: SUPERSEDED (2026-11-03) — DO NOT APPLY.
-- Replaced by 249_sprint_LH_FOUNDATION_SECURE_01.sql + 250_sprint_LH_SETTLEMENT_SECURE_01.sql
-- (security blockers and data defects fixed; see LH-MIGRATION-REVIEW-01.md). Kept for history.
-- ============================================================================
-- PROPOSED MIGRATION: 248_sprint_LH_SETTLEMENT_01.sql
-- SPRINT: LH-SETTLEMENT-01 — Monthly Settlement & Account Closing
--
-- STATUS: PROPOSED — READY FOR APPOINTED REPOSITORIES
-- Lives in supabase/proposals/ per policy so `supabase db push` cannot auto-apply.
-- Rollback: supabase/proposals/248_rollback_sprint_LH_SETTLEMENT_01.sql
--
-- ENTITIES IMPLEMENTED:
--   1. labour_monthly_settlements        (Monthly period closing & contractor ledger)
--   2. labour_monthly_settlement_items  (Per-labourer opening/closing balances & carry-forward)
--   3. labour_settlement_corrections    (Traceable historical audit log for closed months)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. MONTHLY SETTLEMENTS MASTER (Period-Level Closing & Settlement Status)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.labour_monthly_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
    year_month VARCHAR(7) NOT NULL, -- e.g. '2026-10'
    status VARCHAR(50) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Reviewed', 'Partially Settled', 'Settled', 'Closed')),
    total_labourers INT NOT NULL DEFAULT 0,
    total_working_days INT NOT NULL DEFAULT 0,
    total_weight_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_earned NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_paid NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0,
    contractor_expenses NUMERIC(12, 2) NOT NULL DEFAULT 0,
    opening_balance_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    closing_balance_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    closed_at TIMESTAMPTZ,
    closed_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_contractor_settlement_month UNIQUE (contractor_id, year_month)
);

-- ----------------------------------------------------------------------------
-- 2. MONTHLY SETTLEMENT ITEMS (Per-Labourer Opening, Closing & Carry Forward)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.labour_monthly_settlement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id UUID NOT NULL REFERENCES public.labour_monthly_settlements(id) ON DELETE CASCADE,
    labourer_id UUID NOT NULL REFERENCES public.labourers(id) ON DELETE RESTRICT,
    year_month VARCHAR(7) NOT NULL,
    working_days INT NOT NULL DEFAULT 0,
    total_weight_kg NUMERIC(12, 2) NOT NULL DEFAULT 0,
    opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    current_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payments_made NUMERIC(12, 2) NOT NULL DEFAULT 0,
    allocated_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0,
    closing_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
    settlement_status VARCHAR(50) NOT NULL DEFAULT 'Open' CHECK (settlement_status IN ('Open', 'Reviewed', 'Partially Settled', 'Settled', 'Closed')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_settlement_labourer_item UNIQUE (settlement_id, labourer_id)
);

-- ----------------------------------------------------------------------------
-- 3. SETTLEMENT CORRECTIONS AUDIT TRAIL (Traceable Historical Protection)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.labour_settlement_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID REFERENCES public.contractors(id) ON DELETE CASCADE,
    settlement_item_id UUID NOT NULL REFERENCES public.labour_monthly_settlement_items(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    previous_values JSONB NOT NULL,
    corrected_values JSONB NOT NULL,
    corrected_by VARCHAR(255) DEFAULT 'Contractor',
    corrected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure contractor_id column exists if table was previously created without it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'labour_settlement_corrections'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'labour_settlement_corrections' 
          AND column_name = 'contractor_id'
    ) THEN
        ALTER TABLE public.labour_settlement_corrections
        ADD COLUMN contractor_id UUID REFERENCES public.contractors(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. INDEXES FOR SETTLEMENT QUERIES & CARRY-FORWARD LOOKUPS
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_settlement_contractor_month ON public.labour_monthly_settlements(contractor_id, year_month);
CREATE INDEX IF NOT EXISTS idx_settlement_items_labourer ON public.labour_monthly_settlement_items(labourer_id, year_month);
CREATE INDEX IF NOT EXISTS idx_settlement_corrections_item ON public.labour_settlement_corrections(settlement_item_id);
CREATE INDEX IF NOT EXISTS idx_settlement_corrections_contractor ON public.labour_settlement_corrections(contractor_id);

-- ----------------------------------------------------------------------------
-- 5. FUNCTION: CARRY FORWARD CLOSING BALANCES TO NEXT MONTH
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_carry_forward_monthly_settlement(
    p_contractor_id UUID,
    p_closed_year_month VARCHAR(7)
) RETURNS INT AS $$
DECLARE
    v_next_year_month VARCHAR(7);
    v_next_date DATE;
    v_next_settlement_id UUID;
    v_item RECORD;
    v_carried_count INT := 0;
BEGIN
    -- Calculate next month string YYYY-MM
    v_next_date := (TO_DATE(p_closed_year_month || '-01', 'YYYY-MM-DD') + INTERVAL '1 month')::DATE;
    v_next_year_month := TO_CHAR(v_next_date, 'YYYY-MM');

    -- Ensure next month settlement header exists
    INSERT INTO public.labour_monthly_settlements (
        contractor_id,
        year_month,
        status
    ) VALUES (
        p_contractor_id,
        v_next_year_month,
        'Open'
    )
    ON CONFLICT (contractor_id, year_month) DO UPDATE
    SET updated_at = NOW()
    RETURNING id INTO v_next_settlement_id;

    -- Carry forward closing balance of each labourer as opening balance of next month
    FOR v_item IN
        SELECT i.labourer_id, i.closing_balance
        FROM public.labour_monthly_settlement_items i
        JOIN public.labour_monthly_settlements s ON s.id = i.settlement_id
        WHERE s.contractor_id = p_contractor_id AND s.year_month = p_closed_year_month
    LOOP
        INSERT INTO public.labour_monthly_settlement_items (
            settlement_id,
            labourer_id,
            year_month,
            opening_balance,
            current_earnings,
            payments_made,
            allocated_deductions,
            closing_balance,
            settlement_status
        ) VALUES (
            v_next_settlement_id,
            v_item.labourer_id,
            v_next_year_month,
            v_item.closing_balance, -- Carry forward exact closing balance
            0,
            0,
            0,
            v_item.closing_balance,
            'Open'
        )
        ON CONFLICT (settlement_id, labourer_id) DO UPDATE
        SET opening_balance = EXCLUDED.opening_balance,
            closing_balance = EXCLUDED.opening_balance + public.labour_monthly_settlement_items.current_earnings - public.labour_monthly_settlement_items.payments_made - public.labour_monthly_settlement_items.allocated_deductions,
            updated_at = NOW();

        v_carried_count := v_carried_count + 1;
    END LOOP;

    RETURN v_carried_count;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS) POLICIES FOR SETTLEMENT MODULE
-- ---------------------------------------------------------------------
ALTER TABLE public.labour_monthly_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labour_monthly_settlement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labour_settlement_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settlements_contractor_isolation" ON public.labour_monthly_settlements;
CREATE POLICY "settlements_contractor_isolation" ON public.labour_monthly_settlements
    FOR ALL USING (contractor_id = auth.uid());

DROP POLICY IF EXISTS "settlement_items_isolation" ON public.labour_monthly_settlement_items;
CREATE POLICY "settlement_items_isolation" ON public.labour_monthly_settlement_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.labour_monthly_settlements s
            WHERE s.id = settlement_id AND s.contractor_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "settlement_corrections_isolation" ON public.labour_settlement_corrections;
CREATE POLICY "settlement_corrections_isolation" ON public.labour_settlement_corrections
    FOR ALL USING (
        contractor_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.labour_monthly_settlement_items i
            JOIN public.labour_monthly_settlements s ON s.id = i.settlement_id
            WHERE i.id = settlement_item_id AND s.contractor_id = auth.uid()
        )
    );



