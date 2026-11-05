/**
 * POST /api/admin/clients/convert-mentoria
 * Requiere un pago real de Mentoría de 666,33 € y destino General, Delft o
 * Llegada. El RPC conserva pago/factura y contrato previos en una transacción.
 */
const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { isApplicationAdmin, isDeveloperAdmin, canUseStudentPortal, normalizeEmail } = require('../../lib/authorization');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../../lib/http');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  const body = parseJsonBody(event);
  if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });
  if (!body.user_id || !['general', 'delft', 'llegada'].includes(body.target_type)) {
    return json({ error: 'invalid_conversion' }, { statusCode: 400 });
  }

  try {
    const sb = getSupabase();
    const { data: admin, error: adminError } = await sb.from('users')
      .select('id,email,username,role,visible_tabs').eq('id', session.uid).single();
    if (adminError || !admin) return json({ error: 'unauthorized' }, { statusCode: 401 });
    if (!isApplicationAdmin(admin) || !canUseStudentPortal(admin)) {
      return json({ error: 'forbidden' }, { statusCode: 403 });
    }

    const { data: client, error: clientError } = await sb.from('users')
      .select('id,email,username,role,assigned_to,tipo,pago_completed').eq('id', body.user_id).single();
    if (clientError || !client) return json({ error: 'not_found' }, { statusCode: 404 });
    if (isApplicationAdmin(client) || (!isDeveloperAdmin(admin)
        && String(client.assigned_to || '').toLowerCase() !== normalizeEmail(admin))) {
      return json({ error: 'forbidden' }, { statusCode: 403 });
    }
    if (String(client.tipo || '').toLowerCase() !== 'mentoria') {
      return json({ error: 'client_not_mentoria' }, { statusCode: 409 });
    }
    if (!client.pago_completed) {
      return json({ error: 'mentoria_payment_required' }, { statusCode: 409 });
    }

    // La función bloquea las filas y conserva el pago original con su factura.
    const { data, error } = await sb.rpc('convert_paid_mentoria_client', {
      p_user_id: client.id,
      p_target_type: body.target_type,
      p_admin_id: admin.id,
    });
    if (error) {
      if (/client_not_mentoria|mentoria_payment_required|paid_mentoria_installment_missing|client_not_found|invalid_target_type/.test(error.message || '')) {
        return json({ error: error.message }, { statusCode: 409 });
      }
      throw error;
    }
    return json({ ok: true, ...data });
  } catch (error) {
    console.error('admin-client-convert-mentoria error', error);
    return serverError(error);
  }
};
