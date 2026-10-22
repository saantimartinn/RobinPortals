/**
 * POST /api/payments/verify  Body: { attempt_id }
 * Confirma inmediatamente al volver de la pasarela recuperando la operación
 * y cumpliendo el pago de forma idempotente. El webhook sigue siendo el
 * mecanismo autoritativo; esto sólo mejora la UX del retorno.
 */
const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../../lib/http');
const revolut = require('../../lib/revolut');
const attempts = require('../../lib/payment-attempts');
const { assertFulfilled } = require('../../lib/payment-fulfill');
const { createOperationLogger } = require('../../lib/observability');
const { stringValue } = require('../../lib/validation');

exports.handler = async (event) => {
  const session = readSessionFromEvent(event);
  const log = createOperationLogger(event, {
    operation: 'payments.verify',
    actor_id: session && session.uid,
    actor_role: session && session.role,
    integration: 'revolut',
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
  const body = parseJsonBody(event);
  const attemptId = body && stringValue(body.attempt_id, { max: 64, pattern: /^[0-9a-f-]{36}$/i });
  if (!attemptId) {
    const code = body && body.attempt_id ? 'invalid_payment_reference' : 'missing_payment_reference';
    log.warn('rejected', { error_code: code });
    return json({ error: code }, { statusCode: 400 });
  }

  try {
    const sb = getSupabase();
    if (!revolut.isConfigured()) return json({ error: 'revolut_not_configured' }, { statusCode: 503 });
    const attempt = await attempts.getAttemptForUser(sb, attemptId, session.uid);
    if (!attempt) return json({ error: 'not_found' }, { statusCode: 404 });
    if (attempt.provider !== 'revolut' || !attempt.provider_order_id) {
      return json({ error: 'invalid_payment_reference' }, { statusCode: 400 });
    }
    const order = await revolut.retrieveOrder(attempt.provider_order_id);
    if (order.state !== 'completed') {
      await attempts.markAttempt(sb, attempt.id, order.state || 'pending');
      return json({ ok: false, status: order.state || 'pending' });
    }
    const result = await revolut.fulfillOrder(sb, order, attempt);
    assertFulfilled(result);
    await attempts.markAttempt(sb, attempt.id, 'completed');
    log.success({ entity_type: 'revolut_order', entity_id: order.id });
    return json({ ok: true, status: 'paid', kind: attempt.kind, result });
  } catch (e) {
    log.failure(e);
    return serverError(e);
  }
};
