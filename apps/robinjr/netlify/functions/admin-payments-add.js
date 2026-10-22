/**
 * POST /api/admin/payments/add
 * Body: { user_id, preset?, concept?, amount?, tax_rate?, ielts_mode?, ielts_hours?, units?, due_date? }
 * El asesor añade un pago extra a un cliente (servicio adicional contratado).
 * Se crea como una fila en `payments` con installment >= 4, estado 'unlocked'
 * (el cliente puede pagarlo directamente). Las 3 cuotas estándar no se tocan.
 */
const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { getSessionUser } = require('../../lib/session-user');
const { isApplicationAdmin } = require('../../lib/authorization');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../../lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });

  const body = parseJsonBody(event);
  if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });

  const user_id = body.user_id;
  const preset = String(body.preset || 'custom').trim();
  const concept = String(body.concept || '').trim();
  const tax_rate = String(body.tax_rate || '21').trim();
  const ielts_mode = String(body.ielts_mode || '').trim();
  const ielts_hours = Number(body.ielts_hours);
  const units = Number(body.units);
  let amount = Number(body.amount);
  const due_date = body.due_date ? String(body.due_date).trim() : null;

  if (!user_id) return json({ error: 'missing_user_id' }, { statusCode: 400 });
  if (!['custom', 'ielts_evaluation', 'ielts_class'].includes(preset)) return json({ error: 'invalid_preset' }, { statusCode: 400 });
  if (preset === 'custom' && !concept) return json({ error: 'missing_concept' }, { statusCode: 400 });
  if (preset === 'custom' && !['21', 'exempt'].includes(tax_rate)) return json({ error: 'invalid_tax_rate' }, { statusCode: 400 });
  if (preset === 'ielts_evaluation') {
    if (!Number.isInteger(units) || units < 1) return json({ error: 'invalid_units' }, { statusCode: 400 });
    amount = units * 33;
  }
  if (preset === 'ielts_class') {
    if (!['individual', 'group'].includes(ielts_mode) || ![4, 6, 8, 12].includes(ielts_hours)) return json({ error: 'invalid_ielts_class' }, { statusCode: 400 });
    amount = ielts_hours * (ielts_mode === 'group' ? 16.5 : 33);
  }
  if (!isFinite(amount) || amount <= 0) return json({ error: 'invalid_amount' }, { statusCode: 400 });
  if (due_date && !/^\d{4}-\d{2}-\d{2}$/.test(due_date)) {
    return json({ error: 'invalid_due_date' }, { statusCode: 400 });
  }

  try {
    const sb = getSupabase();
    const { data: admin } = await getSessionUser(sb, session, 'id, email, username, role');
    if (!admin) return json({ error: 'unauthorized' }, { statusCode: 401 });
    const isAdmin = isApplicationAdmin(admin);
    if (!isAdmin) return json({ error: 'forbidden' }, { statusCode: 403 });

    // Comprobar que el cliente existe
    const { data: client, error: ce } = await sb
      .from('users').select('id').eq('id', user_id).single();
    if (ce || !client) return json({ error: 'client_not_found' }, { statusCode: 404 });

    // Siguiente número de installment (>= 4, no choca con las 3 cuotas estándar)
    const { data: rows, error: e1 } = await sb
      .from('payments').select('installment').eq('user_id', user_id);
    if (e1) throw e1;
    let next = 4;
    (rows || []).forEach((r) => { if (Number(r.installment) >= next) next = Number(r.installment) + 1; });

    const nowIso = new Date().toISOString();
    const { data: ins, error: e2 } = await sb
      .from('payments')
      .insert({
        user_id,
        installment: next,
        amount: Math.round(amount * 100) / 100,
        currency: 'EUR',
        status: 'unlocked',
        unlocked_at: nowIso,
        concept: preset === 'ielts_evaluation' ? 'Evaluación inicial de inglés/IELTS'
          : preset === 'ielts_class' ? 'Clase de preparación de inglés/IELTS' : concept,
        payment_data: preset === 'ielts_evaluation'
          ? { ielts_preset: 'evaluation', ielts_units: units, tax_rate: 'exempt' }
          : preset === 'ielts_class'
            ? { ielts_preset: 'class', ielts_mode, ielts_hours, tax_rate: 'exempt' }
            : { tax_rate },
        due_date,
      })
      .select()
      .single();
    if (e2) throw e2;

    // Reflejar el cliente en la hoja de control de pagos (best-effort, no bloquea).
    await require('../../lib/integration-sync').syncGoogleSheets(sb, user_id);
    return json({ ok: true, payment: ins });
  } catch (e) {
    console.error('admin-payments-add error', e);
    return serverError(e);
  }
};
