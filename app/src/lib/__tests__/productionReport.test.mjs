import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeProductionReport,
  generateProductionReportText,
} from '../productionReport.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('Section 7 validation scenario: aggregates products, packaging weights, totals, and gifts accurately in Hindi', () => {
  const requirements = [
    {
      id: 'req-1',
      status: 'Identified',
      customer_name: 'Secret Customer Alpha',
      customer_city: 'Indore',
      requirement_items: [
        { product_name: 'Shubh Labh', quantity: 70, weight: 45 },
      ],
    },
    {
      id: 'req-2',
      status: 'Qualified',
      customer_name: 'Secret Customer Beta',
      customer_city: 'Ujjain',
      requirement_items: [
        { product_name: 'Shubh Labh', quantity: 20, weight: 45 },
        { product_name: 'Shubh Labh', quantity: 50, weight: 43, gift: 'Oswal Soap' },
      ],
    },
    {
      id: 'req-3',
      status: 'Commercial Intent',
      customer_name: 'Secret Customer Gamma',
      customer_city: 'Bhopal',
      requirement_items: [
        { product_name: 'Lapti Mix', quantity: 60, weight: 40, gift: 'Katora' },
        { product_name: 'Dry Mix', quantity: 60, weight: 60 },
      ],
    },
  ];

  const data = computeProductionReport(requirements, '2026-11-12');

  assert.equal(data.reportDateDDMMYYYY, '12-11-2026');
  assert.equal(data.totalBags, 260);
  assert.equal(data.totalKnownWeightKg, 12200);
  assert.equal(data.totalKnownWeightMT, '12.200');
  assert.equal(data.hasMissingWeightOverall, false);
  assert.equal(data.hasUnspecifiedGifts, true);

  assert.equal(data.products.length, 3);
  assert.equal(data.products[0].productName, 'Shubh Labh');
  assert.equal(data.products[0].totalBags, 140);
  assert.equal(data.products[0].totalKnownWeightKg, 6200);
  assert.deepEqual(
    data.products[0].variants.map(v => ({ w: v.bagWeightKg, b: v.bags })),
    [{ w: 45, b: 90 }, { w: 43, b: 50 }]
  );

  const reportText = generateProductionReportText(data);

  // Must NEVER include any customer names or cities
  assert.equal(reportText.includes('Secret Customer Alpha'), false);
  assert.equal(reportText.includes('Secret Customer Beta'), false);
  assert.equal(reportText.includes('Secret Customer Gamma'), false);
  assert.equal(reportText.includes('Indore'), false);
  assert.equal(reportText.includes('Ujjain'), false);
  assert.equal(reportText.includes('Bhopal'), false);

  // Must include exact Hindi production details
  assert.match(reportText, /🏭 \*शुभ लाभ – आज की उत्पादन आवश्यकता\*/);
  assert.match(reportText, /📅 12-11-2026/);
  assert.match(reportText, /📦 \*1\. Shubh Labh\*/);
  assert.match(reportText, /- Shubh Labh के 45 किलो के \*90 बैग\* बनाने हैं।/);
  assert.match(reportText, /- Shubh Labh के 43 किलो के \*50 बैग\* बनाने हैं।/);
  assert.match(reportText, /कुल: \*140 बैग\*/);
  assert.match(reportText, /कुल वजन: \*6,200 किलो\*/);
  assert.match(reportText, /📦 \*2\. Lapti Mix\*/);
  assert.match(reportText, /- Lapti Mix के 40 किलो के \*60 बैग\* बनाने हैं।/);
  assert.match(reportText, /कुल वजन: \*2,400 किलो\*/);
  assert.match(reportText, /📦 \*3\. Dry Mix\*/);
  assert.match(reportText, /- Dry Mix के 60 किलो के \*60 बैग\* बनाने हैं।/);
  assert.match(reportText, /कुल वजन: \*3,600 किलो\*/);
  assert.match(reportText, /🎁 \*उपहार पैकिंग\*/);
  assert.match(reportText, /- Shubh Labh के 43 किलो वाले 50 बैग के साथ \*Oswal Soap\* देना है। \(उपहार की संख्या की पुष्टि करनी है।\)/);
  assert.match(reportText, /- Lapti Mix के 40 किलो वाले 60 बैग के साथ \*Katora\* देना है। \(उपहार की संख्या की पुष्टि करनी है।\)/);
  assert.match(reportText, /📊 \*कुल उत्पादन\*/);
  assert.match(reportText, /- कुल बैग बनाने हैं: \*260\*/);
  assert.match(reportText, /- कुल माल: \*12,200 किलो \(12\.200 मीट्रिक टन\)\*/);
  assert.match(reportText, /\*शुभ लाभ CRM – उत्पादन विभाग\*/);
});

test('Duplicate gift commitments across multiple customers are merged without duplicate gift lines', () => {
  const requirements = [
    {
      id: 'r1',
      status: 'Identified',
      customer_name: 'Customer One',
      requirement_items: [
        { product_name: 'Lapti Mix', quantity: 25, weight: 40, gift: 'Katora' },
      ],
    },
    {
      id: 'r2',
      status: 'Identified',
      customer_name: 'Customer Two',
      requirement_items: [
        { product_name: 'Lapti Mix', quantity: 35, weight: 40, gift: 'Katora' },
      ],
    },
  ];

  const data = computeProductionReport(requirements, '2026-11-12');
  assert.equal(data.gifts.length, 1);
  assert.equal(data.gifts[0].bags, 60);
  assert.equal(data.gifts[0].giftName, 'Katora');

  const text = generateProductionReportText(data);
  const katoraMatches = text.match(/\*Katora\*/g) || [];
  assert.equal(katoraMatches.length, 1);
  assert.match(text, /Lapti Mix के 40 किलो वाले 60 बैग के साथ \*Katora\* देना है।/);
});

test('Explicit gift quantity is displayed in नग without confirmation warning when all quantities known', () => {
  const requirements = [
    {
      id: 'r1',
      status: 'Identified',
      requirement_items: [
        { product_name: 'Shubh Labh', quantity: 100, weight: 50, gift: 'Steel Bucket × 4' },
      ],
    },
  ];

  const data = computeProductionReport(requirements, '2026-11-12');
  assert.equal(data.hasUnspecifiedGifts, false);
  const text = generateProductionReportText(data);
  assert.match(text, /Shubh Labh के 50 किलो वाले 100 बैग के साथ \*Steel Bucket\* \(4 नग\) देना है।/);
  assert.equal(text.includes('उपहार की संख्या की पुष्टि करनी है।'), false);
});

test('Missing packaging weight is never guessed or assumed 50kg and is excluded from known weight totals', () => {
  const requirements = [
    {
      id: 'r1',
      status: 'Identified',
      requirement_items: [
        { product_name: 'Shubh Labh (50 kg)', quantity: 40, weight: null },
        { product_name: 'Dry Mix', quantity: 20, weight: 60 },
      ],
    },
  ];

  const data = computeProductionReport(requirements, '2026-11-12');
  assert.equal(data.totalBags, 60);
  assert.equal(data.totalKnownWeightKg, 1200);
  assert.equal(data.totalKnownWeightMT, '1.200');
  assert.equal(data.hasMissingWeightOverall, true);

  const text = generateProductionReportText(data);
  assert.match(text, /Shubh Labh \(50 kg\) \(पैकेजिंग वजन उपलब्ध नहीं\) के \*40 बैग\* बनाने हैं।/);
  assert.match(text, /कुल वजन: ⚠️ \*वजन उपलब्ध नहीं है\*/);
  assert.match(text, /कुल ज्ञात माल: \*1,200 किलो \(1\.200 मीट्रिक टन\)\*/);
  assert.match(text, /अज्ञात वजन को कुल में शामिल नहीं किया गया है/);
});

test('Empty filtered results & long product names & exclusions of dispatched/cancelled', () => {
  const emptyData = computeProductionReport([
    { id: 'd1', status: 'Dispatched', required_quantity: 50 },
    { id: 'd2', status: 'Cancelled', required_quantity: 50 },
  ], '2026-11-12');

  assert.equal(emptyData.totalBags, 0);
  assert.equal(emptyData.products.length, 0);

  const emptyText = generateProductionReportText(emptyData);
  assert.match(emptyText, /कोई लंबित \(Not Dispatched\) उत्पादन आवश्यकता नहीं है/);
  assert.equal(emptyText.includes('उपहार पैकिंग'), false);

  const longProdData = computeProductionReport([
    {
      id: 'lp-1',
      status: 'Identified',
      requirement_items: [
        { product_name: 'Super Premium High-Protein Broiler Finisher Mash Special', quantity: 30, weight: 50 },
      ],
    },
  ], '2026-11-12');

  const longProdText = generateProductionReportText(longProdData);
  assert.match(longProdText, /Super Premium High-Protein Broiler Finisher Mash Special/);
  assert.match(longProdText, /\*30 बैग\*/);
});

test('UI component wiring: Production Report button sits next to Copy Report and modal shares identical text for WhatsApp and Copy', () => {
  const componentPath = path.resolve(__dirname, '../../components/requirements/DailyPendingDispatchReport.jsx');
  const source = fs.readFileSync(componentPath, 'utf8');

  const copyIdx = source.indexOf("'Copy Report'");
  const prodIdx = source.indexOf('🏭 Production Report');
  assert.ok(copyIdx > -1, 'Existing Copy Report button must remain');
  assert.ok(prodIdx > copyIdx, 'Production Report button must be placed right after Copy Report');

  // Check WhatsApp and Copy actions in modal use the exact same productionReportText
  assert.match(source, /copyTextToClipboard\(productionReportText/);
  assert.match(source, /encodeURIComponent\(productionReportText\)/);
  assert.match(source, /WhatsApp पर भेजें/);
  assert.match(source, /कॉपी करें/);
  assert.match(source, /बंद करें/);
});

