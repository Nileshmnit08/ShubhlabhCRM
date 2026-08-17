-- SPRINT 5: Feed-Grade Requirement Management

-- 1. Simple Products Master
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed basic products
INSERT INTO public.products (name, category) VALUES
    ('Broiler Pre-Starter', 'Broiler'),
    ('Broiler Starter', 'Broiler'),
    ('Broiler Finisher', 'Broiler'),
    ('Layer Chick Mash', 'Layer'),
    ('Layer Grower Mash', 'Layer'),
    ('Layer Phase 1', 'Layer')
ON CONFLICT DO NOTHING;

-- 2. Upgrade Requirements Table
-- Note: Since this is rapid development, we ALTER the table. 
-- In a strict prod environment we might write complex migrations, but here ALTER is safe.
ALTER TABLE public.requirements
ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Bags',
ADD COLUMN IF NOT EXISTS expected_rate DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'Normal',
ADD COLUMN IF NOT EXISTS source_interaction_id UUID REFERENCES public.interactions(id) ON DELETE SET NULL;

-- 3. Requirement Status History Table
CREATE TABLE IF NOT EXISTS public.requirement_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requirement_id UUID REFERENCES public.requirements(id) ON DELETE CASCADE NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    note TEXT,
    changed_by UUID, -- Authentication user
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on requirement_status_history" ON public.requirement_status_history FOR ALL USING (true) WITH CHECK (true);
