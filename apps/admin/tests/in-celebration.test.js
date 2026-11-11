const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../src/features/admin/in-celebration.mjs');

test('solo celebra una cuenta creada y conserva el nombre y portal confirmados', async () => {
  const { getInCelebration } = await load();
  const details = { name: 'Ana', portalName: 'Robin Jr', lastId: null };
  assert.equal(getInCelebration({ result: 'exists' }, details), null);
  assert.equal(getInCelebration(null, details), null);
  const result = getInCelebration({ result: 'created' }, details, () => 0.5);
  assert.equal(result.name, 'Ana');
  assert.equal(result.portalName, 'Robin Jr');
  assert.ok(result.gif.src.endsWith('.gif'));
});

test('alterna los dibujos sin repetir el GIF anterior y reserva las sorpresas para pocas ocasiones', async () => {
  const { getInCelebration, inCelebrationGallery } = await load();
  const normal = inCelebrationGallery.filter(gif => !gif.rare);
  assert.ok(normal.some(gif => gif.id.startsWith('spongebob')));
  assert.ok(normal.some(gif => gif.id.startsWith('cars')));
  const first = getInCelebration({ result: 'created' }, { name: 'Ana', portalName: 'Alumno' }, () => 0.5);
  const next = getInCelebration({ result: 'created' }, { name: 'Ana', portalName: 'Alumno', lastId: first.gif.id }, () => 0.5);
  assert.notEqual(first.gif.id, next.gif.id);
  const rare = getInCelebration({ result: 'created' }, { name: 'Ana', portalName: 'Alumno' }, () => 0);
  assert.equal(rare.gif.rare, true);
  const afterRare = getInCelebration({ result: 'created' }, { name: 'Ana', portalName: 'Alumno', lastId: rare.gif.id }, () => 0);
  assert.equal(Boolean(afterRare.gif.rare), false);
});
