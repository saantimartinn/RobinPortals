// Automated checks for identity test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildLoginFilter,
  findIdentityCandidates,
  resolvePasswordCandidate,
} = require('../lib/identity');

test('escapa el identificador antes de construir el filtro PostgREST', () => {
  assert.equal(
    buildLoginFilter(' a,b"c\\d '),
    'username.eq."a,b\\"c\\\\d",email.eq."a,b\\"c\\\\d",lead_id.eq."a,b\\"c\\\\d"'
  );
});

test('la autenticación consulta únicamente la identidad de aplicación', async () => {
  const tables = [];
  const sb = {
    from(table) {
      tables.push(table);
      return {
        select() { return this; },
        or() { return this; },
        async limit() { return { data: [{ id: 'u1' }], error: null }; },
      };
    },
  };
  const candidates = await findIdentityCandidates(sb, 'student@example.com');
  assert.deepEqual(tables, ['users']);
  assert.deepEqual(candidates, [{ table: 'users', row: { id: 'u1' } }]);
});

test('elige la única identidad cuya contraseña coincide', () => {
  const candidates = [
    { table: 'users', row: { id: 'u1', password_hash: 'first' } },
    { table: 'users', row: { id: 'u2', password_hash: 'second' } },
  ];
  const result = resolvePasswordCandidate(candidates, 'secret', (_plain, hash) => hash === 'second');
  assert.equal(result.status, 'ok');
  assert.equal(result.candidate.row.id, 'u2');
});

test('rechaza una identidad si la misma credencial abre más de una cuenta', () => {
  const candidates = [
    { table: 'users', row: { id: 'u1', password_hash: 'same' } },
    { table: 'users', row: { id: 'u2', password_hash: 'same' } },
  ];
  const result = resolvePasswordCandidate(candidates, 'secret', () => true);
  assert.equal(result.status, 'ambiguous');
  assert.equal(result.candidate, null);
});

test('no revela candidato cuando ninguna contraseña coincide', () => {
  const result = resolvePasswordCandidate(
    [{ table: 'users', row: { id: 'u1', password_hash: 'hash' } }],
    'wrong',
    () => false
  );
  assert.equal(result.status, 'invalid');
  assert.equal(result.candidate, null);
});
