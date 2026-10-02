import { parseUTCString, formatRelativeDate, formatTime } from './src/pages/StaffMessages/utils/formatters.js';

// The local time is 2026-10-02T16:12:08+05:30
// So Today is Oct 2, 2026. Yesterday is Oct 1, 2026.

const tests = [
  { desc: "Today's message (4:06 PM IST = 10:36 UTC)", input: "2026-10-02T10:36:00" },
  { desc: "Yesterday's message", input: "2026-10-01T10:36:00" },
  { desc: "Older message", input: "2026-09-20T10:36:00" },
  { desc: "With Z suffix", input: "2026-10-02T10:36:00Z" }
];

tests.forEach(t => {
  const parsed = parseUTCString(t.input);
  const relative = formatRelativeDate(t.input);
  const time = formatTime(t.input);
  console.log(`${t.desc}: ${t.input} -> ${parsed.toISOString()} | Group: ${relative} | Time: ${time}`);
});
