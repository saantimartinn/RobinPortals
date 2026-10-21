// Admin workspace module for dashboard utils; AdminPortal composes these views.
export function dashboardPhaseMetrics(clients = []) {
  const phaseCounts = Object.fromEntries(Array.from({ length: 9 }, (_, index) => [index + 1, 0]));
  const sums = { ...phaseCounts };
  const counts = { ...phaseCounts };
  clients.forEach((client) => {
    const phase = client.application_phase || 1;
    if (phaseCounts[phase] == null) return;
    phaseCounts[phase] += 1;
    if (client.days_in_phase != null) {
      sums[phase] += client.days_in_phase;
      counts[phase] += 1;
    }
  });
  const avgPhaseDays = {};
  Object.keys(phaseCounts).forEach((phase) => {
    avgPhaseDays[phase] = counts[phase] ? Math.round(sums[phase] / counts[phase]) : null;
  });
  let max = -1;
  let bottleneck = null;
  Object.entries(phaseCounts).forEach(([phase, count]) => {
    if (count > max) { max = count; bottleneck = Number(phase); }
  });
  return { phaseCounts, avgPhaseDays, bottleneck: max > 0 ? bottleneck : null };
}

export function dashboardFinancialSummary(payments = []) {
  const total = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const collected = payments.filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const pending = payments.filter((payment) => payment.status !== "paid")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const clientsWithPayments = new Set(payments.map((payment) => payment.user_id)).size || 1;
  const pct = total > 0 ? Math.round((collected / total) * 1000) / 10 : 0;
  return { total, collected, pending, pct, avgPerClient: Math.round(total / clientsWithPayments) };
}

export function dashboardAlerts({ clients = [], payments = [], documents = [], sort = "urgency", now = Date.now() } = {}) {
  const alerts = [];
  const clientById = new Map(clients.map((client) => [client.id, client]));
  payments.forEach((payment) => {
    if (payment.status !== "unlocked" || !payment.unlocked_at) return;
    const days = Math.floor((now - new Date(payment.unlocked_at).getTime()) / 86400000);
    const client = clientById.get(payment.user_id);
    if (days > 7 && client) alerts.push({
      kind: "impago",
      urgency: 90 + days,
      client,
      label: `💸 Cuota ${payment.installment} pendiente · ${days}d (${Number(payment.amount).toFixed(0)}€)`,
    });
  });
  const requiredByUser = {};
  documents.forEach((document) => {
    if (document.status === "required" && document.required) {
      requiredByUser[document.user_id] = (requiredByUser[document.user_id] || 0) + 1;
    }
    if (document.deadline && document.status !== "validated" && document.deadline < new Date(now).toISOString().slice(0, 10)) {
      const client = clientById.get(document.user_id);
      if (!client) return;
      const overdueDays = Math.max(1, Math.floor((now - new Date(`${document.deadline}T00:00:00`).getTime()) / 86400000));
      alerts.push({
        kind: "deadline",
        urgency: 70 + overdueDays,
        client,
        label: `⏰ Deadline vencida: ${document.name} · ${overdueDays}d`,
      });
    }
  });
  Object.entries(requiredByUser).forEach(([userId, count]) => {
    const client = clientById.get(userId);
    if (client) alerts.push({
      kind: "docs",
      urgency: 60 + count,
      client,
      label: `📄 ${count} doc(s) requerido(s) pendiente(s)`,
    });
  });
  if (sort === "name") alerts.sort((a, b) => (a.client.nombre || "").localeCompare(b.client.nombre || ""));
  else if (sort === "days") alerts.sort((a, b) => (b.client.days_in_phase || 0) - (a.client.days_in_phase || 0));
  else alerts.sort((a, b) => b.urgency - a.urgency);
  return alerts;
}

export function dashboardClientMetrics(clients = [], alerts = [], now = Date.now()) {
  const ms7 = 7 * 86400000;
  const ms30 = 30 * 86400000;
  const new7 = clients.filter((client) => client.created_at && now - new Date(client.created_at).getTime() <= ms7).length;
  const new30 = clients.filter((client) => client.created_at && now - new Date(client.created_at).getTime() <= ms30).length;
  const inactive = clients.filter((client) => client.updated_at && now - new Date(client.updated_at).getTime() > ms30).length;
  const highPriority = new Set(alerts.filter((alert) => alert.kind === "fuego" || alert.kind === "impago")
    .map((alert) => alert.client.id)).size;
  return { total: clients.length, new7, new30, inactive, highPriority };
}
