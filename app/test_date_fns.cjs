const { differenceInMinutes } = require('date-fns');

try {
  differenceInMinutes(new Date(undefined), new Date('2026-09-01T00:00:00Z'));
  console.log("No crash!");
} catch (e) {
  console.error("CRASH:", e.message);
}
