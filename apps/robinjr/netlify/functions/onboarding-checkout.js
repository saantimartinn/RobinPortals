/**
 * POST /api/onboarding/checkout
 * Crea un checkout alojado para la PRIMERA cuota del onboarding.
 * Devuelve { url } al que el frontend redirige. El pago se confirma vía
 * el webhook del proveedor (autoritativo) y/o payments-verify (al volver).
 */
const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { json, methodNotAllowed, serverError, verifyOrigin } = require('../../lib/http');
const revolut = require('../../lib/revolut');
const paymentProvider = require('../../lib/payment-provider');
const attempts = require('../../lib/payment-attempts');
const { toMinorUnits } = require('../../lib/payment-fulfill');
const { applicationPlanForUser } = require('../../shared/financial-config.cjs');
const { createOperationLogger } = require('../../lib/observability');

exports.handler = async (event) => {
  const session = readSessionFromEvent(event);
  const provider = paymentProvider.name();
  const log = createOperationLogger(event, {
    operation: 'onboarding.checkout',
    actor_id: session && session.uid,
    actor_role: session && session.role,
    integration: provider,
  });
  log.start();
  if (event.httpMethod !== 'POST') {
    log.warn('rejected', { error_code: 'method_not_allowed' });
    return methodNotAllowed(['POST']);
  }
  if (!verifyOrigin(event)) {
    log.warn('rejected', { error_code: 'bad_origin' });
    return json({ error: 'bad_origin' }, { statusCode: 403 });
  }
  if (!session) {
    log.warn('rejected', { error_code: 'unauthorized' });
    return json({ error: 'unauthorized' }, { statusCode: 401 });
  }
  if (!paymentProvider.isConfigured()) {
    log.warn('degraded', { error_code: 'payment_provider_not_configured' });
    return json({ error: 'payment_provider_not_configured', provider }, { statusCode: 503 });
  }

  try {
    const sb = getSupabase();
    const { data: u, error: e1 } = await sb
      .from('users')
      .select('id, lead_id, email, nombre, apellidos, tipo, origin, pais, num_carreras, has_eu_id, contract_signed, contract_data, pago_completed')
      .eq('id', session.uid)
      .single();
    if (e1 || !u) {
      log.warn('rejected', { error_code: 'unauthorized' });
      return json({ error: 'unauthorized' }, { statusCode: 401 });
    }
    if (!u.contract_signed) {
      log.warn('rejected', { error_code: 'contract_not_signed' });
      return json({ error: 'contract_not_signed' }, { statusCode: 409 });
    }
    if (u.pago_completed) {
      log.warn('rejected', { error_code: 'already_paid' });
      return json({ error: 'already_paid' }, { statusCode: 409 });
    }

    const first = applicationPlanForUser(u)[0];
    const amount = first.amount;
    const amountMinor = toMinorUnits(amount);
    const nombre = [u.nombre, u.apellidos].filter(Boolean).join(' ') || (u.email || '');

    const attempt = await attempts.createAttempt(sb, {
      userId: u.id,
      kind: 'onboarding',
      provider,
      amountMinor,
      currency: 'EUR',
    });
    try {
      const order = await revolut.createOrder({
        amountMinor,
        currency: 'EUR',
        description: ('Project Robin · Primera cuota' + (nombre ? ' · ' + nombre : '')).slice(0, 240),
        email: u.email,
        attemptId: attempt.id,
        kind: 'onboarding',
        redirectUrl: `${revolut.getBaseUrl(event)}/portal/?payment_attempt=${attempt.id}`,
      });
      await attempts.attachProviderOrder(sb, attempt.id, order);
      log.success({ entity_type: 'revolut_order', entity_id: order.id });
      return json({ url: order.checkout_url, id: order.id, attempt_id: attempt.id, provider });
    } catch (error) {
      try { await attempts.markAttempt(sb, attempt.id, 'failed'); } catch (_) { /* best effort */ }
      throw error;
    }
  } catch (e) {
    log.failure(e);
    return serverError(e);
  }
};
