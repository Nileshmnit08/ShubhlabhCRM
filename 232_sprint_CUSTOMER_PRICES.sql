-- SL-CUSTOMER-PRICE-PUBLISH-02: Customer Published Prices Migration
-- Creates a dedicated table for customer-facing raw material prices to separate them from internal purchasing costs.

CREATE TABLE public.customer_published_prices (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    raw_material_id uuid REFERENCES public.raw_materials(id) ON DELETE CASCADE NOT NULL,
    price numeric(12,2) NOT NULL,
    unit text NOT NULL,
    effective_date date NOT NULL,
    is_published boolean DEFAULT true,
    remarks text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    created_by uuid REFERENCES auth.users(id)
);

-- Index for fast queries
CREATE INDEX idx_customer_published_prices_material_date ON public.customer_published_prices(raw_material_id, effective_date DESC);

-- Enable RLS
ALTER TABLE public.customer_published_prices ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins can do everything
CREATE POLICY "Admins can manage customer_published_prices"
    ON public.customer_published_prices
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.app_users
            WHERE app_users.id = auth.uid() AND app_users.role = 'Admin'
        )
    );

-- Policy 2: Authenticated buyers can only read published prices
CREATE POLICY "Buyers can read published customer prices"
    ON public.customer_published_prices
    FOR SELECT
    USING (
        is_published = true
        AND EXISTS (
            SELECT 1 FROM public.app_users
            WHERE app_users.id = auth.uid()
        )
    );
