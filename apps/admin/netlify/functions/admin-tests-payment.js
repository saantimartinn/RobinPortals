const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { isApplicationAdmin } = require('../../lib/authorization');
const { runPaymentAction } = require('../../lib/release-payment-runner.cjs');
const { recordResult } = require('../../lib/release-results.cjs');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../../lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') return methodNotAllowed(['GET', 'POST']);
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  if (event.httpMethod === 'POST' && !verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  try {
    const sb = getSupabase();
    const { data: admin, error } = await sb.from('users').select('id,email,role').eq('id', session.uid).single();
    if (error || !admin || !isApplicationAdmin(admin)) return json({ error: 'forbidden' }, { statusCode: 403 });
    const action = event.httpMethod === 'GET' ? 'status' : parseJsonBody(event)?.action;
    if (!['status', 'start', 'verify', 'cleanup'].includes(action)) return json({ error: 'invalid_action' }, { statusCode: 400 });
    try {
      const payment = await runPaymentAction(action, admin.id);
      if (action === 'verify' && payment.status === 'passed') {
        await recordResult(sb, { id: 'payment_sandbox', status: 'passed', detail: payment.detail, duration_ms: 0, ran_at: new Date().toISOString() });
      } else if (action === 'cleanup') {
        await recordResult(sb, { id: 'payment_sandbox', status: 'cancelled', detail: 'Prueba cancelada antes de completar el pago.', duration_ms: 0, ran_at: new Date().toISOString() });
      }
      return json(payment);
    }
    catch (testError) { return json({ error: testError.message || 'payment_test_failed' }, { statusCode: 409 }); }
  } catch (error) { return serverError(error, 'admin.tests_payment'); }
};
