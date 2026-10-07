DO $$ 
DECLARE
  v_category VARCHAR(100);
  v_product_name VARCHAR(255);
  v_count INT;
BEGIN
  -- We will use a temporary table to hold our approved product master
  CREATE TEMP TABLE temp_approved_products (
      category VARCHAR(100),
      name VARCHAR(255)
  );

  INSERT INTO temp_approved_products (category, name) VALUES
    ('Pallet', '8000'),
    ('Pallet', 'Diamond'),
    ('Pallet', 'Shubh Labh'),
    ('Pallet', 'Gori'),
    ('Pallet', 'Naman'),

    ('Churi', 'Chana Churi'),
    ('Churi', 'Makka Aata'),
    ('Churi', 'Makka Daliya'),
    ('Churi', 'Soya Churi'),

    ('Mix', 'Dry Mix'),
    ('Mix', 'Lapti Mix'),

    ('Daliya', 'Makka Daliya'),
    ('Daliya', 'Wheat Daliya'),

    ('Feed', 'Mix - Lapti'),
    ('Feed', 'Mix Pallet + Khal + Kakde'),
    ('Feed', 'Mix Dry Powder'),

    ('ByPass Protein', 'Bypass Pallet'),

    ('ByPass Fat', 'ByPassFat');

  -- Ensure they are inserted
  INSERT INTO public.products (name, category, active, unit_of_measure, bag_conversion_factor)
  SELECT t.name, t.category, true, 'Bags', 1.0
  FROM temp_approved_products t
  WHERE NOT EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.name = t.name AND p.category = t.category
  );

  -- Ensure any existing matching ones are marked as active
  UPDATE public.products p
  SET active = true
  FROM temp_approved_products t
  WHERE p.name = t.name AND p.category = t.category;

  DROP TABLE temp_approved_products;
END $$;
