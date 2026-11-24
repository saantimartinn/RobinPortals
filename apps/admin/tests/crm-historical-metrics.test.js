// Automated checks for crm historical metrics test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  enrichHistoricalCampaigns,
  historicalCampaignChannel,
  normalizeHistoricalValue,
} = require('../lib/crm-historical-metrics');
const { buildSalesDashboard } = require('../lib/sales-dashboard');
const { buildCrmPerformance } = require('../lib/crm-performance');

test('classifies historical campaign channels without losing campaign names', () => {
  assert.equal(historicalCampaignChannel('Orgánico'), 'organic');
  assert.equal(historicalCampaignChannel('Delft Septiembre'), 'meta');
  assert.equal(historicalCampaignChannel('Deflt Junio 26'), 'meta');
  assert.equal(historicalCampaignChannel('Voramar'), 'schools');
  assert.equal(historicalCampaignChannel('Kings College'), 'schools');
  assert.equal(historicalCampaignChannel('The Ark'), 'schools');
  assert.equal(historicalCampaignChannel('Foto Webinar Mar'), 'meta');
  assert.equal(normalizeHistoricalValue('  María – Vídeo  '), 'maria video');
});

test('matches an unmapped historical campaign to one unambiguous Meta name', () => {
  const [row] = enrichHistoricalCampaigns([{
    campaign_name: 'foto webinar feb',
    channel: 'meta',
    meta_campaign_id: null,
  }], [{ id: 'meta-1', name: 'Foto Webinar Feb' }]);
  assert.equal(row.meta_campaign_id, 'meta-1');
  assert.equal(row.campaign_match_method, 'exact_name');
});

test('adds historical cohorts to existing ranges but keeps live operational data separate', () => {
  const bounds = {
    id: 'custom',
    start: new Date('2026-09-01T00:00:00.000Z'),
    end: new Date('2026-10-01T00:00:00.000Z'),
    granularity: 'month',
  };
  const historicalFacts = [
    { acquired_at: '2026-09-10T10:00:00.000Z', campaign_name: 'Foto Webinar Mar', campaign_key: 'foto webinar mar', channel: 'meta', manager: 'Noel', is_client: true, meta_campaign_id: 'meta-1', meta_campaign_name: 'Foto Webinar Mar' },
    { acquired_at: '2026-09-11T10:00:00.000Z', campaign_name: 'Orgánico', campaign_key: 'organico', channel: 'organic', manager: 'Sin gestor', is_client: false },
    { acquired_at: '2026-09-12T10:00:00.000Z', campaign_name: 'The Ark', campaign_key: 'the ark', channel: 'schools', manager: 'Varios', is_client: true },
  ];
  const result = buildSalesDashboard({
    period: 'custom',
    bounds,
    leads: [{
      id: 'live-1', name: 'Live', email: 'live@example.com', source_created_at: '2026-09-24T10:00:00.000Z', created_at: '2026-09-24T10:00:00.000Z',
      owner_names: ['María'], source_payload: { source: 'meta', campaign_id: 'meta-1', campaign_name: 'Foto Webinar Mar' }, crm_stage: 'Por contactar', is_test: false,
    }, {
      id: 'old-native', name: 'Old native', email: 'old@example.com', source_created_at: '2026-09-20T10:00:00.000Z', created_at: '2026-09-20T10:00:00.000Z',
      owner_names: ['Manuel'], source_payload: { source: 'meta', campaign_id: 'meta-1', campaign_name: 'Foto Webinar Mar' }, crm_stage: 'Por contactar', is_test: false,
    }],
    users: [], payments: [], marketingExpense: 0, marketingAvailable: true,
    metaCampaigns: [{ id: 'meta-1', name: 'Foto Webinar Mar', spend: 100, leads: 10 }],
    metaAvailable: true, crmAvailability: { historical: true }, historicalFacts,
  });

  assert.equal(result.kpis.leads, 4);
  assert.equal(result.kpis.contracts, 2);
  assert.equal(result.kpis.conversion, 50);
  assert.equal(result.acquisition.newClients, 0);
  assert.equal(result.buckets.reduce((sum, row) => sum + row.leads, 0), 4);
  assert.equal(result.channels.find((row) => row.key === 'organic').leads, 1);
  assert.equal(result.channels.find((row) => row.key === 'schools').contracts, 1);
  assert.equal(result.campaigns.find((row) => row.id === 'meta-1').contracts, 1);
  assert.equal(result.campaigns.find((row) => row.id === 'meta-1').leads, 2);
  assert.equal(result.campaigns.find((row) => row.name === 'The Ark').spend, null);
  assert.equal(result.team.funnel, null);
  assert.equal(result.team.summary.newLeads, 4);
  assert.equal(result.team.agents.find((row) => row.key === 'noel').cohortClients, 1);
  assert.equal(result.team.agents.find((row) => row.key === 'maria').cohortLeads, 1);
});

test('keeps an undated historical conversion in its acquisition cohort without inventing a signing date', () => {
  const historicalFacts = [{
    acquired_at: '2026-09-10T10:00:00.000Z', campaign_name: 'Orgánico', campaign_key: 'organico',
    channel: 'organic', manager: 'Noel', is_client: true, portal_user_id: 'portal-1', client_at: null,
  }];
  const users = [{ id: 'portal-1', email: 'client@example.com', contract_signed_at: '2026-10-02T10:00:00.000Z' }];
  const common = {
    period: 'custom', leads: [], users, payments: [], marketingExpense: 0, marketingAvailable: true,
    metaCampaigns: [], metaAvailable: false, crmAvailability: { historical: true }, historicalFacts,
  };
  const september = buildSalesDashboard({
    ...common,
    bounds: { id: 'custom', start: new Date('2026-09-01T00:00:00.000Z'), end: new Date('2026-10-01T00:00:00.000Z'), granularity: 'month' },
  });
  const october = buildSalesDashboard({
    ...common,
    bounds: { id: 'custom', start: new Date('2026-10-01T00:00:00.000Z'), end: new Date('2026-11-01T00:00:00.000Z'), granularity: 'month' },
  });

  assert.deepEqual({ leads: september.kpis.leads, clients: september.kpis.contracts, conversion: september.kpis.conversion }, { leads: 1, clients: 1, conversion: 100 });
  assert.equal(september.acquisition.newClients, 0);
  assert.equal(september.buckets[0].contracts, 0);
  assert.deepEqual({ leads: october.kpis.leads, clients: october.kpis.contracts, conversion: october.kpis.conversion }, { leads: 0, clients: 0, conversion: null });
  assert.equal(october.acquisition.newClients, 1);
  assert.equal(october.buckets[0].contracts, 1);
});

test('el retargeting conserva la captación original y no infla totales, campañas, canales ni series', () => {
  const bounds = { id: 'custom', start: new Date('2026-11-01T00:00:00Z'), end: new Date('2026-12-01T00:00:00Z'), granularity: 'month' };
  const reservation = { page_url: '/retarwebinar21-11/', received_at: '2026-11-24T12:00:00Z' };
  const leads = [
    { id: 'original', source_created_at: '2026-11-18T12:00:00Z', owner_names: ['Manuel'], source_payload: { source: 'meta', campaign_name: 'Webinar 21-11', retargeting_reservation: reservation } },
    { id: 'new-retargeting', source_created_at: '2026-11-24T12:00:00Z', owner_names: ['Manuel'], source_payload: { source: 'meta', campaign_name: 'Webinar 21-11', exclude_from_acquisition: true, retargeting_reservation: reservation } },
    // Unmarked records from before this change keep counting exactly as before.
    { id: 'old-reservation', source_created_at: '2026-11-20T12:00:00Z', source_payload: { source: 'website', form_name: 'reserva', page_url: '/retarwebinar21-11/' } },
  ];
  const dashboard = buildSalesDashboard({
    period: 'custom', bounds, leads, users: [], payments: [], marketingExpense: 0, marketingAvailable: true,
    metaCampaigns: [{ id: 'webinar', name: 'Webinar 21-11', spend: 100, leads: 25 }], metaAvailable: true,
  });
  assert.equal(dashboard.kpis.leads, 2);
  assert.equal(dashboard.acquisition.leads, 2);
  assert.equal(dashboard.team.summary.newLeads, 2);
  assert.equal(dashboard.buckets.reduce((sum, row) => sum + row.leads, 0), 2);
  assert.equal(dashboard.acquisition.buckets.reduce((sum, row) => sum + row.leads, 0), 2);
  assert.equal(dashboard.channels.find((row) => row.key === 'meta').leads, 1);
  assert.equal(dashboard.channels.find((row) => row.key === 'organic').leads, 1);
  assert.equal(dashboard.campaigns.find((row) => row.id === 'webinar').leads, 1);
  assert.equal(dashboard.campaigns.find((row) => row.id === 'webinar').cpl, 100);
  assert.equal(dashboard.team.agents.find((row) => row.key === 'manuel').cohortLeads, 1);
});

test('la variación de leads nuevos excluye retargeting también del período anterior', () => {
  const bounds = { start: new Date('2026-11-01T00:00:00Z'), end: new Date('2026-11-25T00:00:00Z') };
  const lead = (id, date, excluded) => ({ id, source_created_at: date, source_payload: { source: 'website', exclude_from_acquisition: excluded } });
  const result = buildCrmPerformance({
    bounds, leads: [
      lead('previous', '2026-10-20T12:00:00Z', false),
      lead('previous-retargeting', '2026-10-20T12:00:00Z', true),
      lead('current', '2026-11-18T12:00:00Z', false),
      lead('current-retargeting', '2026-11-24T12:00:00Z', true),
    ],
  });
  assert.equal(result.summary.newLeads, 1);
  assert.equal(result.summary.leadVariation, 0);
});
