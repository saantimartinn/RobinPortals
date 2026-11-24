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

test('las reservas marcadas como retargeting solo aparecen en su subsección, conservando la campaña original', async () => {
  const { matchesInboxView } = await shared;
  for (const campaign of ['Webinar 21-11', 'Recomendador', 'Unitour Lisboa', 'Campaña continua Candela']) {
    const lead = Object.freeze({ source: 'Meta Ads', campaign, formName: 'contacto', country: 'España', retargetingReservationAt: '2026-11-24T12:00:00Z' });
    assert.equal(matchesInboxView(lead, 'reservas', undefined, 'retargeting'), true);
    for (const view of ['all', 'España', 'Portugal', 'recomendador', 'eventos', 'reservas']) {
      assert.equal(matchesInboxView(lead, view, 'webinar-21-11'), false, `${campaign}: ${view}`);
    }
    assert.equal(lead.campaign, campaign);
  }
});

test('una reserva antigua de esa URL sin la marca nueva no se reclasifica retroactivamente', async () => {
  const { matchesInboxView } = await shared;
  const old = { source: 'Página web', formName: 'reserva', pageUrl: 'https://project-robin.com/retarwebinar21-11/', country: 'España' };
  assert.equal(matchesInboxView(old, 'reservas'), true);
  assert.equal(matchesInboxView(old, 'reservas', undefined, 'retargeting'), false);
});

test('Retargeting solo muestra los pendientes de asignar y mantiene fuera los contactos con asesor u otra fase', async () => {
  const { leadInboxSection, matchesInboxView } = await shared;
  const lead = { ...pending, source: 'Meta Ads', campaign: 'Webinar 21-11', createdAt: '2026-11-18T12:00:00Z', retargetingReservationAt: '2026-11-24T12:00:00Z' };
  const visible = (contact) => leadInboxSection(contact, undefined, undefined, now) === 'active' && matchesInboxView(contact, 'reservas', undefined, 'retargeting');
  assert.equal(visible(lead), true);
  assert.equal(visible({ ...lead, owner: 'Manuel' }), false);
  for (const stage of ['Contactado', 'Propuesta enviada', 'Llamada programada', 'Llamada tenida', 'En espera', 'Cliente', 'Lost']) {
    assert.equal(visible({ ...lead, stage }), false, stage);
  }
});

test('una reserva de un lead de más de 30 días sale de Lost sin cambiar su fecha de captación ni contarse dos veces', async () => {
  const { leadInboxSection, matchesInboxView } = await shared;
  const original = { ...pending, id: 'same-lead', source: 'Meta Ads', campaign: 'Campaña continua Candela', createdAt: new Date(now - 90 * day).toISOString() };
  assert.equal(leadInboxSection(original, undefined, undefined, now), 'overdue');
  const reactivated = Object.freeze({ ...original, retargetingReservationAt: new Date(now - day).toISOString() });
  assert.equal(leadInboxSection(reactivated, undefined, undefined, now), 'active');
  assert.equal(matchesInboxView(reactivated, 'reservas', undefined, 'retargeting'), true);
  for (const view of ['all', 'España', 'Portugal', 'eventos', 'recomendador']) assert.equal(matchesInboxView(reactivated, view), false);
  assert.equal(reactivated.id, original.id); assert.equal(reactivated.createdAt, original.createdAt); assert.equal(reactivated.campaign, original.campaign);
  assert.equal(leadInboxSection(reactivated, undefined, undefined, now + 31 * day), 'overdue');
});
