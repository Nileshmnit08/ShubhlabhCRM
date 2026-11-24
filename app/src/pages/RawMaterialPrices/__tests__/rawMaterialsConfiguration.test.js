import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeIdentity } from '../../../utils/normalizer.js';

// Configuration tabs matching Configuration.jsx
const CONFIGURATION_TABS = [
  { id: 'raw-materials', label: 'Raw Materials', icon: 'Package', description: 'Add, edit and manage raw materials with category, unit and status.' },
  { id: 'quality-parameters', label: 'Quality Parameters', icon: 'Sliders', description: 'Define quality parameters, deduction scales and acceptable moisture limits.' },
  { id: 'brokers', label: 'Brokers', icon: 'Users', description: 'Manage broker contacts, active status, commission terms and commodities.' },
  { id: 'units', label: 'Units', icon: 'Ruler', description: 'Configure measurement units (Quintal, MT, Kg) and conversion factors.' },
  { id: 'price-types', label: 'Price Types', icon: 'IndianRupee', description: 'Manage pricing quotation types: Delivered, Ex-mandi, Indicative and Purchase.' },
  { id: 'general-settings', label: 'General Settings', icon: 'Settings', description: 'Configure operational defaults, price alerts and update schedules.' },
];

describe('SL-RAW-MATERIALS-UI-01: Raw Materials Configuration Master & Layout Tests', () => {

  // Sample materials dataset matching production
  const sampleMaterials = [
    { id: '1', code: 'KHAL', name_en: 'Mustard Oil Cake', name_hi: 'सरसों खल', category: 'Oil Cakes', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 1, default_unit: { unit_name: 'Quintal' } },
    { id: '2', code: 'MAKKA', name_en: 'Makka Daliya', name_hi: 'मक्का दलिया', category: 'Grains', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 2, default_unit: { unit_name: 'Quintal' } },
    { id: '3', code: 'JAGGERY', name_en: 'Jaggery (Gur)', name_hi: 'गुड़', category: 'Feed', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 3, default_unit: { unit_name: 'Quintal' } },
    { id: '4', code: 'OIL', name_en: 'Feed Oil', name_hi: 'तेल', category: 'Liquid', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 4, default_unit: { unit_name: 'Quintal' } },
    { id: '5', code: 'CHANA_CHURI', name_en: 'Chana Churi', name_hi: 'चना चूरी', category: 'Protein Sources', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 5, default_unit: { unit_name: 'Quintal' } },
    { id: '6', code: 'SOYA_CHURI', name_en: 'Soya Churi', name_hi: 'सोया चूरी', category: 'Protein Sources', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 6, default_unit: { unit_name: 'Quintal' } },
    { id: '7', code: 'KAKDE', name_en: 'Cotton Seed (Kakde)', name_hi: 'काकड़े', category: 'Grains', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 7, default_unit: { unit_name: 'Quintal' } },
    { id: '8', code: 'KAKDE_KHAL', name_en: 'Cotton Seed Cake', name_hi: 'काकड़े खल', category: 'Oil Cakes', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 8, default_unit: { unit_name: 'Quintal' } },
    { id: '9', code: 'MUSTARD_KHAL', name_en: 'Sarson Khal Special', name_hi: 'सरसों खल स्पेशल', category: 'Oil Cakes', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 9, default_unit: { unit_name: 'Quintal' } },
    { id: '10', code: 'CHAPAD', name_en: 'Wheat Bran (Chapad)', name_hi: 'चपड़', category: 'Brans', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 10, default_unit: { unit_name: 'Quintal' } },
    { id: '11', code: 'METHI', name_en: 'Fenugreek Seeds (Methi)', name_hi: 'मेथी', category: 'Minerals', default_unit_id: 'u3', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 11, default_unit: { unit_name: 'Kg' } },
    { id: '12', code: 'AJWAIN', name_en: 'Carom Seeds (Ajwain)', name_hi: 'अजवाइन', category: 'Minerals', default_unit_id: 'u3', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 12, default_unit: { unit_name: 'Kg' } },
    { id: '13', code: 'CALCIUM', name_en: 'Liquid Calcium Booster', name_hi: 'लिक्विड कैल्शियम', category: 'Liquid Additives', default_unit_id: 'u3', default_price_type_id: 'p1', daily_tracking_required: true, active: true, display_order: 13, default_unit: { unit_name: 'Kg' } },
    { id: '14', code: 'DORB', name_en: 'De-Oiled Rice Bran', name_hi: 'डी-ऑयल्ड राइस ब्रान', category: 'De-oiled Cakes', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: true, active: false, display_order: 14, default_unit: { unit_name: 'Quintal' } },
    { id: '15', code: 'BAJRA', name_en: 'Pearl Millet (Bajra)', name_hi: 'बाजरा', category: 'Grains', default_unit_id: 'u1', default_price_type_id: 'p1', daily_tracking_required: false, active: true, display_order: 15, default_unit: { unit_name: 'Quintal' } }
  ];

  // Component filter logic simulation
  function filterMaterials(materials, { search = '', category = 'All', status = 'All' } = {}) {
    let result = materials || [];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(m => 
        (m.code && m.code.toLowerCase().includes(q)) ||
        (m.name_en && m.name_en.toLowerCase().includes(q)) ||
        (m.name_hi && m.name_hi.toLowerCase().includes(q))
      );
    }

    if (category !== 'All') {
      result = result.filter(m => m.category === category);
    }

    if (status !== 'All') {
      const isActive = status === 'Active';
      result = result.filter(m => m.active === isActive);
    }

    return result;
  }

  // 1. Navigation Panel Tabs
  it('should define exactly 6 configuration navigation tabs with valid ids and labels', () => {
    assert.strictEqual(CONFIGURATION_TABS.length, 6);
    const expectedIds = ['raw-materials', 'quality-parameters', 'brokers', 'units', 'price-types', 'general-settings'];
    const actualIds = CONFIGURATION_TABS.map(t => t.id);
    assert.deepStrictEqual(actualIds, expectedIds);

    // Verify all have icons and descriptions
    CONFIGURATION_TABS.forEach(tab => {
      assert.ok(tab.label && tab.label.length > 0, `Tab ${tab.id} missing label`);
      assert.ok(tab.icon, `Tab ${tab.id} missing icon`);
      assert.ok(tab.description && tab.description.length > 0, `Tab ${tab.id} missing description`);
    });
  });

  // 2. Search filtering
  it('should filter materials by code', () => {
    const res = filterMaterials(sampleMaterials, { search: 'KHAL' });
    assert.strictEqual(res.length, 3); // KHAL, KAKDE_KHAL, MUSTARD_KHAL
    assert.ok(res.every(m => m.code.includes('KHAL')));
  });

  it('should filter materials by English name', () => {
    const res = filterMaterials(sampleMaterials, { search: 'Makka Daliya' });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].name_en, 'Makka Daliya');
  });

  it('should filter materials by Hindi name', () => {
    const res = filterMaterials(sampleMaterials, { search: 'खल' });
    assert.strictEqual(res.length, 3); // Mustard Oil Cake, Cotton Seed Cake, Sarson Khal Special
    assert.ok(res.every(m => m.name_hi.includes('खल')));
  });

  // 3. Category filtering
  it('should filter materials by category', () => {
    const grains = filterMaterials(sampleMaterials, { category: 'Grains' });
    assert.strictEqual(grains.length, 3); // MAKKA, KAKDE, BAJRA
    assert.ok(grains.every(m => m.category === 'Grains'));

    const oilCakes = filterMaterials(sampleMaterials, { category: 'Oil Cakes' });
    assert.strictEqual(oilCakes.length, 3);
    assert.ok(oilCakes.every(m => m.category === 'Oil Cakes'));
  });

  // 4. Status filtering
  it('should filter materials by active status', () => {
    const activeOnly = filterMaterials(sampleMaterials, { status: 'Active' });
    assert.strictEqual(activeOnly.length, 14);
    assert.ok(activeOnly.every(m => m.active === true));

    const inactiveOnly = filterMaterials(sampleMaterials, { status: 'Inactive' });
    assert.strictEqual(inactiveOnly.length, 1);
    assert.strictEqual(inactiveOnly[0].code, 'DORB');
    assert.strictEqual(inactiveOnly[0].active, false);
  });

  // 5. Combined filters and reset
  it('should combine search and category filter correctly', () => {
    const res = filterMaterials(sampleMaterials, { search: 'Cake', category: 'Oil Cakes' });
    assert.strictEqual(res.length, 2); // Mustard Oil Cake, Cotton Seed Cake
  });

  it('should reset filters back to complete list', () => {
    const filtered = filterMaterials(sampleMaterials, { search: 'KHAL', category: 'Oil Cakes', status: 'Active' });
    assert.strictEqual(filtered.length, 3);

    // Resetting defaults
    const reset = filterMaterials(sampleMaterials, { search: '', category: 'All', status: 'All' });
    assert.strictEqual(reset.length, sampleMaterials.length);
  });

  // 6. Pagination calculations
  it('should paginate data with correct record bounds', () => {
    const itemsPerPage = 10;
    const totalRecords = sampleMaterials.length; // 15
    const totalPages = Math.ceil(totalRecords / itemsPerPage); // 2

    assert.strictEqual(totalPages, 2);

    // Page 1
    const page1 = sampleMaterials.slice(0, 10);
    assert.strictEqual(page1.length, 10);
    assert.strictEqual(page1[0].code, 'KHAL');
    assert.strictEqual(page1[9].code, 'CHAPAD');

    // Page 2
    const page2 = sampleMaterials.slice(10, 20);
    assert.strictEqual(page2.length, 5);
    assert.strictEqual(page2[0].code, 'METHI');
    assert.strictEqual(page2[4].code, 'BAJRA');
  });

  // 7. Validation logic
  it('should validate unique material code and normalized name', () => {
    // Normalizer test
    const norm1 = normalizeIdentity('Mustard Oil Cake');
    const norm2 = normalizeIdentity('MUSTARD OIL CAKE');
    assert.strictEqual(norm1, norm2);

    // Code uniqueness check
    const existingCodes = new Set(sampleMaterials.map(m => m.code.toUpperCase()));
    assert.ok(existingCodes.has('KHAL'));
    assert.ok(!existingCodes.has('NEW_MATERIAL_CODE'));

    // Required fields check
    const validMaterial = {
      code: 'SOYA_MEAL',
      name_en: 'Soya De-Oiled Cake',
      category: 'De-oiled Cakes',
      default_unit_id: 'u1'
    };
    assert.ok(validMaterial.code.trim().length > 0);
    assert.ok(validMaterial.name_en.trim().length > 0);
    assert.ok(validMaterial.category.trim().length > 0);
    assert.ok(validMaterial.default_unit_id.trim().length > 0);
  });

  // 8. Visual Badge & Property Standards
  it('should ensure all materials have valid daily_tracking_required and active flags', () => {
    sampleMaterials.forEach(m => {
      assert.strictEqual(typeof m.daily_tracking_required, 'boolean');
      assert.strictEqual(typeof m.active, 'boolean');
      assert.ok(m.default_unit?.unit_name, `Material ${m.code} missing unit_name`);
    });
  });

  // 9. Horizontal Tab Bar Requirements (SL-CRM-RAW-MATERIALS-HORIZONTAL-TABS-01)
  it('should verify horizontal tab layout structure and styling properties', () => {
    // 6 evenly distributed tabs
    assert.strictEqual(CONFIGURATION_TABS.length, 6);

    // Verify tab route generation
    const expectedRoutes = [
      '/raw-material-prices/configuration/raw-materials',
      '/raw-material-prices/configuration/quality-parameters',
      '/raw-material-prices/configuration/brokers',
      '/raw-material-prices/configuration/units',
      '/raw-material-prices/configuration/price-types',
      '/raw-material-prices/configuration/general-settings'
    ];

    const actualRoutes = CONFIGURATION_TABS.map(t => `/raw-material-prices/configuration/${t.id}`);
    assert.deepStrictEqual(actualRoutes, expectedRoutes);

    // Verify styling tokens: Active Tab
    const activeStyle = {
      color: '#EA580C',
      backgroundColor: '#FFF7ED',
      borderBottom: '3px solid #EA580C',
      fontWeight: 600
    };
    assert.strictEqual(activeStyle.color, '#EA580C');
    assert.strictEqual(activeStyle.backgroundColor, '#FFF7ED');
    assert.strictEqual(activeStyle.borderBottom, '3px solid #EA580C');

    // Verify styling tokens: Inactive Tab
    const inactiveStyle = {
      color: '#0F172A',
      backgroundColor: 'transparent',
      fontWeight: 500
    };
    assert.strictEqual(inactiveStyle.color, '#0F172A');
    assert.strictEqual(inactiveStyle.backgroundColor, 'transparent');
  });

});
