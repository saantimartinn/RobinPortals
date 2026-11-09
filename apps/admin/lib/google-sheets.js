/**
 * Google Sheets helper — refleja cada cliente asignado en la hoja de control
 * de pagos/facturación (la misma que el equipo usa manualmente).
 *
 * Autenticación: OAuth 2.0 con el MISMO refresh token que Google Drive
 * (hello@project-robin.com). Env vars:
 *   - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN  (ya existen)
 *   - GOOGLE_SHEETS_SPREADSHEET_ID   (ID de la hoja de control)
 *   - GOOGLE_SHEETS_GID              (opcional, id numérico de la pestaña; por
 *                                     defecto 2041257143)
 *   - GOOGLE_SHEETS_TAB             (opcional, nombre exacto de la pestaña; si
 *                                     se define, se usa en vez del GID)
 *
 * IMPORTANTE (deploy): el refresh token de Drive debe re-consentirse añadiendo
 * el scope `https://www.googleapis.com/auth/spreadsheets`, y la hoja debe ser
 * editable por hello@project-robin.com. Si falta el scope, las llamadas
 * devuelven 403 y el helper simplemente loguea (best-effort, no rompe nada).
 *
 * Diseño "best-effort" idéntico al de Drive: si Sheets falla, los flujos de
 * asignación/pago/contrato NO se rompen; solo se loguea el error.
 *
 * Layout de la hoja 26-27 (columnas A..N, cabecera en la fila con "Asesor"):
 *   A Asesor · B PR · C alumno · D Pago1 · E Estado1 · F Pago2 · G Estado2 ·
 *   H Pago3 · I Estado3 · J Pagado(*) · K Restante(*) · L Cobros ·
 *   M Sin IVA(*) · N Contrato
 *   (*) columnas con FÓRMULA en las filas plantilla: NO se sobreescriben cuando
 *       reutilizamos una fila existente; se dejan recalcular solas.
 */

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CHANGES_SHEET_GID = 288896043;
const { FISCAL } = require('../shared/financial-config.cjs');
const { isLatamClient, usesInternational2700Plan } = require('../../portal/shared/financial-config.cjs');
const { buildChangesRow } = require('../../../packages/cash-sheet/rows.cjs');
const { attributionForUser } = require('../../../packages/cash-sheet/attribution.cjs');
const { runInApp } = require('../../../site/app-env.cjs');
const { isPaymentAnnulled } = require('./payments');
const TAX_FACTOR = 1 + (FISCAL.iva / 100);

let _cachedToken = null;
let _cachedTokenExp = 0;
const _cachedTabTitles = new Map();

function googleCredentials() {
  const own = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  };
  if (own.clientId && own.clientSecret && own.refreshToken) return own;
  return runInApp('portal', () => ({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  }));
}

function isConfigured() {
  const credentials = googleCredentials();
  return !!(credentials.clientId && credentials.clientSecret && credentials.refreshToken &&
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID);
}

async function getAccessToken() {
  if (!isConfigured()) throw new Error('google_sheets_not_configured');
  const credentials = googleCredentials();
  const now = Date.now();
  if (_cachedToken && now < _cachedTokenExp - 60000) return _cachedToken;
  const body = new URLSearchParams({
    client_id: String(credentials.clientId || '').trim(),
    client_secret: String(credentials.clientSecret || '').trim(),
    refresh_token: String(credentials.refreshToken || '').trim(),
    grant_type: 'refresh_token',
  });
  const resp = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.access_token) {
    throw new Error('google_oauth_failed: ' + (data.error_description || data.error || resp.status));
  }
  _cachedToken = data.access_token;
  _cachedTokenExp = now + (Number(data.expires_in || 3600) * 1000);
  return _cachedToken;
}

function spreadsheetId() {
  return String(process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '').trim();
}

// Devuelve el título de la pestaña destino. Prioridad: GOOGLE_SHEETS_TAB ->
// resolver por GID (default 2041257143) contra la API.
async function resolveTabTitle(token, gid = Number(process.env.GOOGLE_SHEETS_GID || 2041257143)) {
  if (gid !== CHANGES_SHEET_GID && process.env.GOOGLE_SHEETS_TAB) return String(process.env.GOOGLE_SHEETS_TAB).trim();
  if (_cachedTabTitles.has(gid)) return _cachedTabTitles.get(gid);
  const url = `${SHEETS_API}/${spreadsheetId()}?fields=sheets(properties(sheetId,title))`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error('sheets_meta_failed: ' + (data.error && data.error.message || resp.status));
  const match = (data.sheets || []).find((s) => s.properties && s.properties.sheetId === gid);
  if (!match) throw new Error('sheets_tab_not_found_for_gid_' + gid);
  _cachedTabTitles.set(gid, match.properties.title);
  return match.properties.title;
}

function a1(tab, range) {
  // Escapa comillas simples del título y lo encierra en comillas.
  return `'${String(tab).replace(/'/g, "''")}'!${range}`;
}

async function getRange(token, tab, range) {
  const url = `${SHEETS_API}/${spreadsheetId()}/values/${encodeURIComponent(a1(tab, range))}?majorDimension=ROWS`;
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error('sheets_get_failed: ' + (data.error && data.error.message || resp.status));
  return data.values || [];
}

async function batchUpdate(token, tab, updates) {
  // updates: [{ range: 'A5:I5', values: [[...]] }, ...]  (range relativo a la pestaña)
  const body = {
    valueInputOption: 'USER_ENTERED',
    data: updates.map((u) => ({ range: a1(tab, u.range), majorDimension: 'ROWS', values: u.values })),
  };
  const url = `${SHEETS_API}/${spreadsheetId()}/values:batchUpdate`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error('sheets_update_failed: ' + (data.error && data.error.message || resp.status));
  return data;
}

async function appendRow(token, tab, rowValues, lastColumn = 'N') {
  const url = `${SHEETS_API}/${spreadsheetId()}/values/${encodeURIComponent(a1(tab, `A:${lastColumn}`))}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ majorDimension: 'ROWS', values: [rowValues] }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error('sheets_append_failed: ' + (data.error && data.error.message || resp.status));
  return data;
}

// --- Mapeos de negocio -----------------------------------------------------

// assigned_to (email) -> nombre del asesor tal y como aparece en la hoja.
function advisorName(email) {
  const e = String(email || '').toLowerCase().trim();
  const known = {
    'noel@project-robin.com': 'Noel',
    'maria@project-robin.com': 'Maria',
    'manuel@project-robin.com': 'Manuel',
  };
  if (known[e]) return known[e];
  const local = e.split('@')[0] || '';
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : '';
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Construye la fila de la hoja a partir del cliente y sus pagos (tabla payments).
 * Usa exactamente los mismos datos que muestra el portal para garantizar que la
 * información coincide. Las cuotas inexistentes (planes de 1-2 cuotas) se rellenan
 * con importe 0 y Estado "No" (decisión del usuario).
 */
function buildRow(user, payments) {
  const activePayments = (payments || []).filter((p) => !isPaymentAnnulled(p));
  const byInst = new Map(activePayments.map((p) => [Number(p.installment), p]));
  const slot = (i) => {
    const p = byInst.get(i);
    return {
      amount: p ? round2(p.amount) : 0,
      paid: !!(p && p.status === 'paid'),
    };
  };
  const s1 = slot(1), s2 = slot(2), s3 = slot(3);

  // Total pagado = suma de TODAS las cuotas en estado 'paid' (incluye extras > 3).
  const totalPagado = round2(
    activePayments
      .filter((p) => p.status === 'paid')
      .reduce((s, p) => s + Number(p.amount || 0), 0)
  );
  // Cobro (bruto) = suma de TODAS las cuotas del plan (incluye extras).
  const cobro = round2(
    activePayments.reduce((s, p) => s + Number(p.amount || 0), 0)
  );
  const restante = round2(cobro - totalPagado);
  const facturacion = round2(cobro / TAX_FACTOR);

  return {
    asesor: advisorName(user.assigned_to),
    pr: user.lead_id != null ? String(user.lead_id) : '',
    alumno: [user.nombre, user.apellidos].filter(Boolean).join(' ').trim(),
    pago1: s1.amount, estado1: s1.paid ? 'Si' : 'No',
    pago2: s2.amount, estado2: s2.paid ? 'Si' : 'No',
    pago3: s3.amount, estado3: s3.paid ? 'Si' : 'No',
    totalPagado,
    restante,
    cobroInicial: cobro,
    cobroReal: cobro,
    facInicial: facturacion,
    facReal: facturacion,
    contrato: user.contract_signed ? 'si' : 'no',
  };
}

// Localiza en la pestaña la fila del cliente (por PR en col B) o la primera fila
// plantilla libre (A,B,C vacías) antes de las filas de resumen.
function locateRow(values, headerOffset, pr) {
  // values[0] corresponde a la fila `headerOffset` (1-indexed) de la hoja.
  let headerIdx = -1;
  for (let i = 0; i < values.length; i++) {
    const a = (values[i][0] || '').toString().trim().toLowerCase();
    if (a === 'asesor') { headerIdx = i; break; }
  }
  if (headerIdx === -1) return { found: null, emptyRow: null };

  let found = null;
  let emptyRow = null;
  for (let i = headerIdx + 1; i < values.length; i++) {
    const row = values[i] || [];
    const a = (row[0] || '').toString().trim();
    const b = (row[1] || '').toString().trim();
    const c = (row[2] || '').toString().trim();
    const cLower = c.toLowerCase();
    // Filas de resumen al final -> paramos.
    if (a.toLowerCase() === 'xx' || cLower === 'pagado' || cLower === 'no pagado' || cLower === 'total') break;
    if (b && pr && b === String(pr)) {
      found = headerOffset + i; // nº de fila real (1-indexed)
      break;
    }
    if (!a && !b && !c && emptyRow === null) {
      emptyRow = headerOffset + i;
    }
  }
  return { found, emptyRow };
}

async function upsertChangesRow(token, user, payments, paymentRow, options = {}) {
  const tab = await resolveTabTitle(token, CHANGES_SHEET_GID);
  const values = await getRange(token, tab, 'A1:AB');
  const header = values[0] || [];
  if (header[19] !== 'Contrato' || header[22] !== 'Canal de captación' ||
      header[23] !== 'Campaña' || header[24] !== 'Mercado') {
    throw new Error('cash_changes_layout_mismatch');
  }
  const { found, emptyRow } = locateRow(values, 1, paymentRow.pr);
  const row = found || emptyRow;
  const c = buildChangesRow(user, payments, paymentRow, {
    ...options,
    isLatam: isLatamClient(user),
    international: usesInternational2700Plan(user),
  });
  if (!row) {
    await appendRow(token, tab, [
      c.asesor, c.pr, c.alumno, c.pago1, c.estado1, c.slots[0].date, c.slots[0].invoice,
      c.pago2, c.estado2, c.slots[1].date, c.slots[1].invoice,
      c.pago3, c.estado3, c.slots[2].date, c.slots[2].invoice,
      c.totalPagado, c.restante, c.cobroInicial, c.facInicial, c.contrato,
      c.signatureDate, c.type, c.channel, c.campaign, c.market,
    ], 'AB');
    return;
  }
  const updates = [
    { range: `A${row}:E${row}`, values: [[c.asesor, c.pr, c.alumno, c.pago1, c.estado1]] },
    { range: `H${row}:I${row}`, values: [[c.pago2, c.estado2]] },
    { range: `L${row}:M${row}`, values: [[c.pago3, c.estado3]] },
    { range: `R${row}:R${row}`, values: [[c.cobroInicial]] },
    { range: `T${row}:T${row}`, values: [[c.contrato]] },
    { range: `V${row}:V${row}`, values: [[c.type]] },
  ];
  for (const [column, value] of [
    ['F', c.slots[0].date], ['G', c.slots[0].invoice],
    ['J', c.slots[1].date], ['K', c.slots[1].invoice],
    ['N', c.slots[2].date], ['O', c.slots[2].invoice],
    ['U', c.signatureDate], ['W', c.channel], ['X', c.campaign], ['Y', c.market],
  ]) {
    if (value || (column === 'X' && c.channel)) {
      updates.push({ range: `${column}${row}:${column}${row}`, values: [[value]] });
    }
  }
  await batchUpdate(token, tab, updates);
}

// Rellena únicamente números reales emitidos por Holded; las celdas con un
// número o introducidas a mano se respetan. Los borradores se revisan de nuevo
// en la siguiente ejecución programada.
async function syncIssuedInvoiceNumbers(entries, readInvoice) {
  if (!isConfigured()) throw new Error('google_sheets_not_configured');
  const token = await getAccessToken();
  const tab = await resolveTabTitle(token, CHANGES_SHEET_GID);
  const values = await getRange(token, tab, 'A1:O');
  if (values[0]?.[6] !== 'Nº factura 1' || values[0]?.[10] !== 'Nº factura 2' ||
      values[0]?.[14] !== 'Nº factura 3') throw new Error('cash_changes_invoice_layout_mismatch');
  const rows = new Map();
  for (let i = 1; i < values.length; i++) {
    const leadId = String(values[i]?.[1] || '').trim();
    if (leadId) rows.set(leadId, i + 1);
  }
  const updates = [];
  let pending = 0;
  let missingRows = 0;
  let failed = 0;
  const candidates = [];
  for (const entry of entries) {
    const row = rows.get(String(entry.leadId || '').trim());
    if (!row) { missingRows++; continue; }
    const columnIndex = { 1: 6, 2: 10, 3: 14 }[Number(entry.installment)];
    if (columnIndex === undefined || values[row - 1]?.[columnIndex]) continue;
    candidates.push({ entry, row, columnIndex });
  }
  await Promise.all(Array.from({ length: Math.min(5, candidates.length) }, async (_, worker) => {
    for (let i = worker; i < candidates.length; i += 5) {
      const { entry, row, columnIndex } = candidates[i];
    try {
      const invoice = await readInvoice(entry);
      const number = String(invoice?.document_number || invoice?.docNumber || '').trim();
      if (!number) { pending++; continue; }
      const column = { 6: 'G', 10: 'K', 14: 'O' }[columnIndex];
      updates.push({ range: `${column}${row}:${column}${row}`, values: [[number]] });
      values[row - 1][columnIndex] = number;
    } catch (error) {
      failed++;
      console.warn('[sheets] Holded invoice lookup failed:', error?.message || error);
    }
    }
  }));
  if (updates.length) await batchUpdate(token, tab, updates);
  return { checked: entries.length, updated: updates.length, pending, missingRows, failed };
}

/**
 * Escribe/actualiza la fila del cliente en la hoja. Best-effort: nunca lanza.
 * @returns {Promise<{ok:boolean, action?:string, row?:number, reason?:string}>}
 */
async function upsertClientRow(sb, userId, options = {}) {
  try {
    if (!isConfigured()) return { ok: false, reason: 'not_configured' };
    const { data: user, error } = await sb
      .from('users')
      .select('id, lead_id, notion_page_id, nombre, apellidos, assigned_to, contract_signed, contract_signed_at, tipo, origin, pais, has_eu_id')
      .eq('id', userId)
      .single();
    if (error || !user) return { ok: false, reason: 'user_not_found' };
    // Solo reflejamos clientes ya asignados a un asesor.
    if (!user.assigned_to) return { ok: false, reason: 'not_assigned' };

    const { data: payments } = await sb
      .from('payments')
      .select('installment, amount, status, paid_at, invoice_number, payment_data')
      .eq('user_id', userId)
      .order('installment', { ascending: true });

    const attribution = await attributionForUser(user, options.attribution);
    const r = buildRow(user, payments || []);
    const token = await getAccessToken();
    const tab = await resolveTabTitle(token);

    // Leemos una ventana amplia (cabecera + zona de clientes) para localizar la fila.
    const headerOffset = 1; // empezamos a leer desde la fila 1
    const values = await getRange(token, tab, 'A1:N');
    if (values[0]?.[13] !== 'Contrato') throw new Error('cash_main_layout_mismatch');
    const { found, emptyRow } = locateRow(values, headerOffset, r.pr);
    const targetRow = found || emptyRow;

    // Conserva las fórmulas J, K y M; el selector de contrato está en N.
    const segFor = (row) => ([
      { range: `A${row}:I${row}`, values: [[r.asesor, r.pr, r.alumno, r.pago1, r.estado1, r.pago2, r.estado2, r.pago3, r.estado3]] },
      { range: `L${row}:L${row}`, values: [[r.cobroInicial]] },
      { range: `N${row}:N${row}`, values: [[r.contrato]] },
    ]);

    if (targetRow) {
      await batchUpdate(token, tab, segFor(targetRow));
      await upsertChangesRow(token, user, payments || [], r, { ...options, attribution });
      return { ok: true, action: found ? 'updated' : 'filled', row: targetRow };
    }

    // Sin fila plantilla libre: añadimos una nueva con TODAS las columnas como
    // valores (sin fórmulas, pero completa y correcta en ese momento).
    const fullRow = [
      r.asesor, r.pr, r.alumno,
      r.pago1, r.estado1, r.pago2, r.estado2, r.pago3, r.estado3,
      r.totalPagado, r.restante, r.cobroInicial, r.facInicial, r.contrato,
    ];
    await appendRow(token, tab, fullRow);
    await upsertChangesRow(token, user, payments || [], r, { ...options, attribution });
    return { ok: true, action: 'appended' };
  } catch (e) {
    console.error('[sheets] upsertClientRow error:', e && e.message);
    return { ok: false, reason: (e && e.message) || 'error' };
  }
}

module.exports = { isConfigured, upsertClientRow, syncIssuedInvoiceNumbers, buildRow, advisorName };
