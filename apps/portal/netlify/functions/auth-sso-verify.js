// Verify a RobinJr handoff ticket server-to-server and return the current platform identity.
const jwt = require('jsonwebtoken');
const { getSupabase } = require('../../lib/supabase');
const { json, methodNotAllowed, parseJsonBody, serverError } = require('../../lib/http');
const { isApplicationAdmin } = require('../../lib/authorization');
const PRO_ADMIN_EMAILS = new Set([
  'noel@project-robin.com',
  'maria@project-robin.com',
  'manuel@project-robin.com',
  'santimartin1203@gmail.com',
]);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  const body = parseJsonBody(event);
  if (!body || typeof body.ticket !== 'string') return json({ error: 'invalid_ticket' }, { statusCode: 400 });
  try {
    const ticket = jwt.verify(body.ticket, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (ticket.purpose !== 'portal_sso' || ticket.target !== 'robinjr' || !ticket.uid) {
      return json({ error: 'invalid_ticket' }, { statusCode: 401 });
    }
    if (ticket.external_identity?.id) {
      const identity = ticket.external_identity;
      return json({
        id: identity.id,
        lead_id: identity.lead_id || null,
        username: identity.username || identity.email,
        email: identity.email || null,
        role: 'client',
        nombre: identity.nombre || null,
        apellidos: identity.apellidos || null,
        source: identity.source || null,
        is_application_admin: false,
        is_pro_admin: false,
        visible_tabs: [],
      });
    }
    const { data: user, error } = await getSupabase()
      .from('users')
      .select('id, lead_id, username, email, role, nombre, apellidos, avatar_path, visible_tabs')
      .eq('id', ticket.uid)
      .single();
    if (error || !user) return json({ error: 'unauthorized' }, { statusCode: 401 });
    return json({
      id: user.id,
      lead_id: user.lead_id || null,
      username: user.username || user.email,
      email: user.email || null,
      role: user.role,
      nombre: user.nombre || null,
      apellidos: user.apellidos || null,
      avatar_url: null,
      is_application_admin: isApplicationAdmin(user),
      is_pro_admin: isApplicationAdmin(user) && PRO_ADMIN_EMAILS.has(String(user.email || '').trim().toLowerCase()),
      visible_tabs: Array.isArray(user.visible_tabs) ? user.visible_tabs : [],
    });
  } catch (error) {
    if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') {
      return json({ error: 'invalid_ticket' }, { statusCode: 401 });
    }
    return serverError(error, 'auth.sso_verify');
  }
};
