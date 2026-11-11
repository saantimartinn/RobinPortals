const TIME_ZONE = 'Europe/Madrid';
const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
});
const clockFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});
const partsOf = (formatter, value) => Object.fromEntries(formatter.formatToParts(value)
  .filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));

function parseCalendarDate(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(key || ''))) throw new Error('invalid_calendar_date');
  const date = new Date(`${key}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== key) throw new Error('invalid_calendar_date');
  return date;
}

function dateKey(value = new Date()) {
  if (value == null || value === '') return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return parseCalendarDate(value).toISOString().slice(0, 10);
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = partsOf(dayFormatter, date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function calendarDate(value) {
  const key = dateKey(value);
  return key ? parseCalendarDate(key) : null;
}

function dayStart(key) {
  const target = parseCalendarDate(key).getTime();
  let candidate = target;
  for (let step = 0; step < 3; step += 1) {
    const p = partsOf(clockFormatter, new Date(candidate));
    const wallTime = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
    candidate += target - wallTime;
  }
  return new Date(candidate);
}

function addCalendarDays(key, count) {
  const date = parseCalendarDate(key);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

module.exports = { TIME_ZONE, dateKey, calendarDate, dayStart, addCalendarDays };
