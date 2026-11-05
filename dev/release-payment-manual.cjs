'use strict';

// Local operator-assisted checkout. The saved reference contains no credentials.
// Run with: node --env-file=.env dev/release-payment-manual.cjs start|verify|cleanup
const { randomUUID, randomBytes, createHmac } = require('node:crypto');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { existsSync, readFileSync, writeFileSync, unlinkSync } = require('node:fs');
const { createClient } = require('../apps/admin/node_modules/@supabase/supabase-js');
const { LEAD_PREFIX, EMAIL_DOMAIN, isReleaseTestUser } = require('../packages/auth/release-test.cjs');

const STATE_FILE = join(tmpdir(), 'project-robin-release-payment.json');
const SANDBOX_BASE = 'https://sandbox-merchant.revolut.com';
const HOLDED_BASE = 'https://api.holded.com/api/v2';
const DEMO_ACCOUNT_ID = '6aeba28c449854402405960d';
const DEMO_GENERAL_ACCOUNT_ID = '6aebb22540b45e36f70b262c';
const secret = String(process.env.ADMIN__REVOLUT_SANDBOX_MERCHANT_SECRET_KEY || '').trim();
if (!secret) throw new Error('Falta la credencial sandbox de Admin en el .env generado');
const demoPat = String(process.env.ADMIN__HOLDED_DEMO_API_PAT || '').trim();
if (!demoPat || demoPat === String(process.env.PORTAL__HOLDED_API_PAT || '').trim()) {
  throw new Error('Falta un PAT exclusivo de Holded demo');
}
process.env.PORTAL__REVOLUT_API_BASE = SANDBOX_BASE;
process.env.PORTAL__REVOLUT_MERCHANT_SECRET_KEY = secret;
process.env.PORTAL__HOLDED_API_PAT = demoPat;
process.env.PORTAL__HOLDED_ACCOUNT_GENERAL = DEMO_GENERAL_ACCOUNT_ID;
process.env.ROBIN_LOCAL_TESTS = 'true';
process.env.CONTEXT = 'dev';
// Revolut rejects localhost as a redirect host. The operator returns here
// manually and runs verify; the production portal URL is only a return URL.
process.env.PUBLIC_BASE_URL = 'https://project-robin.com';

const { runInApp } = require('../site/app-env.cjs');

function db() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function event(method, cookie, body) {
  return {
    httpMethod: method,
    headers: { origin: 'http://localhost:8888', host: 'localhost:8888', ...(cookie ? { cookie } : {}) },
    body: body === undefined ? null : JSON.stringify(body),
  };
}

function cookieFor(user) {
  const auth = require('../apps/portal/lib/auth');
  return auth.buildSessionCookie(auth.signSession(user)).split(';')[0];
}

async function demoApi(path, { method = 'GET', body } = {}) {
  const response = await fetch(HOLDED_BASE + path, {
    method,
    headers: { Authorization: `Bearer ${demoPat}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch (_) { /* empty or non-JSON */ }
  if (!response.ok) throw new Error(`Holded demo HTTP ${response.status}`);
  return data;
}

async function assertDemoAccount() {
  const account = await demoApi('/account');
  if (account?.id !== DEMO_ACCOUNT_ID || !String(account.name || '').startsWith('DEMO ')) {
    throw new Error('El PAT no corresponde a la cuenta Holded demo esperada');
  }
  const chart = await demoApi('/accounting-accounts?limit=500');
  if (!chart?.items?.some((row) => row.id === DEMO_GENERAL_ACCOUNT_ID && Number(row.number) === 70500001)) {
    throw new Error('La subcuenta demo 70500001 no coincide con la configuración del test');
  }
}

async function sandboxSigningSecret() {
  const headers = { Authorization: `Bearer ${secret}`, 'Revolut-Api-Version': '2026-08-17' };
  const listedResponse = await fetch(`${SANDBOX_BASE}/api/webhooks`, { headers });
  if (!listedResponse.ok) throw new Error(`Revolut sandbox: no se pudieron listar webhooks (HTTP ${listedResponse.status})`);
  const listed = await listedResponse.json();
  for (const webhook of listed.webhooks || []) {
    if (!webhook.events?.includes('ORDER_COMPLETED')) continue;
    const response = await fetch(`${SANDBOX_BASE}/api/webhooks/${encodeURIComponent(webhook.id)}`, { headers });
    if (!response.ok) continue;
    const detail = await response.json();
    if (detail.signing_secret) return detail.signing_secret;
  }
  throw new Error('No hay un webhook ORDER_COMPLETED con secreto de firma en Revolut sandbox');
}

async function checkedUser(sb, state) {
  const { data: user, error } = await sb.from('users').select('*').eq('id', state.userId).single();
  if (error || !user || !isReleaseTestUser(user) || user.lead_id !== state.leadId || user.email !== state.email) {
    throw new Error('La cuenta TEST no coincide con la referencia guardada; no se modificará');
  }
  return user;
}

async function cleanup(sb, state) {
  await checkedUser(sb, state);
  const { error: paymentError } = await sb.from('payments').delete().eq('user_id', state.userId);
  if (paymentError) throw paymentError;
  const { data: deleted, error: userError } = await sb.from('users').delete()
    .eq('id', state.userId).eq('lead_id', state.leadId).eq('email', state.email).select('id');
  if (userError || deleted?.length !== 1) throw new Error(`No se eliminó exactamente la cuenta TEST: ${userError?.message || '0 filas'}`);
  unlinkSync(STATE_FILE);
}

async function start() {
  if (existsSync(STATE_FILE)) throw new Error('Ya hay una prueba pendiente; ejecuta verify o cleanup primero');
  await assertDemoAccount();
  const sb = db();
  const auth = require('../apps/portal/lib/auth');
  const { pricingVersionForNewUser } = require('../apps/portal/shared/financial-config.cjs');
  const token = randomUUID();
  const leadId = `${LEAD_PREFIX}${token}`;
  const email = `test-${token.replace(/-/g, '')}${EMAIL_DOMAIN}`;
  const row = {
    lead_id: leadId, email, username: email,
    password_hash: auth.hashPassword(`Test-${randomBytes(18).toString('base64url')}#`),
    nombre: 'TEST Robin', apellidos: 'Pago Sandbox', tipo: 'general', origin: 'espana',
    requires_onboarding: true, dni_completed: true, profile_completed: true,
    contract_signed: true, pago_completed: false,
    contract_data: { pricing_version: pricingVersionForNewUser('general') },
  };
  const { data: created, error } = await sb.from('users').insert(row).select('id,lead_id,email,username,role').single();
  if (error) throw error;
  const state = { userId: created.id, leadId, email };
  try {
    if (!isReleaseTestUser(created)) throw new Error('La cuenta creada no tiene los marcadores TEST');
    // The test completes in this CLI process, so the browser returns to Admin
    // instead of sending the sandbox attempt through production verification.
    const revolut = require('../apps/portal/lib/revolut');
    const createOrder = revolut.createOrder;
    revolut.createOrder = (input) => createOrder({ ...input, redirectUrl: 'https://project-robin.com/admin/' });
    const handler = require('../apps/portal/netlify/functions/onboarding-checkout').handler;
    const response = await handler(event('POST', cookieFor(created)));
    const payload = JSON.parse(response.body || '{}');
    if (response.statusCode !== 200 || !payload.url || !payload.attempt_id || !payload.id) {
      throw new Error(`Checkout: HTTP ${response.statusCode} ${payload.error || ''}`);
    }
    state.attemptId = payload.attempt_id;
    state.orderId = payload.id;
    state.checkoutUrl = payload.url;
    // Keep the test order unmatched while the operator pays. Any webhook sent
    // to a remote sandbox deployment cannot fulfill this production DB fixture.
    const { error: detachError } = await sb.from('payment_attempts').update({ provider_order_id: null })
      .eq('id', state.attemptId).eq('user_id', state.userId);
    if (detachError) throw detachError;
    writeFileSync(STATE_FILE, JSON.stringify(state), { mode: 0o600, flag: 'wx' });
    const { applicationPlanForUser } = require('../apps/portal/shared/financial-config.cjs');
    console.log(JSON.stringify({ status: 'action_required', checkout_url: payload.url, amount_eur: applicationPlanForUser(row)[0].amount, test_email: email, test_holder: 'TEST Robin Pago Sandbox' }));
  } catch (failure) {
    if (state.orderId) {
      try {
        await fetch(`${SANDBOX_BASE}/api/orders/${encodeURIComponent(state.orderId)}/cancel`, {
          method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Revolut-Api-Version': '2026-03-12' },
        });
      } catch (_) { /* best effort; user cleanup is still mandatory */ }
    }
    const { error: deleteError } = await sb.from('users').delete().eq('id', created.id).eq('lead_id', leadId).eq('email', email);
    if (deleteError) throw new Error(`${failure.message}; limpieza: ${deleteError.message}`);
    throw failure;
  }
}

async function verify() {
  if (!existsSync(STATE_FILE)) throw new Error('No hay ninguna prueba pendiente');
  const state = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  const sb = db();
  const user = await checkedUser(sb, state);
  const revolut = require('../apps/portal/lib/revolut');
  const order = await revolut.retrieveOrder(state.orderId);
  if (order.state !== 'completed') {
    console.log(JSON.stringify({ status: order.state || 'pending', checkout_url: state.checkoutUrl }));
    return;
  }
  const { data: attemptBefore, error: attemptReadError } = await sb.from('payment_attempts')
    .select('provider_order_id').eq('id', state.attemptId).eq('user_id', state.userId).single();
  if (attemptReadError || !attemptBefore) throw new Error('No se encontró la tentativa TEST');
  if (attemptBefore.provider_order_id && attemptBefore.provider_order_id !== state.orderId) {
    throw new Error('La tentativa TEST está asociada a otra orden');
  }
  if (!attemptBefore.provider_order_id) {
    const { data: linked, error: linkError } = await sb.from('payment_attempts')
      .update({ provider_order_id: state.orderId }).eq('id', state.attemptId)
      .eq('user_id', state.userId).is('provider_order_id', null).select('id');
    if (linkError || linked?.length !== 1) throw new Error(`No se pudo asociar la orden completada a la tentativa TEST: ${linkError?.message || '0 filas'}`);
  }
  const signingSecret = await sandboxSigningSecret();
  process.env.REVOLUT_WEBHOOK_SIGNING_SECRET = signingSecret;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const raw = JSON.stringify({ event: 'ORDER_COMPLETED', order_id: state.orderId });
  const signature = 'v1=' + createHmac('sha256', signingSecret).update(`v1.${timestamp}.${raw}`).digest('hex');
  const webhookHandler = require('../apps/portal/netlify/functions/revolut-webhook').handler;
  const webhookResponse = await webhookHandler({
    httpMethod: 'POST',
    headers: { 'revolut-request-timestamp': timestamp, 'revolut-signature': signature },
    body: raw,
  });
  if (webhookResponse.statusCode !== 204) throw new Error(`Webhook sandbox firmado: HTTP ${webhookResponse.statusCode}`);
  const handler = require('../apps/portal/netlify/functions/payments-verify').handler;
  const response = await handler(event('POST', cookieFor(user), { attempt_id: state.attemptId }));
  const payload = JSON.parse(response.body || '{}');
  if (response.statusCode !== 200) throw new Error(`Verificación: HTTP ${response.statusCode} ${payload.error || ''}`);
  if (!payload.ok) {
    console.log(JSON.stringify({ status: payload.status || 'pending', checkout_url: state.checkoutUrl }));
    return;
  }
  const { data: paid, error } = await sb.from('users').select('pago_completed,requires_onboarding,pago_data').eq('id', state.userId).single();
  if (error || !paid?.pago_completed || paid.requires_onboarding || paid.pago_data?.revolut_order_id !== state.orderId) {
    throw new Error('Revolut completó la orden, pero el cliente TEST no quedó marcado como pagado');
  }
  const { data: attempt, error: attemptError } = await sb.from('payment_attempts').select('status').eq('id', state.attemptId).single();
  if (attemptError || attempt?.status !== 'completed') throw new Error('La tentativa de pago no quedó completada');
  await assertDemoAccount();
  const { data: payment, error: paymentError } = await sb.from('payments').select('*')
    .eq('user_id', state.userId).eq('installment', 1).single();
  if (paymentError || !payment || payment.status !== 'paid' || payment.payment_data?.simulated !== true
    || payment.payment_data?.revolut_order_id !== state.orderId) {
    throw new Error('La primera cuota TEST no quedó pagada y marcada como simulada');
  }
  const holded = require('../apps/portal/lib/holded');
  const { data: fullUser, error: userError } = await sb.from('users').select('*').eq('id', state.userId).single();
  if (userError || !fullUser) throw new Error('No se pudo leer el cliente TEST para la factura demo');
  let invoiceId;
  let contactId;
  try {
    const invoice = await holded.createInvoiceForPayment(sb, fullUser, payment);
    invoiceId = invoice.invoiceId;
    const saved = await demoApi(`/invoices/${encodeURIComponent(invoiceId)}`);
    const { data: withContact } = await sb.from('users').select('holded_contact_id').eq('id', state.userId).single();
    contactId = withContact?.holded_contact_id;
    if (saved?.id !== invoiceId || saved.contact_id !== contactId
      || !JSON.stringify(saved).includes(DEMO_GENERAL_ACCOUNT_ID)
      || !JSON.stringify(saved).includes(state.leadId)) {
      throw new Error('La factura demo no conserva el cliente TEST y la subcuenta 70500001');
    }
  } finally {
    if (!contactId) {
      const { data: withContact } = await sb.from('users').select('holded_contact_id').eq('id', state.userId).single();
      contactId = withContact?.holded_contact_id;
    }
    const cleanupErrors = [];
    if (invoiceId) {
      try { await demoApi(`/invoices/${encodeURIComponent(invoiceId)}`, { method: 'DELETE' }); }
      catch (error) { cleanupErrors.push(`factura ${invoiceId}: ${error.message}`); }
    }
    if (contactId && cleanupErrors.length === 0) {
      try {
        await demoApi(`/contacts/${encodeURIComponent(contactId)}`, { method: 'DELETE' });
        const { error: clearContactError } = await sb.from('users').update({ holded_contact_id: null }).eq('id', state.userId);
        if (clearContactError) throw clearContactError;
      }
      catch (error) { cleanupErrors.push(`contacto ${contactId}: ${error.message}`); }
    }
    if (cleanupErrors.length) throw new Error(`Limpieza de Holded demo fallida: ${cleanupErrors.join('; ')}`);
  }
  await cleanup(sb, state);
  console.log(JSON.stringify({ status: 'passed', detail: 'Checkout sandbox completado; webhook firmado y verificación idempotente; cliente pagado y factura en Holded demo 70500001 comprobados; datos TEST eliminados.' }));
}

async function cancel() {
  if (!existsSync(STATE_FILE)) throw new Error('No hay ninguna prueba pendiente');
  const state = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  const response = await fetch(`${SANDBOX_BASE}/api/orders/${encodeURIComponent(state.orderId)}`, {
    headers: { Authorization: `Bearer ${secret}`, 'Revolut-Api-Version': '2026-03-12' },
  });
  if (!response.ok) throw new Error(`No se pudo consultar la orden sandbox: HTTP ${response.status}`);
  const order = await response.json();
  if (order.state === 'completed') throw new Error('La orden está completada: usa verify para comprobarla antes de borrar el usuario');
  if (order.state !== 'cancelled') {
    const cancelled = await fetch(`${SANDBOX_BASE}/api/orders/${encodeURIComponent(state.orderId)}/cancel`, {
      method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Revolut-Api-Version': '2026-03-12' },
    });
    // Revolut no permite cancelar una orden que ya pasó a processing. El
    // intento TEST está desligado del webhook; se puede retirar su usuario
    // sin activar ningún pago real ni una factura de producción.
    if (!cancelled.ok && !(cancelled.status === 422 && ['processing', 'failed', 'declined'].includes(order.state))) {
      throw new Error(`No se pudo cancelar la orden sandbox: HTTP ${cancelled.status}`);
    }
  }
  await cleanup(db(), state);
  console.log(JSON.stringify({ status: 'cancelled', detail: order.state === 'processing' ? 'Orden sandbox en procesamiento, desligada del webhook; usuario TEST eliminado.' : 'Orden sandbox cancelada y usuario TEST eliminado.' }));
}

async function status() {
  if (!existsSync(STATE_FILE)) {
    console.log(JSON.stringify({ status: 'idle' }));
    return;
  }
  const state = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  const sb = db();
  await checkedUser(sb, state);
  const order = await require('../apps/portal/lib/revolut').retrieveOrder(state.orderId);
  console.log(JSON.stringify({ status: order.state === 'completed' ? 'ready_to_verify' : order.state === 'pending' ? 'action_required' : order.state, checkout_url: state.checkoutUrl, amount_eur: Number(order.amount) / 100, test_email: state.email, test_holder: 'TEST Robin Pago Sandbox' }));
}

runInApp('portal', async () => {
  const action = process.argv[2];
  if (action === 'start') return start();
  if (action === 'verify') return verify();
  if (action === 'cleanup') return cancel();
  if (action === 'status') return status();
  throw new Error('Uso: start | verify | cleanup | status');
}).catch((error) => { console.error(error.message); process.exitCode = 1; });
