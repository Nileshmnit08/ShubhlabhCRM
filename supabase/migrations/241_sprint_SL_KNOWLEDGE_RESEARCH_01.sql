-- =============================================================================
-- Migration: Seed Ten-Year Cattle Feed Scientific Research Library
-- Target Database: Supabase / PostgreSQL (public.website_knowledge_articles)
-- Sprint: SL-KNOWLEDGE-RESEARCH-01
-- Period: 15 October 2016 – 15 October 2026
-- Status: Defaulted to 'published' as per Section 10 publication policy
-- Note: Includes public.knowledge_articles view compatibility shim & ON CONFLICT idempotency
-- =============================================================================

START TRANSACTION;

-- -----------------------------------------------------------------------------
-- Supabase Compatibility View:
-- Creates/replaces public.knowledge_articles view pointing to public.website_knowledge_articles
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.knowledge_articles AS
SELECT * FROM public.website_knowledge_articles;

-- Article 1 (2016): Agro-Industrial By-Product Inclusion in Dairy Rations
INSERT INTO public.website_knowledge_articles (
    title, slug, category, summary, content_body, display_order, status, published_at, created_at
) VALUES (
    'Evaluating Agro-Industrial By-Product Feeds in Lactating Dairy Rations',
    'evaluating-agro-industrial-by-products-dairy-rations',
    'Feed Raw Materials',
    'Peer-reviewed evaluation of agro-industrial by-products including dried distillers grains, soyhulls, and palm kernel extract in lactating dairy rations assessing milk solids, nutrient digestibility, and rumen fermentation dynamics.',
    '<h2>Research Overview</h2>
<p>Utilizing agro-industrial by-products in dairy cattle feeding reduces reliance on cereal grains and human-edible foodstuffs while lowering concentrate costs for dairy enterprises. Understanding how high-inclusion by-product blends affect digestion and milk production is critical for compound feed formulation.</p>
<h2>Research Objective</h2>
<p>The researchers investigated the effects of substituting traditional cereal-based concentrates with varying inclusion levels of by-product ingredients (dried distillers grains, soyhulls, and palm kernel extract) on milk yield, milk composition, nutrient digestibility, and rumen fermentation characteristics in lactating dairy cows.</p>
<h2>Key Findings</h2>
<ul>
  <li>By-product inclusion maintained total dry matter intake (DMI) and ruminal pH within healthy physiological parameters.</li>
  <li>Fat-corrected milk yield and milk fat percentage remained stable when by-products replaced conventional starch sources.</li>
  <li>Digestible neutral detergent fiber (NDF) intake was enhanced, compensating for reduced dietary starch concentrations.</li>
  <li>Nitrogen utilization efficiency remained comparable across treatments, provided crude protein was balanced.</li>
</ul>
<h2>Practical Relevance for Cattle Feed</h2>
<p>Feed millers and commercial formulators can safely utilize high-fiber, medium-protein by-products such as dried distillers grains and oilseed by-products to formulate cost-effective dairy concentrates without compromising rumen health or milk fat output.</p>
<h2>Limitations and Application</h2>
<p>Responses depend on by-product batch consistency, moisture content, oil levels, and residual fiber quality. Strict laboratory screening for aflatoxins and rancidity is essential before bulk inclusion.</p>
<h2>Original Research Reference</h2>
<p>McCarthy, S., Rath, M., Murphy, J. J., and Boland, T. M. (2016). The effect of by-product inclusion level on milk production, nutrient digestibility and excretion, and rumen fermentation parameters in lactating dairy cows offered a pasture-based diet. <em>Journal of Dairy Science</em>, 99. DOI: <a href="https://doi.org/10.3168/jds.2016-11600" target="_blank" rel="noopener noreferrer">10.3168/jds.2016-11600</a>.</p>
<p><strong>Research note:</strong> This article summarizes published research. Commercial feed formulation should consider laboratory analysis, animal requirements and qualified nutritional advice.</p>',
    1,
    'published',
    '2016-12-01 10:00:00',
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    summary = EXCLUDED.summary,
    content_body = EXCLUDED.content_body,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- Article 2 (2017): Substitution of SBM with Dried Distillers Grains with Solubles (DDGS)
INSERT INTO public.website_knowledge_articles (
    title, slug, category, summary, content_body, display_order, status, published_at, created_at
) VALUES (
    'Dried Distillers Grains with Solubles as a Protein Source in Dairy Cow Diets',
    'ddgs-protein-source-dairy-cow-diets',
    'Feed Raw Materials',
    'A controlled trial assessing the complete and partial replacement of soybean meal and canola cake with dried distillers grains with solubles (DDGS) at two dietary crude protein levels in lactating cows.',
    '<h2>Research Overview</h2>
<p>Protein meals represent the costliest fraction of commercial dairy cattle concentrates. Evaluating grain processing co-products like dried distillers grains with solubles (DDGS) allows feed manufacturers to identify sustainable, economical protein alternatives to soybean meal.</p>
<h2>Research Objective</h2>
<p>The investigation examined the impact of replacing soybean meal and rapeseed/canola cake with corn DDGS at normal and reduced dietary crude protein levels on feed intake, milk production, and milk nitrogen efficiency in dairy cattle.</p>
<h2>Key Findings</h2>
<ul>
  <li>DDGS successfully replaced conventional oilseed meals without depressing daily dry matter intake.</li>
  <li>Milk production and energy-corrected milk yield were maintained across both standard and reduced crude protein diets.</li>
  <li>Rumen-undegradable protein (RUP) supplied by DDGS supported adequate metabolizable protein delivery to the small intestine.</li>
  <li>Milk urea nitrogen concentrations remained within optimal ranges, reflecting balanced amino acid absorption.</li>
</ul>
<h2>Practical Relevance for Cattle Feed</h2>
<p>Corn DDGS provides a dual advantage of high crude protein (26–30%) and elevated bypass protein. Feed manufacturers can substitute conventional oilseed cakes with DDGS in commercial pelleted rations while maintaining milk volume and solid component yields.</p>
<h2>Limitations and Application</h2>
<p>DDGS exhibits variability in lysine bioavailability due to heat damage during drying. Formulations must monitor sulfur content and ensure lysine:methionine ratios are balanced with synthetic or protected amino acids.</p>
<h2>Original Research Reference</h2>
<p>Gaillard, C., Sørensen, M. T., Vestergaard, M., Sehested, J., and Larsen, M. (2017). Effect of substituting soybean meal and canola cake with dried distillers grains with solubles at 2 dietary crude protein levels on feed intake, milk production, and milk quality in dairy cows. <em>Journal of Dairy Science</em>, 100(11): 8928–8938. DOI: <a href="https://doi.org/10.3168/jds.2017-12718" target="_blank" rel="noopener noreferrer">10.3168/jds.2017-12718</a>.</p>
<p><strong>Research note:</strong> This article summarizes published research. Commercial feed formulation should consider laboratory analysis, animal requirements and qualified nutritional advice.</p>',
    2,
    'published',
    '2017-11-15 10:00:00',
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    summary = EXCLUDED.summary,
    content_body = EXCLUDED.content_body,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- Article 3 (2017): Ethyl-Cellulose Rumen-Protected Methionine in Transition Cows
INSERT INTO public.website_knowledge_articles (
    title, slug, category, summary, content_body, display_order, status, published_at, created_at
) VALUES (
    'Rumen-Protected Methionine Supplementation in Transition and Fresh Dairy Cows',
    'rumen-protected-methionine-transition-dairy-cows',
    'Dairy Nutrition',
    'Evaluation of ethyl-cellulose protected methionine supplementation during the periparturient period and early lactation on performance, oxidative balance, and milk protein yield.',
    '<h2>Research Overview</h2>
<p>The periparturient transition period represents the most metabolically demanding phase in dairy cows. Methionine is universally recognized as the primary limiting amino acid for milk protein synthesis and liver lipid export via very-low-density lipoproteins (VLDL).</p>
<h2>Research Objective</h2>
<p>The researchers evaluated whether supplementing ethyl-cellulose coated rumen-protected methionine from -21 days pre-calving to +30 days post-calving enhances dry matter intake, milk production, liver function, and oxidative stress resistance in dairy cows.</p>
<h2>Key Findings</h2>
<ul>
  <li>Pre-partum and post-partum dry matter intake was significantly higher in cows receiving rumen-protected methionine.</li>
  <li>Milk yield, milk fat yield, and milk protein percentage increased markedly during early lactation.</li>
  <li>Cows exhibited improved hepatic lipid processing and reduced plasma biomarkers of systemic oxidative stress.</li>
  <li>Neutrophil phagocytic capacity and immune response indicators were positively modulated post-calving.</li>
</ul>
<h2>Practical Relevance for Cattle Feed</h2>
<p>Incorporating rumen-protected methionine into commercial transition feeds and high-yielding dairy formulations prevents negative energy balance crashes, elevates milk protein yield, and accelerates peak lactation stability.</p>
<h2>Limitations and Application</h2>
<p>Ethyl-cellulose coatings require careful handling in feed mills to avoid pelleting die shear forces that could rupture the protective matrix. Optimal dietary lysine concentrations must be present to realize methionine benefits.</p>
<h2>Original Research Reference</h2>
<p>Batistel, F., Arroyo, J. M., Bellingeri, A., Wang, L., Saremi, B., Parys, C., Trevisi, E., Cardoso, F. C., and Loor, J. J. (2017). Ethyl-cellulose rumen-protected methionine enhances performance during the periparturient period and early lactation in Holstein dairy cows. <em>Journal of Dairy Science</em>, 100(9): 7455–7467. DOI: <a href="https://doi.org/10.3168/jds.2017-12689" target="_blank" rel="noopener noreferrer">10.3168/jds.2017-12689</a>.</p>
<p><strong>Research note:</strong> This article summarizes published research. Commercial feed formulation should consider laboratory analysis, animal requirements and qualified nutritional advice.</p>',
    3,
    'published',
    '2017-09-01 10:00:00',
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    summary = EXCLUDED.summary,
    content_body = EXCLUDED.content_body,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- Article 4 (2018): Supplemental Yeast Culture and Dietary Starch Interactions
INSERT INTO public.website_knowledge_articles (
    title, slug, category, summary, content_body, display_order, status, published_at, created_at
) VALUES (
    'Yeast Culture Supplementation and Starch Fermentation in Dairy Cattle',
    'yeast-culture-supplementation-starch-fermentation',
    'Feed Additives',
    'Controlled trial exploring the interaction between Saccharomyces cerevisiae yeast culture supplementation and dietary starch content on ruminal fermentation, fiber digestion, and systemic acid-base status.',
    '<h2>Research Overview</h2>
<p>High-concentrate diets rich in starch are commonly fed to maintain high milk production, but they increase the risk of subacute ruminal acidosis (SARA). Microbial feed additives, specifically Saccharomyces cerevisiae cultures, have been proposed to stabilize ruminal pH and stimulate cellulolytic bacteria.</p>
<h2>Research Objective</h2>
<p>The study investigated the effects of active yeast culture supplementation in diets formulated with normal versus elevated starch concentrations on ruminal pH kinetics, volatile fatty acid profiles, and fiber digestibility in lactating cows.</p>
<h2>Key Findings</h2>
<ul>
  <li>Yeast culture supplementation moderated diurnal ruminal pH fluctuations and reduced the duration of subacute ruminal acidosis.</li>
  <li>Total tract neutral detergent fiber (NDF) digestibility was significantly increased in yeast-supplemented groups.</li>
  <li>Molar proportions of ruminal acetate were maintained, supporting milk fat precursor availability.</li>
  <li>Lactate-utilizing bacteria populations were stimulated, enhancing ruminal buffering capacity.</li>
</ul>
<h2>Practical Relevance for Cattle Feed</h2>
<p>Including authentic yeast cultures in commercial pelleted dairy feeds and high-grain rations provides a natural buffering mechanism, mitigating acidosis risk when feeding high-starch diets to crossbred cows and high-producing buffaloes.</p>
<h2>Limitations and Application</h2>
<p>Thermal stability of live yeast cells varies during steam conditioning and extrusion pelleting. Formulators must verify that the yeast preparation possesses validated heat-tolerance or utilize post-pellet liquid application systems.</p>
<h2>Original Research Reference</h2>
<p>Dias, A. L. G., Freitas, J. A., Micai, B., Azevedo, R. A., Greco, L. F., and Santos, J. E. P. (2018). Effect of supplemental yeast culture and dietary starch content on rumen fermentation and digestion in dairy cows. <em>Journal of Dairy Science</em>, 101(1): 201–221. DOI: <a href="https://doi.org/10.3168/jds.2017-13241" target="_blank" rel="noopener noreferrer">10.3168/jds.2017-13241</a>.</p>
<p><strong>Research note:</strong> This article summarizes published research. Commercial feed formulation should consider laboratory analysis, animal requirements and qualified nutritional advice.</p>',
    4,
    'published',
    '2018-01-10 10:00:00',
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    summary = EXCLUDED.summary,
    content_body = EXCLUDED.content_body,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- Article 5 (2018): Cottonseed Cake Supplementation in Growing Buffalo Calves
INSERT INTO public.website_knowledge_articles (
    title, slug, category, summary, content_body, display_order, status, published_at, created_at
) VALUES (
    'Cottonseed Cake Supplementation and Metabolic Response in Growing Buffalo Calves',
    'cottonseed-cake-supplementation-buffalo-calves',
    'Feed Raw Materials',
    'Field-matched trial evaluating supplemental cottonseed cake on average daily gain, feed conversion efficiency, and thyroid hormone status in growing female Mehsana buffalo calves.',
    '<h2>Research Overview</h2>
<p>Cottonseed cake is a cornerstone traditional oilseed protein supplement across western and northern India, especially Rajasthan and Gujarat. Validating its biological efficacy and metabolic safety in growing buffalo stock provides empirical backing for commercial ration balancing.</p>
<h2>Research Objective</h2>
<p>The researchers investigated the effects of graduated cottonseed cake (CSC) supplementation alongside commercial compound concentrate on average daily body weight gain, serum biochemical profiles, and thyroid hormones (T3 and T4) in growing female Mehsana buffalo calves.</p>
<h2>Key Findings</h2>
<ul>
  <li>Average daily body weight gain was significantly higher in calves receiving supplemental cottonseed cake compared to controls.</li>
  <li>Serum total protein, globulin, and cholesterol concentrations were enhanced, demonstrating superior protein assimilation.</li>
  <li>Serum triiodothyronine (T3) and thyroxine (T4) levels were significantly elevated, indicating elevated metabolic rate and developmental vigor.</li>
  <li>Feeding cost per kilogram of live body weight gain was reduced under the balanced cottonseed cake regimen.</li>
</ul>
<h2>Practical Relevance for Cattle Feed</h2>
<p>Cottonseed cake remains an exceptional ingredient for ruminant formulations due to its natural bypass protein and rumen-fermentable fiber. Compound feed manufacturers can strategically combine cottonseed meal with pulses and grains to optimize calf growth and heifer development.</p>
<h2>Limitations and Application</h2>
<p>Cottonseed products contain free gossypol, which can cause toxicity in pre-ruminant calves if fed excessively before full rumen development. Young stock must have functional rumens (typically >3 months of age) with adequate microbial degradation capacity.</p>
<h2>Original Research Reference</h2>
<p>Barman, D., Prajapati, K. B., Pawar, M. M., Das, H., Prasad, K. C., and Ahirwar, M. (2018). Effect of feeding cotton seed cake (CSC) on growth performance and blood biochemical profile in Mehsana buffalo calves. <em>Indian Journal of Animal Research</em>, 53(5): 604–608. DOI: <a href="https://doi.org/10.18805/ijar.B-3580" target="_blank" rel="noopener noreferrer">10.18805/ijar.B-3580</a>.</p>
<p><strong>Research note:</strong> This article summarizes published research. Commercial feed formulation should consider laboratory analysis, animal requirements and qualified nutritional advice.</p>',
    5,
    'published',
    '2018-05-20 10:00:00',
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    summary = EXCLUDED.summary,
    content_body = EXCLUDED.content_body,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- Article 6 (2019): Palmitic Acid Bypass Fat in Early Lactation Dairy Cows
INSERT INTO public.website_knowledge_articles (
    title, slug, category, summary, content_body, display_order, status, published_at, created_at
) VALUES (
    'Timing of Palmitic Acid Bypass Fat Supplementation in Early Lactation',
    'palmitic-acid-bypass-fat-early-lactation',
    'Dairy Nutrition',
    'Randomized lactation study investigating the timing and physiological impact of enriched palmitic acid bypass fat on dry matter intake, milk fat yield, and body weight retention in fresh cows.',
    '<h2>Research Overview</h2>
<p>Negative energy balance during early lactation prompts cows to mobilize body fat reserves, predisposing them to ketosis and body condition score drops. Enriched palmitic acid (C16:0) supplements bypass rumen biohydrogenation to directly enhance mammary fatty acid synthesis.</p>
<h2>Research Objective</h2>
<p>The trial examined whether the timing of supplemental palmitic acid (introduced in early postpartum versus delayed introduction) alters energy intake, milk production, 3.5% fat-corrected milk yield, and maternal tissue mobilization in lactating cows.</p>
<h2>Key Findings</h2>
<ul>
  <li>Palmitic acid supplementation increased yields of 3.5% fat-corrected milk and total milk fat mass.</li>
  <li>Supplementation initiated immediately post-calving maintained higher peak lactation curves without depressing dry matter intake.</li>
  <li>Gross energetic efficiency of milk production was significantly higher in cows receiving palmitic acid.</li>
  <li>Plasma non-esterified fatty acid (NEFA) dynamics demonstrated stabilized energy partitioning toward the mammary gland.</li>
</ul>
<h2>Practical Relevance for Cattle Feed</h2>
<p>Enriched palmitic acid bypass fats (prills and calcium salts) are highly effective in early-lactation compound cattle feeds. Incorporating C16:0 fractions at 1.5–2.0% of dietary dry matter maximizes milk fat test without interfering with ruminal fiber digestion.</p>
<h2>Limitations and Application</h2>
<p>Palmitic acid supplementation requires careful balancing against unsaturated fatty acid sources (such as oleic acid, C18:1) to maintain total tract fatty acid digestibility and prevent excessive body fat mobilization in cows with poor baseline body condition.</p>
<h2>Original Research Reference</h2>
<p>de Souza, J., and Lock, A. L. (2019). Effects of timing of palmitic acid supplementation on production responses of early-lactation dairy cows. <em>Journal of Dairy Science</em>, 102(1): 260–273. DOI: <a href="https://doi.org/10.3168/jds.2018-14976" target="_blank" rel="noopener noreferrer">10.3168/jds.2018-14976</a>.</p>
<p><strong>Research note:</strong> This article summarizes published research. Commercial feed formulation should consider laboratory analysis, animal requirements and qualified nutritional advice.</p>',
    6,
    'published',
    '2019-01-15 10:00:00',
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    summary = EXCLUDED.summary,
    content_body = EXCLUDED.content_body,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- Article 7 (2019): Canola-Quality Rapeseed-Mustard Cake in Crossbred Cows
INSERT INTO public.website_knowledge_articles (
    title, slug, category, summary, content_body, display_order, status, published_at, created_at
) VALUES (
    'Canola-Quality Rapeseed-Mustard Cake as a Soybean Meal Alternative in Crossbred Cows',
    'canola-quality-mustard-cake-soybean-alternative',
    'Feed Raw Materials',
    'Investigating the total substitution of soybean meal with low-glucosinolate canola-quality rapeseed-mustard cake on metabolic profile, thyroid hormones, and milk quality in crossbred dairy cattle.',
    '<h2>Research Overview</h2>
<p>Mustard cake (Brassica juncea) is widely accessible and affordable across Rajasthan and northern India, but conventional varieties contain high levels of glucosinolates and erucic acid that can depress feed intake and alter thyroid metabolism. Improved low-glucosinolate canola-quality varieties offer an attractive alternative.</p>
<h2>Research Objective</h2>
<p>Researchers at ICAR-IVRI evaluated whether complete replacement of solvent-extracted soybean meal with canola-quality rapeseed-mustard cake influences metabolic health, serum triiodothyronine (T3), thyroxine (T4), and milk production in crossbred cows.</p>
<h2>Key Findings</h2>
<ul>
  <li>Cows fed canola-quality rapeseed-mustard cake exhibited normal metabolic profiles, with blood glucose, albumin, and urea nitrogen remaining stable.</li>
  <li>Serum T3 and T4 concentrations were statistically indistinguishable between soybean meal and canola-quality mustard cake groups.</li>
  <li>Unlike high-glucosinolate conventional mustard cake, canola-quality cake caused no elevation in serum lactate dehydrogenase (LDH).</li>
  <li>Daily milk yield, 4% fat-corrected milk, and milk component percentages (fat, protein, SNF) were fully sustained.</li>
</ul>
<h2>Practical Relevance for Cattle Feed</h2>
<p>Procuring and formulating with low-glucosinolate mustard cake varieties allows commercial feed manufacturers in India to completely replace expensive soybean meal in dairy rations, substantially reducing feed manufacturing costs while maintaining animal health and milk output.</p>
<h2>Limitations and Application</h2>
<p>Commercial availability of certified canola-quality mustard cake in local mandis must be validated through glucosinolate testing (target <30 µmol/g). Standard high-glucosinolate mustard cake requires lower inclusion thresholds (<15% of concentrate).</p>
<h2>Original Research Reference</h2>
<p>Tayo, T., Dutta, N., Pattanaik, A. K., and Sharma, K. (2019). Effect of supplementing canola quality rapeseed mustard cake on the metabolic profile and quality of milk in crossbred cows. <em>The Indian Journal of Animal Sciences</em>, 89(3): 264–268. Repository: <a href="https://epubs.icar.org.in/index.php/IJAnS/article/view/87964" target="_blank" rel="noopener noreferrer">ICAR ePubs 87964</a>.</p>
<p><strong>Research note:</strong> This article summarizes published research. Commercial feed formulation should consider laboratory analysis, animal requirements and qualified nutritional advice.</p>',
    7,
    'published',
    '2019-03-20 10:00:00',
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    summary = EXCLUDED.summary,
    content_body = EXCLUDED.content_body,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- Article 8 (2020): Clay and Yeast-Based Aflatoxin B1 Binders in Dairy Cattle
INSERT INTO public.website_knowledge_articles (
    title, slug, category, summary, content_body, display_order, status, published_at, created_at
) VALUES (
    'Yeast Culture and Clay-Based Binders for Aflatoxin B1 Mitigation in Dairy Cattle',
    'yeast-clay-aflatoxin-mitigation-dairy-cattle',
    'Feed Quality',
    'Controlled rumen challenge trial evaluating sequestering agents composed of Saccharomyces cerevisiae fermentation products and bentonite clay against dietary aflatoxin B1 contamination.',
    '<h2>Research Overview</h2>
<p>Aflatoxin B1 (AFB1) is a potent mycotoxin produced by Aspergillus molds on grains and oilseed meals during humid storage. When consumed by dairy cows, AFB1 is metabolized into carcinogenic Aflatoxin M1 (AFM1) in milk, creating severe food safety hazards and depressing ruminal bacterial diversity.</p>
<h2>Research Objective</h2>
<p>The trial investigated the efficacy of combining bentonite clay with Saccharomyces cerevisiae fermentation products in adsorbing aflatoxins and preserving ruminal bacterial diversity in lactating dairy cows exposed to dietary AFB1.</p>
<h2>Key Findings</h2>
<ul>
  <li>Dietary AFB1 challenge without sequestering agents significantly suppressed cellulolytic bacterial taxa (Ruminococcaceae and Fibrobacteres).</li>
  <li>The combined clay and yeast fermentation sequestering agent significantly reduced aflatoxin transfer from contaminated feed into milk.</li>
  <li>Sequestering agents protected the ruminal microbiome, maintaining bacterial richness and volatile fatty acid generation.</li>
  <li>In vitro and in vivo binding assays confirmed strong physical adsorption of AFB1 across physiological rumen pH conditions.</li>
</ul>
<h2>Practical Relevance for Cattle Feed</h2>
<p>Incorporating verified broad-spectrum mycotoxin binders (combining hydrated sodium calcium aluminosilicate/bentonite clay and modified yeast cell walls) is essential in commercial dairy feeds, particularly during monsoon storage, to protect animal productivity and ensure legal milk purity.</p>
<h2>Limitations and Application</h2>
<p>Excessive non-specific clay inclusion (>2% of ration) can bind non-target micronutrients such as fat-soluble vitamins (A, D, E) and trace minerals. Binders must be selected based on proven selectivity and documented binding isotherms.</p>
<h2>Original Research Reference</h2>
<p>Jiang, Y., Ogunade, I. M., Pech-Cervantes, A. A., Fan, P. X., Li, X., Kim, D. H., Arriola, K. G., Poindexter, M. B., Jeong, K. C., Vyas, D., and Adesogan, A. T. (2020). Effect of sequestering agents based on a Saccharomyces cerevisiae fermentation product and clay on the ruminal bacterial community of lactating dairy cows challenged with dietary aflatoxin B1. <em>Journal of Dairy Science</em>, 103(1): 510–523. DOI: <a href="https://doi.org/10.3168/jds.2019-16851" target="_blank" rel="noopener noreferrer">10.3168/jds.2019-16851</a>.</p>
<p><strong>Research note:</strong> This article summarizes published research. Commercial feed formulation should consider laboratory analysis, animal requirements and qualified nutritional advice.</p>',
    8,
    'published',
    '2020-01-10 10:00:00',
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    summary = EXCLUDED.summary,
    content_body = EXCLUDED.content_body,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- Article 9 (2021): Calcium Salts of Palm Fatty Acids (Ca-PFA) Meta-Analysis
INSERT INTO public.website_knowledge_articles (
    title, slug, category, summary, content_body, display_order, status, published_at, created_at
) VALUES (
    'Calcium Salts of Fatty Acids: Digestibility and Production Meta-Analysis in Dairy Cows',
    'calcium-salts-fatty-acids-dairy-meta-analysis',
    'Dairy Nutrition',
    'Comprehensive meta-analysis of peer-reviewed lactation trials evaluating nutrient digestibility, milk production, and fat-corrected milk yield in response to calcium salts of palm fatty acids.',
    '<h2>Research Overview</h2>
<p>Calcium salts of palm fatty acids (Ca-PFA) are the most widely used commercial bypass fat supplement worldwide. Because individual trial responses vary by basal diet, stage of lactation, and supplementation dose, a quantitative meta-analysis provides the gold standard for nutritional prediction.</p>
<h2>Research Objective</h2>
<p>The researchers conducted a meta-analysis and meta-regression across dozens of peer-reviewed dairy cattle studies to quantify the exact effects of Ca-PFA on dry matter intake, total tract nutrient digestibility, milk yield, and milk component synthesis.</p>
<h2>Key Findings</h2>
<ul>
  <li>Ca-PFA supplementation consistently increased milk yield by an average of 1.40 kg/day across evaluated trials.</li>
  <li>Yield of 3.5% fat-corrected milk increased by 1.84 kg/day, driven by enhanced dietary energy density.</li>
  <li>Dry matter intake showed a modest, dose-dependent decrease (-0.46 kg/day), while overall net energy for lactation intake increased.</li>
  <li>Total-tract fatty acid digestibility remained high (averaging ~75%), without adverse impacts on crude protein or NDF digestion.</li>
</ul>
<h2>Practical Relevance for Cattle Feed</h2>
<p>This meta-analysis provides rigorous mathematical justification for adding 300–450 g/day of calcium salts of fatty acids to commercial high-yield dairy rations. It confirms substantial return on investment through fat-corrected milk volume gains.</p>
<h2>Limitations and Application</h2>
<p>Ca-PFA has a characteristic odor and pungent taste that can cause mild palatability depressions if introduced abruptly. Feed manufacturers should blend Ca-PFA into pelleted concentrates or advise a 7–10 day gradual introductory period on farm.</p>
<h2>Original Research Reference</h2>
<p>Santos Neto, J. M., Souza, J., and Lock, A. L. (2021). Effects of calcium salts of palm fatty acids on nutrient digestibility and production responses of lactating dairy cows: A meta-analysis and meta-regression. <em>Journal of Dairy Science</em>, 104(9): 9752–9768. DOI: <a href="https://doi.org/10.3168/jds.2020-19936" target="_blank" rel="noopener noreferrer">10.3168/jds.2020-19936</a>.</p>
<p><strong>Research note:</strong> This article summarizes published research. Commercial feed formulation should consider laboratory analysis, animal requirements and qualified nutritional advice.</p>',
    9,
    'published',
    '2021-09-15 10:00:00',
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    summary = EXCLUDED.summary,
    content_body = EXCLUDED.content_body,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- Article 10 (2021): Chelated Mineral Mixture Supplementation in Lactating Buffaloes
INSERT INTO public.website_knowledge_articles (
    title, slug, category, summary, content_body, display_order, status, published_at, created_at
) VALUES (
    'Chelated Mineral Supplementation and Lactation Performance in Murrah Buffaloes',
    'chelated-mineral-supplementation-lactating-buffaloes',
    'Feed Additives',
    'Field trial conducted in Rajasthan assessing the effect of organic chelated mineral mixture supplementation on daily milk yield, post-partum estrus onset, and economics in lactating dairy buffaloes.',
    '<h2>Research Overview</h2>
<p>Dairy soils and green forages across Rajasthan are widely documented to suffer from micro-mineral deficiencies (copper, zinc, manganese). Inorganic mineral salts possess lower intestinal bioavailability compared to organic amino acid chelates, limiting their effectiveness in lactating buffaloes.</p>
<h2>Research Objective</h2>
<p>Krishi Vigyan Kendra (SKNAU, Jobner, Jaipur, Rajasthan) evaluated the effect of daily supplementation with 40g of chelated mineral mixture on milk yield, fat percentage, and post-partum reproductive intervals in lactating Murrah buffaloes.</p>
<h2>Key Findings</h2>
<ul>
  <li>Daily milk yield increased significantly by 1.55 liters/day (15.82% gain) in buffaloes supplemented with chelated minerals.</li>
  <li>Service period was reduced by 24 days, and the interval from calving to first fertile post-partum estrus was accelerated.</li>
  <li>Somatic cell score indicators and udder health parameters improved due to enhanced zinc and copper bioavailability.</li>
  <li>Economic evaluation demonstrated an outstanding benefit-cost (B:C) ratio of 1:7.75 under field farming conditions.</li>
</ul>
<h2>Practical Relevance for Cattle Feed</h2>
<p>Formulating cattle feed with organic chelated trace minerals (zinc glycinate, copper glycinate, chromium propionate) provides commercial feed mills in Rajasthan with a powerful, scientifically proven performance differentiator that directly improves farmer milk yield and fertility.</p>
<h2>Limitations and Application</h2>
<p>Chelated trace minerals have a higher unit cost than inorganic sulfates or oxides. Formulations can adopt a hybrid strategy, supplying 30–50% of the trace mineral package in chelated form and the remainder as verified inorganic salts.</p>
<h2>Original Research Reference</h2>
<p>Kantwa, S. C., Shekhawat, S. S., Pratap, R., Meena, Y. K., and Samota, S. D. (2021). Effect of chelated mineral supplementation on productive and reproductive performance of lactating buffalo. <em>The Indian Journal of Animal Sciences</em>, 91(12): 1073–1076. Repository: <a href="https://epubs.icar.org.in/index.php/IJAnS/article/view/118816" target="_blank" rel="noopener noreferrer">ICAR ePubs 118816</a>.</p>
<p><strong>Research note:</strong> This article summarizes published research. Commercial feed formulation should consider laboratory analysis, animal requirements and qualified nutritional advice.</p>',
    10,
    'published',
    '2021-12-20 10:00:00',
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    summary = EXCLUDED.summary,
    content_body = EXCLUDED.content_body,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- Article 11 (2022): Rice Bran Crude Lecithin (RBCL) in Ruminant Diets
INSERT INTO public.website_knowledge_articles (
    title, slug, category, summary, content_body, display_order, status, published_at, created_at
) VALUES (
    'Rice Bran Crude Lecithin as an Energy Supplement and Rumen Modifier in Calves',
    'rice-bran-crude-lecithin-energy-supplement',
    'Feed Raw Materials',
    'Evaluating rice bran crude lecithin supplementation on nutrient metabolism, ruminal methanogenesis, and blood metabolites in crossbred ruminants.',
    '<h2>Research Overview</h2>
<p>India is the world second-largest producer of rice, generating substantial volumes of rice bran and solvent extraction co-products. Rice bran crude lecithin (RBCL) is an energy-dense phospholipid by-product that represents a low-cost alternative to conventional fats.</p>
<h2>Research Objective</h2>
<p>Researchers at ICAR-IVRI investigated the effects of supplementing rice bran crude lecithin at increasing dietary levels on dry matter intake, nutrient digestibility, ruminal methane production, and serum lipid profiles in growing crossbred calves.</p>
<h2>Key Findings</h2>
<ul>
  <li>Dietary supplementation with RBCL improved energy intake and crude fat (ether extract) digestibility without depressing fiber intake.</li>
  <li>Enteric methane production (L/kg digestible organic matter) decreased in calves receiving lecithin-supplemented diets.</li>
  <li>Serum total lipids, cholesterol, and phospholipid fractions increased within healthy physiological boundaries.</li>
  <li>Digestible energy and metabolizable energy values of the overall concentrate mixture were significantly enhanced.</li>
</ul>
<h2>Practical Relevance for Cattle Feed</h2>
<p>Rice bran crude lecithin can serve as a functional, indigenous energy and emulsifying additive in commercial cattle feed compounding. It improves pellet binding, reduces dust, and provides supplemental phospholipids that support ruminal lipid emulsification.</p>
<h2>Limitations and Application</h2>
<p>Crude lecithin is highly viscous at ambient winter temperatures and requires pre-heating or inline spray application during feed blending. Storage must be monitored for free fatty acid development and oxidative rancidity.</p>
<h2>Original Research Reference</h2>
<p>Tewari, D., Dutta, N., Pattanaik, A. K., and Jadhav, S. E. (2022). Effect of dietary supplementation of rice bran crude lecithin on nutrient metabolism, methanogenesis and metabolic profile of crossbred calves. <em>The Indian Journal of Animal Sciences</em>, 92(5): 585–591. Repository: <a href="https://epubs.icar.org.in/index.php/IJAnS/article/view/124707" target="_blank" rel="noopener noreferrer">ICAR ePubs 124707</a>.</p>
<p><strong>Research note:</strong> This article summarizes published research. Commercial feed formulation should consider laboratory analysis, animal requirements and qualified nutritional advice.</p>',
    11,
    'published',
    '2022-05-15 10:00:00',
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    summary = EXCLUDED.summary,
    content_body = EXCLUDED.content_body,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- Article 12 (2022): Exogenous Fibrolytic and Amylolytic Enzyme Supplementation
INSERT INTO public.website_knowledge_articles (
    title, slug, category, summary, content_body, display_order, status, published_at, created_at
) VALUES (
    'Exogenous Fibrolytic and Amylolytic Enzymes in Low- and Normal-Starch Dairy Diets',
    'exogenous-enzymes-dairy-diets-starch-fiber',
    'Feed Additives',
    'Controlled lactation trial assessing an exogenous enzyme preparation with cellulase, xylanase, and alpha-amylase activities on production performance in cows fed normal- or reduced-starch diets.',
    '<h2>Research Overview</h2>
<p>Roughage quality in India fluctuates dramatically across seasons. Exogenous fibrolytic enzymes (EFE) pre-treat fiber fractions to accelerate ruminal colonization by cellulolytic bacteria, enabling higher energy extraction from fibrous agro-residues and straw.</p>
<h2>Research Objective</h2>
<p>The study evaluated whether supplementing an exogenous enzyme preparation containing concentrated cellulase, xylanase, and amylase improves feed intake, total-tract fiber digestibility, and milk production in cows fed normal-starch versus reduced-starch rations.</p>
<h2>Key Findings</h2>
<ul>
  <li>Enzyme supplementation improved total-tract neutral detergent fiber (NDF) digestibility in dairy cows by over 4 percentage units.</li>
  <li>In reduced-starch rations, enzyme addition restored energy-corrected milk yield to levels comparable with normal-starch control diets.</li>
  <li>Feed efficiency (energy-corrected milk divided by dry matter intake) was significantly improved in enzyme-treated cohorts.</li>
  <li>Ruminal volatile fatty acid production shifted toward higher total concentrations without inducing milk fat depression.</li>
</ul>
<h2>Practical Relevance for Cattle Feed</h2>
<p>Exogenous enzyme cocktails enable compound feed manufacturers to optimize formulations utilizing higher proportions of economical fibrous by-products (such as wheat bran, rice bran, and hulls) without penalizing milk volume or body condition.</p>
<h2>Limitations and Application</h2>
<p>Enzyme activity is heat-sensitive. Pelleting temperatures exceeding 75–80°C in standard feed mill conditioners can denature unprotected enzymes. Formulators must use certified thermostable formulations or apply enzymes post-pelleting.</p>
<h2>Original Research Reference</h2>
<p>Silvestre, F. T., Fetter, M., Räisänen, S. E., Lage, C. F. A., Stefenoni, H., Melgar, A., Cueva, S. F., Wasson, D. E., Martins, L. F., Karnezos, T. P., and Hristov, A. N. (2022). Performance of dairy cows fed normal- or reduced-starch diets supplemented with an exogenous enzyme preparation. <em>Journal of Dairy Science</em>, 105(3): 2288–2300. DOI: <a href="https://doi.org/10.3168/jds.2021-21264" target="_blank" rel="noopener noreferrer">10.3168/jds.2021-21264</a>.</p>
<p><strong>Research note:</strong> This article summarizes published research. Commercial feed formulation should consider laboratory analysis, animal requirements and qualified nutritional advice.</p>',
    12,
    'published',
    '2022-03-10 10:00:00',
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    summary = EXCLUDED.summary,
    content_body = EXCLUDED.content_body,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- Article 13 (2023): Heat-Treated SBM vs. High-Protein DDGS on RUP and Digestibility
INSERT INTO public.website_knowledge_articles (
    title, slug, category, summary, content_body, display_order, status, published_at, created_at
) VALUES (
    'Rumen-Undegradable Protein Optimization: Heat-Treated SBM vs. High-Protein DDGS',
    'heat-treated-sbm-vs-ddgs-rup-digestibility',
    'Dairy Nutrition',
    'Evaluating the replacement of solvent soybean meal with heat-treated bypass soybean meal or high-protein corn distillers grains on amino acid delivery, milk yield, and nitrogen efficiency.',
    '<h2>Research Overview</h2>
<p>Excessive dietary rumen-degradable protein (RDP) leads to ammonia accumulation, energy loss via urea synthesis, and elevated milk urea nitrogen (MUN). Feeding high rumen-undegradable protein (RUP) sources delivers essential amino acids directly to the small intestine.</p>
<h2>Research Objective</h2>
<p>The researchers investigated the replacement of standard solvent-extracted soybean meal with either heat-treated bypass soybean meal (HTSBM) or high-protein corn DDGS on intake, total-tract digestibility, nitrogen partitioning, and milk composition in mid-lactation cows.</p>
<h2>Key Findings</h2>
<ul>
  <li>Both HTSBM and high-protein DDGS increased total post-ruminal flow of digestible essential amino acids.</li>
  <li>Dry matter intake remained steady while milk production and milk true protein yield were sustained or elevated.</li>
  <li>Urinary nitrogen excretion decreased significantly in cows receiving high-RUP feeds, indicating higher systemic nitrogen efficiency.</li>
  <li>Total tract crude protein digestibility was maintained, confirming that heat-treatment did not cause irreversible Maillard reaction binding.</li>
</ul>
<h2>Practical Relevance for Cattle Feed</h2>
<p>Manufacturing premium high-yield cattle feeds requires strict balancing of RDP and RUP fractions. Replacing standard protein meals with high-RUP ingredients lowers overall crude protein requirements from 22% to 20% while delivering equal or superior milk production.</p>
<h2>Limitations and Application</h2>
<p>Over-heating during thermal bypass treatment can cross-link proteins and destroy essential lysine. Formulators must verify acid detergent insoluble crude protein (ADICP) levels (<10% of total CP) to ensure high intestinal digestibility.</p>
<h2>Original Research Reference</h2>
<p>Chesini, R. G., Takiya, C. S., Dias, M. S. S., Silva, T. B. P., Nunes, A. T., Grigoletto, N. T. S., da Silva, G. G., Vittorazzi, P. C., Jr., Rennó, L. N., and Rennó, F. P. (2023). Dietary replacement of soybean meal with heat-treated soybean meal or high-protein corn distillers grains on nutrient digestibility and milk composition in mid-lactation cows. <em>Journal of Dairy Science</em>, 106(1): 233–244. DOI: <a href="https://doi.org/10.3168/jds.2022-21904" target="_blank" rel="noopener noreferrer">10.3168/jds.2022-21904</a>.</p>
<p><strong>Research note:</strong> This article summarizes published research. Commercial feed formulation should consider laboratory analysis, animal requirements and qualified nutritional advice.</p>',
    13,
    'published',
    '2023-01-15 10:00:00',
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    summary = EXCLUDED.summary,
    content_body = EXCLUDED.content_body,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- Article 14 (2024): Rumen-Protected Methionine Under Thermal Heat Stress
INSERT INTO public.website_knowledge_articles (
    title, slug, category, summary, content_body, display_order, status, published_at, created_at
) VALUES (
    'Rumen-Protected Methionine Supplementation Under Heat Stress in Transition Cows',
    'methionine-supplementation-heat-stress-dairy',
    'Dairy Nutrition',
    'Controlled thermal challenge trial investigating rumen-protected methionine supplementation during the pre-calving transition period on cow thermoregulation, metabolic health, and calf birth weight.',
    '<h2>Research Overview</h2>
<p>Summer heat stress in northern and western India severely impacts transition cow welfare, depressing appetite, compromising placental development, and causing severe post-calving milk drops. Dietary methionine plays vital roles in cellular thermotolerance and immune competence.</p>
<h2>Research Objective</h2>
<p>The study examined whether supplementing rumen-protected methionine (RPM) during late gestation under artificially induced thermal stress alters physiological thermoregulation, dry matter intake, metabolic markers, and subsequent calf development.</p>
<h2>Key Findings</h2>
<ul>
  <li>Cows supplemented with RPM maintained higher pre-partum and post-partum dry matter intake under elevated heat index conditions.</li>
  <li>Plasma indicators of liver function and amino acid availability were significantly improved in RPM-supplemented cows.</li>
  <li>Calves born to heat-stressed cows receiving RPM exhibited higher birth weights and superior passive immunity transfer.</li>
  <li>Post-calving energy-corrected milk production recovered more rapidly following the resolution of heat stress events.</li>
</ul>
<h2>Practical Relevance for Cattle Feed</h2>
<p>During the intense summer months in Rajasthan (March–July), incorporating rumen-protected methionine into commercial summer rations acts as a metabolic protectant, counteracting heat-induced immunosuppression and dry matter intake crashes.</p>
<h2>Limitations and Application</h2>
<p>Methionine supplementation cannot overcome inadequate farm ventilation, lack of shade, or water deprivation. Dietary heat mitigation must be integrated with herd cooling and adequate potassium/sodium buffering strategies.</p>
<h2>Original Research Reference</h2>
<p>Davidson, B. D., Zambon, A. A., Guadagnin, A. R., Hoppmann, A., Larsen, G. A., Sherlock, D. N., Luchini, D., Arriola Apelo, S. I., and Laporta, J. (2024). Rumen-protected methionine supplementation during the transition period under artificially induced heat stress: Effects on cow-calf performance. <em>Journal of Dairy Science</em>, 107(10): 8654–8669. DOI: <a href="https://doi.org/10.3168/jds.2024-25028" target="_blank" rel="noopener noreferrer">10.3168/jds.2024-25028</a>.</p>
<p><strong>Research note:</strong> This article summarizes published research. Commercial feed formulation should consider laboratory analysis, animal requirements and qualified nutritional advice.</p>',
    14,
    'published',
    '2024-10-01 10:00:00',
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    summary = EXCLUDED.summary,
    content_body = EXCLUDED.content_body,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- Article 15 (2024): Isoacid Supplementation in Low- and High-Forage Dairy Diets
INSERT INTO public.website_knowledge_articles (
    title, slug, category, summary, content_body, display_order, status, published_at, created_at
) VALUES (
    'Isoacids as Feed Additives for Cellulolytic Bacteria and Milk Fat Synthesis',
    'isoacids-feed-additives-cellulolytic-bacteria-milk-fat',
    'Feed Additives',
    'Evaluating dietary supplementation of branched-chain volatile fatty acids (isoacids) in lactating dairy cows on fiber digestibility, rumen microbial synthesis, and milk fat percentage.',
    '<h2>Research Overview</h2>
<p>Isoacids—consisting of isobutyrate, isovalerate, and 2-methylbutyrate—are branched-chain volatile fatty acids required by ruminal cellulolytic bacteria (such as Ruminococcus albus and Fibrobacter succinogenes) to synthesize branched-chain amino acids and structural membrane lipids.</p>
<h2>Research Objective</h2>
<p>The research assessed how supplementing isoacids in diets formulated with varying forage:concentrate ratios affects nutrient digestibility, rumen fermentation, chewing activity, and milk fatty acid composition in dairy cows.</p>
<h2>Key Findings</h2>
<ul>
  <li>Isoacid supplementation stimulated cellulolytic microbial activity, significantly enhancing total-tract NDF and ADF digestibility.</li>
  <li>Milk fat yield and milk fat percentage were elevated across both low- and high-forage dietary configurations.</li>
  <li>De novo fatty acid synthesis in the mammary gland was enhanced, reflected by increased short- and medium-chain fatty acids in milk.</li>
  <li>Dry matter intake remained stable while feed conversion efficiency toward energy-corrected milk improved.</li>
</ul>
<h2>Practical Relevance for Cattle Feed</h2>
<p>Isoacids represent a high-value feed additive for commercial compound feed manufacturers. Supplementing isoacids in cattle feeds improves the digestion of low-quality crop residues (wheat straw, bajra kadbi) and directly counters seasonal milk fat depression.</p>
<h2>Limitations and Application</h2>
<p>Isoacids possess pungent organoleptic properties. Commercial products are typically formulated as calcium or magnesium salts to minimize volatilization and ensure optimal intake when blended into pelleted feeds.</p>
<h2>Original Research Reference</h2>
<p>Redoy, M. R. A., Ahmed, S., Bonilla Urbina, J. L., Kleinschmit, D. H., Socha, M. T., Salunke, P., and Uddin, M. E. (2024). Supplementation of isoacids to lactating dairy cows fed low- or high-forage diets: Effects on performance, digestibility, and milk fatty acid profile. <em>Journal of Dairy Science</em>, 108(2): 1408–1418. DOI: <a href="https://doi.org/10.3168/jds.2024-25358" target="_blank" rel="noopener noreferrer">10.3168/jds.2024-25358</a>.</p>
<p><strong>Research note:</strong> This article summarizes published research. Commercial feed formulation should consider laboratory analysis, animal requirements and qualified nutritional advice.</p>',
    15,
    'published',
    '2024-11-15 10:00:00',
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    summary = EXCLUDED.summary,
    content_body = EXCLUDED.content_body,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- Article 16 (2025): Medium-Chain Fatty Acids (MCFA) in Transition Dairy Cows
INSERT INTO public.website_knowledge_articles (
    title, slug, category, summary, content_body, display_order, status, published_at, created_at
) VALUES (
    'Medium-Chain Fatty Acid Supplementation Across the Dairy Transition Period',
    'medium-chain-fatty-acids-transition-dairy-cows',
    'Dairy Nutrition',
    'Evaluating medium-chain fatty acid (MCFA) supplementation on pre-partum feed intake, ruminal fermentation parameters, blood metabolites, and early lactation milk output in dairy cows.',
    '<h2>Research Overview</h2>
<p>Medium-chain fatty acids (MCFA; caproic, caprylic, capric, and lauric acids) are rapidly absorbed and metabolized directly in the liver for energy rather than packaged into chylomicrons. Their application in ruminant transition nutrition represents an emerging frontier for energy balancing.</p>
<h2>Research Objective</h2>
<p>The study evaluated the effects of dietary MCFA supplementation administered throughout the periparturient transition period on feed intake dynamics, volatile fatty acid profiles, non-esterified fatty acid (NEFA) concentrations, and post-calving milk production.</p>
<h2>Key Findings</h2>
<ul>
  <li>Cows supplemented with MCFA exhibited reduced plasma NEFA and beta-hydroxybutyrate (BHB) concentrations post-calving, signaling reduced body tissue mobilization.</li>
  <li>Rumen fermentation profiles demonstrated healthy propionate proportions without depressing ruminal acetate.</li>
  <li>Post-partum energy-corrected milk yield increased, accompanied by stabilized dry matter intake curves.</li>
  <li>Liver triglyceride accumulation was minimized, demonstrating hepatoprotective characteristics against fatty liver syndrome.</li>
</ul>
<h2>Practical Relevance for Cattle Feed</h2>
<p>MCFA complexes and specialized calcium salts provide commercial dairy feed mills with high-potency energy sources for transition cow feeds, directly lowering the incidence of subclinical ketosis and hepatic lipidosis.</p>
<h2>Limitations and Application</h2>
<p>Excessive unesterified MCFA levels (>1.5% of total diet) can exert antimicrobial effects on certain rumen microbes and depress palatability. Products should be delivered as protected calcium soaps or encapsulated matrix forms.</p>
<h2>Original Research Reference</h2>
<p>Nishimura, K., Hirabayashi, H., Kawashima, K., Okimura, T., Suzuki, A., Asakuma, S., Isobe, N., Obitsu, T., Kushibiki, S., and Sugino, T. (2025). Effect of medium-chain fatty acid supplementation on feed intake, rumen fermentation, blood profile, and milk production of dairy cows in the transition period. <em>Journal of Dairy Science</em>, 108(4): 4381–4389. DOI: <a href="https://doi.org/10.3168/jds.2024-25808" target="_blank" rel="noopener noreferrer">10.3168/jds.2024-25808</a>.</p>
<p><strong>Research note:</strong> This article summarizes published research. Commercial feed formulation should consider laboratory analysis, animal requirements and qualified nutritional advice.</p>',
    16,
    'published',
    '2025-01-20 10:00:00',
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    summary = EXCLUDED.summary,
    content_body = EXCLUDED.content_body,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- Article 17 (2025): Bioactive Feed Additives for Enteric Methane Mitigation
INSERT INTO public.website_knowledge_articles (
    title, slug, category, summary, content_body, display_order, status, published_at, created_at
) VALUES (
    'Scientific Criteria for Selecting Antimethanogenic Bioactive Feed Additives in Cattle',
    'antimethanogenic-bioactive-feed-additives-selection',
    'Feed Additives',
    'International consensus review outlining screening criteria, bioactivity benchmarks, and ruminal evaluation standards for developing sustainable antimethanogenic feed additives in ruminants.',
    '<h2>Research Overview</h2>
<p>Enteric methane emissions represent a substantial loss of dietary gross energy (2–12%) for dairy cattle, as well as an environmental concern. Developing reliable, non-toxic bioactive feed additives requires rigorous screening against microbial and performance benchmarks.</p>
<h2>Research Objective</h2>
<p>An international consortium of animal nutritionists formulated standardized screening recommendations and selection criteria for identifying natural bioactive compounds (from plant extracts, tannins, essential oils, and macroalgae) that suppress methanogenesis without compromising ruminal digestion.</p>
<h2>Key Findings</h2>
<ul>
  <li>Effective antimethanogenic bioactives must target archaeal methanogens without suppressing cellulolytic bacteria or dry matter intake.</li>
  <li>Dietary energy spared from methane suppression is effectively partitioned into volatile fatty acids (propionate) that support milk production.</li>
  <li>Secondary plant metabolites (condensed tannins, saponins, halogenated compounds) require standardized active ingredient quantification.</li>
  <li>In vitro batch fermentation testing must be validated through long-term continuous culture and animal respiration chamber trials to confirm persistent efficacy.</li>
</ul>
<h2>Practical Relevance for Cattle Feed</h2>
<p>Feed manufacturers can formulate green, climate-smart cattle feeds incorporating verified plant-derived phytogenics and tannins that simultaneously improve feed conversion efficiency and reduce enteric carbon footprint.</p>
<h2>Limitations and Application</h2>
<p>Ruminal microbes frequently adapt to phytogenic additives over 4–6 weeks, causing initial methane reductions to diminish over time. Blends of multiple complementary bioactives are required to prevent microbial resistance.</p>
<h2>Original Research Reference</h2>
<p>Durmic, Z., Duin, E. C., Bannink, A., Belanche, A., Carbone, V., Carro, M. D., Crüsemann, M., et al. (2025). Feed additives for methane mitigation: Recommendations for identification and selection of bioactive compounds to develop antimethanogenic feed additives. <em>Journal of Dairy Science</em>, 108(1): 302–321. DOI: <a href="https://doi.org/10.3168/jds.2024-25045" target="_blank" rel="noopener noreferrer">10.3168/jds.2024-25045</a>.</p>
<p><strong>Research note:</strong> This article summarizes published research. Commercial feed formulation should consider laboratory analysis, animal requirements and qualified nutritional advice.</p>',
    17,
    'published',
    '2025-02-15 10:00:00',
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    summary = EXCLUDED.summary,
    content_body = EXCLUDED.content_body,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- Article 18 (2026): Meta-Analysis on Extended Lactations and Nutritional Management
INSERT INTO public.website_knowledge_articles (
    title, slug, category, summary, content_body, display_order, status, published_at, created_at
) VALUES (
    'Nutritional Dynamics and Production Responses in Extended Dairy Cow Lactations',
    'extended-dairy-lactations-nutritional-dynamics',
    'Dairy Nutrition',
    'Large-scale meta-analysis modeling the effects of extended lactation cycles and specialized nutritional persistency management on milk yield and reproductive longevity in dairy herds.',
    '<h2>Research Overview</h2>
<p>Traditional 305-day lactation cycles with annual calving impose severe metabolic stress during the transition period. Extended lactation strategies (18–24 months) manage high persistency nutrition to minimize metabolic transition frequency while sustaining lifetime herd profitability.</p>
<h2>Research Objective</h2>
<p>The meta-analysis modeled production, fertility, and body condition trajectories across multi-lactation datasets to determine how diet composition, energy persistency, and voluntary waiting periods influence cumulative herd milk yield and metabolic stability.</p>
<h2>Key Findings</h2>
<ul>
  <li>Extended lactation cycles achieved comparable or higher cumulative lifetime milk yields when rations were adjusted for mid-lactation persistency.</li>
  <li>Transition-related metabolic disorder incidence (ketosis, displaced abomasum, milk fever) per productive year was reduced by up to 35%.</li>
  <li>Insemination success rates at first service increased significantly due to fully recovered negative energy balance before breeding.</li>
  <li>Formulation must shift toward balanced glucogenic energy sources to maintain peak persistency without causing excessive late-lactation fattening.</li>
</ul>
<h2>Practical Relevance for Cattle Feed</h2>
<p>Extended lactation models create new opportunities for compound feed mills to produce specialized mid-to-late lactation feeds designed for steady persistency, preventing over-conditioning while maximizing daily milk returns.</p>
<h2>Limitations and Application</h2>
<p>Extended lactation success requires cows with genetic capacity for flat, persistent lactation curves. Animals with steep post-peak declines risk early drying off or excessive fattening on high-density diets.</p>
<h2>Original Research Reference</h2>
<p>Tao, Z., Ellis, J. L., Cant, J. P., Baes, C. F., and DeVries, T. J. (2026). Meta-analysis to predict the effects of extended lactations on milk production and reproductive performance of dairy cows. <em>Journal of Dairy Science</em>. DOI: <a href="https://doi.org/10.3168/jds.2026-29046" target="_blank" rel="noopener noreferrer">10.3168/jds.2026-29046</a>.</p>
<p><strong>Research note:</strong> This article summarizes published research. Commercial feed formulation should consider laboratory analysis, animal requirements and qualified nutritional advice.</p>',
    18,
    'published',
    '2026-03-01 10:00:00',
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    category = EXCLUDED.category,
    summary = EXCLUDED.summary,
    content_body = EXCLUDED.content_body,
    display_order = EXCLUDED.display_order,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- Synchronize serial ID sequence for website_knowledge_articles
SELECT setval(
    pg_get_serial_sequence('public.website_knowledge_articles', 'id'),
    COALESCE((SELECT MAX(id) FROM public.website_knowledge_articles), 1)
);

COMMIT;
