/**
 * Integración con Holded (facturación) — API v2 (Bearer PAT).
 * Genera, por cada pago cobrado, una factura real en Holded y deja disponible
 * su PDF en el portal del cliente.
 *
 * Migrado de la API v1 (header `key`) a la v2 (header `Authorization: Bearer`).
 * Motivo: la API v1 IGNORA la cuenta contable en la factura (siempre aplicaba la
 * cuenta de venta por defecto "Ventas de mercaderías"). La v2 SÍ respeta la cuenta
 * enviada en cada línea (`items[].account`), por lo que la categorización por tipo
 * de cliente (Delft/Mentoría/Llegada/General) ahora funciona.
 *
 * Env vars:
 *   - HOLDED_API_PAT   (obligatoria; token v2 tipo `pat_...`. Sin ella
 *                       isConfigured()=false y todo degrada con gracia: el pago
 *                       NO se aborta, sólo se omite la factura).
 *   - HOLDED_ACCOUNT_GENERAL/_DELFT/_MENTORIA/_LLEGADA (IDs internos de las cuentas
 *                       del plan contable; la v2 los acepta directamente).
 *
 * Reglas de negocio (sin cambios respecto a v1):
 *   - Contacto: tipo PERSONA, a nombre del cliente/tutor legal del contrato, con su
 *     NIF/DNI y dirección. Se crea UNA vez por usuario (users.holded_contact_id).
 *   - Fecha: día actual. Vencimiento: +7 días.
 *   - Concepto (fijo): "Asesoramiento para estudiar en el extranjero".
 *   - Impuestos: IVA 21% por defecto; 0% si el cliente es de fuera de la UE.
 *   - Total: importe abonado (Holded desglosa base + IVA a partir del precio neto).
 *   - Cuenta contable según tipo de cliente (ver ACCOUNT_BY_TIPO).
 */

const HOLDED_BASE = 'https://api.holded.com/api/v2';

const {
  FISCAL,
  invoiceBreakdown,
  isEuClient,
  taxRateForClient,
} = require('../shared/financial-config.cjs');
const { errorCode } = require('./observability');
const CONCEPTO = FISCAL.concepto;
const IELTS_NOTE = 'Operación exenta de IVA conforme al artículo 20.Uno.9.º de la Ley 37/1992.';
const IELTS_EVALUATION = 'Evaluación inicial de inglés/IELTS';
const IELTS_CLASS = 'Clase de preparación de inglés/IELTS';

// Cuenta contable (Categorización · Cuenta Contable) según el tipo de servicio.
// Valor = ID interno de la cuenta del plan contable de Holded (la v2 lo exige y lo
// respeta). Los números del PGC quedan como fallback documental.
const ACCOUNT_BY_TIPO = {
  general:  process.env.HOLDED_ACCOUNT_GENERAL  || '70500001', // Asesoramiento completo
  delft:    process.env.HOLDED_ACCOUNT_DELFT    || '70500002', // Cliente Delft
  mentoria: process.env.HOLDED_ACCOUNT_MENTORIA || '70500003', // Cliente de mentoría
  llegada:  process.env.HOLDED_ACCOUNT_LLEGADA  || '70500004', // Cliente Pack Llegada
};

function pat() {
  return String(process.env.HOLDED_API_PAT || '').trim();
}

function isConfigured() {
  return !!pat();
}

function norm(s) {
  return String(s == null ? '' : s)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** ¿El cliente tributa en la UE? (España = sí; 'otros' según su país). */
function isEU(user) {
  return isEuClient(user);
}

function taxRateFor(user) {
  return taxRateForClient(user);
}

function accountFor(tipo) {
  return ACCOUNT_BY_TIPO[norm(tipo) || 'general'] || ACCOUNT_BY_TIPO.general;
}

function parseContractData(user) {
  if (!user || !user.contract_data) return {};
  if (typeof user.contract_data === 'object') return user.contract_data;
  try { return JSON.parse(user.contract_data) || {}; } catch (_) { return {}; }
}

function billingHolderName(user) {
  const cd = parseContractData(user);
  const cliente = cd.cliente || {};
  return String(cliente.nombre || [user && user.nombre, user && user.apellidos].filter(Boolean).join(' ') || 'Cliente').trim();
}

function shortLeadId(user) {
  const raw = String(user && user.lead_id || '').trim();
  const digits = raw.replace(/\D/g, '');
  return digits ? digits.slice(-4).padStart(4, '0') : raw;
}

function suffixFor(user) {
  return ` – ${billingHolderName(user)} – ID ${shortLeadId(user)}`;
}

function stripSuffix(value) {
  return String(value || '').replace(/\s+–\s+[^–]+\s+–\s+ID\s+\d{4}\s*$/u, '').trim();
}

function standardConcept(user, payment) {
  const tipo = norm(user && user.tipo);
  const installment = Number(payment && payment.installment);
  const total = tipo === 'llegada' ? 2 : tipo === 'mentoria' ? 1 : 3;
  if (tipo === 'mentoria') return CONCEPTO;
  const labels = tipo === 'llegada'
    ? ['Inicio del servicio', 'Alojamiento reservado']
    : ['Asesoramiento inicial', 'Gestión de postulaciones', 'Admisión confirmada y preparación de llegada'];
  return `${tipo === 'llegada' ? 'Pack Llegada' : 'Servicio de acompañamiento universitario'} – Cuota ${installment}/${total} – ${labels[Math.max(0, installment - 1)] || labels[0]}`;
}

function invoiceConcept(user, payment) {
  const pd = payment && payment.payment_data || {};
  if (pd.ielts_preset === 'evaluation') return IELTS_EVALUATION;
  if (pd.ielts_preset === 'class') return `${IELTS_CLASS} – ${pd.ielts_mode === 'group' ? 'Grupo' : 'Individual'} – ${Number(pd.ielts_hours)} horas`;
  if (payment && payment.concept) return stripSuffix(payment.concept);
  return standardConcept(user, payment);
}

// Códigos de impuesto que espera la v2 en `items[].taxes` (array de strings).
// 21% -> ['s_iva_21']; 0% (fuera de la UE) -> [] (sin impuesto).
function taxCodesFor(rate) {
  return rate ? ['s_iva_' + rate] : [];
}

// Fecha en formato ISO YYYY-MM-DD que espera la v2 (a partir de epoch en segundos).
function ymd(unixSec) {
  return new Date(unixSec * 1000).toISOString().slice(0, 10);
}

function countryName(user) {
  if (user && user.pais && (
    ['otros', 'latam', 'international'].includes(norm(user.origin)) || !isEU(user)
  )) {
    return String(user.pais);
  }
  return 'España';
}

async function holdedFetch(path, { method = 'GET', body, raw = false } = {}) {
  if (!isConfigured()) throw new Error('holded_not_configured');
  const res = await fetch(HOLDED_BASE + path, {
    method,
    headers: {
      Authorization: 'Bearer ' + pat(),
      Accept: raw ? 'application/pdf, application/json' : 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (raw) {
    if (!res.ok) {
      const t = await res.text();
      const err = new Error('holded_http_' + res.status);
      try { err.detail = JSON.parse(t); } catch (_) { err.detail = t; }
      throw err;
    }
    return Buffer.from(await res.arrayBuffer());
  }
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (_) { data = { raw: text }; }
  if (!res.ok) {
    const err = new Error('holded_http_' + res.status);
    err.detail = data;
    throw err;
  }
  return data;
}

/**
 * Garantiza un contacto (tipo persona) en Holded para el usuario.
 * Reutiliza users.holded_contact_id si ya existe.
 */
async function ensureContact(sb, user) {
  if (user.holded_contact_id) return user.holded_contact_id;

  const cd = user.contract_data || {};
  const cliente = cd.cliente || {};
  const name = (cliente.nombre
    || [user.nombre, user.apellidos].filter(Boolean).join(' ')
    || 'Cliente').trim();
  const code = String(cliente.dni || user.dni_numero || '').trim().toUpperCase();
  const address = ((cd.alumno && cd.alumno.direccion) || user.direccion || '').trim();

  const payload = {
    name,
    code,                 // NIF / DNI
    email: user.email || '',
    type: 'client',
    is_person: true,      // contacto tipo PERSONA (v2: snake_case)
    bill_address: {
      address,
      country: countryName(user),
    },
  };

  const r = await holdedFetch('/contacts', { method: 'POST', body: payload });
  const id = r && (r.id || (r.contact && r.contact.id));
  if (!id) { const e = new Error('holded_contact_no_id'); e.detail = r; throw e; }

  await sb.from('users').update({ holded_contact_id: id }).eq('id', user.id);
  return id;
}

/**
 * Crea en Holded la factura correspondiente a un pago.
 * Devuelve { invoiceId, docNumber, taxRate }.
 */
async function createInvoiceForPayment(sb, user, payment) {
  const contactId = await ensureContact(sb, user);
  const pd = payment.payment_data || {};
  const isIelts = pd.ielts_preset === 'evaluation' || pd.ielts_preset === 'class';
  const explicitRate = isIelts ? 0 : (pd.tax_rate === 'exempt' ? 0 : pd.tax_rate);
  const breakdown = invoiceBreakdown(payment.amount, user, explicitRate);
  const rate = breakdown.taxRate;
  // Holded espera el precio NETO unitario; para LATAM coincide con el total
  // porque la factura se emite sin IVA.
  const net = breakdown.base;
  const now = Math.floor(Date.now() / 1000);
  const due = now + 7 * 24 * 3600;

  // La v2 acepta directamente el ID interno de la cuenta del plan contable.
  const acct = accountFor(user.tipo);

  const body = {
    contact_id: contactId,
    date: ymd(now),
    due_date: ymd(due),
    currency: String(payment.currency || 'eur').toLowerCase(),
    notes: isIelts ? IELTS_NOTE : 'Cliente Robin ' + (user.lead_id || user.id || ''),
    retention: 0,
    items: [{
      name: invoiceConcept(user, payment) + suffixFor(user),
      desc: '',
      units: 1,
      price: net,
      taxes: taxCodesFor(rate),
      account: acct,
    }],
  };

  const r = await holdedFetch('/invoices', { method: 'POST', body });
  const invoiceId = r && (r.id || r.invoice_id || (r.invoice && r.invoice.id));
  if (!invoiceId) { const e = new Error('holded_invoice_no_id'); e.detail = r; throw e; }

  // La v2 al crear devuelve sólo el id; leemos el documento para el nº (null si borrador).
  let docNumber = null;
  try {
    const doc = await holdedFetch('/invoices/' + encodeURIComponent(invoiceId));
    docNumber = (doc && (doc.document_number || doc.docNumber)) || null;
  } catch (_) { /* no crítico */ }

  return { invoiceId, docNumber, taxRate: rate };
}

/** Descarga el PDF de una factura de Holded (devuelve base64 o null). */
async function getInvoicePdf(invoiceId) {
  try {
    const buf = await holdedFetch('/invoices/' + encodeURIComponent(invoiceId) + '/pdf', { raw: true });
    return buf && buf.length ? buf.toString('base64') : null;
  } catch (_) {
    return null;
  }
}

/**
 * Genera (idempotente, best-effort) la factura de Holded para una fila de payments.
 * Guarda holded_invoice_id / holded_invoice_num dentro de payments.payment_data.
 * Nunca lanza: cualquier fallo se registra en webhook_log y se devuelve {ok:false}.
 */
async function generateInvoiceForPaymentRow(sb, paymentId) {
  if (!isConfigured()) {
    try {
      await sb.from('webhook_log').insert({
        source: 'holded',
        payload: { payment_id: paymentId },
        result: 'skipped',
        message: 'not_configured: falta HOLDED_API_PAT en el entorno',
      });
    } catch (error) { console.warn("[optional_operation_failed]", error && error.message); }
    console.warn('[holded] skipped: HOLDED_API_PAT no configurada');
    return { skipped: true, reason: 'not_configured' };
  }
  try {
    const { data: p, error } = await sb.from('payments').select('*').eq('id', paymentId).single();
    if (error || !p) return { ok: false, reason: 'payment_not_found' };
    const pd = p.payment_data || {};
    // Nunca emitir documentación fiscal real por un cobro de Sandbox.
    if (pd.simulated === true) {
      try {
        await sb.from('webhook_log').insert({
          source: 'holded',
          payload: { payment_id: p.id },
          result: 'skipped',
          message: 'simulated_payment',
        });
      } catch (error) { console.warn('[optional_operation_failed]', error && error.message); }
      return { skipped: true, reason: 'simulated_payment' };
    }
    if (pd.holded_invoice_id) return { ok: true, already: true, invoice_id: pd.holded_invoice_id };

    const { data: u, error: e2 } = await sb
      .from('users')
      .select('id, lead_id, email, nombre, apellidos, dni_numero, direccion, tipo, origin, pais, has_eu_id, holded_contact_id, contract_data')
      .eq('id', p.user_id)
      .single();
    if (e2 || !u) return { ok: false, reason: 'user_not_found' };

    const inv = await createInvoiceForPayment(sb, u, p);
    const newPd = {
      ...pd,
      holded_invoice_id: inv.invoiceId,
      holded_invoice_num: inv.docNumber,
      holded_tax_rate: inv.taxRate,
      holded_at: new Date().toISOString(),
    };
    await sb.from('payments').update({ payment_data: newPd }).eq('id', p.id);
    try {
      await sb.from('webhook_log').insert({
        source: 'holded',
        payload: { payment_id: p.id, user_id: u.id, installment: p.installment },
        result: 'ok',
        message: 'invoice_created',
      });
    } catch (error) { console.warn("[optional_operation_failed]", error && error.message); }
    return { ok: true, invoice_id: inv.invoiceId, invoice_num: inv.docNumber };
  } catch (e) {
    try {
      await sb.from('webhook_log').insert({
        source: 'holded',
        payload: { payment_id: paymentId },
        result: 'error',
        message: errorCode(e, 'holded_error'),
      });
    } catch (error) { console.warn("[optional_operation_failed]", error && error.message); }
    console.error('[holded] invoice error:', errorCode(e, 'holded_error'));
    return { ok: false, reason: 'holded_error', error: errorCode(e, 'holded_error') };
  }
}

module.exports = {
  isConfigured,
  isEU,
  taxRateFor,
  accountFor,
  ensureContact,
  createInvoiceForPayment,
  getInvoicePdf,
  generateInvoiceForPaymentRow,
  taxCodesFor,
  CONCEPTO,
  ACCOUNT_BY_TIPO,
  billingHolderName,
  shortLeadId,
  invoiceConcept,
  IELTS_NOTE,
};
