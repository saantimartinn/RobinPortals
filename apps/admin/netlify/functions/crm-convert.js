// Netlify handler for /api/internal/crm/convert; it owns the HTTP boundary and hands reusable work to server modules.
const { getSupabase } = require('../../lib/supabase');
const { getAdminSupabase } = require('../../lib/admin-supabase');
const { getJuniorSupabase } = require('../../lib/junior-supabase');
const { getSubscriptionsSupabase } = require('../../lib/subscriptions-supabase');
const { readSessionFromEvent, hashPassword } = require('../../lib/auth');
const { isApplicationAdmin, normalizeEmail } = require('../../lib/authorization');
const { identityExists } = require('../../lib/identity');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../../lib/http');
const { passwordPolicy } = require('../../shared/password-policy.cjs');
const { normalizeTipo, ensureDriveFolder } = require('../../lib/notion');
const { sendAccountAccessEmail } = require('../../lib/account-access-email');
const { contractedAmountForUser } = require('../../lib/finance-dashboard');
const { resolveCrmOwner, syncCrmIdentity } = require('../../lib/crm-identity');
const { pricingVersionForNewUser } = require('../../../robinjr/shared/financial-config.cjs');

const PORTALS = new Set(['alumno', 'robinjr', 'community']);

const normalizedPerson = (value) => String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function matchesAdvisor(user, requested) {
  const values = [user.email, user.username, user.nombre, [user.nombre, user.apellidos].filter(Boolean).join(' ')];
  return values.some((value) => normalizedPerson(value) === requested);
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'forbidden_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });
  try {
    const portal = getSupabase();
    const { data: admin } = await portal.from('users').select('id,email,username,nombre,apellidos,role').eq('id', session.uid).single();
    if (!admin || !isApplicationAdmin(admin)) return json({ error: 'forbidden' }, { statusCode: 403 });
    const body = parseJsonBody(event);
    if (!body || !body.leadId) return json({ error: 'missing_lead_id' }, { statusCode: 400 });
    const targetPortal = String(body.targetPortal || '').trim().toLowerCase();
    if (!PORTALS.has(targetPortal)) return json({ error: 'portal_required' }, { statusCode: 400 });
    const requestedAdvisor = normalizedPerson(body.advisor);
    if (targetPortal !== 'community' && !requestedAdvisor) return json({ error: 'advisor_required' }, { statusCode: 400 });
    let advisor = null;
    if (requestedAdvisor) {
      const { data: adminRows, error: adminRowsError } = await portal.from('users').select('id,email,username,nombre,apellidos,role');
      if (adminRowsError) throw adminRowsError;
      advisor = (adminRows || []).filter(isApplicationAdmin).find((candidate) => matchesAdvisor(candidate, requestedAdvisor));
      if (!advisor) return json({ error: 'advisor_invalid' }, { statusCode: 400 });
    }

    const crm = getAdminSupabase();
    const { data: lead, error: leadError } = await crm.from('crm_leads')
      .select('id,notion_numeric_id,name,email,lead_type,owner_names,source_payload,is_test').eq('id', body.leadId).single();
    if (leadError || !lead) return json({ error: 'lead_not_found' }, { statusCode: 404 });
    if (lead.is_test || lead.source_payload?.simulated === true) return json({ error: 'test_lead_not_convertible' }, { statusCode: 400 });
    if (!lead.email) return json({ error: 'lead_email_required' }, { statusCode: 400 });

    const leadId = String(lead.notion_numeric_id || lead.id);
    // Imported Notion rows use their Notion page UUID as the CRM id. Native
    // website/Meta leads have no Notion page and must not depend on one.
    const notionPageId = lead.source_payload?.notion_url ? lead.id : null;
    const tipo = normalizeTipo(body.clientType || lead.lead_type);
    const assignedTo = advisor ? normalizeEmail(advisor) : null;
    const salesAgent = String(lead.owner_names?.[0] || admin.nombre || admin.email || '').trim();
    const targetDb = targetPortal === 'alumno' ? portal : targetPortal === 'robinjr' ? getJuniorSupabase() : getSubscriptionsSupabase();
    const table = targetPortal === 'community' ? 'subscribers' : 'users';
    let result = 'created';
    let userId;
    let emailSent = false;
    const { data: existing, error: existingError } = await targetDb.from(table).select('id').eq('lead_id', leadId).maybeSingle();
    if (existingError) throw existingError;
    if (existing) {
      result = 'exists';
      userId = existing.id;
      if (targetPortal !== 'community') {
        const { error } = await targetDb.from('users').update({ assigned_to: assignedTo, tipo, notion_page_id: notionPageId }).eq('id', existing.id);
        if (error) throw error;
        if (targetPortal === 'alumno') await ensureDriveFolder(portal, existing.id);
      }
    } else {
      if (targetPortal === 'community') {
        const { data: collisions, error: collisionError } = await targetDb.from('subscribers').select('id').eq('email', lead.email.trim().toLowerCase()).limit(1);
        if (collisionError) throw collisionError;
        if (collisions?.length) return json({ error: 'identity_collision' }, { statusCode: 409 });
      } else if (await identityExists(targetDb, [leadId, lead.email])) {
        return json({ error: 'identity_collision' }, { statusCode: 409 });
      }
      const password = String(process.env.CRM_BOOTSTRAP_PASSWORD || '');
      if (!password || !passwordPolicy(password).ok) return json({ error: 'invalid_bootstrap_password_configuration' }, { statusCode: 500 });
      const [nombre, ...apellidos] = String(lead.name || '').trim().split(/\s+/);
      const newUser = targetPortal === 'community' ? {
        lead_id: leadId, username: lead.email.trim().toLowerCase(), email: lead.email.trim().toLowerCase(),
        password_hash: hashPassword(password), role: 'subscriber', nombre: nombre || null,
        apellidos: apellidos.join(' ') || null, is_subscriber: true, subscription_status: 'active',
        subscription_started_at: new Date().toISOString(),
      } : {
        lead_id: leadId, notion_page_id: notionPageId, username: lead.email.trim().toLowerCase(), email: lead.email.trim().toLowerCase(),
        password_hash: hashPassword(password), requires_onboarding: true, dni_completed: false,
        profile_completed: false, nombre: lead.name || null, assigned_to: assignedTo, tipo,
        ...(targetPortal === 'robinjr' ? { contract_data: { pricing_version: pricingVersionForNewUser(tipo) } } : {}),
      };
      const { data: inserted, error: insertError } = await targetDb.from(table).insert(newUser).select('id').single();
      if (insertError) throw insertError;
      userId = inserted.id;
      if (targetPortal === 'alumno') await ensureDriveFolder(portal, inserted.id);
    }
    let contractedAmount;
    if (targetPortal === 'alumno') {
      const [{ data: portalUser, error: portalUserError }, { data: portalPayments, error: portalPaymentsError }] = await Promise.all([
        portal.from('users').select('id,tipo,origin,has_eu_id,num_carreras,contract_data').eq('id', userId).single(),
        portal.from('payments').select('user_id,installment,amount,status').eq('user_id', userId),
      ]);
      if (portalUserError) throw portalUserError;
      if (portalPaymentsError) throw portalPaymentsError;
      contractedAmount = contractedAmountForUser(portalUser, portalPayments || []);
    }
    const actor = await syncCrmIdentity(crm, admin);
    const owner = await resolveCrmOwner({ portal, crm, ownerName: salesAgent });
    const crmUpdate = {
      crm_stage: 'Cliente',
      source_payload: {
        ...(lead.source_payload || {}),
        sales_agent: salesAgent || null,
        advisor_email: assignedTo || lead.source_payload?.advisor_email || null,
        converted_by: admin.id,
        portal_accounts: {
          ...(lead.source_payload?.portal_accounts || {}),
          ...(lead.source_payload?.target_portal && lead.source_payload?.target_user_id
            ? { [lead.source_payload.target_portal]: lead.source_payload.target_user_id } : {}),
          [targetPortal]: userId,
        },
      },
    };
    if (actor.available && owner.available) {
      crmUpdate.updated_by_user_id = admin.id;
      crmUpdate.owner_id = owner.user?.id || null;
      if (contractedAmount !== undefined) crmUpdate.price_at_signature = contractedAmount;
    }
    const { error: crmError } = await crm.from('crm_leads').update(crmUpdate).eq('id', lead.id);
    if (crmError) throw crmError;
    if (result === 'created') {
      const password = String(process.env.CRM_BOOTSTRAP_PASSWORD || '');
      const accessEmail = await sendAccountAccessEmail({ email: lead.email, name: lead.name, username: lead.email.trim().toLowerCase(), password, targetPortal });
      emailSent = !!accessEmail.sent;
    }
    return json({ ok: true, result, userId, emailSent, loginUrl: '/portal/', targetPortal, assignedTo, salesAgent: salesAgent || null });
  } catch (error) {
    console.error('crm-convert error', error);
    return serverError(error, 'crm.convert');
  }
};
