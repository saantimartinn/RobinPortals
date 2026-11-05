'use strict';

// The published site runs sandbox providers in an isolated Portal environment.
// State lives in Supabase because consecutive Netlify invocations need not share a filesystem.
const { randomUUID, randomBytes, createHmac } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { runInApp, runInAppWithEnv } = require('../../../site/app-env.cjs');
const { LEAD_PREFIX, EMAIL_DOMAIN, isReleaseTestUser } = require('../../../packages/auth/release-test.cjs');

const SANDBOX_BASE = 'https://sandbox-merchant.revolut.com';
const HOLDED_BASE = 'https://api.holded.com/api/v2';
const DEMO_ACCOUNT_ID = '6aeba28c449854402405960d';
const DEMO_GENERAL_ACCOUNT_ID = '6aebb22540b45e36f70b262c';
const STATE_SOURCE = 'release_payment_state';

function settings() {
  const secret = String(process.env.REVOLUT_SANDBOX_MERCHANT_SECRET_KEY || '').trim();
  const demoPat = String(process.env.HOLDED_DEMO_API_PAT || '').trim();
  const portal = runInApp('portal', () => ({
    url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY,
    holdedPat: process.env.HOLDED_API_PAT,
  }));
  if (!secret || !demoPat || !portal.url || !portal.key) throw new Error('Faltan credenciales de sandbox, Holded demo o Portal en producción');
  if (demoPat === portal.holdedPat) throw new Error('La credencial de Holded demo coincide con la de la cuenta real');
  return { secret, demoPat, portal };
}

function portalSandbox(config, fn, extra = {}) {
  return runInAppWithEnv('portal', {
    CONTEXT: 'dev', PAYMENT_PROVIDER: 'revolut',
    REVOLUT_API_BASE: SANDBOX_BASE, REVOLUT_MERCHANT_SECRET_KEY: config.secret,
    HOLDED_API_PAT: config.demoPat, HOLDED_ACCOUNT_GENERAL: DEMO_GENERAL_ACCOUNT_ID,
    PUBLIC_BASE_URL: 'https://project-robin.com', ...extra,
  }, fn);
}

function db(config) {
  return createClient(config.portal.url, config.portal.key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function event(method, cookie, body) {
  return {
    httpMethod: method,
    headers: { origin: 'https://project-robin.com', host: 'project-robin.com', ...(cookie ? { cookie } : {}) },
    body: body === undefined ? null : JSON.stringify(body),
  };
}

function cookieFor(user) {
  const auth = require('../../portal/lib/auth');
  return auth.buildSessionCookie(auth.signSession(user)).split(';')[0];
}

async function demoApi(config, path, { method = 'GET', body } = {}) {
  const response = await fetch(HOLDED_BASE + path, {
    method,
    headers: { Authorization: `Bearer ${config.demoPat}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch (_) { data = null; }
  if (!response.ok) throw new Error(`Holded demo HTTP ${response.status}`);
  return data;
}

async function assertDemoAccount(config) {
  const account = await demoApi(config, '/account');
  if (account?.id !== DEMO_ACCOUNT_ID || !String(account.name || '').startsWith('DEMO ')) {
    throw new Error('El PAT no corresponde a la cuenta Holded demo esperada');
  }
  const chart = await demoApi(config, '/accounting-accounts?limit=500');
  if (!chart?.items?.some((row) => row.id === DEMO_GENERAL_ACCOUNT_ID && Number(row.number) === 70500001)) {
    throw new Error('La subcuenta demo 70500001 no coincide con la configuración de la prueba');
  }
}

async function signingSecret(config) {
  const headers = { Authorization: `Bearer ${config.secret}`, 'Revolut-Api-Version': '2026-08-17' };
  const listedResponse = await fetch(`${SANDBOX_BASE}/api/webhooks`, { headers, signal: AbortSignal.timeout(15000) });
  if (!listedResponse.ok) throw new Error(`Revolut sandbox: no se pudieron listar webhooks (HTTP ${listedResponse.status})`);
  const listed = await listedResponse.json();
  for (const webhook of listed.webhooks || []) {
    if (!webhook.events?.includes('ORDER_COMPLETED')) continue;
    const response = await fetch(`${SANDBOX_BASE}/api/webhooks/${encodeURIComponent(webhook.id)}`, { headers, signal: AbortSignal.timeout(15000) });
    if (!response.ok) continue;
    const detail = await response.json();
    if (detail.signing_secret) return detail.signing_secret;
  }
  throw new Error('No hay un webhook ORDER_COMPLETED con secreto de firma en Revolut sandbox');
}

async function stateRow(sb, adminId) {
  const { data, error } = await sb.from('webhook_log').select('id,payload,created_at')
    .eq('source', STATE_SOURCE).eq('result', 'pending')
    .contains('payload', { admin_id: adminId }).order('created_at', { ascending: false }).limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

async function closeState(sb, row, result) {
  const { error } = await sb.from('webhook_log').update({ result }).eq('id', row.id).eq('source', STATE_SOURCE).eq('result', 'pending');
  if (error) throw error;
}

async function checkedUser(sb, state) {
  const { data: user, error } = await sb.from('users').select('*').eq('id', state.userId).single();
  if (error || !user || !isReleaseTestUser(user) || user.lead_id !== state.leadId || user.email !== state.email) {
    throw new Error('La cuenta TEST no coincide con la referencia guardada; no se modificará');
  }
  return user;
}

async function cleanup(sb, row) {
  const state = row.payload;
  await checkedUser(sb, state);
  const { error: paymentError } = await sb.from('payments').delete().eq('user_id', state.userId);
  if (paymentError) throw paymentError;
  const { data: deleted, error: userError } = await sb.from('users').delete()
    .eq('id', state.userId).eq('lead_id', state.leadId).eq('email', state.email).select('id');
  if (userError || deleted?.length !== 1) throw new Error(`No se eliminó exactamente la cuenta TEST: ${userError?.message || '0 filas'}`);
  await closeState(sb, row, 'closed');
}

async function start(config, sb, adminId) {
  if (await stateRow(sb, adminId)) return status(config, sb, adminId);
  await assertDemoAccount(config);
  const auth = require('../../portal/lib/auth');
  const { pricingVersionForNewUser, applicationPlanForUser } = require('../../portal/shared/financial-config.cjs');
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
  const state = { admin_id: adminId, userId: created.id, leadId, email };
  try {
    if (!isReleaseTestUser(created)) throw new Error('La cuenta creada no tiene los marcadores TEST');
    const response = await require('../../portal/netlify/functions/onboarding-checkout').handler(event('POST', cookieFor(created)));
    const payload = JSON.parse(response.body || '{}');
    if (response.statusCode !== 200 || !payload.url || !payload.attempt_id || !payload.id) {
      throw new Error(`Checkout sandbox: HTTP ${response.statusCode} ${payload.error || ''}`);
    }
    Object.assign(state, { attemptId: payload.attempt_id, orderId: payload.id, checkoutUrl: payload.url });
    // A network webhook cannot fulfill the fixture before the guided verification.
    const { error: detachError } = await sb.from('payment_attempts').update({ provider_order_id: null })
      .eq('id', state.attemptId).eq('user_id', state.userId);
    if (detachError) throw detachError;
    const { error: saveError } = await sb.from('webhook_log').insert({
      source: STATE_SOURCE, result: 'pending', message: 'Pago sandbox TEST pendiente', payload: state,
    });
    if (saveError) throw saveError;
    return { status: 'action_required', checkout_url: state.checkoutUrl,
      amount_eur: applicationPlanForUser(row)[0].amount, test_email: email, test_holder: 'TEST Robin Pago Sandbox' };
  } catch (failure) {
    if (state.orderId) {
      try { await fetch(`${SANDBOX_BASE}/api/orders/${encodeURIComponent(state.orderId)}/cancel`, {
        method: 'POST', headers: { Authorization: `Bearer ${config.secret}`, 'Revolut-Api-Version': '2026-03-12' },
      }); } catch (_) { /* cleanup of the TEST user remains mandatory */ }
    }
    const { error: deleteError } = await sb.from('users').delete().eq('id', created.id).eq('lead_id', leadId).eq('email', email);
    if (deleteError) throw new Error(`${failure.message}; limpieza: ${deleteError.message}`);
    throw failure;
  }
}

async function status(config, sb, adminId) {
  const row = await stateRow(sb, adminId);
  if (!row) return { status: 'idle' };
  const state = row.payload;
  await checkedUser(sb, state);
  const order = await require('../../portal/lib/revolut').retrieveOrder(state.orderId);
  return { status: order.state === 'completed' ? 'ready_to_verify' : order.state === 'pending' ? 'action_required' : order.state,
    checkout_url: state.checkoutUrl, amount_eur: Number(order.amount) / 100,
    test_email: state.email, test_holder: 'TEST Robin Pago Sandbox' };
}

async function verify(config, sb, adminId) {
  const row = await stateRow(sb, adminId);
  if (!row) throw new Error('No hay ninguna prueba de pago pendiente');
  const state = row.payload;
  const user = await checkedUser(sb, state);
  const order = await require('../../portal/lib/revolut').retrieveOrder(state.orderId);
  if (order.state !== 'completed') return { status: order.state || 'pending', checkout_url: state.checkoutUrl };
  const { data: attemptBefore, error: attemptReadError } = await sb.from('payment_attempts')
    .select('provider_order_id').eq('id', state.attemptId).eq('user_id', state.userId).single();
  if (attemptReadError || !attemptBefore) throw new Error('No se encontró la tentativa TEST');
  if (attemptBefore.provider_order_id && attemptBefore.provider_order_id !== state.orderId) throw new Error('La tentativa TEST está asociada a otra orden');
  if (!attemptBefore.provider_order_id) {
    const { data: linked, error: linkError } = await sb.from('payment_attempts')
      .update({ provider_order_id: state.orderId }).eq('id', state.attemptId)
      .eq('user_id', state.userId).is('provider_order_id', null).select('id');
    if (linkError || linked?.length !== 1) throw new Error(`No se pudo asociar la orden TEST: ${linkError?.message || '0 filas'}`);
  }
  const secret = await signingSecret(config);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const raw = JSON.stringify({ event: 'ORDER_COMPLETED', order_id: state.orderId });
  const signature = 'v1=' + createHmac('sha256', secret).update(`v1.${timestamp}.${raw}`).digest('hex');
  const webhook = await portalSandbox(config, () => require('../../portal/netlify/functions/revolut-webhook').handler({
    httpMethod: 'POST', headers: { 'revolut-request-timestamp': timestamp, 'revolut-signature': signature }, body: raw,
  }), { REVOLUT_WEBHOOK_SIGNING_SECRET: secret });
  if (webhook.statusCode !== 204) throw new Error(`Webhook sandbox firmado: HTTP ${webhook.statusCode}`);
  const response = await require('../../portal/netlify/functions/payments-verify').handler(event('POST', cookieFor(user), { attempt_id: state.attemptId }));
  const payload = JSON.parse(response.body || '{}');
  if (response.statusCode !== 200) throw new Error(`Verificación: HTTP ${response.statusCode} ${payload.error || ''}`);
  if (!payload.ok) return { status: payload.status || 'pending', checkout_url: state.checkoutUrl };
  const { data: paid, error } = await sb.from('users').select('pago_completed,requires_onboarding,pago_data').eq('id', state.userId).single();
  if (error || !paid?.pago_completed || paid.requires_onboarding || paid.pago_data?.revolut_order_id !== state.orderId) {
    throw new Error('La orden se completó, pero el cliente TEST no quedó pagado');
  }
  const { data: attempt, error: attemptError } = await sb.from('payment_attempts').select('status').eq('id', state.attemptId).single();
  if (attemptError || attempt?.status !== 'completed') throw new Error('La tentativa TEST no quedó completada');
  await assertDemoAccount(config);
  const { data: payment, error: paymentError } = await sb.from('payments').select('*')
    .eq('user_id', state.userId).eq('installment', 1).single();
  if (paymentError || !payment || payment.status !== 'paid' || payment.payment_data?.simulated !== true
    || payment.payment_data?.revolut_order_id !== state.orderId) throw new Error('La cuota TEST no quedó pagada y simulada');
  const { data: fullUser, error: userError } = await sb.from('users').select('*').eq('id', state.userId).single();
  if (userError || !fullUser) throw new Error('No se pudo leer el cliente TEST para la factura demo');
  let invoiceId;
  let contactId;
  try {
    const invoice = await require('../../portal/lib/holded').createInvoiceForPayment(sb, fullUser, payment);
    invoiceId = invoice.invoiceId;
    const saved = await demoApi(config, `/invoices/${encodeURIComponent(invoiceId)}`);
    const { data: withContact } = await sb.from('users').select('holded_contact_id').eq('id', state.userId).single();
    contactId = withContact?.holded_contact_id;
    if (saved?.id !== invoiceId || saved.contact_id !== contactId
      || !JSON.stringify(saved).includes(DEMO_GENERAL_ACCOUNT_ID)
      || !JSON.stringify(saved).includes(state.leadId)) throw new Error('La factura demo no conserva el cliente y la subcuenta 70500001');
  } finally {
    if (!contactId) {
      const { data: withContact } = await sb.from('users').select('holded_contact_id').eq('id', state.userId).single();
      contactId = withContact?.holded_contact_id;
    }
    const errors = [];
    if (invoiceId) try { await demoApi(config, `/invoices/${encodeURIComponent(invoiceId)}`, { method: 'DELETE' }); }
      catch (cause) { errors.push(`factura ${invoiceId}: ${cause.message}`); }
    if (contactId && errors.length === 0) try {
      await demoApi(config, `/contacts/${encodeURIComponent(contactId)}`, { method: 'DELETE' });
      const { error: clearError } = await sb.from('users').update({ holded_contact_id: null }).eq('id', state.userId);
      if (clearError) throw clearError;
    } catch (cause) { errors.push(`contacto ${contactId}: ${cause.message}`); }
    if (errors.length) throw new Error(`Limpieza de Holded demo fallida: ${errors.join('; ')}`);
  }
  await cleanup(sb, row);
  return { status: 'passed', detail: 'Checkout sandbox completado; webhook firmado y verificación; cliente pagado y factura en Holded demo 70500001 comprobados; datos TEST eliminados.' };
}

async function cancel(config, sb, adminId) {
  const row = await stateRow(sb, adminId);
  if (!row) throw new Error('No hay ninguna prueba de pago pendiente');
  const state = row.payload;
  const response = await fetch(`${SANDBOX_BASE}/api/orders/${encodeURIComponent(state.orderId)}`, {
    headers: { Authorization: `Bearer ${config.secret}`, 'Revolut-Api-Version': '2026-03-12' }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`No se pudo consultar la orden sandbox: HTTP ${response.status}`);
  const order = await response.json();
  if (order.state === 'completed') throw new Error('La orden está completada: usa Verificar pago antes de borrar el usuario TEST');
  if (order.state !== 'cancelled') {
    const cancelled = await fetch(`${SANDBOX_BASE}/api/orders/${encodeURIComponent(state.orderId)}/cancel`, {
      method: 'POST', headers: { Authorization: `Bearer ${config.secret}`, 'Revolut-Api-Version': '2026-03-12' }, signal: AbortSignal.timeout(15000),
    });
    if (!cancelled.ok && !(cancelled.status === 422 && ['processing', 'failed', 'declined'].includes(order.state))) {
      throw new Error(`No se pudo cancelar la orden sandbox: HTTP ${cancelled.status}`);
    }
  }
  await cleanup(sb, row);
  return { status: 'cancelled', detail: 'Orden sandbox cancelada y usuario TEST eliminado.' };
}

async function runProductionPaymentAction(action, adminId) {
  if (!adminId) throw new Error('Falta identificar al administrador de la prueba');
  const config = settings();
  const sb = db(config);
  return portalSandbox(config, async () => {
    if (action === 'start') return start(config, sb, adminId);
    if (action === 'status') return status(config, sb, adminId);
    if (action === 'verify') return verify(config, sb, adminId);
    if (action === 'cleanup') return cancel(config, sb, adminId);
    throw new Error('Acción de pago de prueba no válida');
  });
}

module.exports = { runProductionPaymentAction };
