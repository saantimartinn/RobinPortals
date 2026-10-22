/**
 * GET /api/admin/clients
 * Devuelve los clientes asignados al admin de la sesión.
 * El admin se identifica por su email (campo email en users) o por su username,
 * y los clientes se filtran por users.assigned_to = email_del_admin.
 */
const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const {
  hasApplicationAdminRole,
  isApplicationAdmin,
  isDeveloperAdmin,
  canUseStudentPortal,
  normalizeEmail,
} = require('../../lib/authorization');
const { json, methodNotAllowed, serverError } = require('../../lib/http');
const { attachStudentPhones } = require('../../lib/student-phone');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });

  try {
    const sb = getSupabase();

    // Cargar el admin
    const { data: admin, error: e1 } = await sb
      .from('users')
      .select('id, email, username, role, visible_tabs, nombre, apellidos')
      .eq('id', session.uid)
      .single();
    if (e1 || !admin) return json({ error: 'unauthorized' }, { statusCode: 401 });

    const adminEmail = normalizeEmail(admin);
    const isAdmin = isApplicationAdmin(admin);
    if (!isAdmin) return json({ error: 'forbidden' }, { statusCode: 403 });
    if (!canUseStudentPortal(admin)) return json({ error: 'portal_access_denied' }, { statusCode: 403 });

    // El desarrollador puede abrir cualquier expediente; los demás conservan su cartera.
    let clientsQuery = sb
      .from('users')
      .select(
        'id, lead_id, username, email, role, requires_onboarding, dni_completed, profile_completed, nombre, apellidos, dni_numero, direccion, fecha_nacimiento, questionnaire, intereses, academic_system, academic_subjects, lived_abroad, lived_abroad_country, lived_abroad_other, lived_abroad_set, tipo, origin, application_level, has_eu_id, assigned_to, application_phase, created_at, updated_at'
      );
    if (!isDeveloperAdmin(admin)) clientsQuery = clientsQuery.eq('assigned_to', adminEmail);
    const { data: clients, error: e2 } = await clientsQuery.order('created_at', { ascending: false });
    if (e2) throw e2;

    // Por seguridad, nunca devolver otro admin/supervisor como cliente.
    const list = await attachStudentPhones(sb, (clients || []).filter((client) => !hasApplicationAdminRole(client)));

    return json({
      admin: {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        nombre: admin.nombre,
        apellidos: admin.apellidos,
      },
      clients: list,
    });
  } catch (e) {
    console.error('admin-clients-list error', e);
    return serverError(e);
  }
};
