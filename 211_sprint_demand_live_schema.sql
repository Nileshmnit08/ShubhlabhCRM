-- SPRINT DEMAND-LIVE-FINAL-01

-- 1. Alter requirements to drop NOT NULL on product_type and quantity
ALTER TABLE public.requirements 
  ALTER COLUMN product_type DROP NOT NULL,
  ALTER COLUMN quantity DROP NOT NULL;

-- 2. Add demand_ref to requirements
CREATE SEQUENCE IF NOT EXISTS demand_ref_seq START 1;

ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS demand_ref VARCHAR(50);

CREATE OR REPLACE FUNCTION set_demand_ref() RETURNS trigger AS $$
BEGIN
    IF NEW.demand_ref IS NULL THEN
        NEW.demand_ref := 'D-' || LPAD(nextval('demand_ref_seq')::text, 3, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_demand_ref ON public.requirements;
CREATE TRIGGER trg_set_demand_ref
    BEFORE INSERT ON public.requirements
    FOR EACH ROW
    EXECUTE FUNCTION set_demand_ref();

-- 3. Create requirement_items table for multi-product demands
CREATE TABLE IF NOT EXISTS public.requirement_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id UUID REFERENCES public.requirements(id) ON DELETE CASCADE NOT NULL,
    category VARCHAR(255),
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit VARCHAR(50) DEFAULT 'Bags',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Enable RLS
ALTER TABLE public.requirement_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on requirement_items" ON public.requirement_items FOR ALL USING (true) WITH CHECK (true);

-- 5. Seed required products
INSERT INTO public.products (name, category) VALUES
    ('Dry Mix', 'Mix'),
    ('Lapti Mix', 'Mix'),
    ('Naman', 'Pallet'),
    ('Gori', 'Pallet'),
    ('Shubh Labh', 'Pallet'),
    ('Diamond', 'Pallet'),
    ('8000', 'Pallet'),
    ('Chana Churi', 'Churi'),
    ('Soya Churi', 'Churi'),
    ('Makka Daliya', 'Daliya'),
    ('Wheat Daliya', 'Daliya')
ON CONFLICT DO NOTHING;
