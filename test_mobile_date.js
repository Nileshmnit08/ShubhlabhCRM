const dbTimestamp = '2026-10-02T10:15:30.123'; // UTC (which is 15:45 IST)
const date = new Date(dbTimestamp);

console.log('Original DB Timestamp (UTC):', dbTimestamp);
console.log('Parsed Date:', date.toString());
console.log('Parsed Date ISO:', date.toISOString());

const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

console.log('Displayed Time:', formatTime(dbTimestamp));
// Expected displayed time in India (UTC+5:30) for 10:15 UTC is 15:45 -> 3:45 PM.
// If it prints 10:15 AM, it means it's treating it as local time.
