const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { transformSync } = require('esbuild');

async function inboxViews() {
  const source = readFileSync(require.resolve('../src/features/admin/lead-shared.tsx'), 'utf8');
  const compiled = transformSync(source, { loader: 'tsx', format: 'esm' }).code;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}

test('los leads existentes del recomendador aparecen solo en su bandeja', async () => {
  const { matchesInboxView } = await inboxViews();
  const leads = [
    { id: 'rbmt', source: 'Página web', campaign: 'Recomendador', formName: 'recomendador', country: 'España', createdAt: '2026-11-18T12:00:00Z' },
    { id: 'web', source: 'Página web', campaign: '', formName: 'contacto', country: 'Portugal' },
    { id: 'meta', source: 'Meta Ads', campaign: 'Campaña de otoño', country: 'España' },
  ];
  assert.deepEqual(leads.filter(lead => matchesInboxView(lead, 'all')).map(lead => lead.id), ['web', 'meta']);
  assert.deepEqual(leads.filter(lead => matchesInboxView(lead, 'recomendador')).map(lead => lead.id), ['rbmt']);
  assert.deepEqual(leads.filter(lead => matchesInboxView(lead, 'España')).map(lead => lead.id), ['meta']);
});

test('reconoce el origen por campaña, formulario o etiqueta de origen, sin confundir otras webs', async () => {
  const { matchesInboxView } = await inboxViews();
  for (const lead of [{ campaign: ' ReCoMeNdAdOr ' }, { formName: 'recomendador' }, { source: 'Recomendador' }]) {
    assert.equal(matchesInboxView(lead, 'recomendador'), true);
  }
  assert.equal(matchesInboxView({ source: 'Página web', campaign: 'Otras campañas', comment: 'Le interesa el recomendador' }, 'recomendador'), false);
  assert.equal(matchesInboxView({}, 'recomendador'), false);
});

test('la bandeja de Reservas conserva su separación al añadir Recomendador', async () => {
  const { matchesInboxView } = await inboxViews();
  const booking = { formName: 'reserva', country: 'España' };
  assert.equal(matchesInboxView(booking, 'reservas'), true);
  for (const view of ['all', 'España', 'Portugal', 'recomendador']) assert.equal(matchesInboxView(booking, view), false);
  assert.equal(matchesInboxView({ formName: 'recomendador' }, 'reservas'), false);
});
