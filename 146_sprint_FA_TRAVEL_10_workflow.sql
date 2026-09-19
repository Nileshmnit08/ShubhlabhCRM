-- MICRO-SPRINT FA-TRAVEL-10
-- Travel Expense Approval Workflow

-- 1. Add Workflow Columns to daily_travel_expenses
ALTER TABLE public.daily_travel_expenses 
ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(50) DEFAULT 'DRAFT' NOT NULL,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES public.app_users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.app_users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.app_users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES public.app_users(id),
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS paid_by UUID REFERENCES public.app_users(id);

-- Create index on workflow_status
CREATE INDEX IF NOT EXISTS idx_daily_expenses_workflow ON public.daily_travel_expenses(workflow_status);

-- 2. Create Audit Table
CREATE TABLE IF NOT EXISTS public.daily_travel_expense_audits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES public.daily_travel_expenses(id) ON DELETE CASCADE,
    previous_status VARCHAR(50) NOT NULL,
    new_status VARCHAR(50) NOT NULL,
    actor_id UUID NOT NULL REFERENCES public.app_users(id),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expense_audits_expense_id ON public.daily_travel_expense_audits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_audits_created_at ON public.daily_travel_expense_audits(created_at DESC);

-- Enable RLS on audit table
ALTER TABLE public.daily_travel_expense_audits ENABLE ROW LEVEL SECURITY;

-- Admins can view all audits
CREATE POLICY "Admins can view all travel expense audits"
ON public.daily_travel_expense_audits FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'Admin')
);

-- Staff can view audits for their own expenses
CREATE POLICY "Staff can view own travel expense audits"
ON public.daily_travel_expense_audits FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.daily_travel_expenses 
        WHERE id = daily_travel_expense_audits.expense_id AND staff_id = auth.uid()
    )
);

-- Nobody can manually insert/update/delete audits from client
CREATE POLICY "No manual insert audits" ON public.daily_travel_expense_audits FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "No manual update audits" ON public.daily_travel_expense_audits FOR UPDATE TO authenticated USING (false);
CREATE POLICY "No manual delete audits" ON public.daily_travel_expense_audits FOR DELETE TO authenticated USING (false);

-- 3. Prevent Manual Updates to Workflow Columns
-- We don't want direct updates to workflow_status, submitted_at, etc. from the client.
-- Since daily_travel_expenses already has 'No manual update' policy (for everything), 
-- all updates must go through RPC.

-- 4. RPC for Status Transition
CREATE OR REPLACE FUNCTION public.transition_travel_expense_status(
    p_expense_id UUID,
    p_new_status VARCHAR(50),
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_expense RECORD;
    v_current_status VARCHAR(50);
    v_calc_status VARCHAR(50);
    v_user_role VARCHAR(50);
    v_actor_id UUID;
    v_now TIMESTAMPTZ;
BEGIN
    v_actor_id := auth.uid();
    v_now := CURRENT_TIMESTAMP;

    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Get user role
    SELECT role INTO v_user_role FROM public.app_users WHERE id = v_actor_id;

    -- Lock the row for update to prevent concurrency issues
    SELECT * INTO v_expense 
    FROM public.daily_travel_expenses 
    WHERE id = p_expense_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Expense not found';
    END IF;

    v_current_status := v_expense.workflow_status;
    v_calc_status := v_expense.status; -- The calculation status

    -- Validate transitions
    IF p_new_status = 'SUBMITTED' THEN
        IF v_current_status NOT IN ('DRAFT', 'REJECTED') THEN
            RAISE EXCEPTION 'Cannot submit expense in % state', v_current_status;
        END IF;
        
        -- Only staff themselves or Admin can submit
        IF v_user_role <> 'Admin' AND v_expense.staff_id <> v_actor_id THEN
            RAISE EXCEPTION 'Not authorized to submit this expense';
        END IF;

        -- Ensure calculation is complete and valid before submission
        IF v_calc_status <> 'CALCULATED' THEN
            RAISE EXCEPTION 'Cannot submit expense with calculation status %', v_calc_status;
        END IF;

        UPDATE public.daily_travel_expenses SET 
            workflow_status = 'SUBMITTED',
            submitted_at = v_now,
            submitted_by = v_actor_id,
            updated_at = v_now
        WHERE id = p_expense_id;

    ELSIF p_new_status = 'UNDER_REVIEW' THEN
        IF v_current_status <> 'SUBMITTED' THEN
            RAISE EXCEPTION 'Cannot review expense in % state', v_current_status;
        END IF;
        
        IF v_user_role <> 'Admin' THEN
            RAISE EXCEPTION 'Only Admins can review expenses';
        END IF;

        UPDATE public.daily_travel_expenses SET 
            workflow_status = 'UNDER_REVIEW',
            reviewed_at = v_now,
            reviewed_by = v_actor_id,
            updated_at = v_now
        WHERE id = p_expense_id;

    ELSIF p_new_status = 'APPROVED' THEN
        IF v_current_status <> 'UNDER_REVIEW' THEN
            RAISE EXCEPTION 'Cannot approve expense in % state', v_current_status;
        END IF;
        
        IF v_user_role <> 'Admin' THEN
            RAISE EXCEPTION 'Only Admins can approve expenses';
        END IF;

        UPDATE public.daily_travel_expenses SET 
            workflow_status = 'APPROVED',
            approved_at = v_now,
            approved_by = v_actor_id,
            updated_at = v_now
        WHERE id = p_expense_id;

    ELSIF p_new_status = 'REJECTED' THEN
        IF v_current_status <> 'UNDER_REVIEW' THEN
            RAISE EXCEPTION 'Cannot reject expense in % state', v_current_status;
        END IF;
        
        IF v_user_role <> 'Admin' THEN
            RAISE EXCEPTION 'Only Admins can reject expenses';
        END IF;

        IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
            RAISE EXCEPTION 'Rejection requires a reason';
        END IF;

        UPDATE public.daily_travel_expenses SET 
            workflow_status = 'REJECTED',
            rejected_at = v_now,
            rejected_by = v_actor_id,
            rejection_reason = p_reason,
            updated_at = v_now
        WHERE id = p_expense_id;

    ELSIF p_new_status = 'PAID' THEN
        IF v_current_status <> 'APPROVED' THEN
            RAISE EXCEPTION 'Cannot pay expense in % state', v_current_status;
        END IF;
        
        IF v_user_role <> 'Admin' THEN
            RAISE EXCEPTION 'Only Admins can mark expenses as paid';
        END IF;

        UPDATE public.daily_travel_expenses SET 
            workflow_status = 'PAID',
            paid_at = v_now,
            paid_by = v_actor_id,
            updated_at = v_now
        WHERE id = p_expense_id;

    ELSE
        RAISE EXCEPTION 'Invalid target status: %', p_new_status;
    END IF;

    -- Record the audit
    INSERT INTO public.daily_travel_expense_audits (
        expense_id, previous_status, new_status, actor_id, reason
    ) VALUES (
        p_expense_id, v_current_status, p_new_status, v_actor_id, p_reason
    );

    -- Notify PostgREST cache (optional but good practice)
    NOTIFY pgrst, 'reload schema';

    RETURN jsonb_build_object('success', true, 'new_status', p_new_status);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.transition_travel_expense_status(UUID, VARCHAR, TEXT) TO authenticated;
