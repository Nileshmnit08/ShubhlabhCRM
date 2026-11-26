import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseProductWeight,
  calculateItemTotalWeightKg,
  calculateItemWeightDetails,
  formatItemQtyAndWeight,
  normalizeRequirementItem,
  getCanonicalRequirementItems,
  formatCompatibleUnitTotals,
  getDistinctProductNames
} from '../canonicalRequirements.js';

test('1. parseProductWeight: extracts bag weight from explicit number or name suffix', () => {
  // Direct explicit weight
  assert.deepEqual(parseProductWeight('Dry Mix', 40), { productName: 'Dry Mix', bagWeight: 40 });
  assert.deepEqual(parseProductWeight('Dry Mix (40 kg)', 50), { productName: 'Dry Mix', bagWeight: 50 }, 'explicit wins over suffix');
  
  // Suffix parsing
  assert.deepEqual(parseProductWeight('Shubh Labh (45 kg)', null), { productName: 'Shubh Labh', bagWeight: 45 });
  assert.deepEqual(parseProductWeight('Diamond (50kg)', undefined), { productName: 'Diamond', bagWeight: 50 });
  assert.deepEqual(parseProductWeight('Makka Daliya ( 60  KG )', ''), { productName: 'Makka Daliya', bagWeight: 60 });

  // No weight
  assert.deepEqual(parseProductWeight('Chana Churi', null), { productName: 'Chana Churi', bagWeight: null });
  assert.deepEqual(parseProductWeight(null, null), { productName: 'Feed', bagWeight: null });
});

test('2. calculateItemTotalWeightKg: mathematical conversion by unit', () => {
  // MT conversion (1 MT = 1,000 KG)
  assert.equal(calculateItemTotalWeightKg(10, 'MT', null), 10000);
  assert.equal(calculateItemTotalWeightKg(3, 'MT', 40), 3000, 'MT uses MT conversion');
  
  // Quintal conversion (1 Qtl = 100 KG)
  assert.equal(calculateItemTotalWeightKg(5, 'Qtl', null), 500);

  // KG
  assert.equal(calculateItemTotalWeightKg(250, 'KG', null), 250);

  // Bags with packaging weight
  assert.equal(calculateItemTotalWeightKg(100, 'Bags', 40), 4000);
  assert.equal(calculateItemTotalWeightKg(75, 'Bags', 50), 3750);

  // Bags without packaging weight (never guesses 50 kg)
  assert.equal(calculateItemTotalWeightKg(100, 'Bags', null), null);
  assert.equal(calculateItemTotalWeightKg(0, 'Bags', 40), null);
});

test('3. formatItemQtyAndWeight: clear UI formatting', () => {
  // Bags with weight and total
  const bagItem = { quantity: 100, unit: 'Bags', bag_weight: 40, total_weight_kg: 4000 };
  const formattedBags = formatItemQtyAndWeight(bagItem);
  assert.equal(formattedBags.primary, '100 Bags');
  assert.equal(formattedBags.weightSub, '(40 kg/bag • 4,000 kg)');
  assert.equal(formattedBags.fullLabel, '100 Bags (40 kg/bag • 4,000 kg)');

  // MT item
  const mtItem = { quantity: 3, unit: 'MT', bag_weight: null, total_weight_kg: 3000 };
  const formattedMT = formatItemQtyAndWeight(mtItem);
  assert.equal(formattedMT.primary, '3 MT');
  assert.equal(formattedMT.weightSub, '(3,000 kg)');

  // Bags without weight
  const plainItem = { quantity: 70, unit: 'Bags', bag_weight: null, total_weight_kg: null };
  const formattedPlain = formatItemQtyAndWeight(plainItem);
  assert.equal(formattedPlain.primary, '70 Bags');
  assert.equal(formattedPlain.weightSub, null);
  assert.equal(formattedPlain.fullLabel, '70 Bags');
});

test('4. getCanonicalRequirementItems: multi-product order from Order App / Field Assist / CRM', () => {
  // Yashika Agro Industries D-302 order
  const orderReq = {
    id: 'req-yashika',
    demand_ref: 'D-302',
    unit: 'Bags', // Header default
    requirement_items: [
      { id: 'item-1', product_name: 'Chana Churi', quantity: 3, unit: 'MT', weight: 40, category: 'Churi' },
      { id: 'item-2', product_name: 'Dry Mix', quantity: 5, unit: 'MT', weight: 40, category: 'Mix' },
      { id: 'item-3', product_name: 'Lapti Mix', quantity: 2, unit: 'MT', weight: 40, category: 'Mix' },
    ]
  };

  const canonical = getCanonicalRequirementItems(orderReq);
  assert.equal(canonical.length, 3);

  assert.equal(canonical[0].product_name, 'Chana Churi');
  assert.equal(canonical[0].quantity, 3);
  assert.equal(canonical[0].unit, 'MT');
  assert.equal(canonical[0].total_weight_kg, 3000);

  assert.equal(canonical[1].product_name, 'Dry Mix');
  assert.equal(canonical[1].quantity, 5);
  assert.equal(canonical[1].unit, 'MT');
  assert.equal(canonical[1].total_weight_kg, 5000);

  assert.equal(canonical[2].product_name, 'Lapti Mix');
  assert.equal(canonical[2].quantity, 2);
  assert.equal(canonical[2].unit, 'MT');
  assert.equal(canonical[2].total_weight_kg, 2000);
});

test('5. getCanonicalRequirementItems: legacy requirement with no requirement_items', () => {
  const legacyReq = {
    id: 'req-legacy',
    demand_ref: 'D-005',
    product_type: 'Shubh Labh (45 kg)',
    quantity: 80,
    unit: 'Bags',
    requirement_items: []
  };

  const canonical = getCanonicalRequirementItems(legacyReq);
  assert.equal(canonical.length, 1);
  assert.equal(canonical[0].product_name, 'Shubh Labh');
  assert.equal(canonical[0].quantity, 80);
  assert.equal(canonical[0].unit, 'Bags');
  assert.equal(canonical[0].bag_weight, 45);
  assert.equal(canonical[0].total_weight_kg, 3600);
  assert.equal(canonical[0].is_fallback_header, true);
});

test('6. formatCompatibleUnitTotals: prevents invalid unit aggregation', () => {
  // Only Bags
  const bags = [
    { product_name: 'Diamond', quantity: 50, unit: 'Bags' },
    { product_name: 'Naman', quantity: 15, unit: 'Bags' }
  ];
  assert.equal(formatCompatibleUnitTotals(bags), '65 Bags');

  // Only MT
  const mts = [
    { product_name: 'Chana Churi', quantity: 3, unit: 'MT' },
    { product_name: 'Dry Mix', quantity: 5, unit: 'MT' }
  ];
  assert.equal(formatCompatibleUnitTotals(mts), '8 MT');

  // Mixed Bags + MT
  const mixed = [...bags, ...mts];
  assert.equal(formatCompatibleUnitTotals(mixed), '65 Bags + 8 MT');
});

test('7. getDistinctProductNames: returns unique product names', () => {
  const reqs = [
    { requirement_items: [{ product_name: 'Diamond', unit: 'Bags' }, { product_name: 'Naman', unit: 'Bags' }] },
    { requirement_items: [{ product_name: 'Diamond', unit: 'Bags' }, { product_name: 'Dry Mix', unit: 'Bags' }] }
  ];
  assert.deepEqual(getDistinctProductNames(reqs), ['Diamond', 'Naman', 'Dry Mix']);
});

test('8. calculateItemWeightDetails: bag-based, MT-based, and non-bag calculations', () => {
  // Bag-based with explicit weight
  const bagsWithWeight = calculateItemWeightDetails(70, 'Bags', 45);
  assert.equal(bagsWithWeight.isBagBased, true);
  assert.equal(bagsWithWeight.quantity, 70);
  assert.equal(bagsWithWeight.weight, 45);
  assert.equal(bagsWithWeight.totalWeightKg, 3150);
  assert.equal(bagsWithWeight.totalWeightMt, 3.15);
  assert.equal(bagsWithWeight.equivalentBags, 70);

  // Bag-based without weight
  const bagsNoWeight = calculateItemWeightDetails(60, 'Bags', null);
  assert.equal(bagsNoWeight.isBagBased, true);
  assert.equal(bagsNoWeight.weight, null);
  assert.equal(bagsNoWeight.totalWeightKg, null);
  assert.equal(bagsNoWeight.totalWeightMt, null);
  assert.equal(bagsNoWeight.equivalentBags, 60);

  // MT-based with bag weight (Yashika Agro Chana Churi 3 MT @ 40 kg/bag)
  const mtWithWeight = calculateItemWeightDetails(3, 'MT', 40);
  assert.equal(mtWithWeight.isBagBased, false);
  assert.equal(mtWithWeight.totalWeightKg, 3000);
  assert.equal(mtWithWeight.totalWeightMt, 3);
  assert.equal(mtWithWeight.equivalentBags, 75);

  // MT-based without bag weight
  const mtNoWeight = calculateItemWeightDetails(10, 'MT', '');
  assert.equal(mtNoWeight.isBagBased, false);
  assert.equal(mtNoWeight.totalWeightKg, 10000);
  assert.equal(mtNoWeight.totalWeightMt, 10);
  assert.equal(mtNoWeight.equivalentBags, null);

  // Quintal
  const qtl = calculateItemWeightDetails(50, 'Quintal', 50);
  assert.equal(qtl.totalWeightKg, 5000);
  assert.equal(qtl.totalWeightMt, 5);
  assert.equal(qtl.equivalentBags, 100);
});
