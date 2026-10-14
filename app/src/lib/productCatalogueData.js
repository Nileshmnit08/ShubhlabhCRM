/**
 * Authoritative Shubh Labh Product Catalogue Data
 * 
 * Verified against genuine factory formulations and CRM products table.
 * Provides baseline defaults, category/subcategory hierarchy, and specification data.
 */

export const AUTHORITATIVE_CATEGORIES = [
  {
    id: 1,
    name: 'Cattle Feed',
    slug: 'cattle-feed',
    category_badge: 'CATTLE FEED',
    display_order: 1,
    description: 'Scientifically balanced compound pelleted feeds formulated for peak lactation and digestive stability.',
    icon: '🥛'
  },
  {
    id: 2,
    name: 'Nutrition Support',
    slug: 'nutrition-support',
    category_badge: 'NUTRITION SUPPORT',
    display_order: 2,
    description: 'High-density rumen bypass protein, bypass fat, and concentrated transition cow rations.',
    icon: '⚡'
  },
  {
    id: 3,
    name: 'Traditional Feeds',
    slug: 'traditional-feeds',
    category_badge: 'CHURI & DALIYA',
    display_order: 3,
    description: 'Pure, cleaned legume churi, broken pulses, cracked yellow maize, and wholesome wheat daliya.',
    icon: '🌾'
  },
  {
    id: 4,
    name: 'Custom Blends',
    slug: 'custom-blends',
    category_badge: 'SPECIAL MIX',
    display_order: 4,
    description: 'Composite farm rations blending pellets, genuine oil cake (khal), and cotton seeds (kakde).',
    icon: '🌱'
  }
];

export const AUTHORITATIVE_SUBCATEGORIES = [
  {
    id: 1,
    category_id: 1,
    name: 'High-Yield Lactation Feed',
    slug: 'high-yield-lactation',
    description: 'Energy-dense pelleted formulations crafted for peak milk yield and fat retention in high-yielding dairy cattle.',
    display_order: 1
  },
  {
    id: 2,
    category_id: 1,
    name: 'Daily Dairy Rations',
    slug: 'daily-dairy-rations',
    description: 'Balanced daily pelleted feed for consistent lactation, rumen digestion, and body condition maintenance.',
    display_order: 2
  },
  {
    id: 3,
    category_id: 2,
    name: 'Bypass Protein & Fat',
    slug: 'bypass-nutrition',
    description: 'Advanced rumen-protected bypass protein and bypass fat supplements to overcome negative energy balance.',
    display_order: 1
  },
  {
    id: 4,
    category_id: 2,
    name: 'Mash & Transition Concentrates',
    slug: 'mash-transition-mixes',
    description: 'High-protein dry concentrates and traditional hot mash preparation supplements for transition cows and recovery.',
    display_order: 2
  },
  {
    id: 5,
    category_id: 3,
    name: 'Pure Churi & Legume Fractions',
    slug: 'churi-products',
    description: 'Clean, protein-rich pulse fractions including premium Chana Churi and Soya Churi for natural digestion.',
    display_order: 1
  },
  {
    id: 6,
    category_id: 3,
    name: 'Grain Daliya & Energy Fractions',
    slug: 'grain-daliya',
    description: 'Coarsely cracked yellow maize and wheat grain for steady rumen starch fermentation and palatable energy.',
    display_order: 2
  },
  {
    id: 7,
    category_id: 4,
    name: 'Compound Dairy Mixtures',
    slug: 'compound-mixes',
    description: 'Wholesome balanced blends of pellets, oilseed cake (khal), and cotton seeds (kakde) for optimal milk solids.',
    display_order: 1
  },
  {
    id: 8,
    category_id: 4,
    name: 'Traditional Farm Blends',
    slug: 'farm-blends',
    description: 'Convenient dry mixes and lapti preparations formulated for local dairy farming practices across Rajasthan.',
    display_order: 2
  }
];

export const AUTHORITATIVE_PRODUCTS = [
  // 1. High-Yield Lactation Feeds
  {
    id: 1,
    category_id: 1,
    subcategory_id: 1,
    name: 'Shubh Labh Pallet 8000',
    slug: 'pallet-8000',
    short_description: 'Premium high-energy pelleted cattle feed crafted for high-yielding crossbred cows and Murrah buffaloes.',
    full_description: 'Shubh Labh Pallet 8000 is scientifically formulated for high-producing dairy animals producing 15+ liters of milk daily. Enriched with optimal bypass protein, balanced calcium-phosphorus ratio, and essential vitamins to prevent post-calving milk drop and retain peak lactation curve.',
    packaging_desc: 'Standard 50 kg HDPE moisture-proof woven bag',
    pack_sizes: '50 kg Bag',
    is_featured: true,
    status: 'published',
    display_order: 1,
    specifications: {
      'Crude Protein (Min)': '22.0%',
      'Crude Fat (Min)': '4.5%',
      'Crude Fibre (Max)': '10.0%',
      'Total Digestible Nutrients (TDN)': '75%+',
      'Moisture (Max)': '10.0%'
    },
    feeding_guide: 'Feed 400g to 500g of Pallet 8000 per liter of milk produced, alongside 1.5kg for body maintenance, split into morning and evening feedings with adequate green fodder and clean water.',
    seo_title: 'Pallet 8000 Cattle Feed - Shubh Labh Dairy Nutrition',
    seo_description: 'High-energy pelleted cattle feed for peak milk yield and lactation stability in dairy cattle across Rajasthan.'
  },
  {
    id: 2,
    category_id: 1,
    subcategory_id: 1,
    name: 'Shubh Labh Pallet Diamond',
    slug: 'pallet-diamond',
    short_description: 'Top-tier lactation booster pelleted ration designed for maximum milk fat percentage and body condition.',
    full_description: 'Formulated with high digestible starches, rumen buffers, and trace mineral chelates. Pallet Diamond enhances milk density, promotes milk fat synthesis, and minimizes metabolic stress during hot dry weather.',
    packaging_desc: 'Standard 50 kg HDPE moisture-proof woven bag',
    pack_sizes: '50 kg Bag',
    is_featured: true,
    status: 'published',
    display_order: 2,
    specifications: {
      'Crude Protein (Min)': '21.0%',
      'Crude Fat (Min)': '4.2%',
      'Crude Fibre (Max)': '11.0%',
      'Total Digestible Nutrients (TDN)': '73%+',
      'Moisture (Max)': '10.0%'
    },
    feeding_guide: 'Provide 400g per liter of milk yield. Ideal for Murrah buffaloes and high-fat testing dairy cows.',
    seo_title: 'Pallet Diamond Cattle Feed - Shubh Labh',
    seo_description: 'Premium dairy pellet feed engineered for high fat yield, digestive efficiency, and herd longevity.'
  },

  // 2. Daily Dairy Rations
  {
    id: 3,
    category_id: 1,
    subcategory_id: 2,
    name: 'Shubh Labh Pallet Naman',
    slug: 'pallet-naman',
    short_description: 'Balanced daily dairy feed providing ideal digestible energy and protein for everyday milking cattle.',
    full_description: 'Our most trusted everyday pelleted feed. Shubh Labh Pallet Naman maintains consistent milk yield, promotes smooth rumination, and helps cows and buffaloes sustain peak condition through standard lactation cycles.',
    packaging_desc: 'Standard 50 kg HDPE moisture-proof woven bag',
    pack_sizes: '50 kg Bag',
    is_featured: true,
    status: 'published',
    display_order: 3,
    specifications: {
      'Crude Protein (Min)': '19.0%',
      'Crude Fat (Min)': '3.5%',
      'Crude Fibre (Max)': '12.0%',
      'Total Digestible Nutrients (TDN)': '70%+',
      'Moisture (Max)': '10.5%'
    },
    feeding_guide: 'Feed 350g to 400g per liter of milk produced plus 1.0kg baseline maintenance.',
    seo_title: 'Pallet Naman Cattle Feed - Shubh Labh',
    seo_description: 'All-around balanced daily cattle feed pellet for steady milk yield and optimal digestive health.'
  },
  {
    id: 4,
    category_id: 1,
    subcategory_id: 2,
    name: 'Shubh Labh Pallet Gori',
    slug: 'pallet-gori',
    short_description: 'Cost-effective, highly digestible pelleted feed designed for sustained lactation and rural dairy efficiency.',
    full_description: 'Pallet Gori offers balanced energy, palatable grains, and essential minerals tailored for Indian rural dairy management. Suitable for mid-to-late lactation animals and indigenous breeds.',
    packaging_desc: 'Standard 50 kg HDPE moisture-proof woven bag',
    pack_sizes: '50 kg Bag',
    is_featured: false,
    status: 'published',
    display_order: 4,
    specifications: {
      'Crude Protein (Min)': '18.0%',
      'Crude Fat (Min)': '3.0%',
      'Crude Fibre (Max)': '13.0%',
      'Total Digestible Nutrients (TDN)': '68%+',
      'Moisture (Max)': '11.0%'
    },
    feeding_guide: 'Feed 300g to 350g per liter of milk with ad-lib dry and green roughage.',
    seo_title: 'Pallet Gori Cattle Feed - Shubh Labh',
    seo_description: 'Reliable and affordable daily cattle feed pellets for cows and buffaloes across Rajasthan.'
  },
  {
    id: 5,
    category_id: 1,
    subcategory_id: 2,
    name: 'Shubh Labh Pallet Standard',
    slug: 'pallet-shubh-labh',
    short_description: 'Traditional balanced pellet ration delivering dependable nutrition for family farms and commercial sheds.',
    full_description: 'A dependable compound pelleted feed blending ground grains, quality oil meals, and fortified mineral premixes to maintain baseline milk production and herd fertility.',
    packaging_desc: 'Standard 50 kg HDPE moisture-proof woven bag',
    pack_sizes: '50 kg Bag',
    is_featured: false,
    status: 'published',
    display_order: 5,
    specifications: {
      'Crude Protein (Min)': '18.5%',
      'Crude Fat (Min)': '3.2%',
      'Crude Fibre (Max)': '12.5%',
      'Moisture (Max)': '10.5%'
    },
    feeding_guide: 'Feed daily in two split rations mixed with dry fodder or chopped silage.',
    seo_title: 'Shubh Labh Pallet Cattle Feed',
    seo_description: 'Quality standard dairy feed pellet maintaining cattle well-being and milk volume.'
  },

  // 3. Bypass Protein & Fat
  {
    id: 6,
    category_id: 2,
    subcategory_id: 3,
    name: 'Shubh Labh Bypass Pallet',
    slug: 'bypass-pallet',
    short_description: 'Advanced rumen-protected bypass protein feed maximizing intestinal amino acid availability for dairy cows.',
    full_description: 'Engineered with treated high-protein meals that bypass rumen microbial degradation and break down in the abomasum, delivering vital methionine and lysine directly to the bloodstream for superior milk synthesis.',
    packaging_desc: 'Standard 50 kg HDPE moisture-proof woven bag',
    pack_sizes: '50 kg Bag',
    is_featured: true,
    status: 'published',
    display_order: 6,
    specifications: {
      'Crude Protein (Min)': '28.0%',
      'Rumen Bypass Fraction': '65%+',
      'Crude Fat (Min)': '4.0%',
      'Moisture (Max)': '9.5%'
    },
    feeding_guide: 'Top-dress 500g to 1.0kg daily per animal over the regular dairy ration during peak lactation.',
    seo_title: 'Bypass Protein Cattle Feed - Shubh Labh Bypass Pallet',
    seo_description: 'Advanced rumen bypass protein pellets for high-yielding dairy cattle.'
  },
  {
    id: 7,
    category_id: 2,
    subcategory_id: 3,
    name: 'Shubh Labh ByPassFat',
    slug: 'bypass-fat',
    short_description: 'Fractionated rumen-inert energy supplement designed to counteract negative energy balance in early lactation.',
    full_description: 'Pure rumen-bypass palm fatty acid calcium salts providing 8,500+ kcal/kg of dense energy without disrupting rumen fermentation. Prevents body score depletion and accelerates post-calving re-breeding.',
    packaging_desc: '25 kg & 50 kg moisture-proof packaging',
    pack_sizes: '25 kg, 50 kg Bag',
    is_featured: true,
    status: 'published',
    display_order: 7,
    specifications: {
      'Total Fat Content (Min)': '84.0%',
      'Energy Density': '8,500 kcal/kg',
      'Calcium (Ca)': '8.0 - 9.5%',
      'Moisture (Max)': '4.0%'
    },
    feeding_guide: 'Administer 100g to 200g daily from 15 days before calving up to 90 days post-calving mixed evenly with the morning concentrate.',
    seo_title: 'ByPassFat Dairy Energy Booster - Shubh Labh',
    seo_description: 'Rumen-inert bypass fat supplement promoting early lactation energy recovery and reproductive vitality.'
  },

  // 4. Mash & Transition Concentrates
  {
    id: 8,
    category_id: 2,
    subcategory_id: 4,
    name: 'Mix Sukha Powder Base',
    slug: 'mix-sukha-powder-base',
    short_description: 'Concentrated dry powder supplement for mixing with local chopped fodder, grains, and agricultural byproducts.',
    full_description: 'A nutrient-dense dry meal concentrate supplying essential protein, vitamins, organic trace minerals, and calcium. Blends uniformly with farm-mixed daliya and roughage.',
    packaging_desc: '50 kg woven bag',
    pack_sizes: '50 kg Bag',
    is_featured: false,
    status: 'published',
    display_order: 8,
    specifications: {
      'Crude Protein (Min)': '24.0%',
      'Crude Fat (Min)': '4.0%',
      'Calcium': '3.0%',
      'Phosphorus': '1.2%'
    },
    feeding_guide: 'Incorporate at 15-20% ratio into farm grain mixtures.',
    seo_title: 'Mix Sukha Powder Base Cattle Feed - Shubh Labh',
    seo_description: 'Concentrated dry powder feed base for customized on-farm dairy rations.'
  },
  {
    id: 9,
    category_id: 2,
    subcategory_id: 4,
    name: 'Shubh Labh Mix - Lapti',
    slug: 'mix-lapti',
    short_description: 'Wholesome cooked-mash concentrate tailored for traditional dairy preparation and post-calving care.',
    full_description: 'Specially formulated for traditional Indian "lapti" preparation (warm boiled feed). Gentle on the digestive tract, accelerates uterine cleansing post-calving, and stimulates hearty appetite.',
    packaging_desc: '50 kg woven bag',
    pack_sizes: '50 kg Bag',
    is_featured: false,
    status: 'published',
    display_order: 9,
    specifications: {
      'Crude Protein (Min)': '18.0%',
      'Energy / Digestible Carbs': 'High',
      'Digestive Herbs / Jeera/Methi': 'Fortified',
      'Moisture (Max)': '10.0%'
    },
    feeding_guide: 'Boil with water into a thick warm porridge (lapti) and feed once daily in the evening, especially during colder months and post-calving recovery.',
    seo_title: 'Mix Lapti Cattle Feed - Shubh Labh',
    seo_description: 'Nutritional mash preparation feed for transition cows and convalescing dairy animals.'
  },

  // 5. Compound Mixtures
  {
    id: 10,
    category_id: 4,
    subcategory_id: 7,
    name: 'Mix Pallet + Khal + Kakde',
    slug: 'mix-pallet-khal-kakde',
    short_description: 'Complete composite ration combining nutritious pellets, pure mustard/cottonseed oil cake, and whole cotton seeds.',
    full_description: 'Combines the convenience of pelleted vitamins with the proven traditional milk-fat boosting benefits of genuine mustard cake (khal) and whole cottonseed (kakde). Popular with progressive milk producers seeking peak fat testing.',
    packaging_desc: 'Standard 50 kg HDPE woven bag',
    pack_sizes: '50 kg Bag',
    is_featured: true,
    status: 'published',
    display_order: 10,
    specifications: {
      'Crude Protein (Min)': '23.0%',
      'Crude Fat (Min)': '5.5%',
      'Real Cottonseed & Khal': 'Included',
      'Moisture (Max)': '9.5%'
    },
    feeding_guide: 'Soak in water 2 hours before feeding or provide directly. Feed 2kg to 3.5kg daily according to milk production volume.',
    seo_title: 'Pallet Khal Kakde Mix - Shubh Labh',
    seo_description: 'Premium composite dairy feed with real oil cake and cottonseed for maximum milk fat.'
  },

  // 6. Pure Churi & Legume Fractions
  {
    id: 11,
    category_id: 3,
    subcategory_id: 5,
    name: 'Shubh Labh Chana Churi',
    slug: 'chana-churi',
    short_description: 'Unadulterated premium Bengal gram husk and split pulse fraction, rich in natural digestible protein.',
    full_description: 'Selected from pure chickpea milling streams. Free from dust and stones, providing sweet palatability and digestible crude fiber for rumen microflora stimulation.',
    packaging_desc: '50 kg clean jute/poly bag',
    pack_sizes: '50 kg Bag',
    is_featured: false,
    status: 'published',
    display_order: 11,
    specifications: {
      'Crude Protein (Min)': '16.5%',
      'Crude Fibre': '18.0%',
      'Moisture (Max)': '10.0%'
    },
    feeding_guide: 'Mix 1kg to 2kg daily with regular feed to increase palatability and natural pulse protein.',
    seo_title: 'Pure Chana Churi - Shubh Labh',
    seo_description: 'Natural high-protein Bengal gram pulse fraction for dairy cattle nutrition.'
  },
  {
    id: 12,
    category_id: 3,
    subcategory_id: 5,
    name: 'Shubh Labh Soya Churi',
    slug: 'soya-churi',
    short_description: 'High-protein dehulled soybean meal fraction providing concentrated natural amino acids.',
    full_description: 'Derived from selected non-GMO soybean processing. Delivers 38%+ crude protein to upgrade low-protein green fodder and wheat straw diets.',
    packaging_desc: '50 kg woven bag',
    pack_sizes: '50 kg Bag',
    is_featured: false,
    status: 'published',
    display_order: 12,
    specifications: {
      'Crude Protein (Min)': '38.0%',
      'Crude Fat': '1.5%',
      'Moisture (Max)': '11.0%'
    },
    feeding_guide: 'Feed 300g to 700g daily per animal mixed thoroughly with grain daliya.',
    seo_title: 'Pure Soya Churi - Shubh Labh',
    seo_description: 'High-protein soy byproduct for intensive commercial dairy herds.'
  },

  // 7. Grain Daliya & Energy Fractions
  {
    id: 13,
    category_id: 3,
    subcategory_id: 6,
    name: 'Shubh Labh Makka Daliya',
    slug: 'makka-daliya',
    short_description: 'Clean, uniformly cracked yellow maize delivering pure bypass starch and sustained glucose precursors.',
    full_description: 'Mechanically cleaned and sized into uniform grits. Promotes controlled rumen fermentation without the risk of lactic acidosis associated with fine corn meal.',
    packaging_desc: '50 kg moisture-proof bag',
    pack_sizes: '50 kg Bag',
    is_featured: false,
    status: 'published',
    display_order: 13,
    specifications: {
      'Starch Content (Min)': '65.0%',
      'Crude Protein': '8.5%',
      'Dust & Impurities': '< 0.5%',
      'Moisture (Max)': '11.0%'
    },
    feeding_guide: 'Combine 1kg to 2kg daily with protein feeds for balanced energy-protein ratio.',
    seo_title: 'Makka Daliya (Cracked Corn) - Shubh Labh',
    seo_description: 'Clean mechanical-grade yellow maize daliya for dairy energy feeding.'
  },
  {
    id: 14,
    category_id: 3,
    subcategory_id: 6,
    name: 'Shubh Labh Wheat Daliya',
    slug: 'wheat-daliya',
    short_description: 'Coarsely crushed whole wheat grain supplying highly digestible energy, B-complex vitamins, and phosphorus.',
    full_description: 'Pure food-grade wheat cracked for livestock feeding. Blends effortlessly into daily morning and evening dairy feeds.',
    packaging_desc: '50 kg bag',
    pack_sizes: '50 kg Bag',
    is_featured: false,
    status: 'published',
    display_order: 14,
    specifications: {
      'Crude Protein': '11.5%',
      'Digestible Energy': 'High',
      'Moisture (Max)': '11.5%'
    },
    feeding_guide: 'Soak or boil slightly before feeding with churi and pellets.',
    seo_title: 'Pure Wheat Daliya - Shubh Labh',
    seo_description: 'Coarse cracked wheat grain for balanced dairy energy supplementation.'
  }
];

/**
 * Helper to retrieve full product details by slug
 */
export function getProductBySlug(slug, productsList = AUTHORITATIVE_PRODUCTS) {
  if (!slug) return null;
  const normalized = slug.toLowerCase().trim();
  return productsList.find((p) => p.slug.toLowerCase() === normalized) || null;
}

/**
 * Helper to retrieve products by category slug
 */
export function getProductsByCategorySlug(categorySlug, categories = AUTHORITATIVE_CATEGORIES, products = AUTHORITATIVE_PRODUCTS) {
  const cat = categories.find((c) => c.slug === categorySlug);
  if (!cat) return [];
  return products.filter((p) => p.category_id === cat.id);
}
