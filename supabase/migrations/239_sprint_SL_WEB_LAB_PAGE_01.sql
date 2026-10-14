-- =============================================================================
-- Migration 239: In-House Laboratory, Quality Workflows & Testing Capabilities
-- Micro-Sprint: SL-WEB-LAB-PAGE-01
-- Target: PostgreSQL / Supabase
-- Description:
--   1. Creates website_lab_capabilities table for laboratory analytical parameters.
--   2. Creates website_lab_equipment table for analytical instruments showcase.
--   3. Creates website_lab_workflow_steps table for the 6-stage QA workflow.
--   4. Applies Row Level Security (RLS) allowing public read of published records
--      and admin full access.
--   5. Seeds authoritative testing capabilities, equipment records, and workflows.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table: website_lab_capabilities
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.website_lab_capabilities (
    id BIGSERIAL PRIMARY KEY,
    parameter_name VARCHAR(150) NOT NULL,
    parameter_code VARCHAR(30) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    standard_method TEXT NOT NULL,
    typical_range VARCHAR(100),
    importance TEXT,
    significance TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_lab_caps_display 
    ON public.website_lab_capabilities (is_published, display_order);

ALTER TABLE public.website_lab_capabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published lab capabilities" ON public.website_lab_capabilities;
CREATE POLICY "Public can view published lab capabilities"
    ON public.website_lab_capabilities FOR SELECT
    TO anon, authenticated
    USING (is_published = true);

DROP POLICY IF EXISTS "Admins can manage lab capabilities" ON public.website_lab_capabilities;
CREATE POLICY "Admins can manage lab capabilities"
    ON public.website_lab_capabilities FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 2. Table: website_lab_equipment
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.website_lab_equipment (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    model_type VARCHAR(150),
    purpose TEXT NOT NULL,
    specs TEXT,
    significance TEXT,
    image_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_lab_equip_display 
    ON public.website_lab_equipment (is_published, display_order);

ALTER TABLE public.website_lab_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published lab equipment" ON public.website_lab_equipment;
CREATE POLICY "Public can view published lab equipment"
    ON public.website_lab_equipment FOR SELECT
    TO anon, authenticated
    USING (is_published = true);

DROP POLICY IF EXISTS "Admins can manage lab equipment" ON public.website_lab_equipment;
CREATE POLICY "Admins can manage lab equipment"
    ON public.website_lab_equipment FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3. Table: website_lab_workflow_steps
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.website_lab_workflow_steps (
    id BIGSERIAL PRIMARY KEY,
    step_number VARCHAR(10) NOT NULL,
    title VARCHAR(200) NOT NULL,
    phase VARCHAR(100),
    description TEXT NOT NULL,
    quality_check TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_lab_steps_display 
    ON public.website_lab_workflow_steps (is_published, display_order);

ALTER TABLE public.website_lab_workflow_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published lab workflow steps" ON public.website_lab_workflow_steps;
CREATE POLICY "Public can view published lab workflow steps"
    ON public.website_lab_workflow_steps FOR SELECT
    TO anon, authenticated
    USING (is_published = true);

DROP POLICY IF EXISTS "Admins can manage lab workflow steps" ON public.website_lab_workflow_steps;
CREATE POLICY "Admins can manage lab workflow steps"
    ON public.website_lab_workflow_steps FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 4. Seed Testing Capabilities Idempotently
-- -----------------------------------------------------------------------------
INSERT INTO public.website_lab_capabilities (
    id, parameter_name, parameter_code, category, standard_method, typical_range, 
    importance, significance, display_order, is_published
)
VALUES
    (1, 'Crude Protein (CP)', 'CP', 'Nutritional Density', 
     'Micro-Kjeldahl Nitrogen Digestion (N × 6.25) & NIR', '18.0% – 24.0% (Feed Dependent)',
     'Essential for rumen microbial protein synthesis, lactation curve stability, and milk protein yield.',
     'Critical indicator of nitrogenous nutrition. Prevents metabolic muscle wasting in high-producing dairy cows.', 1, true),
    (2, 'Crude Fat / Ether Extract (EE)', 'EE', 'Nutritional Density',
     'Automated Soxhlet Petroleum Ether Extraction', '3.5% – 5.5% (Up to 99% in ByPassFat)',
     'High-density energy source that supports milk fat percentage and replenishes energy in early lactation.',
     'Supplies essential fatty acids without causing rumen lactic acidosis or disturbing fiber digestion.', 2, true),
    (3, 'Crude Fiber (CF)', 'CF', 'Digestive Balance',
     'Sequential Dilute Acid & Alkali Digestion', '8.0% – 12.0% Maximum',
     'Maintains optimal rumen motility, rumination chewing time, and acetate production for milk fat.',
     'Guarantees the feed provides adequate structural fiber without diluting the energy density of the ration.', 3, true),
    (4, 'Moisture Content', 'MC', 'Safety & Storage',
     'Thermal Desiccation Oven (105°C) & Digital Halogen Balance', '< 10.5% (Max 11.0%)',
     'Guarantees shelf life, preserves natural grain freshness, and prevents fungal proliferation during storage.',
     'Ensures farmers pay for concentrated feed nutrition rather than excess water weight.', 4, true),
    (5, 'Total Ash & Acid Insoluble Ash (Silica)', 'AIA', 'Purity & Minerals',
     'Muffle Furnace Ashing (550°C) followed by 5N HCl Extraction', 'Total Ash < 8.5%, AIA (Silica) < 2.0%',
     'Measures purity from sand, dust, and non-nutritive soil contaminants.',
     'Low silica guarantees pure, clean legume meals and grains free from abrasive soil minerals.', 5, true),
    (6, 'Aflatoxin B1 Mycotoxin Screening', 'AFB1', 'Safety & Storage',
     'Rapid Immunochromatographic Lateral Flow & Fluorometry', '< 20 ppb (Safety Cut-off)',
     'Toxic mold metabolite screening to protect dairy animal liver function and prevent milk contamination.',
     'Zero tolerance for mold-damaged raw materials ensures clean, safe milk for consumer health.', 6, true),
    (7, 'Calcium & Phosphorus Ratio (Ca:P)', 'Ca:P', 'Purity & Minerals',
     'Complexometric EDTA Titration & Colorimetric Spectrophotometry', 'Balanced 2.0 : 1.0 (Ca 1.0%–1.5%, P 0.5%–0.8%)',
     'Critical for skeletal integrity, milk calcium replenishment, and avoiding hypocalcemia (milk fever).',
     'Maintains ideal reproductive health, regular estrus cycles, and prevents calcium-phosphorus locks.', 7, true),
    (8, 'Pellet Durability Index (PDI)', 'PDI', 'Physical Quality',
     'Mechanical Tumbling Box Test (10 Minutes @ 50 RPM)', '> 92.0% – 95.0%',
     'Measures mechanical resistance to shattering and crumbling during transit and bulk handling.',
     'High PDI ensures cattle consume uniform pellets instead of sorting out fine dust.', 8, true)
ON CONFLICT (id) DO UPDATE SET
    parameter_name = EXCLUDED.parameter_name,
    parameter_code = EXCLUDED.parameter_code,
    category = EXCLUDED.category,
    standard_method = EXCLUDED.standard_method,
    typical_range = EXCLUDED.typical_range,
    importance = EXCLUDED.importance,
    significance = EXCLUDED.significance,
    display_order = EXCLUDED.display_order,
    is_published = EXCLUDED.is_published,
    updated_at = now();

-- -----------------------------------------------------------------------------
-- 5. Seed Laboratory Equipment Showcase Idempotently
-- -----------------------------------------------------------------------------
INSERT INTO public.website_lab_equipment (
    id, name, model_type, purpose, specs, significance, display_order, is_published
)
VALUES
    (1, 'NIR Feed & Grain Spectrophotometer', 'Near-Infrared Reflectance Analyzer',
     'Rapid non-destructive proximate analysis for incoming grain and finished pellets within 90 seconds.',
     'Wavelength spectrum: 1100–2500 nm; Multi-parameter simultaneous quantification.',
     'Allows immediate acceptance or rejection of raw material delivery trucks before unloading.', 1, true),
    (2, 'Automated Kjeldahl Protein Digestion & Distillation System', 'Micro-Kjeldahl Nitrogen Analyzer',
     'Gold standard wet-chemistry reference testing for Crude Protein (CP) quantification.',
     'Aluminum heating block digestion with automated steam distillation and colorimetric endpoint titration.',
     'Provides legal reference verification for all declared feed protein levels.', 2, true),
    (3, 'Automated Soxhlet Fat Extraction System', 'Solvent Recovery Ether Extract Unit',
     'Accurate determination of crude fat and lipid density in oil meals, daliya, and finished pellets.',
     'Multi-chamber reflux extraction with 90%+ closed-loop solvent recovery.',
     'Validates optimal energy levels in lactation booster formulations.', 3, true),
    (4, 'Raw & Detergent Fiber Analyzer', 'Sequential Hot Extraction Unit',
     'Measures crude fiber, acid detergent fiber (ADF), and neutral detergent fiber (NDF).',
     'Acid/alkali digestion vessels with built-in filtration and wash nozzles.',
     'Ensures optimal rumen stimulation without unneeded bulk or low-digestibility residue.', 4, true),
    (5, 'Digital Halogen Moisture Balance & Precision Scale', 'High-Speed Loss-On-Drying Analyzer',
     'Rapid moisture tracking of wet grains, dry mash, and freshly extruded pellets.',
     'Readability: 0.001g (0.01% moisture); Uniform circular halogen thermal chamber.',
     'Guarantees pellet moisture is safely below mold development thresholds.', 5, true),
    (6, 'Microprocessor Laboratory Muffle Furnace', 'High-Temperature Incinerator (up to 1200°C)',
     'Ashing of feed samples to quantify total mineral matter and acid-insoluble ash (silica).',
     'Controlled PID ramp heating to 550°C with ceramic fiber chamber.',
     'Ensures feeds are completely free from dirt, sand, and abrasive ground contaminants.', 6, true),
    (7, 'Holmen-Style Pellet Durability (PDI) Tester', 'Pneumatic / Mechanical Tumbling Chamber',
     'Measures pellet hardness and resistance to mechanical degradation during transport.',
     'Standardized tumbling drum simulating rough road transport conditions across rural Rajasthan.',
     'Guarantees durable, clean pellets that feed cleanly through rural feeders.', 7, true),
    (8, 'Rapid Fluorometric Mycotoxin Test Station', 'Quantitative Lateral Flow Reader',
     'Routine batch testing for Aflatoxin B1 and related mycotoxins in oilseed cakes and corn.',
     'ppb-level quantification with competitive antibody-antigen binding assay.',
     'Prevents contaminated grains from ever entering the factory production stream.', 8, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    model_type = EXCLUDED.model_type,
    purpose = EXCLUDED.purpose,
    specs = EXCLUDED.specs,
    significance = EXCLUDED.significance,
    display_order = EXCLUDED.display_order,
    is_published = EXCLUDED.is_published,
    updated_at = now();

-- -----------------------------------------------------------------------------
-- 6. Seed Quality Workflow Steps Idempotently
-- -----------------------------------------------------------------------------
INSERT INTO public.website_lab_workflow_steps (
    id, step_number, title, phase, description, quality_check, display_order, is_published
)
VALUES
    (1, '01', 'Inbound Raw Material Sampling & Inspection', 'Intake Inspection',
     'Grain and meal truckloads are sampled across multiple grid depths using mechanical core samplers. Raw materials are immediately screened for moisture, physical purity, broken grain percentage, and foreign matter.',
     'Materials exceeding standard moisture (> 12%) or showing signs of pest damage or spoilage are rejected at the gate.', 1, true),
    (2, '02', 'Laboratory Sample Milling & Homogenization', 'Sample Preparation',
     'Representative intake samples undergo standardized reduction and are milled through a 1 mm cyclone screen mill. Fine homogenization guarantees uniform particle distribution for highly reproducible analytical results.',
     'Sub-samples are split using a Boerner divider into primary analysis lots and archive reference lots.', 2, true),
    (3, '03', 'Rapid NIR Spectroscopy Screening', 'Spectrometric Scan',
     'Near-Infrared (NIR) reflectance spectrophotometry provides instant, non-destructive analysis across key nutritional parameters: Dry Matter, Crude Protein, Crude Fat, and Starch within 90 seconds.',
     'NIR calibrations are continuously benchmarked against standard wet-chemistry reference determinations.', 3, true),
    (4, '04', 'Wet-Chemistry Reference Validation', 'Chemical Quantification',
     'Daily wet-chemical analysis validates protein content via Micro-Kjeldahl nitrogen digestion, crude fat via automated Soxhlet solvent extraction, and crude fiber via sequential acid-alkali digestion.',
     'All reagents and standard volumetric solutions are prepared and titrated in-house under strict temperature controls.', 4, true),
    (5, '05', 'In-Process Pellet & Conditioning Audits', 'Manufacturing QA',
     'During pelleting, continuous quality audits measure steam conditioning temperature (75–82°C), pellet durability index (PDI), hardness, moisture retention, and cooling deck temperatures.',
     'Ensures pellets resist mechanical handling breakdown and deliver dust-free, highly palatable feed to cattle.', 5, true),
    (6, '06', 'Final Batch Clearance & Lot Traceability', 'Release & Archiving',
     'Only batches meeting 100% of labeled specification targets receive QA clearance. Every finished lot is assigned an encoded batch ID, and representative sealed archive bags are retained in our sample vault.',
     'Enables complete end-to-end trace-back from dealer bags to incoming grain lots and batch mixing logs.', 6, true)
ON CONFLICT (id) DO UPDATE SET
    step_number = EXCLUDED.step_number,
    title = EXCLUDED.title,
    phase = EXCLUDED.phase,
    description = EXCLUDED.description,
    quality_check = EXCLUDED.quality_check,
    display_order = EXCLUDED.display_order,
    is_published = EXCLUDED.is_published,
    updated_at = now();

-- -----------------------------------------------------------------------------
-- 7. Safely Synchronize Sequences
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    seq_caps TEXT;
    seq_equip TEXT;
    seq_steps TEXT;
BEGIN
    seq_caps := pg_get_serial_sequence('public.website_lab_capabilities', 'id');
    IF seq_caps IS NOT NULL THEN
        PERFORM setval(seq_caps, COALESCE((SELECT MAX(id) FROM public.website_lab_capabilities), 1));
    END IF;

    seq_equip := pg_get_serial_sequence('public.website_lab_equipment', 'id');
    IF seq_equip IS NOT NULL THEN
        PERFORM setval(seq_equip, COALESCE((SELECT MAX(id) FROM public.website_lab_equipment), 1));
    END IF;

    seq_steps := pg_get_serial_sequence('public.website_lab_workflow_steps', 'id');
    IF seq_steps IS NOT NULL THEN
        PERFORM setval(seq_steps, COALESCE((SELECT MAX(id) FROM public.website_lab_workflow_steps), 1));
    END IF;
END $$;
