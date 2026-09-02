-- Migration: 108_master_data_architecture.sql
-- Description: Creates dynamic master configuration tables for Units, Price Types, and migrates existing strings to relationships.

-- 1. Create Units Master
CREATE TABLE IF NOT EXISTS public.rm_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    unit_name VARCHAR(100) NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER update_rm_units_modtime BEFORE UPDATE ON public.rm_units FOR EACH ROW EXECUTE FUNCTION update_modified_column();
ALTER TABLE public.rm_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on rm_units" ON public.rm_units FOR ALL USING (true) WITH CHECK (true);

-- 2. Create Price Types Master
CREATE TABLE IF NOT EXISTS public.rm_price_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_name VARCHAR(100) NOT NULL UNIQUE,
    active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER update_rm_price_types_modtime BEFORE UPDATE ON public.rm_price_types FOR EACH ROW EXECUTE FUNCTION update_modified_column();
ALTER TABLE public.rm_price_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on rm_price_types" ON public.rm_price_types FOR ALL USING (true) WITH CHECK (true);

-- 3. Create Allowed Units Mapping
CREATE TABLE IF NOT EXISTS public.rm_allowed_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_material_id UUID REFERENCES public.raw_materials(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.rm_units(id) ON DELETE CASCADE,
    UNIQUE(raw_material_id, unit_id)
);
ALTER TABLE public.rm_allowed_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on rm_allowed_units" ON public.rm_allowed_units FOR ALL USING (true) WITH CHECK (true);

-- 4. Alter Quality Grades
ALTER TABLE public.material_quality_grades 
    ADD COLUMN IF NOT EXISTS parameter_type VARCHAR(100) DEFAULT 'Grade',
    ADD COLUMN IF NOT EXISTS min_value NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS max_value NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS uom VARCHAR(50),
    ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 5. Seed Units and Price Types
INSERT INTO public.rm_units (id, unit_name, display_order) VALUES
    ('04821cc1-e737-43f1-b9cd-99b35ce675c2', 'Quintal', 1),
    ('942f7791-5360-4cd9-bf7b-2856942c7cb9', 'MT', 2),
    ('b3b3bb21-e37f-431f-bc83-6f9fb19ff391', 'Kg', 3),
    ('138ac2a3-f938-4e89-b001-c5af8a6199df', 'Bag', 4)
ON CONFLICT (unit_name) DO NOTHING;

INSERT INTO public.rm_price_types (id, type_name, display_order) VALUES
    ('d928d39f-b9af-46d5-a359-9943fcf04ef5', 'Delivered', 1),
    ('4b92b6a5-3cc2-4df7-8b5e-0498b598d1a1', 'Ex-mandi', 2),
    ('528f1cc1-a83d-42bc-9d0b-226e382d5a3c', 'Indicative', 3),
    ('81dc6a9d-16f5-47dc-a5e2-2a6d7fa1f211', 'Purchase', 4)
ON CONFLICT (type_name) DO NOTHING;

-- 6. Alter Raw Materials to reference the new masters
ALTER TABLE public.raw_materials 
    ADD COLUMN IF NOT EXISTS default_unit_id UUID REFERENCES public.rm_units(id),
    ADD COLUMN IF NOT EXISTS default_price_type_id UUID REFERENCES public.rm_price_types(id);

-- Migrate existing defaults in raw_materials
UPDATE public.raw_materials rm
SET default_unit_id = u.id
FROM public.rm_units u
WHERE rm.default_unit = u.unit_name AND rm.default_unit_id IS NULL;

UPDATE public.raw_materials rm
SET default_price_type_id = p.id
FROM public.rm_price_types p
WHERE rm.default_price_type = p.type_name AND rm.default_price_type_id IS NULL;

-- Automatically map default unit to allowed units for all materials
INSERT INTO public.rm_allowed_units (raw_material_id, unit_id)
SELECT id, default_unit_id FROM public.raw_materials WHERE default_unit_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 7. Alter Price Entries to reference the new masters
ALTER TABLE public.raw_material_price_entries
    ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.rm_units(id),
    ADD COLUMN IF NOT EXISTS price_type_id UUID REFERENCES public.rm_price_types(id);

-- Migrate existing string records to relations in price_entries
UPDATE public.raw_material_price_entries e
SET unit_id = u.id
FROM public.rm_units u
WHERE e.unit = u.unit_name AND e.unit_id IS NULL;

UPDATE public.raw_material_price_entries e
SET price_type_id = p.id
FROM public.rm_price_types p
WHERE e.price_type = p.type_name AND e.price_type_id IS NULL;

-- We KEEP the original `unit` and `price_type` columns as fallbacks per requirements,
-- but we could optionally make them nullable going forward. 
ALTER TABLE public.raw_material_price_entries ALTER COLUMN unit DROP NOT NULL;
ALTER TABLE public.raw_material_price_entries ALTER COLUMN price_type DROP NOT NULL;
