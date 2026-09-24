-- Migration: 190_sprint_FM_06_expense_engine.sql
-- Description: Field Mobility Expense Engine (FM-06)

CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.expense_categories (name) VALUES 
('TRAVEL'), ('FUEL'), ('TOLL'), ('PARKING'), ('FOOD'), ('LOCAL_TRANSPORT'), ('LODGING'), ('OTHER')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.field_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES auth.users(id),
    session_id UUID REFERENCES public.staff_tracking_sessions(id) ON DELETE SET NULL,
    visit_id UUID REFERENCES public.crm_visits(id) ON DELETE SET NULL,
    expense_date DATE NOT NULL,
    expense_time TIME,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'INR',
    description TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    location_accuracy_m DOUBLE PRECISION,
    odometer_reading INT,
    receipt_reference VARCHAR(255),
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, REIMBURSED
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    reviewer_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all" ON public.expense_categories FOR SELECT USING (true);
CREATE POLICY "Admins can insert" ON public.expense_categories FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'Admin'));
CREATE POLICY "Admins can update" ON public.expense_categories FOR UPDATE USING (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'Admin'));

ALTER TABLE public.field_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for staff to own expenses" 
    ON public.field_expenses FOR SELECT 
    USING (auth.uid() = staff_id);

CREATE POLICY "Enable insert access for staff" 
    ON public.field_expenses FOR INSERT 
    WITH CHECK (auth.uid() = staff_id);

CREATE POLICY "Enable update access for staff (Drafts only)" 
    ON public.field_expenses FOR UPDATE
    USING (auth.uid() = staff_id AND status IN ('DRAFT', 'REJECTED'))
    WITH CHECK (auth.uid() = staff_id AND status IN ('DRAFT', 'REJECTED'));

-- Allow submitting
CREATE POLICY "Enable submit for staff" 
    ON public.field_expenses FOR UPDATE
    USING (auth.uid() = staff_id AND status = 'DRAFT')
    WITH CHECK (auth.uid() = staff_id AND status = 'SUBMITTED');

-- Admin access
CREATE POLICY "Admins can view all" 
    ON public.field_expenses FOR SELECT 
    USING (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'Admin'));

CREATE POLICY "Admins can review/approve/reject" 
    ON public.field_expenses FOR UPDATE
    USING (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'Admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'Admin'));

-- Triggers for modtime
CREATE TRIGGER update_field_expenses_modtime
BEFORE UPDATE ON public.field_expenses
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Indexes
CREATE INDEX idx_field_expenses_staff_date ON public.field_expenses(staff_id, expense_date);
CREATE INDEX idx_field_expenses_status ON public.field_expenses(status);
CREATE INDEX idx_field_expenses_session ON public.field_expenses(session_id);
CREATE INDEX idx_field_expenses_visit ON public.field_expenses(visit_id);
