// Netlify handler for /api/payments; it owns the HTTP boundary and hands reusable work to server modules.
const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { json, methodNotAllowed, serverError } = require('../../lib/http');
const { ensurePayments, invoiceNumber } = require('../../lib/payments');
const { arrivalPackForUser } = require('../../shared/arrival-pack.cjs');
const { applicationPlanForUser } = require('../../shared/financial-config.cjs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });

  try {
    const sb = getSupabase();
    const { data: u, error } = await sb
      .from('users')
      .select('id, lead_id, email, nombre, apellidos, dni_numero, direccion, tipo, origin, pais, num_carreras, has_eu_id, contract_signed, contract_data, pago_completed, pago_completed_at, pago_data, role')
      .eq('id', session.uid)
      .single();
    if (error || !u) return json({ error: 'unauthorized' }, { statusCode: 401 });

    const arrival = event.queryStringParameters?.product === 'llegada';
    if (arrival && !arrivalPackForUser(u)) return json({ error: 'forbidden' }, { statusCode: 403 });
    // Community's Pack view must never create/reprice invoices while reading.
    let rows;
    if (arrival) {
      const result = await sb.from('payments').select('*').eq('user_id', u.id).order('installment', { ascending: true });
      if (result.error) throw result.error;
      rows = (result.data || []).filter(row => [1, 2].includes(row.installment) || row.installment > 3);
    } else rows = await ensurePayments(sb, u);
    const payments = rows.map((p) => ({
      id: p.id,
      installment: p.installment,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      unlocked_at: p.unlocked_at,
      paid_at: p.paid_at,
      invoice_number: p.invoice_number || invoiceNumber(u, p),
      payment_data: p.payment_data,
      concept: p.concept || null,
      due_date: p.due_date || null,
    }));

    return json({
      user: {
        id: u.id, lead_id: u.lead_id, email: u.email,
        nombre: u.nombre, apellidos: u.apellidos,
        dni_numero: u.dni_numero, direccion: u.direccion,
        tipo: u.tipo || 'general', num_carreras: u.num_carreras || 1,
        origin: u.origin || null, pais: u.pais || null,
        has_eu_id: u.has_eu_id == null ? null : !!u.has_eu_id,
      },
      payments,
      ...(arrival ? { contract_plan: applicationPlanForUser(u), arrival_pack: arrivalPackForUser(u) } : {}),
    });
  } catch (e) {
    console.error('payments-list error', e);
    return serverError(e);
  }
};
