const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function localKey(date) {
  const parts = Object.fromEntries(formatter.formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
function parseMadridDateTime(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(String(value || ''))) throw new Error('invalid_schedule');
  const base = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(base)) throw new Error('invalid_schedule');
  const matches = [1, 2].map(hours => new Date(base - hours * 3600000)).filter(date => localKey(date) === value);
  if (matches.length !== 1) throw new Error('ambiguous_or_nonexistent_madrid_time');
  return matches[0];
}
module.exports = { parseMadridDateTime };
