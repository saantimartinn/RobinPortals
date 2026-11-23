const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { transformSync } = require('esbuild');

const source = readFileSync(require.resolve('../src/features/admin/lead-shared.tsx'), 'utf8');
const compiled = transformSync(source, { loader: 'tsx', format: 'esm' }).code;
const shared = import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const day = 86400000;
const now = Date.parse('2026-11-18T12:00:00Z');
const pending = { stage: 'Por contactar', owner: '' };

test('los leads del recomendador solo aparecen en Recomendador, no en España ni General', async () => {
  const { matchesInboxView } = await shared;
  for (const field of ['campaign', 'formName', 'source']) {
    for (const country of ['España', 'Portugal', 'Otros', undefined]) {
      const lead = Object.freeze({ source: 'Página web', country, [field]: '  ReCoMeNdAdOr  ' });
      const views = ['all', 'España', 'Portugal', 'recomendador', 'eventos', 'reservas'];
      assert.deepEqual(views.filter(view => matchesInboxView(lead, view)), ['recomendador']);
      assert.equal(lead.country, country);
      assert.equal(lead[field], '  ReCoMeNdAdOr  ');
    }
  }
});

test('los contactos españoles normales siguen en España y General', async () => {
  const { matchesInboxView } = await shared;
  const lead = { source: 'Página web', campaign: 'Contacto', formName: 'contacto', country: 'España' };
  assert.equal(matchesInboxView(lead, 'España'), true);
  assert.equal(matchesInboxView(lead, 'all'), true);
  assert.equal(matchesInboxView(lead, 'recomendador'), false);
});

test('las campañas de eventos y las reservas conservan su prioridad sobre el recomendador', async () => {
  const { matchesInboxView } = await shared;
  const event = { source: 'Eventos', campaign: 'Unitour Lisboa', formName: 'recomendador', country: 'España' };
  assert.equal(matchesInboxView(event, 'eventos', 'lisboa'), true);
  assert.equal(matchesInboxView(event, 'recomendador'), false);
  assert.equal(matchesInboxView(event, 'España'), false);
  const booking = { source: 'Página web', campaign: 'Recomendador', formName: 'reserva', country: 'España' };
  assert.equal(matchesInboxView(booking, 'reservas'), true);
  assert.equal(matchesInboxView(booking, 'recomendador'), false);
  assert.equal(matchesInboxView(booking, 'España'), false);
});

test('solo archiva al superar 30 días completos desde la entrada', async () => {
  const { leadInboxSection } = await shared;
  for (const [age, expected] of [[29 * day, 'active'], [30 * day, 'active'], [30 * day + 1, 'overdue'], [31 * day, 'overdue']]) {
    const lead = { ...pending, createdAt: new Date(now - age).toISOString() };
    assert.equal(leadInboxSection(lead, undefined, undefined, now), expected);
  }
});

test('la antigüedad no archiva leads asignados ni fases del CRM personal', async () => {
  const { leadInboxSection } = await shared;
  const lead = { ...pending, createdAt: new Date(now - 90 * day).toISOString() };
  assert.equal(leadInboxSection({ ...lead, owner: 'Manuel' }, undefined, undefined, now), null);
  assert.equal(leadInboxSection(lead, 'Por contactar', 'María', now), null);
  for (const stage of ['Contactado', 'Propuesta enviada', 'Llamada programada', 'Llamada tenida', 'En espera', 'Cliente']) {
    assert.equal(leadInboxSection({ ...lead, stage }, undefined, undefined, now), null, stage);
  }
  assert.equal(leadInboxSection({ ...lead, stage: 'Lost' }, undefined, undefined, now), 'definitive');
});

test('un lead antiguo solo aparece en >30 days, aunque encaje en varias pestañas', async () => {
  const { leadInboxSection, matchesInboxView } = await shared;
  for (const formName of ['contacto', 'recomendador', 'reserva']) {
    const lead = { ...pending, createdAt: new Date(now - 31 * day).toISOString(), source: 'Página web', campaign: 'Recomendador', country: 'España', formName };
    const activeViews = ['all', 'España', 'Portugal', 'recomendador', 'reservas'].filter((view) => leadInboxSection(lead, undefined, undefined, now) === 'active' && matchesInboxView(lead, view));
    assert.deepEqual(activeViews, []);
    assert.equal(leadInboxSection(lead, undefined, undefined, now), 'overdue');
  }
});

test('las fechas desconocidas o futuras no provocan un archivo incorrecto', async () => {
  const { leadInboxSection } = await shared;
  for (const createdAt of [undefined, '', 'invalid', new Date(now + day).toISOString()]) {
    assert.equal(leadInboxSection({ ...pending, createdAt }, undefined, undefined, now), 'active');
  }
});

test('responde a asignación y cambio de fase sin duplicar el lead en Lost', async () => {
  const { leadInboxSection } = await shared;
  const lead = { ...pending, createdAt: new Date(now - 31 * day).toISOString() };
  assert.equal(leadInboxSection(lead, 'Por contactar', '', now), 'overdue');
  assert.equal(leadInboxSection(lead, 'Por contactar', 'Noel', now), null);
  assert.equal(leadInboxSection(lead, 'Lost', 'Noel', now), 'definitive');
});
