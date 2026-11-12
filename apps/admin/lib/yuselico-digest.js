const { getAdminSupabase } = require('./admin-supabase');
const { sendEmail } = require('./email');

const madridFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

function madridParts(date) {
  return Object.fromEntries(madridFormatter.formatToParts(date).map(({ type, value }) => [type, value]));
}

function madridKey(date) {
  const { year, month, day, hour, minute } = madridParts(date);
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function weekBounds(now) {
  const { year, month, day } = madridParts(now);
  const end = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  end.setUTCDate(end.getUTCDate() + (5 - end.getUTCDay() + 7) % 7);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);
  const ymd = (date) => date.toISOString().slice(0, 10);
  return { start: `${ymd(start)}T09:00`, end: `${ymd(end)}T09:00`, week: ymd(end) };
}

function isMadridFridayNine(now) {
  const { year, month, day, hour } = madridParts(now);
  return Number(hour) === 9 && new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).getUTCDay() === 5;
}

function buildDigest(leads, now = new Date()) {
  const { start, end, week } = weekBounds(now);
  const recent = [];
  const historical = [];
  for (const lead of leads) {
    if (lead.is_test || lead.source_payload?.simulated === true) continue;
    const created = new Date(lead.source_created_at || lead.created_at || '');
    if (!Number.isFinite(created.getTime())) continue;
    const key = madridKey(created);
    if (key >= end) continue;
    (key >= start ? recent : historical).push(String(lead.name || '').replace(/\s+/g, ' ').trim() || 'Sin nombre');
  }
  const names = (items) => items.length ? items.map((name) => `- ${name}`).join('\n') : 'Ninguno';
  return {
    week, newCount: recent.length, historicalCount: historical.length,
    subject: `Leads de Yuselico: ${recent.length} nuevos y ${historical.length} históricos`,
    text: `Resumen semanal de leads de Yuselico\n\nNuevos (${recent.length})\n${names(recent)}\n\nHistóricos (${historical.length})\n${names(historical)}`,
  };
}

async function listYuselicoLeads(db = getAdminSupabase()) {
  const leads = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await db.from('crm_leads')
      .select('name,source_created_at,created_at,is_test,source_payload')
      .contains('source_payload', { tag: 'yuselico-studios' })
      .order('source_created_at', { ascending: true }).range(start, start + 999);
    if (error) throw error;
    leads.push(...(data || []));
    if ((data || []).length < 1000) return leads;
  }
}

async function sendYuselicoDigest({ to, now = new Date(), demo = false, db, mailer = sendEmail }) {
  const digest = buildDigest(await listYuselicoLeads(db), now);
  const result = await mailer({
    to, subject: `${demo ? '[DEMO] ' : ''}${digest.subject}`, text: digest.text,
    tag: 'yuselico_weekly_digest',
    ...(!demo ? { idempotencyKey: `yuselico-weekly-${digest.week}` } : {}),
  });
  if (!result.sent) throw new Error(`yuselico_digest_send_failed:${result.reason || 'unknown'}`);
  return { week: digest.week, newCount: digest.newCount, historicalCount: digest.historicalCount, messageId: result.id };
}

module.exports = { buildDigest, isMadridFridayNine, sendYuselicoDigest };
