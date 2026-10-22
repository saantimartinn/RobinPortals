/**
 * POST /api/subscription/discount  Body: { code }
 * Valida un codigo de descuento (The Robin Plan) y devuelve el porcentaje y
 * la duración (en meses; null = ilimitado). Publico (se usa en la pantalla de
 * crear cuenta, antes de tener sesion). No revela informacion sensible.
 */
const { getSupabase } = require('../lib/supabase');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');

const { lookupCode } = require('../lib/discounts');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const body = parseJsonBody(event);
  if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });
  try {
    const sb = getSupabase();
    const hit = await lookupCode(sb, body.code);
    if (!hit) return json({ valid: false });
    return json({ valid: true, code: hit.code, percent_off: hit.percent_off, duration_months: hit.duration_months });
  } catch (e) {
    console.error('discount-validate error', e);
    return serverError(e);
  }
};
