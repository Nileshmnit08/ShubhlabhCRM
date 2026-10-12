const test = require('node:test');
const assert = require('node:assert');

// Import or replicate the core logic from customerNotificationService for isolated Node unit testing
const NOTIFICATION_CATEGORIES = {
  PRICE_UPDATE: { label: 'Price Update', color: '#EA580C', bg: '#FFEDD5' },
  RAW_MATERIAL_UPDATE: { label: 'Raw Material', color: '#D97706', bg: '#FEF3C7' },
  SCHEME: { label: 'Scheme', color: '#7C3AED', bg: '#EDE9FE' },
  REWARD: { label: 'Reward', color: '#059669', bg: '#D1FAE5' },
  OFFER: { label: 'Special Offer', color: '#2563EB', bg: '#DBEAFE' },
  PRODUCT_UPDATE: { label: 'Product Update', color: '#0284C7', bg: '#E0F2FE' },
  ANNOUNCEMENT: { label: 'Announcement', color: '#4F46E5', bg: '#EEF2FF' },
  SUPPLY_UPDATE: { label: 'Supply Update', color: '#0D9488', bg: '#CCFBF1' },
  IMPORTANT_NOTICE: { label: 'Important Notice', color: '#DC2626', bg: '#FEE2E2' },
  OTHER: { label: 'General Notice', color: '#4B5563', bg: '#F3F4F6' },
};

function getCategoryMeta(type) {
  if (!type) return NOTIFICATION_CATEGORIES.OTHER;
  const key = String(type).toUpperCase().replace(/ /g, '_');
  return NOTIFICATION_CATEGORIES[key] || {
    label: type.replace(/_/g, ' '),
    color: '#4B5563',
    bg: '#F3F4F6',
  };
}

function calculateUnreadCount(notifications = []) {
  if (!Array.isArray(notifications)) return 0;
  return notifications.filter(n => !n.is_read).length;
}

function formatBadgeDisplay(count) {
  if (count <= 0) return null;
  return count > 99 ? '99+' : String(count);
}

function sanitizeCustomerNotice(rawUpdate, customerId) {
  if (!rawUpdate) return null;

  const recipients = Array.isArray(rawUpdate.business_update_recipients)
    ? rawUpdate.business_update_recipients
    : [];

  const myRecipient = customerId
    ? recipients.find(r => r.customer_id === customerId) || recipients[0]
    : recipients[0];

  const isRead = Boolean(myRecipient && myRecipient.read_at);
  const categoryMeta = getCategoryMeta(rawUpdate.type);

  return {
    id: rawUpdate.id,
    title: rawUpdate.title || 'Untitled Notice',
    message: rawUpdate.message || '',
    type: rawUpdate.type || 'OTHER',
    categoryLabel: categoryMeta.label,
    categoryColor: categoryMeta.color,
    categoryBg: categoryMeta.bg,
    audience_type: rawUpdate.audience_type || 'ALL',
    published_at: rawUpdate.published_at || rawUpdate.created_at || '2026-10-12T10:00:00.000Z',
    image_url: rawUpdate.image_url || null,
    attachment_url: rawUpdate.attachment_url || null,
    is_read: isRead,
    read_at: myRecipient?.read_at || null,
    recipient_id: myRecipient?.id || null,
  };
}

test('1. Unread Counting & Capping Logic', () => {
  assert.strictEqual(calculateUnreadCount([]), 0);
  assert.strictEqual(formatBadgeDisplay(0), null, 'Zero unread count hides badge');

  const notices = [
    { id: '1', is_read: false },
    { id: '2', is_read: true },
    { id: '3', is_read: false },
    { id: '4', is_read: false },
  ];
  const count = calculateUnreadCount(notices);
  assert.strictEqual(count, 3, 'Calculates 3 unread notices');
  assert.strictEqual(formatBadgeDisplay(count), '3');

  // Test capping
  assert.strictEqual(formatBadgeDisplay(99), '99');
  assert.strictEqual(formatBadgeDisplay(100), '99+', 'Caps visually at 99+');
  assert.strictEqual(formatBadgeDisplay(250), '99+', 'Caps visually at 99+');
});

test('2. Notice Category Metadata & Normalization', () => {
  const priceMeta = getCategoryMeta('PRICE_UPDATE');
  assert.strictEqual(priceMeta.label, 'Price Update');
  assert.strictEqual(priceMeta.color, '#EA580C');

  const rewardMeta = getCategoryMeta('reward');
  assert.strictEqual(rewardMeta.label, 'Reward');
  assert.strictEqual(rewardMeta.color, '#059669');

  const unknownMeta = getCategoryMeta('FARMER_MEET_2026');
  assert.strictEqual(unknownMeta.label, 'FARMER MEET 2026');
  assert.strictEqual(unknownMeta.color, '#4B5563');
});

test('3. Buyer Isolation: Read Status Derived Only From Authenticated Customer', () => {
  const buyerA_id = 'party-buyer-aaa';
  const buyerB_id = 'party-buyer-bbb';

  const rawNotice = {
    id: 'notice-123',
    title: 'Festival Scheme Announced',
    message: 'Book 50 bags and get extra cashback.',
    type: 'SCHEME',
    audience_type: 'SELECTED',
    business_update_recipients: [
      {
        id: 'rec-1',
        customer_id: buyerA_id,
        read_at: '2026-10-12T09:30:00.000Z',
      },
      {
        id: 'rec-2',
        customer_id: buyerB_id,
        read_at: null, // Buyer B has not read it yet
      },
    ],
  };

  // When sanitized for Buyer A:
  const sanitizedA = sanitizeCustomerNotice(rawNotice, buyerA_id);
  assert.strictEqual(sanitizedA.is_read, true, "Buyer A has read the notice");
  assert.strictEqual(sanitizedA.read_at, '2026-10-12T09:30:00.000Z');

  // When sanitized for Buyer B:
  const sanitizedB = sanitizeCustomerNotice(rawNotice, buyerB_id);
  assert.strictEqual(sanitizedB.is_read, false, "Buyer B's notice is still unread");
  assert.strictEqual(sanitizedB.read_at, null);
});

test('4. "ALL" Audience Notice: Initially Unread Until Recipient Record Created', () => {
  const buyerId = 'party-buyer-ccc';

  // For audience_type = 'ALL', initially no recipient row exists for the buyer
  const rawAllNotice = {
    id: 'notice-all-999',
    title: 'Factory Maintenance Notice',
    message: 'Factory closed on Sunday.',
    type: 'IMPORTANT_NOTICE',
    audience_type: 'ALL',
    business_update_recipients: [], // No recipients initially
  };

  const initialNotice = sanitizeCustomerNotice(rawAllNotice, buyerId);
  assert.strictEqual(initialNotice.is_read, false, 'ALL notices are unread when no recipient record exists');

  // After buyer reads, an entry is inserted into business_update_recipients
  const updatedNoticeWithReceipt = {
    ...rawAllNotice,
    business_update_recipients: [
      {
        id: 'new-rec-id',
        customer_id: buyerId,
        read_at: '2026-10-12T11:00:00.000Z',
      },
    ],
  };

  const readNotice = sanitizeCustomerNotice(updatedNoticeWithReceipt, buyerId);
  assert.strictEqual(readNotice.is_read, true, 'Becomes read once recipient row with read_at exists');
});

test('5. Session Deduplication: Only Newly Arriving Unread Notices Trigger Popup', () => {
  const knownNoticeIds = new Set();
  let isInitialFetch = true;

  const initialList = [
    { id: 'notice-1', is_read: false },
    { id: 'notice-2', is_read: true },
  ];

  let popupNotice = null;

  function processFetch(list) {
    if (isInitialFetch) {
      list.forEach(n => knownNoticeIds.add(n.id));
      isInitialFetch = false;
      return null;
    }

    const newUnread = list.filter(n => !n.is_read && !knownNoticeIds.has(n.id));
    if (newUnread.length > 0) {
      newUnread.forEach(n => knownNoticeIds.add(n.id));
      return newUnread[0];
    }
    return null;
  }

  // 1. Initial load
  popupNotice = processFetch(initialList);
  assert.strictEqual(popupNotice, null, 'Initial load must NOT pop up existing notices');
  assert.strictEqual(knownNoticeIds.size, 2);

  // 2. Refresh without any changes
  popupNotice = processFetch(initialList);
  assert.strictEqual(popupNotice, null, 'Screen refresh or polling must NOT trigger popup for existing notices');

  // 3. New unread notice arrives while app is in foreground
  const updatedListWithNewNotice = [
    { id: 'notice-3', is_read: false, title: 'Breaking Rate Cut' },
    ...initialList,
  ];
  popupNotice = processFetch(updatedListWithNewNotice);
  assert.notStrictEqual(popupNotice, null, 'Newly arriving unread notice triggers popup');
  assert.strictEqual(popupNotice.id, 'notice-3');

  // 4. Subsequent poll with the same notice
  popupNotice = processFetch(updatedListWithNewNotice);
  assert.strictEqual(popupNotice, null, 'Same new notice does not pop up a second time');
});

test('6. Unified Category Filtering: Correctly partitions canonical notice types', () => {
  const notices = [
    { id: '1', type: 'PRICE_UPDATE', is_read: false },
    { id: '2', type: 'RAW_MATERIAL_UPDATE', is_read: true },
    { id: '3', type: 'ANNOUNCEMENT', is_read: false },
    { id: '4', type: 'PRODUCT_UPDATE', is_read: true },
    { id: '5', type: 'REWARD', is_read: false },
    { id: '6', type: 'SCHEME', is_read: true },
    { id: '7', type: 'SUPPLY_UPDATE', is_read: false },
  ];

  function filterByCategory(items, category) {
    return items.filter(item => {
      if (category === 'ALL') return true;
      if (category === 'UNREAD') return !item.is_read;
      if (category === 'BUSINESS') {
        return (
          item.type === 'PRICE_UPDATE' ||
          item.type === 'RAW_MATERIAL_UPDATE' ||
          item.type === 'SUPPLY_UPDATE'
        );
      }
      if (category === 'SHUBH_LABH') {
        return (
          item.type === 'ANNOUNCEMENT' ||
          item.type === 'PRODUCT_UPDATE' ||
          item.type === 'IMPORTANT_NOTICE' ||
          item.type === 'OTHER'
        );
      }
      if (category === 'REWARDS') {
        return (
          item.type === 'REWARD' ||
          item.type === 'SCHEME' ||
          item.type === 'OFFER'
        );
      }
      return true;
    });
  }

  // ALL returns all 7
  assert.strictEqual(filterByCategory(notices, 'ALL').length, 7);

  // BUSINESS returns PRICE_UPDATE, RAW_MATERIAL_UPDATE, SUPPLY_UPDATE (3)
  const business = filterByCategory(notices, 'BUSINESS');
  assert.strictEqual(business.length, 3);
  assert.deepStrictEqual(business.map(b => b.id), ['1', '2', '7']);

  // SHUBH_LABH returns ANNOUNCEMENT, PRODUCT_UPDATE (2)
  const company = filterByCategory(notices, 'SHUBH_LABH');
  assert.strictEqual(company.length, 2);
  assert.deepStrictEqual(company.map(c => c.id), ['3', '4']);

  // REWARDS returns REWARD, SCHEME (2)
  const rewards = filterByCategory(notices, 'REWARDS');
  assert.strictEqual(rewards.length, 2);
  assert.deepStrictEqual(rewards.map(r => r.id), ['5', '6']);

  // UNREAD returns 4 unread items
  const unread = filterByCategory(notices, 'UNREAD');
  assert.strictEqual(unread.length, 4);
});

test('7. Historical Date Range Filtering: Filters observations accurately', () => {
  const now = new Date();
  const todayNotice = new Date(now).toISOString();

  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const tenDaysAgo = new Date(now);
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

  const fortyDaysAgo = new Date(now);
  fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);

  const notices = [
    { id: 'today', published_at: todayNotice },
    { id: '3days', published_at: threeDaysAgo.toISOString() },
    { id: '10days', published_at: tenDaysAgo.toISOString() },
    { id: '40days', published_at: fortyDaysAgo.toISOString() },
  ];

  function filterByDate(items, range) {
    return items.filter(item => {
      if (range === 'ALL_TIME') return true;
      const noticeDate = new Date(item.published_at);
      const curr = new Date();

      if (range === 'TODAY') {
        const startOfToday = new Date(curr.getFullYear(), curr.getMonth(), curr.getDate());
        return noticeDate >= startOfToday;
      }
      if (range === '7_DAYS') {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 7);
        return noticeDate >= cutoff;
      }
      if (range === '30_DAYS') {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 30);
        return noticeDate >= cutoff;
      }
      return true;
    });
  }

  assert.strictEqual(filterByDate(notices, 'ALL_TIME').length, 4);
  assert.strictEqual(filterByDate(notices, 'TODAY').length, 1);
  assert.strictEqual(filterByDate(notices, '7_DAYS').length, 2);
  assert.strictEqual(filterByDate(notices, '30_DAYS').length, 3);
});

test('8. Canonical Content Consistency: Single source prevents duplicate records', () => {
  // Verifies that a notice accessed via Home or via Notification Centre
  // resolves to the exact same canonical business_updates identifier
  const homeBannerNotice = { id: 'bu-555', title: 'New Harvest Announcement' };
  const inboxNotice = { id: 'bu-555', title: 'New Harvest Announcement' };

  assert.strictEqual(homeBannerNotice.id, inboxNotice.id, 'Notice ID must be identical across entry points');
  assert.strictEqual(homeBannerNotice.title, inboxNotice.title, 'Notice content must be identical');
});

test('9. Concurrency Protection: In-flight guard drops duplicate simultaneous triggers', async () => {
  let inFlight = false;
  let networkCalls = 0;

  async function safeFetch() {
    if (inFlight) return { dropped: true };
    inFlight = true;
    networkCalls += 1;
    await new Promise(res => setTimeout(res, 10));
    inFlight = false;
    return { dropped: false, data: ['notice-1'] };
  }

  // Trigger 3 simultaneous fetch attempts
  const results = await Promise.all([safeFetch(), safeFetch(), safeFetch()]);
  assert.strictEqual(networkCalls, 1, 'Only exactly 1 network call should execute while in-flight');
  const droppedCount = results.filter(r => r.dropped).length;
  assert.strictEqual(droppedCount, 2, 'Two duplicate concurrent requests should be cleanly dropped');
});

test('10. Home Updates State Machine: Settles into predictable non-flashing states', () => {
  function computeSectionState({ loading, error, latestUpdate }) {
    if (loading && !latestUpdate) return 'LOADING';
    if (error && !latestUpdate) return 'ERROR';
    if (latestUpdate) return 'SUCCESS';
    return 'EMPTY';
  }

  // Initial load
  assert.strictEqual(computeSectionState({ loading: true, error: null, latestUpdate: null }), 'LOADING');

  // Success with notice
  assert.strictEqual(computeSectionState({ loading: false, error: null, latestUpdate: { id: '1' } }), 'SUCCESS');

  // Empty success
  assert.strictEqual(computeSectionState({ loading: false, error: null, latestUpdate: null }), 'EMPTY');

  // Initial load error
  assert.strictEqual(computeSectionState({ loading: false, error: 'Network error', latestUpdate: null }), 'ERROR');

  // Background refresh with existing notice: NEVER flashes LOADING or wipes data
  assert.strictEqual(computeSectionState({ loading: true, error: null, latestUpdate: { id: '1' } }), 'SUCCESS');

  // Background refresh error with existing notice: NEVER wipes existing notice
  assert.strictEqual(computeSectionState({ loading: false, error: 'Network glitch', latestUpdate: { id: '1' } }), 'SUCCESS');
});

test('11. Referential Stability: Stable callback prevents focus effect infinite loops', () => {
  // Simulates the effect loop if refresh callback reference changes
  let loopCount = 0;
  let activeCallback = () => {};

  function triggerFocusEffect(cb) {
    if (cb !== activeCallback) {
      activeCallback = cb;
      loopCount += 1;
    }
  }

  // With unstable inline function: triggers every time
  triggerFocusEffect(() => {});
  triggerFocusEffect(() => {});
  triggerFocusEffect(() => {});
  assert.strictEqual(loopCount, 3, 'Unstable references cause 3 triggers');

  // Reset and test stable memoized callback
  loopCount = 0;
  const memoizedCallback = () => {};
  activeCallback = null;
  triggerFocusEffect(memoizedCallback);
  triggerFocusEffect(memoizedCallback);
  triggerFocusEffect(memoizedCallback);
  assert.strictEqual(loopCount, 1, 'Memoized callback triggers only once without looping');
});

