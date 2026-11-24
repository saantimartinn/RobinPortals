const jwt = require('jsonwebtoken');
const { setTimeout: pause } = require('node:timers/promises');
const { getAdminSupabase } = require('./admin-supabase');
const { getJwtSecret } = require('./auth');
const { sendEmail } = require('./email');
const { listWebBookings } = require('./google-calendar');
const { getGmailReadAccessToken, hasLeadReply } = require('./google-gmail');
const { CAMPAIGN_ID, DAY, normalizeEmail, ineligibleReason, madridDate, isSendTurn, renderMessage } = require('./lead-reactivation-content');

const UNSUBSCRIBE_AUDIENCE = 'crm-commercial-unsubscribe';
const BASE_URL = 'https://project-robin.com/api/admin/crm/reactivation-unsubscribe';

function unsubscribeUrl(enrollment) {
  const token = jwt.sign({ sub: enrollment.id, email: enrollment.email }, getJwtSecret(UNSUBSCRIBE_AUDIENCE), { algorithm: 'HS256', audience: UNSUBSCRIBE_AUDIENCE, noTimestamp: true });
  return `${BASE_URL}?token=${encodeURIComponent(token)}`;
}

function readUnsubscribeToken(token) {
  const data = jwt.verify(token, getJwtSecret(UNSUBSCRIBE_AUDIENCE), { algorithms: ['HS256'], audience: UNSUBSCRIBE_AUDIENCE });
  if (!data.sub || !data.email) throw new Error('invalid_unsubscribe_token');
  return data;
}

async function rows(query) {
  const result = await query;
  if (result.error) throw result.error;
  return result.data;
}

async function rpc(db, name, args) { return rows(db.rpc(name, args)); }

async function allRows(db, table, columns = '*') {
  const result = [];
  for (let offset = 0; ; offset += 500) {
    const page = await rows(db.from(table).select(columns).order('id').range(offset, offset + 499));
    result.push(...page);
    if (page.length < 500) return result;
  }
}

async function latestLead(db, id) {
  return rows(db.from('crm_leads').select('*').eq('id', id).maybeSingle());
}

async function humanContact(db, id) {
  const contacts = await rows(db.from('crm_lead_calls').select('id').eq('lead_id', id).limit(1));
  return contacts.length > 0;
}

function activeBooking(bookings, email, now) {
  return bookings.find(booking => (booking.emails || []).some(value => normalizeEmail(value) === email) && Date.parse(booking.end || booking.start) >= now.getTime());
}

// Called by the scheduled function only. All provider failures fail closed.
async function runReactivation({ now = new Date(), db = getAdminSupabase(), calendar = listWebBookings, readToken = getGmailReadAccessToken, reply = hasLeadReply, mailer = sendEmail } = {}) {
  const settings = await rows(db.from('crm_reactivation_settings').select('*').eq('campaign_id', CAMPAIGN_ID).single());
  if (!settings.enabled || !settings.activated_at) return { enabled: false, sent: 0 };
  const exclusion = lead => ineligibleReason(lead, now, settings.confirmed_holanda_lead_ids || []);
  if (!process.env.RESEND_API_KEY) throw new Error('reactivation_email_provider_missing');
  const bookings = await calendar(new Date(now.getTime() - DAY).toISOString(), new Date(now.getTime() + 180 * DAY).toISOString());
  const enrollments = await allRows(db, 'crm_lead_reactivations');
  const knownLeads = new Set(enrollments.map(item => item.lead_id));
  const knownEmails = new Set(enrollments.map(item => item.email));
  const suppressed = new Set((await rows(db.from('crm_email_suppressions').select('email'))).map(item => item.email));
  let stopped = 0;
  let booked = 0;
  const stop = async (item, reason) => { await rpc(db, 'stop_lead_reactivation', { p_enrollment_id: item.id, p_reason: reason }); stopped += 1; };
  const live = [];
  // Booking reconciliation still runs if Gmail needs reauthorization, so the CRM
  // can show an actual booking even while sending is unavailable.
  for (const item of enrollments.filter(row => row.status === 'active')) {
    const lead = await latestLead(db, item.lead_id);
    if (!lead) { await stop(item, 'lead_deleted'); continue; }
    const booking = activeBooking(bookings, item.email, now);
    if (booking || lead.source_payload?.retargeting_reservation) {
      const metadata = booking ? { event_id: booking.eventId, start_at: booking.start, received_at: lead.source_payload?.retargeting_reservation?.received_at || now.toISOString() } : lead.source_payload.retargeting_reservation;
      await rpc(db, 'reactivate_lead_booking', { p_enrollment_id: item.id, p_booking: metadata });
      booked += 1; continue;
    }
    const reason = normalizeEmail(lead.email) !== item.email ? 'email_changed' : suppressed.has(item.email) ? 'suppressed' : exclusion(lead);
    if (reason || await humanContact(db, lead.id)) { await stop(item, reason || 'human_contact'); continue; }
    live.push(item);
  }
  let token;
  try { token = await readToken(); }
  catch (error) { return { enabled: true, sent: 0, booked, stopped, blocked: error.code || 'gmail_read_unavailable' }; }
  if (!process.env.RESEND_WEBHOOK_SECRET) return { enabled: true, sent: 0, booked, stopped, blocked: 'email_events_not_configured' };
  let enrolled = 0;
  if (isSendTurn(now)) {
    const leads = await allRows(db, 'crm_leads');
    for (const lead of leads) {
      const email = normalizeEmail(lead.email);
      if (knownLeads.has(lead.id) || knownEmails.has(email) || suppressed.has(email) || exclusion(lead) || activeBooking(bookings, email, now)) continue;
      if (await humanContact(db, lead.id)) continue;
      const id = await rpc(db, 'enroll_lead_reactivation', { p_lead_id: lead.id, p_email: email, p_start_on: madridDate(now) });
      if (!id) continue;
      const item = { id, lead_id: lead.id, email, enrolled_at: now.toISOString() };
      live.push(item); knownLeads.add(lead.id); knownEmails.add(email); enrolled += 1;
    }
  }
  let sent = 0;
  let failed = 0;
  for (const item of live) {
    if (await reply({ email: item.email, since: item.enrolled_at, accessToken: token, includeOutbound: true })) { await stop(item, 'email_contact'); continue; }
    const messages = await rows(db.from('crm_lead_reactivation_messages').select('*').eq('enrollment_id', item.id).order('message_number'));
    const retrying = messages.some(message => message.status === 'sending' && message.first_attempt_at && now.getTime() - Date.parse(message.first_attempt_at) < 23 * 3600000);
    if (!isSendTurn(now) && !retrying) continue;
    const rejected = messages.find(message => ['bounced', 'complained', 'suppressed', 'failed'].includes(message.delivery_status));
    if (rejected) { await rpc(db, 'suppress_reactivation_email', { p_email: item.email, p_reason: rejected.delivery_status }); continue; }
    const next = messages.find(message => message.status !== 'sent');
    if (!next || !['scheduled', 'sending', 'failed'].includes(next.status) || Date.parse(next.scheduled_at) > now.getTime()) continue;
    // Refresh identity, contact state and the calendar immediately before claiming.
    const lead = await latestLead(db, item.lead_id);
    const reason = !lead ? 'lead_deleted' : normalizeEmail(lead.email) !== item.email ? 'email_changed' : exclusion(lead);
    if (reason || await humanContact(db, item.lead_id)) { await stop(item, reason || 'human_contact'); continue; }
    const currentBookings = await calendar(new Date(now.getTime() - DAY).toISOString(), new Date(now.getTime() + 180 * DAY).toISOString());
    const booking = activeBooking(currentBookings, item.email, now);
    if (booking) { await rpc(db, 'reactivate_lead_booking', { p_enrollment_id: item.id, p_booking: { event_id: booking.eventId, start_at: booking.start, received_at: now.toISOString() } }); booked += 1; continue; }
    if (await reply({ email: item.email, since: item.enrolled_at, accessToken: token, includeOutbound: true })) { await stop(item, 'email_contact'); continue; }
    const url = unsubscribeUrl(item);
    if (messages.some(message => message.status === 'sent' && message.delivery_status !== 'delivered')) continue;
    const payload = next.payload || { ...renderMessage(lead, next.message_number, { unsubscribeUrl: url }), tags: [{ name: 'campaign', value: CAMPAIGN_ID }, { name: 'message_id', value: next.id }], headers: { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } };
    const claimed = await rpc(db, 'claim_lead_reactivation_message', { p_message_id: next.id, p_payload: payload });
    if (!claimed?.length) continue;
    const message = claimed[0];
    if (mailer === sendEmail) await pause(600);
    const result = await mailer({ ...message.payload, idempotencyKey: `${CAMPAIGN_ID}/${item.lead_id}/${message.message_number}`, timeoutMs: 30000 });
    const confirmed = result.sent && result.id;
    await rows(db.from('crm_lead_reactivation_messages').update(confirmed
      ? { status: 'sent', sent_at: new Date().toISOString(), provider_message_id: result.id, claimed_until: null, error: null }
      : { status: 'review', claimed_until: null, error: result.reason || 'send_unconfirmed' }).eq('id', message.id));
    if (confirmed) {
      sent += 1;
      if (message.message_number === 8) await rows(db.from('crm_lead_reactivations').update({ status: 'completed' }).eq('id', item.id).eq('status', 'active'));
    } else failed += 1;
  }
  return { enabled: true, enrolled, sent, failed, booked, stopped };
}

module.exports = { unsubscribeUrl, readUnsubscribeToken, rows, runReactivation };
