// Date helpers for LabourHisaab (LH-HOME-TOTAL-DATE-01).
// Pure module (no React Native imports) so it can be unit-tested in Node.
// Business dates are 'YYYY-MM-DD' strings in the device's local calendar.

const HINDI_MONTHS = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितम्बर', 'अक्टूबर', 'नवम्बर', 'दिसम्बर'];
const HINDI_WEEKDAYS = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];
export const HINDI_WEEKDAYS_SHORT = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];

const pad = (n) => String(n).padStart(2, '0');

/** Today's date in the device's local calendar (not UTC, and never a fixed constant). */
export function todayYmd(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

const parseYmd = (ymd) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || ''));
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === ymd ? d : null;
};

export const isValidYmd = (ymd) => parseYmd(ymd) !== null;

export function addDaysYmd(ymd, days) {
  const d = parseYmd(ymd);
  if (!d) return null;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** '03 नवम्बर 2026 (मंगलवार)' */
export function formatHindiDate(ymd) {
  const d = parseYmd(ymd);
  if (!d) return String(ymd || '');
  return `${pad(d.getUTCDate())} ${HINDI_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} (${HINDI_WEEKDAYS[d.getUTCDay()]})`;
}

/** 'नवम्बर 2026' for a { year, month } where month is 0-11. */
export const formatHindiMonth = (year, month) => `${HINDI_MONTHS[month]} ${year}`;

/** Year/month (0-11) of a date, for opening the calendar on the selected month. */
export function monthOf(ymd) {
  const d = parseYmd(ymd) || parseYmd(todayYmd());
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
}

/** Moves a { year, month } by delta months. */
export function shiftMonth({ year, month }, delta) {
  const total = year * 12 + month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

/**
 * Calendar grid for a month: weeks (Sunday first) of 'YYYY-MM-DD' strings,
 * with null for the blank cells before the 1st and after the last day.
 */
export function monthGrid(year, month) {
  const first = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Array(first.getUTCDay()).fill(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(`${year}-${pad(month + 1)}-${pad(day)}`);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
