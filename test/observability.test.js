// Automated checks for observability test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createOperationLogger, errorCode, requestId } = require('../lib/observability');

function capture() {
  const rows = [];
  return {
    rows,
    sink: {
      log: (line) => rows.push(JSON.parse(line)),
      warn: (line) => rows.push(JSON.parse(line)),
      error: (line) => rows.push(JSON.parse(line)),
    },
  };
}

test('reutiliza el request ID de Netlify sin distinguir mayúsculas', () => {
  assert.equal(requestId({ headers: { 'X-Nf-Request-Id': 'req-123' } }), 'req-123');
});

test('genera un request ID cuando la plataforma no lo proporciona', () => {
  assert.equal(requestId({}, () => 'generated-456'), 'generated-456');
});

test('emite logs correlacionados y descarta payloads o secretos', () => {
  const out = capture();
  let clock = 1_000;
  const log = createOperationLogger(
    { headers: { 'x-request-id': 'req-safe' } },
    { operation: 'payments.verify', integration: 'revolut' },
    { sink: out.sink, now: () => clock }
  );
  log.start({ actor_id: 'user-1', email: 'private@example.com', token: 'secret' });
  clock = 1_025;
  log.success({ entity_type: 'payment', entity_id: 'pay-1', body: { private: true } });

  assert.equal(out.rows.length, 2);
  assert.deepEqual(out.rows[1], {
    timestamp: new Date(1_025).toISOString(),
    level: 'info',
    request_id: 'req-safe',
    operation: 'payments.verify',
    integration: 'revolut',
    entity_type: 'payment',
    entity_id: 'pay-1',
    result: 'ok',
    duration_ms: 25,
  });
  assert.equal('email' in out.rows[0], false);
  assert.equal('token' in out.rows[0], false);
  assert.equal('body' in out.rows[1], false);
});

test('normaliza códigos de error sin registrar el mensaje', () => {
  assert.equal(errorCode({ code: 'REVOLUT/API Error!' }), 'revolut_api_error');
  assert.equal(errorCode(new Error('retry_failed')), 'retry_failed');
  assert.equal(errorCode(new Error('contiene datos privados')), 'error');
});
