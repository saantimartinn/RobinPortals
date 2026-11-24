// The supplied eight-piece Holanda handoff; no generated commercial copy.
const { createHash } = require('node:crypto');
const templates = require('./lead-reactivation-templates.json');
const { detectedCourse, isFirstBachillerato } = require('./crm-lead-ingest');

const CAMPAIGN_ID = 'holanda-inactive-30d-v1';
const FROM = 'Project Robin <no-reply@project-robin.com>';
const REPLY_TO = 'hello@project-robin.com';
const TEST_TO = 'manuelvillamuriel@gmail.com';
const BOOKING_URL = 'https://project-robin.com/contacto/#reserva';
const COMPANY_FOOTER = 'PROJECT ROBIN STUDENTS MOBILITY S.L. · NIF B75355057 · Calle Covarrubias 9, 28010 Madrid, España.';
// Confirmed by the owner on 24/11/2026. Do not infer a destination from notes.
const HOLANDA_CAMPAIGNS = ['Sociales - Video 15/09/2026', 'Webinar 10-10 Video y carrousel', 'Psico - Video 25/09/2026', 'Campaña continua Candela'];
const DAY = 86400000;
const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const validEmail = value => /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(normalizeEmail(value));

function isHolandaLead(lead, confirmedLeadIds = []) {
  const payload = lead.source_payload || {};
  const destination = payload.study_country || payload.destination || payload.destination_country;
  if (destination) return ['holanda', 'paises bajos', 'netherlands', 'the netherlands', 'nl'].includes(normalized(destination));
  if (confirmedLeadIds.includes(lead.id)) return true;
  if (normalized(lead.lead_type) === 'delft') return true;
  const campaign = normalized(payload.campaign_name || lead.campaign_notion_urls?.[0]);
  if (HOLANDA_CAMPAIGNS.some(value => normalized(value) === campaign)) return true;
  try {
    const url = new URL(payload.page_url, 'https://project-robin.com');
    return ['project-robin.com', 'www.project-robin.com'].includes(url.hostname)
      && ['http:', 'https:'].includes(url.protocol)
      && /^\/(veteaholanda|vaparaholanda|vaparaaholanda|estudiaenholanda)\/?$/i.test(url.pathname);
  } catch (_) { return false; }
}

function ineligibleReason(lead, now = new Date(), confirmedLeadIds = []) {
  const p = lead.source_payload || {};
  if (lead.is_test || p.simulated || p.is_test) return 'test';
  if (!validEmail(lead.email)) return 'invalid_email';
  if (p.unsubscribed || p.opt_out || p.bounced || p.complained) return 'suppressed';
  if (lead.inside_at || lead.first_payment_received || p.target_user_id || Object.values(p.portal_accounts || {}).some(Boolean)) return 'converted';
  if ((lead.crm_stage || 'Por contactar') !== 'Por contactar' || /^(LOST|INSIDE)/i.test(lead.lifecycle || '')) return 'closed_or_contacted';
  if ((lead.owner_names || []).some(value => String(value).trim())) return 'assigned';
  if (lead.contact_at) return 'human_contact';
  if (p.retargeting_reservation) return 'booking';
  if (p.commercial_sequence && p.commercial_sequence !== CAMPAIGN_ID) return 'other_sequence';
  const entry = Date.parse(lead.source_created_at || lead.created_at || '');
  if (!Number.isFinite(entry) || now.getTime() - entry <= 30 * DAY) return 'not_overdue';
  if (!isHolandaLead(lead, confirmedLeadIds)) return 'destination_unconfirmed';
  return null;
}

function madridDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function isSendTurn(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(p => [p.type, p.value]));
  return parts.hour === '20' && parts.minute === '00';
}

function structuredValue(lead, pattern) {
  const p = lead.source_payload || {};
  const fields = p.field_data || {};
  const entries = Array.isArray(fields) ? fields.map(field => [field.name, field.values]) : Object.entries(fields);
  const item = entries.find(([key]) => pattern.test(normalized(key).replace(/_/g, ' ')));
  const value = item?.[1];
  return (Array.isArray(value) ? value.join(', ') : typeof value === 'string' ? value : '').trim();
}

function personalText(lead, number) {
  const p = lead.source_payload || {};
  const rawCareer = structuredValue(lead, /carreras?.*interes|interes.*carreras?|^career$|^interests?$/) || p.interests;
  const career = typeof rawCareer === 'string' && rawCareer.length <= 100 && /^[\p{L}\p{N}\s,./()+&-]+$/u.test(rawCareer)
    ? rawCareer.trim().replace(/\bbussines\b/gi, 'Business') : '';
  const concern = normalized([structuredValue(lead, /inquietud|preocupacion|duda|concern/), lead.comment, lead.first_contact_comment].filter(Boolean).join(' '));
  if (number === 1 && career) return `Nos contaste que te interesa ${career}. ¿Sigue siendo una opción para ti?`;
  if (number === 2 && /presupuesto|becas?|costes?|precio/.test(concern)) return 'También nos preguntaste por los costes. Podemos empezar por una estimación para tu caso.';
  if (number === 3 && career) return `Si ${career} sigue en tu lista, podemos comparar programas que se llaman parecido pero enseñan cosas distintas.`;
  if (number === 4) {
    const course = normalized(detectedCourse({ payload: p })).replace(/[º°]/g, 'o');
    const first = isFirstBachillerato(course), second = /\b(?:2o?|segundo)\s*(?:de\s+)?bach/.test(course);
    if (first && !second) return 'Si estás en 1.º, tienes margen para elegir con criterio; no tomes un plazo de 2.º como si fuera el tuyo.';
    if (second && !first) return 'Si quieres empezar el próximo curso, revisemos ahora las fechas de tus programas.';
  }
  if (number === 5 && /acceso|admision|notas|idioma|ingles/.test(concern)) return 'Nos preguntaste por los requisitos de acceso. Podemos mirar los de tus programas concretos.';
  if (number === 6 && /vivienda|alojamiento|habitacion|residencia/.test(concern)) return 'Si la vivienda te preocupa, pongamos esa parte del presupuesto y del calendario encima de la mesa.';
  if (number === 7 && career && structuredValue(lead, /notas|calificaciones|academic/)) return `Con ${career} en mente, lo útil es revisar tus opciones reales, no aplicar un porcentaje general a tu caso.`;
  if (number === 8 && career) return `Si ${career} sigue interesándote, podemos retomarlo en una llamada breve.`;
  return '';
}

function renderMessage(lead, number, { unsubscribeUrl, test = false } = {}) {
  const template = templates.find(item => item.number === number);
  if (!template) throw new Error('invalid_message_number');
  const url = new URL(unsubscribeUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid_unsubscribe_url');
  const firstName = String(lead.name || '').trim().split(/\s+/)[0];
  const greeting = /^[\p{L}][\p{L}'’-]{1,29}$/u.test(firstName) ? ` ${firstName}` : '';
  const personal = personalText(lead, number);
  const footer = `${test ? 'PRUEBA · No estás inscrito en esta secuencia. · ' : ''}${COMPANY_FOOTER}`;
  const values = { SALUDO: greeting, PERSONAL_BLOCK: personal ? `<p style="margin:0 0 19px">${escapeHtml(personal)}</p>` : '', PERSONAL_TEXT: personal, BOOKING_URL, UNSUBSCRIBE_URL: url.href, COMPANY_FOOTER: footer };
  const interpolate = (content, html) => content.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error('unknown_template_placeholder');
    return html && key !== 'PERSONAL_BLOCK' ? escapeHtml(values[key]) : values[key];
  });
  return { from: FROM, reply_to: REPLY_TO, to: test ? TEST_TO : normalizeEmail(lead.email), subject: `${test ? '[PRUEBA] ' : ''}${template.subject}`, html: interpolate(template.html, true), text: interpolate(template.text, false), tag: CAMPAIGN_ID };
}

function testIdempotencyKey(message) {
  return `${CAMPAIGN_ID}/test/${createHash('sha256').update(JSON.stringify(message)).digest('hex')}`;
}

module.exports = { CAMPAIGN_ID, FROM, REPLY_TO, TEST_TO, BOOKING_URL, DAY, templates, escapeHtml, normalizeEmail, validEmail, isHolandaLead, ineligibleReason, madridDate, isSendTurn, renderMessage, testIdempotencyKey };
