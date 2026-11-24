const { getSupabase } = require('../../lib/supabase');
const { getAdminSupabase } = require('../../lib/admin-supabase');
const { readSessionFromEvent } = require('../../lib/auth');
const { findAdminForSession } = require('../../lib/admin-auth');
const { json, methodNotAllowed, parseJsonBody, serverError } = require('../../lib/http');
const { sendEmail } = require('../../lib/email');
const { rows, readSettings } = require('../../lib/lead-reactivation');
const { CAMPAIGN_ID, TEST_TO, templates, ineligibleReason, renderMessage, testIdempotencyKey } = require('../../lib/lead-reactivation-content');

exports.handler = async event => {
  if (!['GET', 'POST'].includes(event.httpMethod)) return methodNotAllowed(['GET', 'POST']);
  try {
    const session = readSessionFromEvent(event);
    const admin = session && await findAdminForSession(getSupabase(), session);
    if (!admin) return json({ error: 'unauthorized' }, { statusCode: 401 });
    const body = event.httpMethod === 'POST' ? parseJsonBody(event) : event.queryStringParameters || {};
    const leadId = String(body?.leadId || '');
    if (!leadId) return json({ error: 'lead_id_required' }, { statusCode: 400 });
    const db = getAdminSupabase();
    const lead = await rows(db.from('crm_leads').select('*').eq('id', leadId).maybeSingle());
    if (!lead) return json({ error: 'lead_not_found' }, { statusCode: 404 });
    if (event.httpMethod === 'POST' || body.action === 'preview') {
      const number = Number(body.messageNumber || 1);
      if (!templates.some(item => item.number === number)) return json({ error: 'invalid_message_number' }, { statusCode: 400 });
      const preview = renderMessage(lead, number, { test: true, unsubscribeUrl: 'https://project-robin.com/api/admin/crm/reactivation-unsubscribe?test=1' });
      if (event.httpMethod === 'GET') return json({ subject: preview.subject, html: preview.html, text: preview.text, testTo: TEST_TO });
      if (body.action !== 'test') return json({ error: 'invalid_action' }, { statusCode: 400 });
      const result = await sendEmail({ ...preview, idempotencyKey: testIdempotencyKey(preview), timeoutMs: 30000 });
      if (!result.sent || !result.id) return json({ error: 'test_send_failed' }, { statusCode: 502 });
      return json({ sent: true, to: TEST_TO, id: result.id });
    }
    const settings = await readSettings(db);
    if (!settings) return json({ enabled: false, setupPending: true, enrollment: null, count: 0, messages: [], templates: templates.map(({ number, day, subject }) => ({ number, day, subject })), testTo: TEST_TO });
    const enrollment = await rows(db.from('crm_lead_reactivations').select('id,status,stop_reason,enrolled_at').eq('lead_id', leadId).eq('campaign_id', CAMPAIGN_ID).maybeSingle());
    const messages = enrollment ? await rows(db.from('crm_lead_reactivation_messages').select('id,message_number,template,scheduled_at,sent_at,status,delivery_status,error').eq('enrollment_id', enrollment.id).order('message_number')) : [];
    return json({ enabled: settings.enabled, blocked: Boolean(settings.last_error), enrollment, exclusion: ineligibleReason(lead, new Date(), settings.confirmed_holanda_lead_ids || []), count: messages.filter(message => message.sent_at).length, messages, templates: templates.map(({ number, day, subject }) => ({ number, day, subject })), testTo: TEST_TO });
  } catch (error) { return serverError(error, 'crm.reactivation_status'); }
};
