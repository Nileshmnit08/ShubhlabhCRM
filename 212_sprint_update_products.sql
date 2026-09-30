-- Disable Broiler and Layer products from New Order selection
UPDATE public.products SET active = false WHERE category IN ('Broiler', 'Layer');

-- Add Makka Aata under Churi category
INSERT INTO public.products (name, category, active) 
SELECT 'Makka Aata', 'Churi', true
WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Makka Aata');
