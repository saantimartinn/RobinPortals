/**
 * POST /api/subscriber/signup  Body: { name, email, password }
 * Crea una cuenta nueva para The Robin Plan (portal de suscriptores).
 * Los suscriptores se dan de alta ellos mismos aquí y viven en la tabla
 * `subscribers` (independiente de `users`, que es el portal de aplicación).
 */
const { getSupabase } = require('../lib/supabase');
const { hashPassword, signSession, buildSessionCookie } = require('../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');
const { lookupCode } = require('../lib/discounts');

function isValidEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ''));
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const body = parseJsonBody(event);
  if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });

  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const ciudad = (body.ciudad || '').trim() || null;
  const discountCodeRaw = (body.discount_code || '').trim();
  const tcAccepted = body.tc_accepted === true || body.tc_accepted === 'true';

  if (!name || !email || !password) return json({ error: 'missing_fields' }, { statusCode: 400 });
  if (!isValidEmail(email)) return json({ error: 'invalid_email' }, { statusCode: 400 });
  if (password.length < 6) return json({ error: 'weak_password' }, { statusCode: 400 });

  try {
    const sb = getSupabase();

    // Valida el codigo de descuento (si se ha introducido)
    let discountCode = null, discountPercent = null, discountDuration = null;
    if (discountCodeRaw) {
      const hit = await lookupCode(sb, discountCodeRaw);
      if (hit) { discountCode = hit.code; discountPercent = hit.percent_off; discountDuration = hit.duration_months; }
    }

    const { data: existing, error: eCheck } = await sb
      .from('subscribers').select('id').or(`email.eq.${email},username.eq.${email}`).limit(1);
    if (eCheck) throw eCheck;
    if (existing && existing[0]) return json({ error: 'email_in_use' }, { statusCode: 409 });

    const leadId = `SUB-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;
    const [nombre, ...restoApellidos] = name.split(' ');
    const apellidos = restoApellidos.join(' ') || null;

    const { data: inserted, error: eIns } = await sb.from('subscribers').insert({
      lead_id: leadId,
      username: email,
      email,
      password_hash: hashPassword(password),
      role: 'subscriber',
      nombre: nombre || name,
      apellidos,
      ciudad,
      is_subscriber: true,
      subscription_status: 'none',
      discount_code: discountCode,
      discount_percent: discountPercent,
      discount_duration_months: discountDuration,
      tc_accepted_at: tcAccepted ? new Date().toISOString() : null,
    }).select('*').single();
    if (eIns) throw eIns;

    // Marca el uso del codigo (best-effort, no bloquea el alta)
    if (discountCode) {
      try {
        const { data: dc } = await sb.from('discount_codes').select('id, times_redeemed').ilike('code', discountCode).limit(1);
        if (dc && dc[0]) await sb.from('discount_codes').update({ times_redeemed: (dc[0].times_redeemed || 0) + 1 }).eq('id', dc[0].id);
      } catch (_) {}
    }

    const token = signSession(inserted);
    const cookie = buildSessionCookie(token);

    return json({ ok: true, user: { id: inserted.id, username: inserted.username, role: inserted.role } }, { cookies: [cookie] });
  } catch (e) {
    console.error('subscriber-signup error', e);
    return serverError(e);
  }
};
