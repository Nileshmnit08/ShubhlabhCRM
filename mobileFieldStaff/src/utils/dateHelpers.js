export const parseUTCString = (isoString) => {
  if (!isoString) return new Date('');
  let normalized = isoString;
  if (!normalized.endsWith('Z') && !normalized.includes('+') && !normalized.match(/-\d{2}:\d{2}$/)) {
    normalized = normalized.replace(' ', 'T') + 'Z';
  }
  return new Date(normalized);
};

export const formatDateFull = (dateString) => {
  if (!dateString) return 'Unknown';
  const d = new Date(dateString);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let hours = d.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; 
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}, ${String(hours).padStart(2, '0')}:${mins} ${ampm}`;
};
