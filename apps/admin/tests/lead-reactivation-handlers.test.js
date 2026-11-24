const test = require('node:test');
const assert = require('node:assert/strict');
const { unsubscribeUrl } = require('../lib/lead-reactivation');
const { TEST_TO } = require('../lib/lead-reactivation-content');

function handler(file, mocks) {
  const saved = [];
  for (const [name, exports] of Object.entries(mocks)) {
    const id = require.resolve(name); saved.push([id, require.cache[id]]);
    require.cache[id] = { id, filename: id, loaded: true, exports };
  }
  const path = require.resolve(file); delete require.cache[path];
  try { return require(path).handler; }
  finally { delete require.cache[path]; for (const [id, value] of saved) { if (value) require.cache[id] = value; else delete require.cache[id]; } }
}

test('history/preview/test endpoints reject unauthenticated requests before reading leads or sending mail', async () => {
  const api = handler('../netlify/functions/admin-crm-reactivation', {
    '../lib/auth': { readSessionFromEvent: () => null },
    '../lib/admin-supabase': { getAdminSupabase: () => { throw new Error('no_database_access'); } },
    '../lib/email': { sendEmail: () => { throw new Error('no_mail'); } },
  });
  for (const method of ['GET', 'POST']) assert.equal((await api({ httpMethod: method })).statusCode, 401);
});

test('preview and test cannot enrol a lead, increment a counter or change the fixed test recipient', async () => {
  let sent; let reads = 0;
  const api = handler('../netlify/functions/admin-crm-reactivation', {
    '../lib/auth': { readSessionFromEvent: () => ({ uid: 'admin' }) },
    '../lib/supabase': { getSupabase: () => ({}) },
    '../lib/admin-auth': { findAdminForSession: async () => ({ id: 'admin' }) },
    '../lib/admin-supabase': { getAdminSupabase: () => ({ from(table) {
      assert.equal(table, 'crm_leads'); reads += 1;
      return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { id: 'lead-id', email: 'never-send@example.org', name: 'María' }, error: null }) };
    } }) },
    '../lib/email': { sendEmail: async message => { sent = message; return { sent: true, id: 'provider-test' }; } },
  });
  const preview = await api({ httpMethod: 'GET', queryStringParameters: { leadId: 'lead-id', action: 'preview', messageNumber: '1' } });
  assert.equal(preview.statusCode, 200); assert.match(JSON.parse(preview.body).html, /Hola María/); assert.equal(sent, undefined);
  const response = await api({ httpMethod: 'POST', body: JSON.stringify({ leadId: 'lead-id', action: 'test', messageNumber: 1, to: 'unapproved@example.org', enable: true }) });
  assert.equal(response.statusCode, 200); assert.equal(sent.to, TEST_TO); assert.match(sent.idempotencyKey, /\/test\//); assert.equal(reads, 2);
  const invalid = await api({ httpMethod: 'POST', body: JSON.stringify({ leadId: 'lead-id', action: 'activate' }) });
  assert.equal(invalid.statusCode, 400);
});

test('unsubscribe GET is safe for scanners; a valid POST changes only the enrolled email; tokens cannot choose another recipient', async () => {
  const old = process.env.JWT_SECRET; process.env.JWT_SECRET = 'test-only-secret';
  try {
    const writes = [];
    const api = handler('../netlify/functions/reactivation-unsubscribe', {
      '../lib/admin-supabase': { getAdminSupabase: () => ({
        from(table) { assert.equal(table, 'crm_lead_reactivations'); return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { id: 'enrollment', email: 'enrolled@example.org' } }) }; },
        async rpc(name, args) { writes.push({ name, args }); return { data: null }; },
      }) },
    });
    const token = new URL(unsubscribeUrl({ id: 'enrollment', email: 'enrolled@example.org' })).searchParams.get('token');
    assert.equal((await api({ httpMethod: 'GET', queryStringParameters: { token } })).statusCode, 200); assert.equal(writes.length, 0);
    const response = await api({ httpMethod: 'POST', queryStringParameters: { token }, body: 'email=other@example.org' });
    assert.match(response.body, /Baja confirmada/); assert.deepEqual(writes, [{ name: 'suppress_reactivation_email', args: { p_email: 'enrolled@example.org', p_reason: 'unsubscribe' } }]);
    assert.equal((await api({ httpMethod: 'POST', queryStringParameters: { token: token + 'invalid' } })).statusCode, 400);
    assert.equal(writes.length, 1);
  } finally { if (old === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = old; }
});

test('background execution rejects a forged worker token, non-production never sends and email events reject missing signatures', async () => {
  const old = process.env.CONTEXT; process.env.CONTEXT = 'production';
  try {
    const worker = handler('../netlify/functions/lead-reactivation-background', {});
    assert.equal((await worker({ headers: { authorization: 'Bearer forged' } })).statusCode, 401);
    const events = handler('../netlify/functions/reactivation-events', {});
    assert.equal((await events({ httpMethod: 'POST', headers: {}, body: '{}' })).statusCode, 401);
    process.env.CONTEXT = 'deploy-preview';
    assert.equal(JSON.parse((await worker({})).body).skipped, 'not_production');
    const scheduled = handler('../netlify/functions/lead-reactivation', {});
    assert.equal((await scheduled({ body: '{}' })).statusCode, 404);
    assert.equal(JSON.parse((await scheduled({ body: JSON.stringify({ next_run: 'test' }) })).body).skipped, 'not_production');
  } finally { if (old === undefined) delete process.env.CONTEXT; else process.env.CONTEXT = old; }
});

test('Gmail missing read permission prevents reply scans; scanning uses metadata-only lists and includes manual outbound messages', async t => {
  const { getGmailReadAccessToken, hasLeadReply } = require('../lib/google-gmail');
  const envKeys = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'CRM_GMAIL_REFRESH_TOKEN'];
  const old = envKeys.map(key => process.env[key]);
  envKeys.forEach(key => { process.env[key] = 'fake-test'; });
  t.after(() => envKeys.forEach((key, i) => { if (old[i] === undefined) delete process.env[key]; else process.env[key] = old[i]; }));
  const requests = [];
  t.mock.method(globalThis, 'fetch', async input => {
    const url = new URL(input); requests.push(url);
    if (url.hostname === 'oauth2.googleapis.com' && url.pathname === '/token') return Response.json({ access_token: 'fake-access' });
    if (url.hostname === 'oauth2.googleapis.com') return Response.json({ scope: 'https://www.googleapis.com/auth/gmail.send' });
    assert.equal(url.pathname, '/gmail/v1/users/me/messages');
    assert.match(url.searchParams.get('q'), /from:\(lead@example.org\)/); assert.match(url.searchParams.get('q'), /in:sent to:\(lead@example.org\)/);
    return Response.json({ messages: [{ id: 'reply-id' }] });
  });
  await assert.rejects(getGmailReadAccessToken(), error => error.code === 'gmail_read_scope_missing');
  assert.equal(await hasLeadReply({ email: ' LEAD@example.org ', since: '2026-11-24T19:00:00Z', accessToken: 'fake-read-access', includeOutbound: true }), true);
  assert.equal(requests.length, 3);
});
