/**
 * POST /api/revolut/webhook (público · sin auth ni verifyOrigin)
 * Verifica la firma del body crudo y procesa eventos de órdenes de Revolut.
 */
const { getSupabase } = require('../../lib/supabase');
const revolut = require('../../lib/revolut');
const attempts = require('../../lib/payment-attempts');
const { assertFulfilled } = require('../../lib/payment-fulfill');
const { createOperationLogger } = require('../../lib/observability');

const FINAL_FAILURE_EVENTS = new Set(['ORDER_CANCELLED', 'ORDER_FAILED']);

exports.handler = async (event) => {
  const log = createOperationLogger(event, {
    operation: 'webhook.revolut',
    actor_role: 'provider',
    integration: 'revolut',
  });
  log.start();
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  if (!revolut.isConfigured() || !process.env.REVOLUT_WEBHOOK_SIGNING_SECRET) {
    log.warn('degraded', { error_code: 'revolut_not_configured' });
    return { statusCode: 503, body: 'revolut_not_configured' };
  }

  const headers = event.headers || {};
  const timestamp = headers['revolut-request-timestamp'] || headers['Revolut-Request-Timestamp'];
  const signature = headers['revolut-signature'] || headers['Revolut-Signature'];
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body || '', 'base64').toString('utf8')
    : String(event.body || '');

  if (!revolut.verifyWebhookSignature(raw, timestamp, signature)) {
    log.warn('rejected', { error_code: 'invalid_signature' });
    return { statusCode: 400, body: 'invalid_signature' };
  }

  let webhook;
  try { webhook = JSON.parse(raw); } catch (_) {
    return { statusCode: 400, body: 'invalid_json' };
  }

  const type = String(webhook.event || webhook.type || '');
  const orderId = webhook.order_id || (webhook.data && webhook.data.order_id);
  if (!orderId) return { statusCode: 204, body: '' };

  try {
    const sb = getSupabase();
    const attempt = await attempts.getAttemptByProviderOrder(sb, 'revolut', orderId);
    if (!attempt) {
      await logWebhook(sb, type, orderId, 'ignored', 'payment_attempt_not_found');
      return { statusCode: 204, body: '' };
    }

    if (type === 'ORDER_COMPLETED') {
      const order = await revolut.retrieveOrder(orderId);
      const result = await revolut.fulfillOrder(sb, order, attempt);
      assertFulfilled(result);
      await attempts.markAttempt(sb, attempt.id, 'completed');
      await logWebhook(sb, type, orderId, result.already ? 'already_processed' : 'ok', 'revolut order fulfillment');
    } else if (FINAL_FAILURE_EVENTS.has(type)) {
      await attempts.markAttempt(sb, attempt.id, type === 'ORDER_CANCELLED' ? 'cancelled' : 'failed');
      await logWebhook(sb, type, orderId, 'ok', 'payment attempt closed');
    } else {
      await logWebhook(sb, type, orderId, 'ignored', 'event_not_actionable');
    }

    log.success({ entity_type: 'revolut_order', entity_id: orderId });
    return { statusCode: 204, body: '' };
  } catch (error) {
    log.failure(error, { entity_type: 'revolut_order', entity_id: orderId });
    return { statusCode: 500, body: 'processing_failed' };
  }
};

async function logWebhook(sb, type, orderId, result, message) {
  try {
    await sb.from('webhook_log').insert({
      source: 'revolut',
      payload: { type, order_id: orderId },
      result,
      message,
    });
  } catch (error) { console.warn('[optional_operation_failed]', error && error.message); }
}
