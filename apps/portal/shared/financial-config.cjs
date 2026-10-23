// Shared financial config values or helpers used across this runtime.
const CURRENCY = 'EUR';
const DELFT_PRICE_VERSION = 'delft-2999-v1';
const GENERAL_PRICE_VERSION = 'general-1999-2399-2499-v1';
const GENERAL_HISTORICAL_PRICE_VERSION = 'general-1700-2000-2100-v1';

const APPLICATION_TOTALS = Object.freeze({
  general: Object.freeze({ 1: 1999, 2: 2399, 3: 2499 }),
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

function applicationPlan(tipo, numCarreras, origin, hasEuId, pais) {
  const client = { tipo, origin, has_eu_id: hasEuId, pais };
  if (usesInternational2700Plan(client)) {
    return splitEqual(APPLICATION_TOTALS.international, 3);
  }
  const key = String(tipo || 'general').toLowerCase();
  const careers = Number(numCarreras) || 1;
  if (key === 'general') {
    return generalPlan(APPLICATION_TOTALS.general, careers, true);
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

/** Los perfiles sin contrato firmado siempre reciben las tarifas vigentes. */
function applicationPlanForUser(user) {
  const source = user || {};
  const key = String(source.tipo || 'general').toLowerCase();
  const pricingVersion = contractPricingVersion(source.contract_data);
  const isInternational = usesInternational2700Plan(source);
  // Conserva el plan histórico únicamente para expedientes ya firmados.
  if (source.contract_signed && key === 'general' && !isInternational && pricingVersion !== GENERAL_PRICE_VERSION) {
    return generalPlan(HISTORICAL_GENERAL_TOTALS, source.num_carreras);
  }
  if (key === 'delft' && source.contract_signed && pricingVersion !== DELFT_PRICE_VERSION) {
    return [
      { installment: 1, amount: 933 },
      { installment: 2, amount: 933 },
      { installment: 3, amount: 933 },
    ];
  }
  return applicationPlan(source.tipo, source.num_carreras, source.origin, source.has_eu_id, source.pais);
}

module.exports = {
  APPLICATION_TOTALS,
  CURRENCY,
  DELFT_PRICE_VERSION,
  GENERAL_PRICE_VERSION,
  GENERAL_HISTORICAL_PRICE_VERSION,
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
  splitEqual,
  taxRateForClient,
  usesInternational2700Plan,
};
