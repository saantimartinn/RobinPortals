const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { isApplicationAdmin } = require('../../lib/authorization');
const { CHECKS, runCheck } = require('../../lib/release-checks');
const { runPaymentAction } = require('../../lib/release-payment-runner.cjs');
const { recordResult, listResults } = require('../../lib/release-results.cjs');
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
    if (event.httpMethod === 'GET') return json({ checks: CHECKS, ...(await listResults(sb, CHECKS)) });

    const body = parseJsonBody(event);
    const check = CHECKS.find((item) => item.id === body?.id);
    if (!check) return json({ error: 'unknown_test' }, { statusCode: 400 });
    if (!check.runnable) return json({ error: check.unavailableReason || 'test_requires_isolated_sandbox' }, { statusCode: 409 });
    const started = Date.now();
    try {
      if (check.id === 'payment_sandbox') {
        const current = await runPaymentAction('status', admin.id);
        const payment = current.status === 'idle' ? await runPaymentAction('start', admin.id) : current;
        const result = { id: check.id, status: 'action_required', detail: payment.status === 'ready_to_verify' ? 'Revolut confirmó el pago. Pulsa Verificar pago.' : 'Abre el checkout sandbox con una tarjeta de prueba y vuelve para verificar el resultado.', checkout_url: payment.checkout_url, amount_eur: payment.amount_eur, test_email: payment.test_email, test_holder: payment.test_holder, duration_ms: Date.now() - started, ran_at: new Date().toISOString() };
        await recordResult(sb, result);
        return json(result);
      }
      const detail = await runCheck(check.id, admin);
      const result = { id: check.id, status: 'passed', detail, duration_ms: Date.now() - started, ran_at: new Date().toISOString() };
      await recordResult(sb, result);
      return json(result);
    } catch (testError) {
      console.error('admin test failed', check.id, testError);
      const result = { id: check.id, status: 'failed', detail: testError.message || 'Error desconocido', duration_ms: Date.now() - started, ran_at: new Date().toISOString() };
      await recordResult(sb, result);
      return json(result);
    }
  } catch (error) {
    return serverError(error, 'admin.tests_run');
  }
};
