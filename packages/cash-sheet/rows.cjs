// Proyección de los datos del portal sobre la pestaña «Cambios para Manu».
const SOURCE_LABELS = Object.freeze({
  meta: 'Meta',
  referral: 'Referido',
  referido: 'Referido',
  referidos: 'Referido',
  organic_social: 'RRSS',
  organico_rrss: 'RRSS',
  rrss: 'RRSS',
  social_organic: 'RRSS',
  schools: 'Centros educativos',
  school: 'Centros educativos',
  colegio: 'Centros educativos',
  colegios: 'Centros educativos',
  website: 'Web',
  organic: 'Orgánico',
  organico: 'Orgánico',
});

function sheetDate(iso) {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return '';
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(iso));
}

function clientType(user, { portalKind = 'alumno', isLatam = false, international = false } = {}) {
  if (portalKind === 'robinjr') return 'Robin Junior';
  if (isLatam) return 'LATAM';
  if (international) return 'Internacional';
  return ({ general: 'General', delft: 'Delft', llegada: 'Pack llegada', mentoria: 'Mentoría' })[
    String(user.tipo || '').toLowerCase()
  ] || 'Otro';
}

function market(user) {
  const country = String(user.pais || '').trim();
  if (country) return country;
  return user.origin === 'espana' ? 'España' : '';
}

function acquisition(attribution) {
  const source = String(attribution?.source || '').trim().toLowerCase();
  const utmSource = String(attribution?.utm_source || '').trim().toLowerCase();
  const metaUtm = /^(meta|facebook|instagram|fb|ig)$/.test(utmSource);
  const channel = ['meta', 'facebook', 'instagram'].includes(source) ||
    attribution?.ad_id || attribution?.campaign_id ||
    (metaUtm && !['organic_social', 'organico_rrss', 'rrss', 'social_organic'].includes(source))
    ? 'Meta' : SOURCE_LABELS[source] || '';
  const campaign = channel === 'Meta'
    ? String(attribution?.campaign_name || attribution?.utm_campaign || attribution?.campaign || 'NA').trim()
    : '';
  return { channel, campaign };
}

function paymentSlot(payments, installment) {
  const p = (payments || []).find((item) => Number(item.installment) === installment);
  const invoice = p?.payment_data?.holded_invoice_num || '';
  return {
    date: p?.status === 'paid' ? sheetDate(p.paid_at) : '',
    invoice: String(invoice || '').trim(),
  };
}

function buildChangesRow(user, payments, paymentRow, options = {}) {
  const { channel, campaign } = acquisition(options.attribution);
  return {
    ...paymentRow,
    slots: [1, 2, 3].map((i) => paymentSlot(payments, i)),
    signatureDate: user.contract_signed ? sheetDate(user.contract_signed_at) : '',
    type: clientType(user, options),
    channel,
    campaign,
    market: market(user),
  };
}

module.exports = { acquisition, buildChangesRow, clientType, market, paymentSlot, sheetDate };
