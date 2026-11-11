import test from 'node:test';
import assert from 'node:assert/strict';
import { createUpdateNoticeGate } from '../portal-source/src/support/update-notice-gate.js';

function storage() {
  const values = new Map();
  return { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
}

test('registra la aparición sin esperar al cierre y no repite al recargar', async () => {
  const local = storage();
  const first = createUpdateNoticeGate();
  assert.equal(await first('student', async () => ({ show: true }), local), true);
  const reloaded = createUpdateNoticeGate();
  let migrated;
  assert.equal(await reloaded('student', async body => { migrated = body; return { show: false }; }, local), false);
  assert.deepEqual(migrated, { already_seen: true });
});

test('deduplica efectos simultáneos sin consumir el resultado del montaje activo', async () => {
  const gate = createUpdateNoticeGate();
  let calls = 0;
  const claim = async () => { calls++; return { show: true }; };
  assert.deepEqual(await Promise.all([gate('a', claim), gate('a', claim)]), [true, true]);
  assert.equal(calls, 1);
  assert.equal(await gate('a', claim), false);
  assert.equal(await gate('b', claim), true);
});

test('la cuenta prevalece sobre un navegador nuevo o con almacenamiento bloqueado', async () => {
  const gate = createUpdateNoticeGate();
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(await gate('already-seen', async () => ({ show: false }), blocked), false);
  assert.equal(await gate('new-student', async () => ({ show: true }), blocked), true);
  assert.equal(await gate('new-student', async () => ({ show: true }), blocked), false);
});
