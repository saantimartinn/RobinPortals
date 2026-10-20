// Automated checks for admin dashboard utils test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');

let dashboard;
test('dashboard summaries preserve phase, payment, priority and sorting rules', async () => {
  dashboard = await import('../portal-source/src/application/admin/dashboard-utils.js');
  const clients = [
    { id: 'a', nombre: 'Ana', application_phase: 3, days_in_phase: 20, created_at: '2025-01-01', updated_at: '2025-01-01' },
    { id: 'b', nombre: 'Beto', application_phase: 4, days_in_phase: 40, created_at: '2025-01-01', updated_at: '2025-01-01' },
  ];
  const phases = dashboard.dashboardPhaseMetrics(clients);
  assert.equal(phases.phaseCounts[3], 1);
  assert.equal(phases.avgPhaseDays[4], 40);
  assert.equal(phases.bottleneck, 3);

  const now = Date.parse('2026-10-20T12:00:00Z');
  const alerts = dashboard.dashboardAlerts({
    clients,
    payments: [
      { user_id: 'a', status: 'unlocked', unlocked_at: new Date(now - 8 * 86400000).toISOString(), installment: 2, amount: 900 },
      { user_id: 'b', status: 'unlocked', unlocked_at: new Date(now - 7 * 86400000).toISOString(), installment: 1, amount: 500 },
    ],
    documents: [{ user_id: 'b', status: 'required', required: true }, { user_id: 'b', status: 'required', required: true }],
    sort: 'urgency',
    now,
  });
  assert.deepEqual(alerts.map((item) => item.kind), ['fuego', 'impago', 'docs', 'deadline']);
  assert.equal(alerts[1].client.id, 'a');
  assert.equal(alerts[2].label, '📄 2 doc(s) requerido(s) pendiente(s)');
  assert.equal(dashboard.dashboardAlerts({ clients, sort: 'name' })[0].client.nombre, 'Ana');

  const fin = dashboard.dashboardFinancialSummary([
    { user_id: 'a', status: 'paid', amount: 75 },
    { user_id: 'b', status: 'unlocked', amount: 25 },
  ]);
  assert.deepEqual(fin, { total: 100, collected: 75, pending: 25, pct: 75, avgPerClient: 50 });
  assert.deepEqual(dashboard.dashboardClientMetrics(clients, alerts, now), {
    total: 2, new7: 0, new30: 0, inactive: 2, highPriority: 1,
  });
});
