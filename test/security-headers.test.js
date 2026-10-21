// Automated checks for security headers test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { json, methodNotAllowed } = require('../lib/http');

const netlify = fs.readFileSync(path.join(__dirname, '..', 'netlify.toml'), 'utf8');

test('las cabeceras globales incluyen hardening de transporte y capacidades', () => {
  assert.match(netlify, /Strict-Transport-Security = "max-age=31536000; includeSubDomains"/);
  assert.match(netlify, /Permissions-Policy = "camera=\(\), microphone=\(\), geolocation=\(\), payment=\(\), usb=\(\), browsing-topics=\(\)"/);
  assert.match(netlify, /X-Permitted-Cross-Domain-Policies = "none"/);
});

test('la CSP permite solo las capacidades que usa el frontend', () => {
  const match = /Content-Security-Policy = "([^"]+)"/.exec(netlify);
  assert.ok(match);
  const policy = match[1];
  for (const directive of [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://jptiqynxiigvgxzbglgh.supabase.co",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "frame-src 'none'",
    'upgrade-insecure-requests',
  ]) assert.equal(policy.includes(directive), true, directive);
  assert.equal(policy.includes("script-src 'unsafe-inline'"), false);
  assert.equal(policy.includes("script-src *"), false);
});

test('las rutas API públicas y directas no se cachean', () => {
  assert.match(netlify, /for = "\/api\/\*"[\s\S]*?Cache-Control = "no-store"/);
  assert.match(netlify, /for = "\/\.netlify\/functions\/\*"[\s\S]*?Cache-Control = "no-store"/);
});

test('las respuestas JSON declaran no-store desde la propia función', () => {
  assert.equal(json({ ok: true }).headers['Cache-Control'], 'no-store');
  assert.equal(json({ ok: true }, { headers: { 'Cache-Control': 'public, max-age=3600' } }).headers['Cache-Control'], 'no-store');
  const rejectedMethod = methodNotAllowed(['POST']);
  assert.equal(rejectedMethod.headers['Cache-Control'], 'no-store');
  assert.equal(rejectedMethod.headers.Allow, 'POST');
});

test('ninguna Function construye respuestas JSON al margen del helper seguro', () => {
  const functionsDir = path.join(__dirname, '..', 'netlify', 'functions');
  const offenders = fs.readdirSync(functionsDir)
    .filter((filename) => filename.endsWith('.js'))
    .filter((filename) => fs.readFileSync(path.join(functionsDir, filename), 'utf8').includes('body: JSON.stringify('));
  assert.deepEqual(offenders, []);
});
