-- Migration: 102_dispatch_tracking_schema.sql
-- Description: Adds tables and views for Requirement Dispatch tracking

-- 1. Create requirement_dispatches table
CREATE TABLE IF NOT EXISTS public.requirement_dispatches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id UUID REFERENCES public.requirements(id) ON DELETE CASCADE NOT NULL,
    dispatch_date DATE NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) DEFAULT 'Bags',
    truck_number VARCHAR(100) NOT NULL,
    driver_name VARCHAR(255),
    driver_mobile VARCHAR(20),
    transporter_name VARCHAR(255),
    lr_bilty_number VARCHAR(100),
    invoice_number VARCHAR(100),
    invoice_date DATE,
    warehouse_location VARCHAR(255),
    expected_delivery_date DATE,
    freight_amount NUMERIC,
    remarks TEXT,
    proof_document_url TEXT,
    status VARCHAR(50) DEFAULT 'Dispatched', -- Dispatched, Delivered, Delayed, Cancelled, Returned
    actual_delivery_date DATE,
    received_by VARCHAR(255),
    delivery_proof_url TEXT,
    shortage_quantity NUMERIC DEFAULT 0,
    return_quantity NUMERIC DEFAULT 0,
    cancellation_reason TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for requirement_dispatches updated_at
DROP TRIGGER IF EXISTS update_requirement_dispatches_modtime ON public.requirement_dispatches;
CREATE TRIGGER update_requirement_dispatches_modtime
BEFORE UPDATE ON public.requirement_dispatches
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- RLS Development Policies
ALTER TABLE public.requirement_dispatches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on requirement_dispatches" ON public.requirement_dispatches FOR ALL USING (true) WITH CHECK (true);

-- 2. Create view for Requirement Dispatch Summary
CREATE OR REPLACE VIEW public.v_requirement_dispatch_summary WITH (security_invoker = true) AS
SELECT 
    r.id AS requirement_id,
    r.quantity AS required_quantity,
    r.unit,
    COALESCE(SUM(
        CASE 
            WHEN rd.status = 'Cancelled' THEN 0
            ELSE rd.quantity - COALESCE(rd.return_quantity, 0)
        END
    ), 0) AS total_dispatched_quantity,
    GREATEST(0, r.quantity - COALESCE(SUM(
        CASE 
            WHEN rd.status = 'Cancelled' THEN 0
            ELSE rd.quantity - COALESCE(rd.return_quantity, 0)
        END
    ), 0)) AS pending_quantity,
    MAX(rd.dispatch_date) AS latest_dispatch_date,
    (
        SELECT truck_number 
        FROM public.requirement_dispatches 
        WHERE requirement_id = r.id AND status != 'Cancelled' 
        ORDER BY dispatch_date DESC, created_at DESC LIMIT 1
    ) AS latest_truck_number,
    (
        SELECT driver_mobile 
        FROM public.requirement_dispatches 
        WHERE requirement_id = r.id AND status != 'Cancelled' 
        ORDER BY dispatch_date DESC, created_at DESC LIMIT 1
    ) AS latest_driver_mobile,
    CASE
        WHEN COALESCE(SUM(CASE WHEN rd.status = 'Cancelled' THEN 0 ELSE rd.quantity - COALESCE(rd.return_quantity, 0) END), 0) = 0 THEN 'Not Dispatched'
        WHEN COALESCE(SUM(CASE WHEN rd.status = 'Cancelled' THEN 0 ELSE rd.quantity - COALESCE(rd.return_quantity, 0) END), 0) < r.quantity THEN 'Partially Dispatched'
        ELSE 'Fully Dispatched'
    END AS dispatch_progress
FROM public.requirements r
LEFT JOIN public.requirement_dispatches rd ON r.id = rd.requirement_id
GROUP BY r.id, r.quantity, r.unit;

GRANT SELECT ON public.v_requirement_dispatch_summary TO authenticated;
GRANT SELECT ON public.v_requirement_dispatch_summary TO anon;
