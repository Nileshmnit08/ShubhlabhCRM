/**
 * Authoritative In-House Laboratory & Quality Assurance Data
 * Shubh Labh Cattle Feed & Dairy Nutrition
 * 
 * Provides verified testing workflows, proximate analysis parameters,
 * laboratory equipment details, and quality assurance standards.
 */

export const LAB_OVERVIEW = {
  hero_title: 'Precision Nutrition. Scientific Quality Control.',
  hero_subtitle: 'Inside the Shubh Labh In-House Feed & Grain Analysis Laboratory',
  hero_eyebrow: 'EVIDENCE-BASED DAIRY QUALITY',
  lead_text: 'At Shubh Labh, quality is not an afterthought—it is formulated into every bag. Our dedicated in-house quality control laboratory operates at our manufacturing facility, subjecting all incoming raw grains, oilseed meals, and finished cattle feed pellets to multi-stage analytical screening.',
  philosophy: 'We believe Indian dairy farmers deserve feed with guaranteed, verified nutritional density. By combining rapid NIR spectroscopy with standard wet-chemistry reference methods, we ensure every batch meets exact protein, fat, fiber, and safety thresholds before leaving our plant gates.',
  stats: [
    { label: 'Raw Material Testing', value: '100%', detail: 'Every truckload of grain & meal inspected on arrival' },
    { label: 'Aflatoxin B1 Safe Limit', value: '< 20 ppb', detail: 'Strict mycotoxin screening protecting cattle health' },
    { label: 'NIR Precision Analysis', value: '± 0.2%', detail: 'Rapid multi-parameter spectrophotometric tracking' },
    { label: 'Sample Retention Policy', value: '90 Days', detail: 'Complete batch sample library maintained for full provenance' }
  ]
};

export const LAB_WORKFLOW_STEPS = [
  {
    id: 1,
    step_number: '01',
    title: 'Inbound Raw Material Sampling & Inspection',
    phase: 'Intake Inspection',
    description: 'Grain and meal truckloads are sampled across multiple grid depths using mechanical core samplers. Raw materials are immediately screened for moisture, physical purity, broken grain percentage, and foreign matter.',
    quality_check: 'Materials exceeding standard moisture (> 12%) or showing signs of pest damage or spoilage are rejected at the gate.',
    icon: 'Truck'
  },
  {
    id: 2,
    step_number: '02',
    title: 'Laboratory Sample Milling & Homogenization',
    phase: 'Sample Preparation',
    description: 'Representative intake samples undergo standardized reduction and are milled through a 1 mm cyclone screen mill. Fine homogenization guarantees uniform particle distribution for highly reproducible analytical results.',
    quality_check: 'Sub-samples are split using a Boerner divider into primary analysis lots and archive reference lots.',
    icon: 'RotateCw'
  },
  {
    id: 3,
    step_number: '03',
    title: 'Rapid NIR Spectroscopy Screening',
    phase: 'Spectrometric Scan',
    description: 'Near-Infrared (NIR) reflectance spectrophotometry provides instant, non-destructive analysis across key nutritional parameters: Dry Matter, Crude Protein, Crude Fat, and Starch within 90 seconds.',
    quality_check: 'NIR calibrations are continuously benchmarked against standard wet-chemistry reference determinations.',
    icon: 'Activity'
  },
  {
    id: 4,
    step_number: '04',
    title: 'Wet-Chemistry Reference Validation',
    phase: 'Chemical Quantification',
    description: 'Daily wet-chemical analysis validates protein content via Micro-Kjeldahl nitrogen digestion, crude fat via automated Soxhlet solvent extraction, and crude fiber via sequential acid-alkali digestion.',
    quality_check: 'All reagents and standard volumetric solutions are prepared and titrated in-house under strict temperature controls.',
    icon: 'FlaskConical'
  },
  {
    id: 5,
    step_number: '05',
    title: 'In-Process Pellet & Conditioning Audits',
    phase: 'Manufacturing QA',
    description: 'During pelleting, continuous quality audits measure steam conditioning temperature (75–82°C), pellet durability index (PDI), hardness, moisture retention, and cooling deck temperatures.',
    quality_check: 'Ensures pellets resist mechanical handling breakdown and deliver dust-free, highly palatable feed to cattle.',
    icon: 'Layers'
  },
  {
    id: 6,
    step_number: '06',
    title: 'Final Batch Clearance & Lot Traceability',
    phase: 'Release & Archiving',
    description: 'Only batches meeting 100% of labeled specification targets receive QA clearance. Every finished lot is assigned an encoded batch ID, and representative sealed archive bags are retained in our sample vault.',
    quality_check: 'Enables complete end-to-end trace-back from dealer bags to incoming grain lots and batch mixing logs.',
    icon: 'ShieldCheck'
  }
];

export const LAB_TESTING_PARAMETERS = [
  {
    id: 1,
    parameter_name: 'Crude Protein (CP)',
    parameter_code: 'CP',
    category: 'Nutritional Density',
    standard_method: 'Micro-Kjeldahl Nitrogen Digestion (N × 6.25) & NIR',
    typical_range: '18.0% – 24.0% (Feed Dependent)',
    importance: 'Essential for rumen microbial protein synthesis, lactation curve stability, and milk protein yield.',
    significance: 'Critical indicator of nitrogenous nutrition. Prevents metabolic muscle wasting in high-producing dairy cows.',
    display_order: 1
  },
  {
    id: 2,
    parameter_name: 'Crude Fat / Ether Extract (EE)',
    parameter_code: 'EE',
    category: 'Nutritional Density',
    standard_method: 'Automated Soxhlet Petroleum Ether Extraction',
    typical_range: '3.5% – 5.5% (Up to 99% in ByPassFat)',
    importance: 'High-density energy source that supports milk fat percentage and replenishes energy in early lactation.',
    significance: 'Supplies essential fatty acids without causing rumen lactic acidosis or disturbing fiber digestion.',
    display_order: 2
  },
  {
    id: 3,
    parameter_name: 'Crude Fiber (CF)',
    parameter_code: 'CF',
    category: 'Digestive Balance',
    standard_method: 'Sequential Dilute Acid & Alkali Digestion',
    typical_range: '8.0% – 12.0% Maximum',
    importance: 'Maintains optimal rumen motility, rumination chewing time, and acetate production for milk fat.',
    significance: 'Guarantees the feed provides adequate structural fiber without diluting the energy density of the ration.',
    display_order: 3
  },
  {
    id: 4,
    parameter_name: 'Moisture Content',
    parameter_code: 'MC',
    category: 'Safety & Storage',
    standard_method: 'Thermal Desiccation Oven (105°C) & Digital Halogen Balance',
    typical_range: '< 10.5% (Max 11.0%)',
    importance: 'Guarantees shelf life, preserves natural grain freshness, and prevents fungal proliferation during storage.',
    significance: 'Ensures farmers pay for concentrated feed nutrition rather than excess water weight.',
    display_order: 4
  },
  {
    id: 5,
    parameter_name: 'Total Ash & Acid Insoluble Ash (Silica)',
    parameter_code: 'AIA',
    category: 'Purity & Minerals',
    standard_method: 'Muffle Furnace Ashing (550°C) followed by 5N HCl Extraction',
    typical_range: 'Total Ash < 8.5%, AIA (Silica) < 2.0%',
    importance: 'Measures purity from sand, dust, and non-nutritive soil contaminants.',
    significance: 'Low silica guarantees pure, clean legume meals and grains free from abrasive soil minerals.',
    display_order: 5
  },
  {
    id: 6,
    parameter_name: 'Aflatoxin B1 Mycotoxin Screening',
    parameter_code: 'AFB1',
    category: 'Safety & Storage',
    standard_method: 'Rapid Immunochromatographic Lateral Flow & Fluorometry',
    typical_range: '< 20 ppb (Safety Cut-off)',
    importance: 'Toxic mold metabolite screening to protect dairy animal liver function and prevent milk contamination.',
    significance: 'Zero tolerance for mold-damaged raw materials ensures clean, safe milk for consumer health.',
    display_order: 6
  },
  {
    id: 7,
    parameter_name: 'Calcium & Phosphorus Ratio (Ca:P)',
    parameter_code: 'Ca:P',
    category: 'Purity & Minerals',
    standard_method: 'Complexometric EDTA Titration & Colorimetric Spectrophotometry',
    typical_range: 'Balanced 2.0 : 1.0 (Ca 1.0%–1.5%, P 0.5%–0.8%)',
    importance: 'Critical for skeletal integrity, milk calcium replenishment, and avoiding hypocalcemia (milk fever).',
    significance: 'Maintains ideal reproductive health, regular estrus cycles, and prevents calcium-phosphorus locks.',
    display_order: 7
  },
  {
    id: 8,
    parameter_name: 'Pellet Durability Index (PDI)',
    parameter_code: 'PDI',
    category: 'Physical Quality',
    standard_method: 'Mechanical Tumbling Box Test (10 Minutes @ 50 RPM)',
    typical_range: '> 92.0% – 95.0%',
    importance: 'Measures mechanical resistance to shattering and crumbling during transit and bulk handling.',
    significance: 'High PDI ensures cattle consume uniform pellets instead of sorting out fine dust.',
    display_order: 8
  }
];

export const LAB_EQUIPMENT = [
  {
    id: 1,
    name: 'NIR Feed & Grain Spectrophotometer',
    model_type: 'Near-Infrared Reflectance Analyzer',
    purpose: 'Rapid non-destructive proximate analysis for incoming grain and finished pellets within 90 seconds.',
    specs: 'Wavelength spectrum: 1100–2500 nm; Multi-parameter simultaneous quantification.',
    significance: 'Allows immediate acceptance or rejection of raw material delivery trucks before unloading.',
    icon: 'Radio'
  },
  {
    id: 2,
    name: 'Automated Kjeldahl Protein Digestion & Distillation System',
    model_type: 'Micro-Kjeldahl Nitrogen Analyzer',
    purpose: 'Gold standard wet-chemistry reference testing for Crude Protein (CP) quantification.',
    specs: 'Aluminum heating block digestion with automated steam distillation and colorimetric endpoint titration.',
    significance: 'Provides legal reference verification for all declared feed protein levels.',
    icon: 'Beaker'
  },
  {
    id: 3,
    name: 'Automated Soxhlet Fat Extraction System',
    model_type: 'Solvent Recovery Ether Extract Unit',
    purpose: 'Accurate determination of crude fat and lipid density in oil meals, daliya, and finished pellets.',
    specs: 'Multi-chamber reflux extraction with 90%+ closed-loop solvent recovery.',
    significance: 'Validates optimal energy levels in lactation booster formulations.',
    icon: 'Droplets'
  },
  {
    id: 4,
    name: 'Raw & Detergent Fiber Analyzer',
    model_type: 'Sequential Hot Extraction Unit',
    purpose: 'Measures crude fiber, acid detergent fiber (ADF), and neutral detergent fiber (NDF).',
    specs: 'Acid/alkali digestion vessels with built-in filtration and wash nozzles.',
    significance: 'Ensures optimal rumen stimulation without unneeded bulk or low-digestibility residue.',
    icon: 'Filter'
  },
  {
    id: 5,
    name: 'Digital Halogen Moisture Balance & Precision Scale',
    model_type: 'High-Speed Loss-On-Drying Analyzer',
    purpose: 'Rapid moisture tracking of wet grains, dry mash, and freshly extruded pellets.',
    specs: 'Readability: 0.001g (0.01% moisture); Uniform circular halogen thermal chamber.',
    significance: 'Guarantees pellet moisture is safely below mold development thresholds.',
    icon: 'Gauge'
  },
  {
    id: 6,
    name: 'Microprocessor Laboratory Muffle Furnace',
    model_type: 'High-Temperature Incinerator (up to 1200°C)',
    purpose: 'Ashing of feed samples to quantify total mineral matter and acid-insoluble ash (silica).',
    specs: 'Controlled PID ramp heating to 550°C with ceramic fiber chamber.',
    significance: 'Ensures feeds are completely free from dirt, sand, and abrasive ground contaminants.',
    icon: 'Flame'
  },
  {
    id: 7,
    name: 'Holmen-Style Pellet Durability (PDI) Tester',
    model_type: 'Pneumatic / Mechanical Tumbling Chamber',
    purpose: 'Measures pellet hardness and resistance to mechanical degradation during transport.',
    specs: 'Standardized tumbling drum simulating rough road transport conditions across rural Rajasthan.',
    significance: 'Guarantees durable, clean pellets that feed cleanly through rural feeders.',
    icon: 'Shield'
  },
  {
    id: 8,
    name: 'Rapid Fluorometric Mycotoxin Test Station',
    model_type: 'Quantitative Lateral Flow Reader',
    purpose: 'Routine batch testing for Aflatoxin B1 and related mycotoxins in oilseed cakes and corn.',
    specs: 'ppb-level quantification with competitive antibody-antigen binding assay.',
    significance: 'Prevents contaminated grains from ever entering the factory production stream.',
    icon: 'ShieldAlert'
  }
];

export const LAB_QA_POLICIES = [
  {
    title: 'Strict Supplier Verification',
    description: 'Raw material suppliers are pre-audited. Each inbound lot must be accompanied by quality certifications and undergo gate inspection before weighbridge clearance.'
  },
  {
    title: 'Daily Equipment Calibration',
    description: 'All analytical balances, spectrophotometers, and thermometers are calibrated daily against certified reference weights and NIST-traceable standard solutions.'
  },
  {
    title: '90-Day Sample Retention Vault',
    description: 'Sealed, moisture-protected archive bags of every manufactured batch are preserved in our climate-controlled archive room for the entire product shelf-life.'
  },
  {
    title: 'Transparent Reporting for Farmers',
    description: 'Dealers and commercial dairy farms can request batch-specific Certificates of Analysis (COA) corresponding to the lot number printed on their feed bags.'
  }
];

export const LAB_FAQS = [
  {
    q: 'How does in-house testing benefit dairy farmers?',
    a: 'Unlike unbranded or unorganized feed makers who rely on visual inspection, Shubh Labh tests every incoming grain and finished pellet. This guarantees that your cows receive consistent protein, fat, and minerals in every bag, preventing unexpected drops in milk yield or fat testing.'
  },
  {
    q: 'What is Aflatoxin and why is testing for it so important?',
    a: 'Aflatoxins are toxic byproducts of mold (Aspergillus) that can grow on poorly stored maize, groundnut, or cotton cake. Feeding aflatoxin-contaminated feed severely damages a cow’s liver, reduces milk output, causes reproductive failure, and can pass into milk. Our < 20 ppb safe-limit screening guarantees clean feed.'
  },
  {
    q: 'Can progressive dairy farmers get their fodder or raw feed ingredients tested?',
    a: 'Yes! We support our dealer network and commercial dairy partners with advisory feed testing. Contact our laboratory helpline to understand sample collection guidelines and analysis availability.'
  },
  {
    q: 'What is the Pellet Durability Index (PDI)?',
    a: 'PDI measures how well a pellet stays intact during transport and handling. A high PDI (> 92%) ensures that when you open a 50 kg bag, it is filled with firm, clean pellets rather than powdered dust, ensuring your animals receive the intended balance of nutrients.'
  }
];
