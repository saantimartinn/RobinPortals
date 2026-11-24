const test = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const { templates, CAMPAIGN_ID, FROM, REPLY_TO, TEST_TO, ineligibleReason, isHolandaLead, isSendTurn, renderMessage } = require('../lib/lead-reactivation-content');
const { verifyEmailEvent } = require('../lib/reactivation-webhook');
const { unsubscribeUrl, readUnsubscribeToken } = require('../lib/lead-reactivation');

const now = new Date('2026-11-24T19:00:00Z');
const lead = { id: 'lead-1', name: 'María García', email: ' MARIA@EXAMPLE.ORG ', crm_stage: 'Por contactar', owner_names: [], source_created_at: '2026-10-24T19:00:00Z', source_payload: { campaign_name: 'Campaña continua Candela' } };

test('the original eight pieces retain their cadence, copy and required fields; tests never address the lead', () => {
  assert.deepEqual(templates.map(t => t.day), [0, 4, 9, 15, 22, 30, 39, 49]);
  for (const template of templates) {
    const message = renderMessage(lead, template.number, { unsubscribeUrl: 'https://project-robin.com/api/admin/crm/reactivation-unsubscribe?token=a&b=c' });
    assert.equal(message.to, 'maria@example.org'); assert.equal(message.from, FROM); assert.equal(message.reply_to, REPLY_TO);
    assert.match(message.html, /Hola María,/); assert.doesNotMatch(message.html + message.text, /\{\{|webinar/i);
    assert.match(message.html, /token=a&amp;b=c/); assert.match(message.html, /NIF B75355057/);
    const preview = renderMessage(lead, template.number, { test: true, unsubscribeUrl: 'https://example.org/test' });
    assert.equal(preview.to, TEST_TO); assert.match(preview.subject, /^\[PRUEBA\]/); assert.match(preview.html, /No estás inscrito/);
  }
  assert.throws(() => renderMessage(lead, 1, { unsubscribeUrl: 'javascript:alert(1)' }), /invalid_unsubscribe/);
});

test('only the owner-confirmed campaigns or an explicit Dutch destination qualify; notes and origin countries do not', () => {
  for (const name of ['Sociales - Video 15/09/2026', 'Webinar 10-10 Video y carrousel', 'Psico - Video 25/09/2026', 'Campaña continua Candela']) assert.equal(isHolandaLead({ source_payload: { campaign_name: name } }), true);
  assert.equal(isHolandaLead({ lead_type: 'Delft' }), true);
  assert.equal(isHolandaLead({ source_payload: { page_url: '/veteaholanda/' } }), true);
  assert.equal(isHolandaLead({ lead_type: 'General', area: 'Business', comment: 'Quiere Holanda', source_payload: { country: 'España' } }), false);
  assert.equal(isHolandaLead({ source_payload: { campaign_name: 'Campaña continua Candela', destination: 'España' } }), false);
  assert.equal(isHolandaLead({ source_payload: { page_url: 'https://evil.test/veteaholanda/' } }), false);
  assert.equal(isHolandaLead({ id: 'owner-confirmed-current' }, ['owner-confirmed-current']), true);
  assert.equal(isHolandaLead({ id: 'new-ambiguous-lead' }, ['owner-confirmed-current']), false);
  assert.equal(isHolandaLead({ id: 'owner-confirmed-current', source_payload: { destination: 'España' } }, ['owner-confirmed-current']), false);
});

test('eligibility uses entry age, never automatic timestamps, and stops for real contact, booking, assignment, conversion or opt-out', () => {
  assert.equal(ineligibleReason(lead, now), null);
  assert.equal(ineligibleReason({ ...lead, updated_at: now.toISOString(), source_updated_at: now.toISOString() }, now), null);
  assert.equal(ineligibleReason({ ...lead, source_created_at: '2026-10-25T19:00:00Z' }, now), 'not_overdue');
  for (const [patch, reason] of [[{ is_test: true }, 'test'], [{ email: 'invalid' }, 'invalid_email'], [{ contact_at: '2026-10-26' }, 'human_contact'], [{ crm_stage: 'Lost' }, 'closed_or_contacted'], [{ crm_stage: 'Cliente' }, 'closed_or_contacted'], [{ owner_names: ['Manuel'] }, 'assigned'], [{ inside_at: now.toISOString() }, 'converted'], [{ source_payload: { ...lead.source_payload, unsubscribed: true } }, 'suppressed'], [{ source_payload: { ...lead.source_payload, retargeting_reservation: {} } }, 'booking'], [{ source_payload: { ...lead.source_payload, commercial_sequence: 'other' } }, 'other_sequence']]) assert.equal(ineligibleReason({ ...lead, ...patch }, now), reason);
});

test('Madrid send time handles summer/winter and runs only the 20:00 turn', () => {
  assert.equal(isSendTurn(new Date('2026-07-10T18:00:00Z')), true);
  assert.equal(isSendTurn(new Date('2026-11-24T19:00:00Z')), true);
  assert.equal(isSendTurn(new Date('2026-07-10T19:00:00Z')), false);
  assert.equal(isSendTurn(new Date('2026-11-24T19:05:00Z')), false);
});

test('personalisation prefers structured data, omits uncertain values, escapes HTML and never quotes internal notes', () => {
  const p = { field_data: { '¿qué_carreras_te_interesan?': 'Bussines' }, course: '1º de Bachillerato' };
  const input = { ...lead, source_payload: p, comment: 'Presupuesto: nota PRIVADA y confidencial' };
  const render = n => renderMessage(input, n, { unsubscribeUrl: 'https://example.org/unsubscribe' });
  assert.match(render(1).text, /te interesa Business/);
  assert.match(render(2).text, /nos preguntaste por los costes/);
  assert.match(render(4).text, /Si estás en 1.º, tienes margen/);
  for (let n = 1; n <= 8; n++) assert.doesNotMatch(render(n).html, /PRIVADA|confidencial/);
  const malicious = renderMessage({ name: '<script>alert(1)</script>', source_payload: { interests: '<img src=x onerror=alert(1)>' } }, 1, { unsubscribeUrl: 'https://example.org/u' });
  assert.match(malicious.text, /Hola,/); assert.doesNotMatch(malicious.html, /<script|onerror/);
});

test('unsubscribe tokens have a separate audience and cannot act as sessions or be changed to unsubscribe somebody else', () => {
  const previous = process.env.JWT_SECRET; process.env.JWT_SECRET = 'local-test-secret-not-production';
  try {
    const url = new URL(unsubscribeUrl({ id: 'enrollment-1', email: 'maria@example.org' }));
    const token = url.searchParams.get('token');
    assert.equal(readUnsubscribeToken(token).aud, 'crm-commercial-unsubscribe');
    assert.equal(readUnsubscribeToken(token).sub, 'enrollment-1');
    const jwt = require('jsonwebtoken');
    assert.throws(() => jwt.verify(token, process.env.JWT_SECRET), /signature/);
    assert.throws(() => jwt.verify(token, process.env.JWT_SECRET, { audience: 'crm-reactivation-worker' }));
    assert.throws(() => readUnsubscribeToken(token.slice(0, -10) + 'tampered'));
  } finally { if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous; }
});

test('provider events verify original bytes, signature, replay window and rotating signature candidates', () => {
  const secret = 'whsec_' + Buffer.from('local-webhook-signing-secret').toString('base64');
  const body = JSON.stringify({ type: 'email.delivered', data: { email_id: 'provider-1', tags: { campaign: CAMPAIGN_ID } } });
  const timestamp = String(Math.floor(now.getTime() / 1000));
  const sig = createHmac('sha256', Buffer.from(secret.slice(6), 'base64')).update(`event-1.${timestamp}.${body}`).digest('base64');
  const event = { body, headers: { 'svix-id': 'event-1', 'svix-timestamp': timestamp, 'svix-signature': `v1,old v1,${sig}` } };
  assert.equal(verifyEmailEvent(event, secret, now.getTime()).type, 'email.delivered');
  assert.throws(() => verifyEmailEvent({ ...event, body: body + ' ' }, secret, now.getTime()), /signature/);
  assert.throws(() => verifyEmailEvent(event, secret, now.getTime() + 301000), /timestamp/);
  assert.throws(() => verifyEmailEvent(event, '', now.getTime()), /not_configured/);
});
