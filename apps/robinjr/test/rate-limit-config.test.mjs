// Automated checks for rate limit config test; external services should remain outside this test boundary.
import test from 'node:test';
import assert from 'node:assert/strict';
import identityHandler, { config as identity } from '../netlify/edge-functions/rate-limit-identity.mjs';
import expensiveHandler, { config as expensive } from '../netlify/edge-functions/rate-limit-expensive.mjs';

test('la regla de identidad protege los endpoints de sesión', () => {
  assert.deepEqual(identity.rateLimit, {
    windowLimit: 10,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  });
  assert.deepEqual(identity.path, [
    '/api/auth/login',
    '/api/auth/change-password',
  ]);
});

test('la regla de coste cubre IA, OCR, uploads y Calendar', () => {
  assert.equal(expensive.rateLimit.windowLimit, 12);
  assert.equal(expensive.rateLimit.windowSize, 60);
  for (const path of ['/api/chat', '/api/onboarding/dni/extract', '/api/documents/upload-ticket', '/api/documents/upload', '/api/bookings/create']) {
    assert.equal(expensive.path.includes(path), true);
  }
});

test('los edge handlers continúan hacia la Function después del gate nativo', async () => {
  const marker = new Response('continued');
  const context = { next: async () => marker };
  assert.equal(await identityHandler(new Request('https://example.test/api/auth/login'), context), marker);
  assert.equal(await expensiveHandler(new Request('https://example.test/api/chat'), context), marker);
});
