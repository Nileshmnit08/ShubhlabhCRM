-- SPRINT 20: Requirements Module Bug Fixes & Product Types

-- 1. Insert Missing Product Types required for the CRM
INSERT INTO public.products (name, category, active)
SELECT new_name, 'Feed', true
FROM (VALUES 
    ('Pallet'),
    ('Mix - Lapti'),
    ('Mix Sukha Powder Base'),
    ('Mix Pallet + Khal + Kakde'),
    ('Pallet Naman'),
    ('Pallet Gori'),
    ('Pallet Shubh Labh'),
    ('Pallet Diamond'),
    ('Pallet 8000')
) AS v(new_name)
WHERE NOT EXISTS (
    SELECT 1 FROM public.products p WHERE p.name = v.new_name
);
