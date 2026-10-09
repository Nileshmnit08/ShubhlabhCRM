-- 1. Create the Watchlist Table
CREATE TABLE IF NOT EXISTS public.dealer_market_watchlists (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    raw_material_id UUID NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(buyer_id, raw_material_id)
);

-- 2. Enable RLS on the Watchlist Table
ALTER TABLE public.dealer_market_watchlists ENABLE ROW LEVEL SECURITY;

-- Policy: Buyers can only read their own watchlists
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'dealer_market_watchlists' AND policyname = 'Buyers can read own watchlist'
    ) THEN
        CREATE POLICY "Buyers can read own watchlist" ON public.dealer_market_watchlists
            FOR SELECT USING (auth.uid() = buyer_id);
    END IF;
END $$;

-- Policy: Buyers can insert into their own watchlists
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'dealer_market_watchlists' AND policyname = 'Buyers can insert own watchlist'
    ) THEN
        CREATE POLICY "Buyers can insert own watchlist" ON public.dealer_market_watchlists
            FOR INSERT WITH CHECK (auth.uid() = buyer_id);
    END IF;
END $$;

-- Policy: Buyers can delete from their own watchlists
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'dealer_market_watchlists' AND policyname = 'Buyers can delete own watchlist'
    ) THEN
        CREATE POLICY "Buyers can delete own watchlist" ON public.dealer_market_watchlists
            FOR DELETE USING (auth.uid() = buyer_id);
    END IF;
END $$;

-- 3. Read Policies for Raw Materials and Prices
-- Allow authenticated users to view active raw materials
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'raw_materials' AND policyname = 'Authenticated users can view active raw materials'
    ) THEN
        CREATE POLICY "Authenticated users can view active raw materials" ON public.raw_materials
            FOR SELECT USING (active = true);
    END IF;
END $$;

-- Allow authenticated users to view price entries
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'raw_material_price_entries' AND policyname = 'Authenticated users can view price entries'
    ) THEN
        CREATE POLICY "Authenticated users can view price entries" ON public.raw_material_price_entries
            FOR SELECT USING (is_deleted = false);
    END IF;
END $$;

-- Allow authenticated users to view rm_units
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'rm_units' AND policyname = 'Authenticated users can view rm_units'
    ) THEN
        CREATE POLICY "Authenticated users can view rm_units" ON public.rm_units
            FOR SELECT USING (true);
    END IF;
END $$;

-- 4. Insert default required materials if they do not exist
INSERT INTO public.raw_materials (name_en, name_hi, category, active)
SELECT * FROM (
    VALUES
        ('Khal', 'खल', 'Feed', true),
        ('Makka Daliya', 'मक्का दलिया', 'Feed', true),
        ('Jaggery', 'गुड़', 'Feed', true),
        ('Oil', 'तेल', 'Liquid', true),
        ('Chana Churi', 'चना चूरी', 'Feed', true),
        ('Soya Churi', 'सोया चूरी', 'Feed', true),
        ('Kakde', 'काकड़े', 'Feed', true),
        ('Kakde Khal', 'काकड़े खल', 'Feed', true),
        ('Mustard Khal', 'सरसों खल', 'Feed', true)
) AS v(name_en, name_hi, category, active)
WHERE NOT EXISTS (
    SELECT 1 FROM public.raw_materials rm WHERE rm.name_en = v.name_en
);
