'use strict';

const { randomUUID } = require('node:crypto');

const REVOLUT_BASE = 'https://sandbox-merchant.revolut.com';
const HOLDED_BASE = 'https://api.holded.com/api/v2';
const DEMO_ACCOUNT_ID = '6aeba28c449854402405960d';
const DEMO_REVENUE_ACCOUNTS = [
  { number: 70500001, portal: 'Alumno' },
  { number: 70500005, portal: 'Community' },
  { number: 70500006, portal: 'Robin Jr' },
];

async function api(base, path, token, { method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const content = await response.text();
  let data = null;
  try { data = content ? JSON.parse(content) : null; } catch (_) { /* no JSON body */ }
  if (!response.ok) throw new Error(`${base === REVOLUT_BASE ? 'Revolut sandbox' : 'Holded demo'}: HTTP ${response.status}${data?.error?.message ? ` · ${data.error.message}` : ''}`);
  return data;
}

async function sandboxOrder() {
  const token = String(process.env.REVOLUT_SANDBOX_MERCHANT_SECRET_KEY || '').trim();
  if (!token) throw new Error('Falta REVOLUT_SANDBOX_MERCHANT_SECRET_KEY para sandbox');
  const marker = `ROBIN_RELEASE_TEST_${randomUUID()}`;
  let id;
  let failure;
  try {
    const order = await api(REVOLUT_BASE, '/api/orders', token, {
      method: 'POST',
      headers: { 'Revolut-Api-Version': '2026-03-12' },
      body: {
        amount: 100,
        currency: 'EUR',
        capture_mode: 'automatic',
        description: 'Project Robin · Test de orden sandbox',
        merchant_order_data: { reference: marker },
        metadata: { kind: 'release_test', robin_attempt_id: marker },
      },
    });
    id = order?.id;
    if (!id || !order.checkout_url || !new URL(order.checkout_url).hostname.endsWith('revolut.com')) {
      throw new Error('Revolut no devolvió un ID y una URL de checkout válidos');
    }
    const retrieved = await api(REVOLUT_BASE, `/api/orders/${encodeURIComponent(id)}`, token, {
      headers: { 'Revolut-Api-Version': '2026-03-12' },
    });
    if (retrieved.id !== id || Number(retrieved.amount) !== 100 || retrieved.currency !== 'EUR') {
      throw new Error('La orden consultada no coincide con 1,00 € de prueba');
    }
  } catch (error) { failure = error; }
  if (id) {
    try {
      const cancelled = await api(REVOLUT_BASE, `/api/orders/${encodeURIComponent(id)}/cancel`, token, {
        method: 'POST', headers: { 'Revolut-Api-Version': '2026-03-12' },
      });
      const current = cancelled?.id ? cancelled : await api(REVOLUT_BASE, `/api/orders/${encodeURIComponent(id)}`, token, {
        headers: { 'Revolut-Api-Version': '2026-03-12' },
      });
      if (current.state !== 'cancelled') throw new Error(`La orden quedó en estado ${current.state || 'desconocido'}`);
    } catch (cleanupError) {
      throw new Error(`No se pudo cancelar la orden sandbox ${id}: ${cleanupError.message}${failure ? `; prueba: ${failure.message}` : ''}`);
    }
  }
  if (failure) throw failure;
  return 'Revolut sandbox: orden de 1,00 € creada, consultada y cancelada. No se completó ningún pago.';
}

async function demoInvoice() {
  const token = String(process.env.HOLDED_DEMO_API_PAT || '').trim();
  if (!token || token === String(process.env.HOLDED_API_PAT || '').trim()) {
    throw new Error('Falta un PAT exclusivo de Holded demo');
  }
  const account = await api(HOLDED_BASE, '/account', token);
  if (account?.id !== DEMO_ACCOUNT_ID || !String(account.name || '').startsWith('DEMO ')) {
    throw new Error('El PAT no pertenece a la cuenta demo esperada');
  }
  const chart = await api(HOLDED_BASE, '/accounting-accounts?limit=500', token);
  const revenues = DEMO_REVENUE_ACCOUNTS.map((target) => ({
    ...target,
    id: chart?.items?.find((row) => Number(row.number) === target.number)?.id,
  }));
  if (revenues.some((row) => !row.id)) throw new Error('Faltan las subcuentas demo 70500001, 70500005 o 70500006');
  const marker = randomUUID();
  let contactId;
  const invoiceIds = [];
  let failure;
  try {
    const contact = await api(HOLDED_BASE, '/contacts', token, {
      method: 'POST', body: { name: `TEST Robin ${marker}`, email: `test-${marker}@release-test.invalid`, type: 'client', is_person: true },
    });
    contactId = contact?.id;
    if (!contactId) throw new Error('Holded demo no devolvió el ID del contacto TEST');
    const today = new Date().toISOString().slice(0, 10);
    for (const revenue of revenues) {
      const invoice = await api(HOLDED_BASE, '/invoices', token, {
        method: 'POST',
        body: {
          contact_id: contactId, date: today, due_date: today, currency: 'EUR',
          notes: `TEST Robin ${revenue.portal} ${marker}`,
          items: [{ name: `Prueba ${revenue.portal} ${marker}`, units: 1, price: 1, taxes: [], account: revenue.id }],
        },
      });
      if (!invoice?.id) throw new Error(`Holded demo no devolvió el ID de la factura TEST de ${revenue.portal}`);
      invoiceIds.push(invoice.id);
      const saved = await api(HOLDED_BASE, `/invoices/${encodeURIComponent(invoice.id)}`, token);
      if (saved?.id !== invoice.id || saved.contact_id !== contactId
        || !JSON.stringify(saved).includes(marker) || !JSON.stringify(saved).includes(revenue.id)) {
        throw new Error(`La factura TEST de ${revenue.portal} no conserva el contacto y la subcuenta ${revenue.number}`);
      }
    }
  } catch (error) { failure = error; }
  const cleanup = [];
  for (const invoiceId of invoiceIds.reverse()) {
    try { await api(HOLDED_BASE, `/invoices/${encodeURIComponent(invoiceId)}`, token, { method: 'DELETE' }); }
    catch (error) { cleanup.push(`factura ${invoiceId}: ${error.message}`); }
  }
  if (contactId && cleanup.length === 0) {
    try { await api(HOLDED_BASE, `/contacts/${encodeURIComponent(contactId)}`, token, { method: 'DELETE' }); }
    catch (error) { cleanup.push(`contacto ${contactId}: ${error.message}`); }
  }
  if (cleanup.length) throw new Error(`Limpieza de Holded demo fallida: ${cleanup.join('; ')}${failure ? `; prueba: ${failure.message}` : ''}`);
  if (failure) throw failure;
  return 'Holded demo: tres facturas ficticias de 1,00 € creadas, verificadas y eliminadas en las subcuentas 70500001, 70500005 y 70500006.';
}

module.exports = { sandboxOrder, demoInvoice };
