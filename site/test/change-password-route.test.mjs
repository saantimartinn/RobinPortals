import test from 'node:test';
import assert from 'node:assert/strict';
import { changeCommonPassword, passwordChangeEndpoint } from '../../packages/auth/change-password-client.mjs';

test('password changes target the identity that powers the shared login', () => {
  assert.equal(passwordChangeEndpoint({ id: 'portal-user' }), '/portal/api/auth/change-password');
  assert.equal(passwordChangeEndpoint({ auth_source: 'external_client', external_source: 'robinjr' }), '/robinjr/api/auth/change-password');
  assert.equal(passwordChangeEndpoint({ auth_source: 'external_client', external_source: 'community' }), '/therobinplan/api/auth/change-password');
  assert.equal(passwordChangeEndpoint({ auth_source: 'external_client', external_source: 'unknown' }), null);
});

test('the browser checks the shared identity before sending a password change', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (url === '/portal/api/me') return Response.json({ auth_source: 'external_client', external_source: 'community' });
    return Response.json({ ok: true });
  };
  try {
    await changeCommonPassword('old-secret', 'new-secret');
    assert.deepEqual(calls.map((call) => call.url), ['/portal/api/me', '/therobinplan/api/auth/change-password']);
    assert.deepEqual(JSON.parse(calls[1].options.body), { current_password: 'old-secret', new_password: 'new-secret' });
    assert.equal(calls[1].options.credentials, 'same-origin');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
