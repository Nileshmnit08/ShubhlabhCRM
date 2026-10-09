-- 1. Insert new materials into public.raw_materials
INSERT INTO public.raw_materials (name_en, name_hi, category, active)
SELECT * FROM (
    VALUES
        ('Chapad', 'चपड़', 'Feed', true),
        ('Methi', 'मेथी', 'Feed', true),
        ('Ajwain', 'अजवाइन', 'Feed', true),
        ('Chaadi Kakda', 'छाडी काकड़ा', 'Feed', true)
) AS v(name_en, name_hi, category, active)
WHERE NOT EXISTS (
    SELECT 1 FROM public.raw_materials rm WHERE rm.name_en = v.name_en
);
