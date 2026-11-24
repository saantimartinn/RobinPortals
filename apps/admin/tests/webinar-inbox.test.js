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

test('solo una campaña Webinar 21-11 atribuida a Meta aparece en la sección del webinar', async (t) => {
  const sources = [['meta', 'Meta Ads'], ['website', 'Página web'], ['email', 'Email']];
  const leads = sources.map(([source], index) => ({
    id: String(index), source_created_at: '2026-11-18T12:00:00Z',
    source_payload: { source, campaign_name: 'Webinar 21-11', form_name: 'contacto' },
  }));
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ leads })));
  const { adminDataClient } = await dataClient;
  const { matchesInboxView } = await shared;
  const contacts = await adminDataClient.listLeads();
  for (const [index, contact] of contacts.entries()) {
    assert.equal(contact.source, sources[index][1]);
    assert.equal(contact.campaign, 'Webinar 21-11');
    assert.equal(matchesInboxView(contact, 'eventos', 'webinar-21-11'), contact.source === 'Meta Ads');
    assert.equal(matchesInboxView(contact, 'all'), contact.source !== 'Meta Ads');
    if (contact.source !== 'Meta Ads') continue;
    for (const view of ['all', 'España', 'Portugal', 'recomendador', 'reservas']) {
      assert.equal(matchesInboxView(contact, view), false, view);
    }
    for (const section of ['lisboa', 'canarias', 'valencia']) {
      assert.equal(matchesInboxView(contact, 'eventos', section), false, section);
    }
    assert.equal(contact.source, sources[index][1]);
    assert.equal(contact.campaign, 'Webinar 21-11');
  }
});

test('las landings del webinar corrigen origen y campaña heredados de cualquier canal', async (t) => {
  const pages = ['/webinar21-11/', '/webianr21-11/', 'https://project-robin.com/WEBINAR21-11/?utm_source=google'];
  const leads = pages.map((page_url, index) => ({
    id: String(index), source_created_at: '2026-11-18T12:00:00Z',
    source_payload: { source: ['website', 'email', 'meta'][index], campaign_name: 'Otra campaña', page_url },
    campaign_notion_urls: ['Otra campaña'],
  }));
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ leads })));
  const { adminDataClient } = await dataClient;
  const { matchesInboxView } = await shared;
  for (const contact of await adminDataClient.listLeads()) {
    assert.equal(contact.source, 'Meta Ads');
    assert.equal(contact.campaign, 'Webinar 21-11');
    assert.equal(matchesInboxView(contact, 'eventos', 'webinar-21-11'), true);
    assert.equal(matchesInboxView(contact, 'all'), false);
  }
});

test('una campaña heredada del webinar no prevalece sobre la landing de Candela', async (t) => {
  const leads = [
    { id: 'payload', source_payload: { source: 'website', campaign_name: 'Webinar 21-11', page_url: '/veteaholanda/', ad_id: 'previous-ad' } },
    { id: 'comment', comment: 'Formulario: contacto\nPágina: /veteaholanda/', source_payload: { source: 'website', campaign_name: 'Webinar 21-11' } },
  ];
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ leads })));
  const { adminDataClient } = await dataClient;
  const { matchesInboxView, inboxCampaignLabel } = await shared;
  for (const contact of await adminDataClient.listLeads()) {
    assert.equal(contact.source, 'Meta Ads');
    assert.equal(contact.campaign, 'Campaña continua Candela');
    assert.equal(inboxCampaignLabel(contact), 'Campaña continua Candela');
    assert.equal(matchesInboxView(contact, 'eventos', 'webinar-21-11'), false);
    assert.equal(matchesInboxView(contact, 'all'), true);
  }
});

test('la selección del webinar tolera mayúsculas y espacios sin modificar el contacto', async () => {
  const { matchesInboxView } = await shared;
  const contact = Object.freeze({ source: 'Meta Ads', campaign: ' WEBINAR 21-11 ', country: 'España' });
  assert.equal(matchesInboxView(contact, 'eventos', 'webinar-21-11'), true);
  assert.equal(matchesInboxView(contact, 'all'), false);
  assert.equal(contact.campaign, ' WEBINAR 21-11 ');
  assert.equal(contact.source, 'Meta Ads');
});

test('otros webinars conservan su bandeja y las ferias mantienen su propia sección', async () => {
  const { matchesInboxView } = await shared;
  for (const campaign of ['Webinar 10-10', 'Webinar 21-12', 'Webinar 21-11 recordatorio']) {
    const contact = { source: 'Meta Ads', campaign, country: 'España' };
    assert.equal(matchesInboxView(contact, 'eventos', 'webinar-21-11'), false, campaign);
    assert.equal(matchesInboxView(contact, 'all'), true, campaign);
  }
  const fair = { source: 'Eventos', campaign: 'Unitour Lisboa' };
  assert.equal(matchesInboxView(fair, 'eventos', 'lisboa'), true);
  assert.equal(matchesInboxView(fair, 'eventos', 'webinar-21-11'), false);
});

test('el cliente usa la marca persistida de la nueva reserva sin inferir retargeting de registros antiguos', async (t) => {
  const leads = [
    { id: 'reactivated', source_created_at: '2026-11-18T12:00:00Z', owner_names: ['Manuel'], crm_stage: 'Contactado', source_payload: {
      source: 'meta', campaign_name: 'Webinar 21-11', form_name: 'contacto', page_url: '/webinar21-11/',
      retargeting_reservation: { page_url: '/retarwebinar21-11/', email: 'new-booking@example.com', received_at: '2026-11-24T12:00:00Z' },
    } },
    { id: 'old', source_payload: { source: 'website', form_name: 'reserva', page_url: '/retarwebinar21-11/' } },
  ];
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ leads })));
  const { adminDataClient } = await dataClient;
  const { matchesInboxView } = await shared;
  const [reactivated, old] = await adminDataClient.listLeads();
  assert.equal(reactivated.retargetingReservationAt, '2026-11-24T12:00:00Z');
  assert.equal(reactivated.retargetingReservationEmail, 'new-booking@example.com');
  assert.equal(reactivated.source, 'Meta Ads');
  assert.equal(reactivated.campaign, 'Webinar 21-11');
  assert.equal(reactivated.createdAt, '2026-11-18T12:00:00Z');
  assert.equal(reactivated.owner, 'Manuel');
  assert.equal(reactivated.stage, 'Contactado');
  assert.equal(matchesInboxView(reactivated, 'reservas', undefined, 'retargeting'), true);
  assert.equal(matchesInboxView(reactivated, 'eventos', 'webinar-21-11'), false);
  assert.equal(old.retargetingReservationAt, undefined);
  assert.equal(matchesInboxView(old, 'reservas'), true);
  assert.equal(matchesInboxView(old, 'reservas', undefined, 'retargeting'), false);
});
