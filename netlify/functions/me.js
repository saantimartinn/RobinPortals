// Netlify handler for /api/me; it owns the HTTP boundary and hands reusable work to server modules.
const { getSupabase } = require('../../lib/supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { isApplicationAdmin } = require('../../lib/authorization');
const { json, methodNotAllowed, serverError } = require('../../lib/http');
const { applicationPlanForUser, contractPricingVersion } = require('../../shared/financial-config.cjs');
const { signedUrl } = require('../../lib/storage');

const PRO_ADMIN_EMAILS = new Set([
  'noel@project-robin.com',
  'maria@project-robin.com',
  'manuel@project-robin.com',
  'santimartin1203@gmail.com',
]);

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return methodNotAllowed(['GET']);
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  try {
    const sb = getSupabase();
    const { data: u, error } = await sb.from('users').select('*').eq('id', session.uid).single();
    if (error || !u) return json({ error: 'unauthorized' }, { statusCode: 401 });
    const firstPayment = applicationPlanForUser(u)[0];
    const avatarUrl = u.avatar_path
      ? await signedUrl(sb, u.avatar_path, { expiresIn: 3600 })
      : null;
    return json({
      id: u.id,
      lead_id: u.lead_id,
      username: u.username,
      email: u.email,
      role: u.role,
      is_application_admin: isApplicationAdmin(u),
      is_pro_admin: isApplicationAdmin(u) && PRO_ADMIN_EMAILS.has(String(u.email || '').trim().toLowerCase()),
      visible_tabs: Array.isArray(u.visible_tabs) ? u.visible_tabs : [],
      requires_onboarding: !!u.requires_onboarding,
      dni_completed: !!u.dni_completed,
      profile_completed: !!u.profile_completed,
      contract_signed: !!u.contract_signed,
      contract_signed_at: u.contract_signed_at || null,
      tipo: u.tipo || 'general',
      num_carreras: u.num_carreras || 1,
      first_payment_amount: firstPayment ? firstPayment.amount : null,
      pricing_version: contractPricingVersion(u.contract_data),
      payment_currency: firstPayment ? 'EUR' : null,
      origin: u.origin || null,
      application_level: u.application_level || null,
      pais: u.pais || null,
      has_eu_id: u.has_eu_id == null ? null : !!u.has_eu_id,
      pago_completed: !!u.pago_completed,
      pago_completed_at: u.pago_completed_at || null,
      assigned_to: u.assigned_to || null,
      application_phase: u.application_phase || 1,
      nombre: u.nombre,
      apellidos: u.apellidos,
      telefono_alumno: u.telefono_alumno || u.questionnaire?.telefono_alumno || null,
      intereses: u.intereses || [],
      academic_system: u.academic_system || null,
      academic_subjects: Array.isArray(u.academic_subjects) ? u.academic_subjects : [],
      lived_abroad: !!u.lived_abroad,
      lived_abroad_country: u.lived_abroad_country || null,
      lived_abroad_other: u.lived_abroad_other || null,
      lived_abroad_set: !!u.lived_abroad_set,
      created_at: u.created_at || null,
      avatar_url: avatarUrl,
    });
  } catch (e) {
    console.error('me error', e);
    return serverError(e);
  }
};
