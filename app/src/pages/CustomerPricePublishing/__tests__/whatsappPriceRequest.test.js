import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  normalizeIndianPhone,
  isValidIndianPhone,
  getIndiaDateFormatted,
  generatePriceRequestId,
  formatINRValue,
  buildPriceRequestMessage,
  buildWhatsAppLink,
  loadProcurementConfig,
  saveProcurementConfig,
  loadPriceRequestHistory,
  recordPriceRequest,
  DEFAULT_PROCUREMENT_CONFIG
} from '../utils/whatsappPriceRequest.js';

// Polyfill localStorage in node environment for config & history tests
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};

describe('CRM-PROCUREMENT-WHATSAPP-PRICE-REQUEST-01 Unit Tests', () => {

  beforeEach(() => {
    global.localStorage.clear();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Phone Number Normalization & Validation
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Indian Phone Normalization & Validation', () => {
    it('should normalize standard 10-digit mobile number', () => {
      assert.strictEqual(normalizeIndianPhone('9352276227'), '9352276227');
      assert.strictEqual(isValidIndianPhone('9352276227'), true);
    });

    it('should normalize phone with +91 country code and spaces/dashes', () => {
      assert.strictEqual(normalizeIndianPhone('+91 98285 39054'), '9828539054');
      assert.strictEqual(isValidIndianPhone('+91 98285 39054'), true);

      assert.strictEqual(normalizeIndianPhone('+91-94144-46444'), '9414446444');
      assert.strictEqual(isValidIndianPhone('+91-94144-46444'), true);
    });

    it('should normalize phone with leading 91 without plus', () => {
      assert.strictEqual(normalizeIndianPhone('919928192696'), '9928192696');
      assert.strictEqual(isValidIndianPhone('919928192696'), true);
    });

    it('should normalize phone with leading 0 (trunk prefix)', () => {
      assert.strictEqual(normalizeIndianPhone('09352276227'), '9352276227');
      assert.strictEqual(isValidIndianPhone('09352276227'), true);
    });

    it('should reject invalid or malformed phone numbers', () => {
      assert.strictEqual(isValidIndianPhone('12345'), false);
      assert.strictEqual(isValidIndianPhone(''), false);
      assert.strictEqual(isValidIndianPhone(null), false);
      assert.strictEqual(isValidIndianPhone(undefined), false);
      assert.strictEqual(isValidIndianPhone('abcdefghij'), false);
      // Valid Indian mobile numbers start with 6, 7, 8, or 9
      assert.strictEqual(isValidIndianPhone('5123456789'), false);
      assert.strictEqual(isValidIndianPhone('1987654321'), false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. India Standard Time (IST) Date Formatting in Hindi
  // ─────────────────────────────────────────────────────────────────────────────
  describe('IST Date Formatting', () => {
    it('should format date with Hindi month name', () => {
      const fixedDate = new Date('2026-11-21T06:00:00Z'); // 11:30 AM IST on 21 Nov 2026
      const formatted = getIndiaDateFormatted(fixedDate);
      assert.ok(formatted.includes('21'));
      assert.ok(formatted.includes('नवम्बर'));
      assert.ok(formatted.includes('2026'));
    });

    it('should handle edge of day correctly in IST timezone', () => {
      // 2026-11-20T20:00:00 UTC = 2026-11-21T01:30:00 IST
      const edgeDate = new Date('2026-11-20T20:00:00Z');
      const formatted = getIndiaDateFormatted(edgeDate);
      assert.ok(formatted.includes('21'), 'Should be 21st in IST');
      assert.ok(formatted.includes('नवम्बर'));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Request Reference ID Generation
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Reference ID Generator', () => {
    it('should generate an ID adhering to PR-YYYYMMDD-XXXX format', () => {
      const id = generatePriceRequestId();
      assert.match(id, /^PR-\d{8}-[A-Z0-9]{4}$/);
    });

    it('should generate unique IDs across calls', () => {
      const set = new Set();
      for (let i = 0; i < 50; i++) {
        set.add(generatePriceRequestId());
      }
      assert.strictEqual(set.size, 50);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. Currency / INR Formatting
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Currency Formatting', () => {
    it('should format integer amounts with Indian grouping', () => {
      assert.strictEqual(formatINRValue(2500), '₹2,500');
      assert.strictEqual(formatINRValue(21000), '₹21,000');
      assert.strictEqual(formatINRValue(100000), '₹1,00,000');
    });

    it('should format decimals properly', () => {
      assert.strictEqual(formatINRValue(220.5), '₹220.50');
      assert.strictEqual(formatINRValue('350'), '₹350');
    });

    it('should handle null/empty values gracefully', () => {
      assert.strictEqual(formatINRValue(null), '-');
      assert.strictEqual(formatINRValue(''), '-');
      assert.strictEqual(formatINRValue(undefined), '-');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. WhatsApp Message Composition with 13 Reference Commodities
  // ─────────────────────────────────────────────────────────────────────────────
  describe('WhatsApp Message Builder', () => {
    const reference13Commodities = [
      { id: '1', name_en: 'Khal', name_hi: 'खल' },
      { id: '2', name_en: 'Makka Daliya', name_hi: 'मक्का दलिया' },
      { id: '3', name_en: 'Jaggery', name_hi: 'गुड़' },
      { id: '4', name_en: 'Oil', name_hi: 'तेल' },
      { id: '5', name_en: 'Chana Churi', name_hi: 'चना चूरी' },
      { id: '6', name_en: 'Soya Churi', name_hi: 'सोया चूरी' },
      { id: '7', name_en: 'Kakde', name_hi: 'काकड़े' },
      { id: '8', name_en: 'Kakde Khal', name_hi: 'काकड़ा खल' },
      { id: '9', name_en: 'Mustard Khal', name_hi: 'सरसों खल' },
      { id: '10', name_en: 'Chapad', name_hi: 'चपड़' },
      { id: '11', name_en: 'Methi', name_hi: 'मेथी' },
      { id: '12', name_en: 'Ajwain', name_hi: 'अजवाइन' },
      { id: '13', name_en: 'Chaadi Kakda', name_hi: 'छाडी काकड़ा' }
    ];

    const confirmedSavedPrices = {
      '1': { price: 2850, unit: 'Quintal' },
      '2': { price: 2400, unit: 'Quintal' },
      '3': { price: 3900, unit: 'Quintal' },
      '4': { price: 21000, unit: 'Quintal' },
      '5': { price: 2750, unit: 'Quintal' },
      '6': { price: 3400, unit: 'Quintal' },
      '7': { price: 4200, unit: 'Quintal' },
      '8': { price: 3100, unit: 'Quintal' },
      '9': { price: 2600, unit: 'Quintal' },
      '10': { price: 2500, unit: 'Quintal' },
      '11': { price: 220, unit: 'Kg' },
      '12': { price: 350, unit: 'Kg' },
      '13': { price: 7000, unit: 'Quintal' }
    };

    it('should return empty string if no commodities are selected', () => {
      const msg = buildPriceRequestMessage({
        commodities: [],
        latestSavedPrices: confirmedSavedPrices
      });
      assert.strictEqual(msg, '');
    });

    it('should build complete Hindi price request message with all 13 items', () => {
      const msg = buildPriceRequestMessage({
        commodities: reference13Commodities,
        latestSavedPrices: confirmedSavedPrices,
        managerName: 'Nilesh Khandelwal',
        userProfile: { full_name: 'Vishnu Khandelwal', role: 'Staff' },
        customNotes: 'कृपया दोपहर 2 बजे तक भाव भिजवाने का कष्ट करें।',
        requestId: 'PR-20261121-TEST'
      });

      // Verification of Header
      assert.ok(msg.includes('शुभ लाभ कैटल फीड्स (Shubh Labh Cattle Feeds)'), 'Must include company header');
      assert.ok(msg.includes('दैनिक कच्चा माल बाजार भाव पूछताछ'), 'Must include Hindi subject');
      assert.ok(msg.includes('दिनांक:'), 'Must include date');
      assert.ok(msg.includes('PR-20261121-TEST'), 'Must include reference ID');
      assert.ok(msg.includes('आदरणीय Nilesh Khandelwal जी'), 'Must address recipient respectfully');

      // Verification of All 13 Commodities with Bilingual Names & Units
      assert.ok(msg.includes('खल (Khal) - पिछला प्रकाशित भाव: ₹2,850 / Quintal'));
      assert.ok(msg.includes('मक्का दलिया (Makka Daliya) - पिछला प्रकाशित भाव: ₹2,400 / Quintal'));
      assert.ok(msg.includes('गुड़ (Jaggery) - पिछला प्रकाशित भाव: ₹3,900 / Quintal'));
      assert.ok(msg.includes('तेल (Oil) - पिछला प्रकाशित भाव: ₹21,000 / Quintal'));
      assert.ok(msg.includes('चना चूरी (Chana Churi) - पिछला प्रकाशित भाव: ₹2,750 / Quintal'));
      assert.ok(msg.includes('सोया चूरी (Soya Churi) - पिछला प्रकाशित भाव: ₹3,400 / Quintal'));
      assert.ok(msg.includes('काकड़े (Kakde) - पिछला प्रकाशित भाव: ₹4,200 / Quintal'));
      assert.ok(msg.includes('काकड़ा खल (Kakde Khal) - पिछला प्रकाशित भाव: ₹3,100 / Quintal'));
      assert.ok(msg.includes('सरसों खल (Mustard Khal) - पिछला प्रकाशित भाव: ₹2,600 / Quintal'));
      assert.ok(msg.includes('चपड़ (Chapad) - पिछला प्रकाशित भाव: ₹2,500 / Quintal'));
      assert.ok(msg.includes('मेथी (Methi) - पिछला प्रकाशित भाव: ₹220 / Kg'));
      assert.ok(msg.includes('अजवाइन (Ajwain) - पिछला प्रकाशित भाव: ₹350 / Kg'));
      assert.ok(msg.includes('छाडी काकड़ा (Chaadi Kakda) - पिछला प्रकाशित भाव: ₹7,000 / Quintal'));

      // Verification of All 5 Structured Questions
      assert.ok(msg.includes('1. आज के भाव क्या हैं? (प्रति क्विंटल / प्रति किलो दर)'));
      assert.ok(msg.includes('2. आवक (Arrived Supply) कैसी है? (सामान्य / कम / भरपूर)'));
      assert.ok(msg.includes('3. बाजार का रुझान (Market Trend) क्या है? (मंदी / तेजी / स्थिर)'));
      assert.ok(msg.includes('4. क्या किसी माल में तुरंत लिवाली (Buy Now) करनी चाहिए?'));
      assert.ok(msg.includes('5. कोई विशेष निर्देश या आपूर्ति (Quality / Payment / Loading) शर्त?'));

      // Verification of Custom Notes & Sign-off
      assert.ok(msg.includes('कृपया दोपहर 2 बजे तक भाव भिजवाने का कष्ट करें।'));
      assert.ok(msg.includes('Vishnu Khandelwal'));
      assert.ok(msg.includes('Staff'));
    });

    it('should strictly use confirmed saved prices and ignore unconfirmed edits', () => {
      const selectedItem = [{ id: '10', name_en: 'Chapad', name_hi: 'चपड़' }];
      const savedPrices = { '10': { price: 2500, unit: 'Quintal' } };

      const msg = buildPriceRequestMessage({
        commodities: selectedItem,
        latestSavedPrices: savedPrices,
        managerName: 'Procurement'
      });

      assert.ok(msg.includes('चपड़ (Chapad) - पिछला प्रकाशित भाव: ₹2,500 / Quintal'));
      assert.ok(!msg.includes('2600'), 'Unsaved edits must never appear in price request');
    });

    it('should format commodity line properly when no previous price exists', () => {
      const newCommodity = [{ id: '99', name_en: 'New Feed', name_hi: 'नया दाना' }];
      const msg = buildPriceRequestMessage({
        commodities: newCommodity,
        latestSavedPrices: {}
      });

      assert.ok(msg.includes('1. नया दाना (New Feed) - [नया आइटम - पूर्व भाव उपलब्ध नहीं]'));
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. WhatsApp URL Generation (wa.me)
  // ─────────────────────────────────────────────────────────────────────────────
  describe('WhatsApp Link Generation', () => {
    it('should generate valid wa.me URL with 91 prefix and encoded text', () => {
      const link = buildWhatsAppLink('9352276227', 'नमस्ते\nआज के भाव बताएं');
      assert.strictEqual(typeof link, 'object');
      assert.ok(link.url.startsWith('https://wa.me/919352276227?text='));
      assert.ok(link.url.includes(encodeURIComponent('नमस्ते')));
      assert.ok(link.url.includes(encodeURIComponent('आज के भाव बताएं')));
    });

    it('should strip existing +91 and return correct link', () => {
      const link = buildWhatsAppLink('+91 98285 39054', 'Test');
      assert.ok(link.url.startsWith('https://wa.me/919828539054?text='));
    });

    it('should throw an error for an invalid phone number', () => {
      assert.throws(() => {
        buildWhatsAppLink('12345', 'Hello');
      }, /Invalid Indian phone number/);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. Configuration Persistence
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Procurement Config Persistence', () => {
    it('should return default config if storage is empty', () => {
      const config = loadProcurementConfig();
      assert.strictEqual(config.managerName, DEFAULT_PROCUREMENT_CONFIG.managerName);
      assert.strictEqual(config.phone, '');
    });

    it('should save and load updated procurement manager configuration', () => {
      const updated = {
        managerName: 'Nilesh Khandelwal',
        phone: '9352276227',
        notes: 'Procurement Head'
      };
      saveProcurementConfig(updated);

      const loaded = loadProcurementConfig();
      assert.strictEqual(loaded.managerName, 'Nilesh Khandelwal');
      assert.strictEqual(loaded.phone, '9352276227');
      assert.strictEqual(loaded.notes, 'Procurement Head');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. Request History Persistence
  // ─────────────────────────────────────────────────────────────────────────────
  describe('Request History Tracking', () => {
    it('should record request entry into history', () => {
      const entry = {
        id: 'PR-20261121-0001',
        dateIST: '21 नवम्बर 2026',
        itemCount: 13,
        commodities: ['Khal', 'Chapad', 'Oil'],
        managerName: 'Nilesh Khandelwal',
        managerPhone: '9352276227',
        requestedBy: 'Vishnu Khandelwal'
      };

      recordPriceRequest(entry);

      const history = loadPriceRequestHistory();
      assert.strictEqual(history.length, 1);
      assert.strictEqual(history[0].id, 'PR-20261121-0001');
      assert.strictEqual(history[0].itemCount, 13);
      assert.strictEqual(history[0].status, 'WhatsApp Opened');
    });

    it('should maintain max history entries and prepend new entries', () => {
      for (let i = 1; i <= 55; i++) {
        recordPriceRequest({
          id: `PR-20261121-${i.toString().padStart(4, '0')}`,
          dateIST: '21 नवम्बर 2026',
          itemCount: i,
          commodities: ['Khal'],
          managerName: 'Procurement',
          managerPhone: '9352276227',
          requestedBy: 'Vishnu'
        });
      }

      const history = loadPriceRequestHistory();
      assert.strictEqual(history.length, 50, 'Should cap at max 50 entries');
      assert.strictEqual(history[0].id, 'PR-20261121-0055', 'Most recent must be first');
    });
  });

});
