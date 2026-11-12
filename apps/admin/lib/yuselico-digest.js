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
  const escapeHtml = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const nameRows = (items) => items.length
    ? items.map((name) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e5eaf0;color:#102b4b;font-size:15px;">${escapeHtml(name)}</td></tr>`).join('')
    : '<tr><td style="padding:10px 0;color:#66768a;font-size:15px;">Sin nombres registrados.</td></tr>';
  const intro = recent.length
    ? `¡Buenas noticias! Esta semana se han sumado ${recent.length} ${recent.length === 1 ? 'persona nueva' : 'personas nuevas'} desde vuestra landing. Aquí tenéis sus nombres y el histórico acumulado.`
    : 'Esta semana no ha habido nuevos registros desde vuestra landing. Os dejamos el histórico acumulado para que tengáis el seguimiento a mano.';
  const closing = recent.length ? '¡Seguimos creciendo juntos!' : '¡A por la próxima semana juntos!';
  const subject = recent.length
    ? `✨ Yuselico × Robin: ${recent.length} ${recent.length === 1 ? 'nuevo lead' : 'nuevos leads'} esta semana`
    : 'Yuselico × Robin: resumen semanal de leads';
  const text = `YUSELICO × ROBIN\n¡Seguimos sumando! ✨\n\n¡Hola, equipo Yuselico!\n\n${intro}\n\nNUEVOS ESTA SEMANA (${recent.length})\n${names(recent)}\n\nHISTÓRICO ACUMULADO (${historical.length})\n${names(historical)}\n\n${closing}\nEl equipo de Robin`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#eef2f7;font-family:Arial,Helvetica,sans-serif;color:#23354b;">
<div style="display:none;font-size:1px;color:#eef2f7;max-height:0;overflow:hidden;">${recent.length} nuevos leads · ${historical.length} históricos</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:14px;overflow:hidden;">
<tr><td style="background:#102b4b;padding:30px 34px;color:#fff;">
<div style="font-size:12px;font-weight:700;letter-spacing:2px;color:#b9d4ef;">YUSELICO × ROBIN</div>
<h1 style="margin:18px 0 8px;font-size:28px;line-height:1.2;color:#fff;">¡Seguimos sumando! ✨</h1>
<p style="margin:0;font-size:15px;line-height:1.5;color:#d8e5f2;">Vuestro resumen semanal de leads</p>
</td></tr>
<tr><td style="padding:30px 34px 34px;">
<p style="margin:0 0 12px;font-size:17px;font-weight:700;">¡Hola, equipo Yuselico!</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.65;">${intro}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;"><tr>
<td width="50%" style="background:#edf5fc;padding:18px;border-radius:9px;"><div style="font-size:30px;font-weight:700;color:#102b4b;">${recent.length}</div><div style="font-size:13px;color:#49637e;">Nuevos esta semana</div></td>
<td width="12"></td>
<td width="50%" style="background:#f5f6f8;padding:18px;border-radius:9px;"><div style="font-size:30px;font-weight:700;color:#102b4b;">${historical.length}</div><div style="font-size:13px;color:#49637e;">Histórico acumulado</div></td>
</tr></table>
<h2 style="margin:0 0 8px;font-size:17px;color:#102b4b;">Nuevos esta semana</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:26px;">${nameRows(recent)}</table>
<h2 style="margin:0 0 8px;font-size:17px;color:#102b4b;">Histórico acumulado</h2>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:26px;">${nameRows(historical)}</table>
<p style="margin:0;font-size:15px;font-weight:700;color:#102b4b;">${closing}</p>
<p style="margin:5px 0 0;font-size:14px;color:#49637e;">El equipo de Robin</p>
</td></tr></table></td></tr></table></body></html>`;
  return {
    week, newCount: recent.length, historicalCount: historical.length,
    subject, text, html,
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
    to, subject: `${demo ? '[DEMO] ' : ''}${digest.subject}`, text: digest.text, html: digest.html,
    tag: 'yuselico_weekly_digest',
    ...(!demo ? { idempotencyKey: `yuselico-weekly-${digest.week}` } : {}),
  });
  if (!result.sent) throw new Error(`yuselico_digest_send_failed:${result.reason || 'unknown'}`);
  return { week: digest.week, newCount: digest.newCount, historicalCount: digest.historicalCount, messageId: result.id };
}

module.exports = { buildDigest, isMadridFridayNine, sendYuselicoDigest };
