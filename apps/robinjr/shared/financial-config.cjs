// Shared financial config values or helpers used across this runtime.
const CURRENCY = 'EUR';
const DELFT_PRICE_VERSION = 'delft-2999-v1';
const GENERAL_PRICE_VERSION = 'robin-jr-499-3x-v1';
const ROBIN_JR_TOTAL = 1499.99;

const APPLICATION_TOTALS = Object.freeze({
  general: Object.freeze({ 1: ROBIN_JR_TOTAL, 2: ROBIN_JR_TOTAL, 3: ROBIN_JR_TOTAL }),
  delft: 2999,
  llegada: 1700,
  mentoria: 450,
  international: 2700,
});

const HISTORICAL_GENERAL_TOTALS = Object.freeze({ 1: 1700, 2: 2000, 3: 2100 });

const FISCAL = Object.freeze({
  razon_social: 'PROJECT ROBIN STUDENTS MOBILITY S.L.',
  cif: 'B75355057',
  direccion: 'Calle Covarrubias 9, 28010, Madrid, Comunidad de Madrid, España',
  iva: 21,
  concepto: 'Asesoramiento para estudiar en el extranjero',
});

const EU_COUNTRIES = new Set([
  'alemania', 'germany', 'de',
  'austria', 'at',
  'belgica', 'belgium', 'be',
  'bulgaria', 'bg',
  'chipre', 'cyprus', 'cy',
  'croacia', 'croatia', 'hr',
  'dinamarca', 'denmark', 'dk',
  'eslovaquia', 'slovakia', 'sk',
  'eslovenia', 'slovenia', 'si',
  'espana', 'spain', 'es',
  'estonia', 'ee',
  'finlandia', 'finland', 'fi',
  'francia', 'france', 'fr',
  'grecia', 'greece', 'gr',
  'hungria', 'hungary', 'hu',
  'irlanda', 'ireland', 'ie',
  'italia', 'italy', 'it',
  'letonia', 'latvia', 'lv',
  'lituania', 'lithuania', 'lt',
  'luxemburgo', 'luxembourg', 'lu',
  'malta', 'mt',
  'paises bajos', 'holanda', 'netherlands', 'nl',
  'polonia', 'poland', 'pl',
  'portugal', 'pt',
  'republica checa', 'chequia', 'czech republic', 'czechia', 'cz',
  'rumania', 'romania', 'ro',
  'suecia', 'sweden', 'se',
]);

// Países que Robin trata comercialmente como LATAM. Se incluyen nombres en
// español/inglés y códigos ISO-2 para tolerar datos procedentes de formularios
// y CRM distintos.
const LATAM_COUNTRIES = new Set([
  'argentina', 'ar',
  'bolivia', 'bo',
  'brasil', 'brazil', 'br',
  'chile', 'cl',
  'colombia', 'co',
  'costa rica', 'cr',
  'cuba', 'cu',
  'ecuador', 'ec',
  'el salvador', 'sv',
  'guatemala', 'gt',
  'haiti', 'ht',
  'honduras', 'hn',
  'mexico', 'mx',
  'nicaragua', 'ni',
  'panama', 'pa',
  'paraguay', 'py',
  'peru', 'pe',
  'puerto rico', 'pr',
  'republica dominicana', 'dominican republic', 'do',
  'uruguay', 'uy',
  'venezuela', 've',
]);

function normalizeLocation(value) {
  return String(value == null ? '' : value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isLatamClient(user) {
  const source = user || {};
  const labels = [source.origin, source.region, source.tipo, source.segment]
    .map(normalizeLocation);
  if (labels.some((label) => label === 'latin america' || label === 'latinoamerica' || /(^|\s)latam($|\s)/.test(label))) {
    return true;
  }
  return LATAM_COUNTRIES.has(normalizeLocation(source.pais || source.country));
}

function usesInternational2700Plan(user) {
  const source = user || {};
  return isLatamClient(source)
    || (normalizeLocation(source.origin) === 'otros' && source.has_eu_id !== true);
}

function isEuClient(user) {
  const source = user || {};
  if (isLatamClient(source)) return false;
  const origin = normalizeLocation(source.origin);
  if (origin !== 'otros' && origin !== 'international') return true;
  return EU_COUNTRIES.has(normalizeLocation(source.pais || source.country));
}

function taxRateForClient(user) {
  return isEuClient(user) ? FISCAL.iva : 0;
}

function invoiceBreakdown(amount, user, explicitTaxRate) {
  const parsedRate = Number(explicitTaxRate);
  const rate = isLatamClient(user)
    ? 0
    : explicitTaxRate !== null && explicitTaxRate !== undefined && Number.isFinite(parsedRate)
      ? parsedRate
      : taxRateForClient(user);
  const gross = Math.round(Number(amount || 0) * 100) / 100;
  const base = Math.round((gross / (1 + rate / 100)) * 100) / 100;
  return {
    gross,
    base,
    tax: Math.round((gross - base) * 100) / 100,
    taxRate: rate,
  };
}

function splitEqual(total, count) {
  const each = Math.round((Number(total) / count) * 100) / 100;
  const installments = [];
  let accumulated = 0;
  for (let installment = 1; installment <= count; installment++) {
    const amount = installment === count
      ? Math.round((Number(total) - accumulated) * 100) / 100
      : each;
    if (installment !== count) accumulated = Math.round((accumulated + amount) * 100) / 100;
    installments.push({ installment, amount });
  }
  return installments;
}

function generalPlan(totals, numCarreras, remainderToLast = false) {
  const careers = Number(numCarreras) || 1;
  const total = totals[careers] || totals[1];
  const firstCents = Math.round((totals[1] * 100) / 3);
  const remainderCents = Math.round(total * 100) - firstCents;
  const secondCents = remainderToLast
    ? Math.floor(remainderCents / 2)
    : Math.round(remainderCents / 2);
  return [
    { installment: 1, amount: firstCents / 100 },
    { installment: 2, amount: secondCents / 100 },
    { installment: 3, amount: (remainderCents - secondCents) / 100 },
  ];
}

function robinJrPlan() {
  return [
    { installment: 1, amount: 500 },
    { installment: 2, amount: 500 },
    { installment: 3, amount: 499.99 },
  ];
}

function applicationPlan(tipo, numCarreras, origin, hasEuId, pais) {
  const client = { tipo, origin, has_eu_id: hasEuId, pais };
  if (usesInternational2700Plan(client)) {
    return splitEqual(APPLICATION_TOTALS.international, 3);
  }
  const key = String(tipo || 'general').toLowerCase();
  const careers = Number(numCarreras) || 1;
  if (key === 'general') {
    return robinJrPlan();
  }
  if (key === 'delft') {
    return [
      { installment: 1, amount: 999 },
      { installment: 2, amount: 1000 },
      { installment: 3, amount: 1000 },
    ];
  }
  if (key === 'llegada') return splitEqual(APPLICATION_TOTALS.llegada, 2);
  if (key === 'mentoria') return splitEqual(APPLICATION_TOTALS.mentoria, 1);
  return applicationPlan('general', careers);
}

function contractPricingVersion(contractData) {
  if (!contractData) return null;
  if (typeof contractData === 'string') {
    try { return JSON.parse(contractData).pricing_version || null; }
    catch (_) { return null; }
  }
  return contractData.pricing_version || null;
}

function pricingVersionForNewUser(tipo) {
  const key = String(tipo || 'general').toLowerCase();
  if (key === 'general') return GENERAL_PRICE_VERSION;
  if (key === 'delft') return DELFT_PRICE_VERSION;
  return null;
}

/**
 * Conserva el plan histórico de Delft en contratos ya firmados antes del
 * cambio a 2.999 €. Los clientes sin contrato firmado usan siempre el precio
 * vigente, y los contratos nuevos quedan marcados con DELFT_PRICE_VERSION.
 */
function applicationPlanForUser(user) {
  // This repository is the Robin Jr portal: every program uses the same
  // three fixed installments, regardless of legacy package metadata.
  return robinJrPlan();
}

module.exports = {
  APPLICATION_TOTALS,
  CURRENCY,
  DELFT_PRICE_VERSION,
  GENERAL_PRICE_VERSION,
  ROBIN_JR_TOTAL,
  HISTORICAL_GENERAL_TOTALS,
  FISCAL,
  EU_COUNTRIES,
  LATAM_COUNTRIES,
  applicationPlan,
  applicationPlanForUser,
  contractPricingVersion,
  invoiceBreakdown,
  isEuClient,
  isLatamClient,
  normalizeLocation,
  pricingVersionForNewUser,
  robinJrPlan,
  splitEqual,
  taxRateForClient,
  usesInternational2700Plan,
};
