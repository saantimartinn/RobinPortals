// Automated checks for validation test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const validation = require('../lib/validation');

test('normaliza UUID, email, fecha y enums válidos', () => {
  assert.equal(validation.uuid(' 550E8400-E29B-41D4-A716-446655440000 '), '550e8400-e29b-41d4-a716-446655440000');
  assert.equal(validation.email(' USER@Example.COM '), 'user@example.com');
  assert.equal(validation.isoDate('2026-09-01T08:00:00+02:00'), '2026-09-01T06:00:00.000Z');
  assert.equal(validation.enumValue('paid', ['paid', 'pending']), 'paid');
  assert.equal(validation.enumValue('other', ['paid', 'pending']), null);
});

test('rechaza números no finitos o fuera de rango', () => {
  assert.equal(validation.numberValue('30', { min: 15, max: 240, integer: true }), 30);
  assert.equal(validation.numberValue('30.5', { integer: true }), null);
  assert.equal(validation.numberValue(Infinity), null);
  assert.equal(validation.numberValue(-1, { min: 0 }), null);
});

test('valida MIME y tamaño real aproximado de data URLs', () => {
  assert.deepEqual(validation.dataUrl('data:text/plain;base64,aG9sYQ==', {
    allowedMime: ['text/plain'], maxBytes: 4,
  }), { ok: true, mime: 'text/plain', bytes: 4 });
  assert.equal(validation.dataUrl('data:text/plain;base64,aG9sYQ==', { maxBytes: 3 }).error, 'file_too_large');
  assert.equal(validation.dataUrl('https://example.com/file.pdf').error, 'invalid_file');
});

test('limita paginación con defaults seguros', () => {
  assert.deepEqual(validation.pagination({ limit: '50', offset: '10' }), { limit: 50, offset: 10 });
  assert.deepEqual(validation.pagination({ limit: '500', offset: '-1' }), { limit: 25, offset: 0 });
});
