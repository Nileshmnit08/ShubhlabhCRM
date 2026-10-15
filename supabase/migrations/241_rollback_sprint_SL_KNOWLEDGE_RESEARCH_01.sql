-- =============================================================================
-- Migration 241 Rollback: Rollback Ten-Year Cattle Feed Scientific Research Library
-- Sprint: SL-KNOWLEDGE-RESEARCH-01
-- Target Database: Supabase / PostgreSQL (public.website_knowledge_articles)
-- =============================================================================

START TRANSACTION;

DELETE FROM public.website_knowledge_articles WHERE slug IN (
    'evaluating-agro-industrial-by-products-dairy-rations',
    'ddgs-protein-source-dairy-cow-diets',
    'rumen-protected-methionine-transition-dairy-cows',
    'yeast-culture-supplementation-starch-fermentation',
    'cottonseed-cake-supplementation-buffalo-calves',
    'palmitic-acid-bypass-fat-early-lactation',
    'canola-quality-mustard-cake-soybean-alternative',
    'yeast-clay-aflatoxin-mitigation-dairy-cattle',
    'calcium-salts-fatty-acids-dairy-meta-analysis',
    'chelated-mineral-supplementation-lactating-buffaloes',
    'rice-bran-crude-lecithin-energy-supplement',
    'exogenous-enzymes-dairy-diets-starch-fiber',
    'heat-treated-sbm-vs-ddgs-rup-digestibility',
    'methionine-supplementation-heat-stress-dairy',
    'isoacids-feed-additives-cellulolytic-bacteria-milk-fat',
    'medium-chain-fatty-acids-transition-dairy-cows',
    'antimethanogenic-bioactive-feed-additives-selection',
    'extended-dairy-lactations-nutritional-dynamics'
);

COMMIT;
