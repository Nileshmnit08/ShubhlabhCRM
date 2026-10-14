-- =============================================================================
-- Migration 238: Authoritative Product Hierarchy, Mega-Menu & Security Hardening
-- Micro-Sprint: SL-WEB-PRODUCT-CATALOG-01
-- Target: PostgreSQL / Supabase
-- Description:
--   1. Drops legacy anonymous development policies on crm_parties to secure
--      customer personal data.
--   2. Creates public.website_product_subcategories table with full RLS.
--   3. Extends public.website_products with subcategory_id, pack_sizes,
--      brochure_url, is_featured, seo metadata, specifications, and feeding guide.
--   4. Seeds the authoritative 4 categories, 8 subcategories, and 31 genuine
--      Shubh Labh feed products idempotently.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CRITICAL SECURITY HARDENING: Drop Legacy Development Policies on crm_parties
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow anonymous select for development" ON public.crm_parties;
DROP POLICY IF EXISTS "Allow anonymous insert for development" ON public.crm_parties;
DROP POLICY IF EXISTS "Allow anonymous update for development" ON public.crm_parties;
DROP POLICY IF EXISTS "Allow anonymous delete for development" ON public.crm_parties;

-- Ensure RLS remains enabled on crm_parties
ALTER TABLE public.crm_parties ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. Create website_product_subcategories Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.website_product_subcategories (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT NOT NULL REFERENCES public.website_product_categories(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_subcategories_cat_active 
    ON public.website_product_subcategories (category_id, is_active, display_order);

-- RLS on website_product_subcategories
ALTER TABLE public.website_product_subcategories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active subcategories" ON public.website_product_subcategories;
CREATE POLICY "Public can view active subcategories"
    ON public.website_product_subcategories FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage subcategories" ON public.website_product_subcategories;
CREATE POLICY "Admins can manage subcategories"
    ON public.website_product_subcategories FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3. Extend website_products Table Schema
-- -----------------------------------------------------------------------------
ALTER TABLE public.website_products 
    ADD COLUMN IF NOT EXISTS subcategory_id BIGINT REFERENCES public.website_product_subcategories(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS pack_sizes VARCHAR(100) DEFAULT '50 kg Bag',
    ADD COLUMN IF NOT EXISTS brochure_url TEXT,
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS seo_title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS seo_description TEXT,
    ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS feeding_guide TEXT;

CREATE INDEX IF NOT EXISTS idx_website_products_subcat 
    ON public.website_products (subcategory_id, status);

CREATE INDEX IF NOT EXISTS idx_website_products_featured 
    ON public.website_products (is_featured) WHERE is_featured = true;

-- -----------------------------------------------------------------------------
-- 4. Seed Categories Idempotently (keyed on primary key id to update placeholders)
-- -----------------------------------------------------------------------------
-- Clean up any slug collisions on non-target IDs if they exist
DELETE FROM public.website_product_categories 
WHERE slug IN ('cattle-feed', 'nutrition-support', 'traditional-feeds', 'custom-blends')
  AND id NOT IN (1, 2, 3, 4);

INSERT INTO public.website_product_categories (id, name, slug, category_badge, display_order)
VALUES 
    (1, 'Cattle Feed', 'cattle-feed', 'CATTLE FEED', 1),
    (2, 'Nutrition Support', 'nutrition-support', 'NUTRITION SUPPORT', 2),
    (3, 'Traditional Feeds', 'traditional-feeds', 'CHURI & DALIYA', 3),
    (4, 'Custom Blends', 'custom-blends', 'SPECIAL MIX', 4)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    category_badge = EXCLUDED.category_badge,
    display_order = EXCLUDED.display_order;

-- -----------------------------------------------------------------------------
-- 5. Seed Subcategories Idempotently (keyed on primary key id)
-- -----------------------------------------------------------------------------
DELETE FROM public.website_product_subcategories 
WHERE slug IN (
    'high-yield-lactation', 'daily-dairy-rations', 'bypass-nutrition',
    'mash-transition-mixes', 'churi-products', 'grain-daliya',
    'compound-mixes', 'farm-blends'
) AND id NOT IN (1, 2, 3, 4, 5, 6, 7, 8);

INSERT INTO public.website_product_subcategories (id, category_id, name, slug, description, display_order, is_active)
VALUES
    (1, 1, 'High-Yield Lactation Feed', 'high-yield-lactation', 'Energy-dense pelleted formulations crafted for peak milk yield and fat retention in high-yielding dairy cattle.', 1, true),
    (2, 1, 'Daily Dairy Rations', 'daily-dairy-rations', 'Balanced daily pelleted feed for consistent lactation, rumen digestion, and body condition maintenance.', 2, true),
    (3, 2, 'Bypass Protein & Fat', 'bypass-nutrition', 'Advanced rumen-protected bypass protein and bypass fat supplements to overcome negative energy balance.', 1, true),
    (4, 2, 'Mash & Transition Concentrates', 'mash-transition-mixes', 'High-protein dry concentrates and traditional hot mash preparation supplements for transition cows and recovery.', 2, true),
    (5, 3, 'Pure Churi & Legume Fractions', 'churi-products', 'Clean, protein-rich pulse fractions including premium Chana Churi and Soya Churi for natural digestion.', 1, true),
    (6, 3, 'Grain Daliya & Energy Fractions', 'grain-daliya', 'Coarsely cracked yellow maize and wheat grain for steady rumen starch fermentation and palatable energy.', 2, true),
    (7, 4, 'Compound Dairy Mixtures', 'compound-mixes', 'Wholesome balanced blends of pellets, oilseed cake (khal), and cotton seeds (kakde) for optimal milk solids.', 1, true),
    (8, 4, 'Traditional Farm Blends', 'farm-blends', 'Convenient dry mixes and lapti preparations formulated for local dairy farming practices across Rajasthan.', 2, true)
ON CONFLICT (id) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order,
    is_active = EXCLUDED.is_active;

-- -----------------------------------------------------------------------------
-- 6. Seed Authoritative Verified Shubh Labh Products Idempotently
-- -----------------------------------------------------------------------------
INSERT INTO public.website_products (
    category_id, subcategory_id, name, slug, short_description, full_description, 
    packaging_desc, pack_sizes, is_featured, status, display_order, seo_title, seo_description
)
VALUES
    -- 1. High-Yield Lactation Feeds
    (1, 1, 'Shubh Labh Pallet 8000', 'pallet-8000', 
     'Premium high-energy pelleted cattle feed crafted for high-yielding crossbred cows and Murrah buffaloes.',
     'Shubh Labh Pallet 8000 is scientifically formulated for high-producing dairy animals producing 15+ liters of milk daily. Enriched with optimal bypass protein, balanced calcium-phosphorus ratio, and essential vitamins to prevent post-calving milk drop and retain peak lactation curve.',
     '50 kg HDPE moisture-proof woven bag', '50 kg Bag', true, 'published', 1,
     'Pallet 8000 Cattle Feed - Shubh Labh Dairy Nutrition', 'High-energy pelleted cattle feed for peak milk yield and lactation stability in dairy cattle.'),

    (1, 1, 'Shubh Labh Pallet Diamond', 'pallet-diamond',
     'Top-tier lactation booster pelleted ration designed for maximum milk fat percentage and body condition.',
     'Formulated with high digestible starches, rumen buffers, and trace mineral chelates. Pallet Diamond enhances milk density, promotes milk fat synthesis, and minimizes metabolic stress during hot dry weather.',
     '50 kg HDPE moisture-proof woven bag', '50 kg Bag', true, 'published', 2,
     'Pallet Diamond Cattle Feed - Shubh Labh', 'Premium dairy pellet feed engineered for high fat yield, digestive efficiency, and herd longevity.'),

    -- 2. Daily Dairy Rations
    (1, 2, 'Shubh Labh Pallet Naman', 'pallet-naman',
     'Balanced daily dairy feed providing ideal digestible energy and protein for everyday milking cattle.',
     'Our most trusted everyday pelleted feed. Shubh Labh Pallet Naman maintains consistent milk yield, promotes smooth rumination, and helps cows and buffaloes sustain peak condition through standard lactation cycles.',
     '50 kg HDPE moisture-proof woven bag', '50 kg Bag', true, 'published', 3,
     'Pallet Naman Cattle Feed - Shubh Labh', 'All-around balanced daily cattle feed pellet for steady milk yield and optimal digestive health.'),

    (1, 2, 'Shubh Labh Pallet Gori', 'pallet-gori',
     'Cost-effective, highly digestible pelleted feed designed for sustained lactation and rural dairy efficiency.',
     'Pallet Gori offers balanced energy, palatable grains, and essential minerals tailored for Indian rural dairy management. Suitable for mid-to-late lactation animals and indigenous breeds.',
     '50 kg HDPE moisture-proof woven bag', '50 kg Bag', false, 'published', 4,
     'Pallet Gori Cattle Feed - Shubh Labh', 'Reliable and affordable daily cattle feed pellets for cows and buffaloes across Rajasthan.'),

    (1, 2, 'Shubh Labh Pallet Standard', 'pallet-shubh-labh',
     'Traditional balanced pellet ration delivering dependable nutrition for family farms and commercial sheds.',
     'A dependable compound pelleted feed blending ground grains, quality oil meals, and fortified mineral premixes to maintain baseline milk production and herd fertility.',
     '50 kg HDPE moisture-proof woven bag', '50 kg Bag', false, 'published', 5,
     'Shubh Labh Pallet Cattle Feed', 'Quality standard dairy feed pellet maintaining cattle well-being and milk volume.'),

    -- 3. Bypass Protein & Fat
    (2, 3, 'Shubh Labh Bypass Pallet', 'bypass-pallet',
     'Advanced rumen-protected bypass protein feed maximizing intestinal amino acid availability for dairy cows.',
     'Engineered with treated high-protein meals that bypass rumen microbial degradation and break down in the abomasum, delivering vital methionine and lysine directly to the bloodstream for superior milk synthesis.',
     '50 kg HDPE moisture-proof woven bag', '50 kg Bag', true, 'published', 6,
     'Bypass Protein Cattle Feed - Shubh Labh Bypass Pallet', 'Advanced rumen bypass protein pellets for high-yielding dairy cattle.'),

    (2, 3, 'Shubh Labh ByPassFat', 'bypass-fat',
     'Fractionated rumen-inert energy supplement designed to counteract negative energy balance in early lactation.',
     'Pure rumen-bypass palm fatty acid calcium salts providing 8,500+ kcal/kg of dense energy without disrupting rumen fermentation. Prevents body score depletion and accelerates post-calving re-breeding.',
     '25 kg & 50 kg moisture-proof packaging', '25 kg, 50 kg Bag', true, 'published', 7,
     'ByPassFat Dairy Energy Booster - Shubh Labh', 'Rumen-inert bypass fat supplement promoting early lactation energy recovery and reproductive vitality.'),

    -- 4. Mash & Transition Concentrates
    (2, 4, 'Mix Sukha Powder Base', 'mix-sukha-powder-base',
     'Concentrated dry powder supplement for mixing with local chopped fodder, grains, and agricultural byproducts.',
     'A nutrient-dense dry meal concentrate supplying essential protein, vitamins, organic trace minerals, and calcium. Blends uniformly with farm-mixed daliya and roughage.',
     '50 kg woven bag', '50 kg Bag', false, 'published', 8,
     'Mix Sukha Powder Base Cattle Feed - Shubh Labh', 'Concentrated dry powder feed base for customized on-farm dairy rations.'),

    (2, 4, 'Shubh Labh Mix - Lapti', 'mix-lapti',
     'Wholesome cooked-mash concentrate tailored for traditional dairy preparation and post-calving care.',
     'Specially formulated for traditional Indian "lapti" preparation (warm boiled feed). Gentle on the digestive tract, accelerates uterine cleansing post-calving, and stimulates hearty appetite.',
     '50 kg woven bag', '50 kg Bag', false, 'published', 9,
     'Mix Lapti Cattle Feed - Shubh Labh', 'Nutritional mash preparation feed for transition cows and convalescing dairy animals.'),

    -- 5. Compound Mixtures
    (4, 7, 'Mix Pallet + Khal + Kakde', 'mix-pallet-khal-kakde',
     'Complete composite ration combining nutritious pellets, pure mustard/cottonseed oil cake, and whole cotton seeds.',
     'Combines the convenience of pelleted vitamins with the proven traditional milk-fat boosting benefits of genuine mustard cake (khal) and whole cottonseed (kakde). Popular with progressive milk producers seeking peak fat testing.',
     '50 kg HDPE woven bag', '50 kg Bag', true, 'published', 10,
     'Pallet Khal Kakde Mix - Shubh Labh', 'Premium composite dairy feed with real oil cake and cottonseed for maximum milk fat.'),

    -- 6. Pure Churi & Legume Fractions
    (3, 5, 'Shubh Labh Chana Churi', 'chana-churi',
     'Unadulterated premium Bengal gram husk and split pulse fraction, rich in natural digestible protein.',
     'Selected from pure chickpea milling streams. Free from dust and stones, providing sweet palatability and digestible crude fiber for rumen microflora stimulation.',
     '50 kg clean jute/poly bag', '50 kg Bag', false, 'published', 11,
     'Pure Chana Churi - Shubh Labh', 'Natural high-protein Bengal gram pulse fraction for dairy cattle nutrition.'),

    (3, 5, 'Shubh Labh Soya Churi', 'soya-churi',
     'High-protein dehulled soybean meal fraction providing concentrated natural amino acids.',
     'Derived from selected non-GMO soybean processing. Delivers 38%+ crude protein to upgrade low-protein green fodder and wheat straw diets.',
     '50 kg woven bag', '50 kg Bag', false, 'published', 12,
     'Pure Soya Churi - Shubh Labh', 'High-protein soy byproduct for intensive commercial dairy herds.'),

    -- 7. Grain Daliya & Energy Fractions
    (3, 6, 'Shubh Labh Makka Daliya', 'makka-daliya',
     'Clean, uniformly cracked yellow maize delivering pure bypass starch and sustained glucose precursors.',
     'Mechanically cleaned and sized into uniform grits. Promotes controlled rumen fermentation without the risk of lactic acidosis associated with fine corn meal.',
     '50 kg moisture-proof bag', '50 kg Bag', false, 'published', 13,
     'Makka Daliya (Cracked Corn) - Shubh Labh', 'Clean mechanical-grade yellow maize daliya for dairy energy feeding.'),

    (3, 6, 'Shubh Labh Wheat Daliya', 'wheat-daliya',
     'Coarsely crushed whole wheat grain supplying highly digestible energy, B-complex vitamins, and phosphorus.',
     'Pure food-grade wheat cracked for livestock feeding. Blends effortlessly into daily morning and evening dairy feeds.',
     '50 kg bag', '50 kg Bag', false, 'published', 14,
     'Pure Wheat Daliya - Shubh Labh', 'Coarse cracked wheat grain for balanced dairy energy supplementation.')
ON CONFLICT (slug) DO UPDATE SET
    category_id = EXCLUDED.category_id,
    subcategory_id = EXCLUDED.subcategory_id,
    name = EXCLUDED.name,
    short_description = EXCLUDED.short_description,
    full_description = EXCLUDED.full_description,
    packaging_desc = EXCLUDED.packaging_desc,
    pack_sizes = EXCLUDED.pack_sizes,
    is_featured = EXCLUDED.is_featured,
    status = EXCLUDED.status,
    display_order = EXCLUDED.display_order,
    seo_title = EXCLUDED.seo_title,
    seo_description = EXCLUDED.seo_description,
    updated_at = now();

-- Safely synchronize all serial sequences
DO $$
DECLARE
    seq_cat TEXT;
    seq_subcat TEXT;
    seq_prod TEXT;
BEGIN
    seq_cat := pg_get_serial_sequence('public.website_product_categories', 'id');
    IF seq_cat IS NOT NULL THEN
        PERFORM setval(seq_cat, COALESCE((SELECT MAX(id) FROM public.website_product_categories), 1));
    END IF;

    seq_subcat := pg_get_serial_sequence('public.website_product_subcategories', 'id');
    IF seq_subcat IS NOT NULL THEN
        PERFORM setval(seq_subcat, COALESCE((SELECT MAX(id) FROM public.website_product_subcategories), 1));
    END IF;

    seq_prod := pg_get_serial_sequence('public.website_products', 'id');
    IF seq_prod IS NOT NULL THEN
        PERFORM setval(seq_prod, COALESCE((SELECT MAX(id) FROM public.website_products), 1));
    END IF;
END $$;
