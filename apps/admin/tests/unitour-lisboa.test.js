const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { buildSync, transformSync } = require('esbuild');

const importCode = (code) => import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const dataClient = importCode(buildSync({
  entryPoints: [resolve(__dirname, '../src/services/admin-data.ts')],
  alias: { '@': resolve(__dirname, '../src') },
  bundle: true, write: false, platform: 'node', format: 'esm',
}).outputFiles[0].text);
const shared = importCode(transformSync(readFileSync(resolve(__dirname, '../src/features/admin/lead-shared.tsx'), 'utf8'), { loader: 'tsx', format: 'esm' }).code);

test('clasifica el recomendador como Unitour Lisboa solo el 17/11 entre las 10:00 y las 18:00 de Lisboa', async (t) => {
  const cases = [
    ['2026-11-17T09:59:59.999Z', 'Recomendador'],
    ['2026-11-17T10:00:00Z', 'Unitour Lisboa'],
    ['2026-11-17T14:30:00Z', 'Unitour Lisboa'],
    ['2026-11-17T18:00:00Z', 'Unitour Lisboa'],
    ['2026-11-17T18:00:00.001Z', 'Recomendador'],
    ['2026-11-16T14:30:00Z', 'Recomendador'],
    ['2026-11-18T14:30:00Z', 'Recomendador'],
    ['2026-11-17T10:30:00+01:00', 'Recomendador'],
    ['2026-11-17T11:00:00+01:00', 'Unitour Lisboa'],
    ['fecha inválida', 'Recomendador'],
    [undefined, 'Recomendador'],
  ];
  const leads = cases.map(([date], index) => ({ id: String(index), source_created_at: date, source_payload: { source: 'website', campaign_name: 'Recomendador', form_name: 'recomendador' } }));
  leads.push({ id: 'contacto', source_created_at: '2026-11-17T14:30:00Z', source_payload: { source: 'website', campaign_name: 'Otra campaña', form_name: 'contacto' } });
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ leads })));
  const { adminDataClient } = await dataClient;
  const contacts = await adminDataClient.listLeads();
  for (const [index, [date, campaign]] of cases.entries()) {
    assert.equal(contacts[index].campaign, campaign, String(date));
    assert.equal(contacts[index].formName, 'recomendador');
    assert.equal(contacts[index].source, campaign === 'Unitour Lisboa' ? 'Eventos' : 'Página web');
  }
  assert.equal(contacts.at(-1).campaign, 'Otra campaña');
});

test('el formulario de feria etiquetado Unitour Lisboa sale de Página web y General', async (t) => {
  const leads = [
    { form_name: 'feria', tag: 'unitour-lisboa-portugal', page_url: '/unitourlisboa/' },
    { form_name: 'feria', tag: 'otra-feria' },
    { form_name: 'feria' },
    { form_name: 'contacto' },
    { form_name: 'feria', tag: 'unitour-lisboa-portugal', campaign_name: 'Unitour Valencia' },
  ].map((payload, index) => ({ id: String(index), source_created_at: '2026-11-17T10:14:04.367Z', source_payload: { source: 'website', ...payload } }));
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ leads })));
  const { adminDataClient } = await dataClient;
  const { inboxCampaignLabel, matchesInboxView } = await shared;
  const contacts = await adminDataClient.listLeads();
  assert.equal(contacts[0].campaign, 'Unitour Lisboa');
  assert.equal(contacts[0].source, 'Eventos');
  assert.equal(inboxCampaignLabel(contacts[0]), 'Unitour Lisboa');
  assert.equal(matchesInboxView(contacts[0], 'eventos', 'lisboa'), true);
  for (const view of ['all', 'Portugal', 'recomendador']) assert.equal(matchesInboxView(contacts[0], view), false, view);
  for (const contact of contacts.slice(1, 4)) {
    assert.equal(contact.source, 'Página web');
    assert.equal(contact.campaign, 'Pendiente de identificar');
    assert.equal(matchesInboxView(contact, 'all'), true);
  }
  assert.equal(contacts[4].campaign, 'Unitour Valencia');
  assert.equal(matchesInboxView(contacts[4], 'eventos', 'valencia'), true);
});

test('la clasificación reconoce el formulario, campaña u origen y usa la fecha de entrada original', async (t) => {
  const leads = [
    { source_payload: { source: 'website', form_name: ' Recomendador ' } },
    { source_payload: { source: 'website', campaign_name: ' RECOMENDADOR ' } },
    { source_payload: { source: 'recomendador' } },
    { campaign_notion_urls: ['Recomendador'] },
  ].map((row, index) => ({ id: String(index), source_created_at: '2026-11-17T12:00:00Z', created_at: '2026-11-18T12:00:00Z', ...row }));
  leads.push({ id: 'fallback', created_at: '2026-11-17T12:00:00Z', source_payload: { campaign_name: 'Recomendador' } });
  leads.push({ id: 'importado', source_created_at: '2026-11-16T12:00:00Z', created_at: '2026-11-17T12:00:00Z', source_payload: { campaign_name: 'Recomendador' } });
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ leads })));
  const { adminDataClient } = await dataClient;
  const contacts = await adminDataClient.listLeads();
  assert.ok(contacts.slice(0, 5).every((contact) => contact.campaign === 'Unitour Lisboa'));
  assert.equal(contacts.at(-1).campaign, 'Recomendador');
});

test('Unitour Lisboa aparece en Eventos y queda fuera de las bandejas de entrada', async () => {
  const { campaignOrOrigin, inboxCampaignLabel, matchesInboxView } = await shared;
  const lead = { source: 'Eventos', campaign: 'Unitour Lisboa', formName: 'recomendador', pageUrl: 'https://project-robin.com/rbmt/', country: 'Portugal' };
  assert.equal(campaignOrOrigin(lead), 'Unitour Lisboa');
  assert.equal(inboxCampaignLabel(lead), 'Unitour Lisboa');
  assert.equal(matchesInboxView(lead, 'eventos', 'lisboa'), true);
  for (const view of ['all', 'España', 'Portugal', 'recomendador', 'reservas']) assert.equal(matchesInboxView(lead, view), false, view);
  for (const section of ['canarias', 'valencia']) assert.equal(matchesInboxView(lead, 'eventos', section), false, section);
  assert.equal(matchesInboxView({ ...lead, campaign: ' UNITOUR LISBOA ', source: 'recomendador' }, 'recomendador'), false);
  assert.equal(matchesInboxView({ ...lead, campaign: 'Recomendador' }, 'recomendador'), true);
  assert.equal(matchesInboxView({ ...lead, campaign: 'Recomendador' }, 'eventos', 'lisboa'), false);
});

test('cada Unitour mantiene su campaña, origen Eventos y un único subtab', async (t) => {
  const names = ['Lisboa', 'Canarias', 'Valencia'];
  const leads = names.map((name, index) => ({ id: String(index), source_created_at: '2026-11-17T12:00:00Z', source_payload: { source: 'website', campaign_name: `Unitour ${name}`, form_name: 'recomendador' } }));
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ leads })));
  const { adminDataClient } = await dataClient;
  const { campaignOrOrigin, inboxCampaignLabel, matchesInboxView } = await shared;
  const contacts = await adminDataClient.listLeads();
  for (const [index, contact] of contacts.entries()) {
    assert.equal(contact.source, 'Eventos');
    assert.equal(contact.campaign, `Unitour ${names[index]}`);
    assert.equal(campaignOrOrigin(contact), contact.campaign);
    assert.equal(inboxCampaignLabel(contact), contact.campaign);
    assert.equal(matchesInboxView(contact, 'all'), false);
    assert.equal(matchesInboxView(contact, 'recomendador'), false);
    for (const section of ['lisboa', 'canarias', 'valencia']) {
      assert.equal(matchesInboxView(contact, 'eventos', section), section === names[index].toLowerCase(), `${contact.campaign}: ${section}`);
    }
  }
});
