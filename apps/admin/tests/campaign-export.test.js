const test = require('node:test');
const assert = require('node:assert/strict');

const helpers = () => import('../src/features/admin/campaign-export.mjs');

test('mes anterior selecciona el mes natural completo, incluido enero y años bisiestos', async () => {
  const { previousCalendarMonth } = await helpers();
  assert.deepEqual(previousCalendarMonth(new Date('2026-11-11T12:00:00Z')), { from: '2026-10-01', to: '2026-10-31' });
  assert.deepEqual(previousCalendarMonth(new Date('2026-01-10T12:00:00Z')), { from: '2025-12-01', to: '2025-12-31' });
  assert.deepEqual(previousCalendarMonth(new Date('2024-03-15T12:00:00Z')), { from: '2024-02-01', to: '2024-02-29' });
  assert.deepEqual(previousCalendarMonth(new Date('2026-03-01T00:30:00Z'), 'America/New_York'), { from: '2026-01-01', to: '2026-01-31' });
});

test('Excel conserva el periodo aplicado y los tipos numéricos de las campañas visibles', async () => {
  const { campaignWorkbook } = await helpers();
  const snapshot = {
    account: { name: 'Robin', currency: 'EUR', timezone: 'Europe/Madrid' },
    campaigns: [{ id: '123456789012345678', name: '=Campaña & verano', status: 'ACTIVE', spend: 1234.56, leads: 20, cpl: 61.728, roas: 1.25 }],
  };
  const workbook = campaignWorkbook(snapshot, { from: '2026-10-01', to: '2026-10-31' }, '1/10/2026 – 31/10/2026');
  assert.equal(workbook.fileName, 'campanas_2026-10-01_2026-10-31.xlsx');
  assert.ok(workbook.data.flat().some(cell => cell?.value === '1/10/2026 – 31/10/2026'));
  const row = workbook.data.at(-1);
  assert.deepEqual(row.map(cell => cell.value), ['=Campaña & verano', '123456789012345678', 'Activa', 1234.56, 20, 61.728, 1.25]);
  assert.equal(row[0].type, String);
  assert.equal(row[1].type, String);
  for (const cell of row.slice(3)) assert.equal(cell.type, Number);
  assert.equal(snapshot.campaigns[0].spend, 1234.56);
});

test('el Excel de últimos 30 días y de periodos sin campañas sigue incluyendo sus cabeceras', async () => {
  const { campaignWorkbook } = await helpers();
  const workbook = campaignWorkbook({ account: { name: 'Robin', currency: 'USD', timezone: 'UTC' }, campaigns: [] }, null, 'Últimos 30 días');
  assert.equal(workbook.fileName, 'campanas_ultimos-30-dias.xlsx');
  assert.deepEqual(workbook.data.at(-1).map(cell => cell.value), ['Campaña', 'ID', 'Estado', 'Inversión (USD)', 'Leads', 'CPL (USD)', 'ROAS']);
});
