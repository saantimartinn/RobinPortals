// Automated checks for webhook auth test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');

const { verifyConfiguredSecret } = require('../lib/http');

test('un webhook sin secreto configurado falla cerrado', () => {
  assert.deepEqual(verifyConfiguredSecret('', ''), {
    ok: false,
    error: 'missing_secret_configuration',
    statusCode: 500,
  });
});

test('un secreto incorrecto se rechaza', () => {
  assert.deepEqual(verifyConfiguredSecret('expected', 'wrong'), {
    ok: false,
    error: 'unauthorized',
    statusCode: 401,
  });
});

test('un secreto correcto permite continuar', () => {
  assert.deepEqual(verifyConfiguredSecret('expected', 'expected'), {
    ok: true,
    error: null,
    statusCode: 200,
  });
});

test('el polling de Meet no admite invocación HTTP', async () => {
  const { handler } = require('../netlify/functions/meet-transcript-poll');
  const response = await handler({ httpMethod: 'POST' });
  assert.equal(response.statusCode, 404);
  assert.deepEqual(JSON.parse(response.body), { error: 'not_found' });
});
