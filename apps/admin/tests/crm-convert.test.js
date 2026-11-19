const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function database(tables) {
  return {
    tables,
    from(table) {
      const rows = tables[table] ||= [];
      let filters = [];
      let operation = 'read';
      let values;
      const query = {
        select() { return query; },
        eq(field, value) { filters.push((row) => row[field] === value); return query; },
        limit() { return query; },
        insert(row) { operation = 'insert'; values = row; return query; },
        upsert(row) { operation = 'upsert'; values = row; return query; },
        update(row) { operation = 'update'; values = row; return query; },
        async single() { return resolve(true); },
        async maybeSingle() { return resolve(true); },
        then(fulfill, reject) { return Promise.resolve(resolve(false)).then(fulfill, reject); },
      };
      function resolve(one) {
        if (operation === 'insert') {
          const inserted = { id: table + '-' + (rows.length + 1), ...values };
          rows.push(inserted);
          return { data: one ? inserted : [inserted], error: null };
        }
        if (operation === 'upsert') {
          const existing = rows.find((row) => row.user_id === values.user_id);
          if (existing) Object.assign(existing, values);
          else rows.push({ ...values });
          return { data: null, error: null };
        }
        const found = rows.filter((row) => filters.every((match) => match(row)));
        if (operation === 'update') found.forEach((row) => Object.assign(row, values));
        return { data: one ? found[0] || null : found, error: null };
      }
      return query;
    },
  };
}

test('CRM crea accesos en bases separadas y conserva ambos portales del mismo lead', async () => {
  const previousPassword = process.env.CRM_BOOTSTRAP_PASSWORD;
  process.env.CRM_BOOTSTRAP_PASSWORD = 'test-bootstrap-password#';
  const admin = { id: 'admin-1', email: 'admin@robin.test', username: 'admin', nombre: 'Admin', role: 'admin' };
  const lead = { id: 'lead-1', name: 'Ana López', email: 'ana@example.test', lead_type: 'General', owner_names: ['Admin'], comment: 'Necesita apoyo con la solicitud.', source_payload: {} };
  const portal = database({ users: [admin], payments: [] });
  const junior = database({ users: [] });
  const community = database({ subscribers: [] });
  const crm = database({ crm_leads: [lead], crm_lead_events: [{ id: 'note-1', lead_id: lead.id, event_type: 'team_note', metadata: { body: 'Llamar a la madre', author_name: 'Equipo' }, created_at: '2026-11-04T10:00:00Z' }], crm_lead_calls: [] });
  const sent = [];
  let mailResult = { sent: true };
  const modules = {
    '../../lib/supabase': { getSupabase: () => portal },
    '../../lib/admin-supabase': { getAdminSupabase: () => crm },
    '../../lib/junior-supabase': { getJuniorSupabase: () => junior },
    '../../lib/subscriptions-supabase': { getSubscriptionsSupabase: () => community },
    '../../lib/auth': { readSessionFromEvent: () => ({ uid: admin.id }), hashPassword: (value) => 'hash:' + value, verifyPassword: (value, hash) => hash === 'hash:' + value },
    '../../lib/authorization': { isApplicationAdmin: (user) => user.role === 'admin', normalizeEmail: (user) => user.email },
    '../../lib/identity': { identityExists: async () => false },
    '../../lib/http': {
      json: (body, options = {}) => ({ statusCode: options.statusCode || 200, body: JSON.stringify(body) }),
      methodNotAllowed: () => ({ statusCode: 405 }),
      parseJsonBody: (event) => JSON.parse(event.body),
      serverError: (error) => { throw error; },
      verifyOrigin: () => true,
    },
    '../../shared/password-policy.cjs': { passwordPolicy: () => ({ ok: true }) },
    '../../lib/notion': { normalizeTipo: (value) => String(value || '').toLowerCase().includes('llegada') ? 'llegada' : value, ensureDriveFolder: async () => {} },
    '../../lib/account-access-email': { sendAccountAccessEmail: async (payload) => { sent.push(payload); return mailResult; } },
    '../../lib/finance-dashboard': { contractedAmountForUser: () => 1499 },
    '../../lib/crm-identity': {
      resolveCrmOwner: async () => ({ available: true, user: admin }),
      syncCrmIdentity: async () => ({ available: true }),
    },
    '../../../robinjr/shared/financial-config.cjs': { pricingVersionForNewUser: () => 'current' },
  };
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (parent?.filename.endsWith('/apps/admin/netlify/functions/crm-convert.js') && modules[request]) return modules[request];
    return originalLoad.call(this, request, parent, isMain);
  };
  let handler;
  try {
    const path = require.resolve('../netlify/functions/crm-convert');
    delete require.cache[path];
    handler = require(path).handler;
  } finally {
    Module._load = originalLoad;
  }
  const convert = async (targetPortal, advisor = 'admin', overrides = {}) => {
    const response = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ leadId: lead.id, targetPortal, advisor, clientType: 'General', ...overrides }),
    });
    assert.equal(response.statusCode, 200);
    return JSON.parse(response.body);
  };

  const first = await convert('robinjr');
  assert.equal(first.result, 'created');
  assert.equal(junior.tables.users.length, 1);
  assert.equal(junior.tables.users[0].contract_data.pricing_version, 'current');
  assert.equal(junior.tables.users[0].username, lead.email);
  assert.equal(junior.tables.users[0].password_hash, 'hash:test-bootstrap-password#');
  assert.equal(portal.tables.users.length, 1);
  assert.equal(community.tables.subscribers.length, 0);

  const second = await convert('community', '');
  assert.equal(second.result, 'created');
  assert.equal(community.tables.subscribers.length, 1);
  assert.equal(community.tables.subscribers[0].subscription_status, 'active');
  assert.equal(portal.tables.users.length, 1);

  const third = await convert('alumno');
  assert.equal(third.result, 'created');
  assert.equal(portal.tables.users.length, 2);
  assert.equal(portal.tables.users[1].username, lead.email);
  assert.deepEqual([
    portal.tables.users[1].email,
    junior.tables.users[0].email,
    community.tables.subscribers[0].email,
  ], [lead.email, lead.email, lead.email]);
  assert.deepEqual(Object.keys(lead.source_payload.portal_accounts).sort(), ['alumno', 'community', 'robinjr']);
  for (const db of [portal, junior, community]) {
    assert.equal(db.tables.crm_client_notes.length, 1);
    assert.deepEqual(db.tables.crm_client_notes[0].notes.map((note) => note.body), ['Necesita apoyo con la solicitud.', 'Llamar a la madre']);
  }
  assert.equal(lead.source_payload.crm_notes.length, 2);

  crm.tables.crm_lead_events.push({ id: 'note-2', lead_id: lead.id, event_type: 'team_note', metadata: { body: 'Enviar resumen', author_name: 'Equipo' }, created_at: '2026-11-05T10:00:00Z' });
  const repeat = await convert('community', '');
  assert.equal(repeat.result, 'exists');
  assert.equal(community.tables.subscribers.length, 1);
  assert.equal(community.tables.crm_client_notes[0].notes.length, 3);
  assert.equal(community.tables.crm_client_notes.length, 1);
  assert.equal(sent.length, 3);
  assert.ok(sent.every((message) => message.username === lead.email && message.password === 'test-bootstrap-password#'));

  const arrival = { id: 'arrival-1', name: 'Llegada Cliente', email: 'arrival@example.test', lead_type: 'Llegada', source_payload: {}, owner_names: ['Admin'] };
  crm.tables.crm_leads.push(arrival);
  const missingAdvisor = await handler({ httpMethod: 'POST', body: JSON.stringify({ leadId: arrival.id, targetPortal: 'community' }) });
  assert.equal(missingAdvisor.statusCode, 400);
  assert.equal(JSON.parse(missingAdvisor.body).error, 'advisor_required');
  mailResult = { sent: false, reason: 'provider_error' };
  const failedMail = await convert('community', 'admin', { leadId: arrival.id });
  assert.equal(failedMail.targetPortal, 'alumno');
  assert.equal(failedMail.emailSent, false);
  assert.equal(failedMail.emailReason, 'provider_error');
  assert.equal(community.tables.subscribers.length, 1);
  const arrivalAccount = portal.tables.users.find(user => user.lead_id === arrival.id);
  assert.equal(arrivalAccount.tipo, 'llegada');
  assert.equal(arrivalAccount.assigned_to, admin.email);
  assert.equal(arrivalAccount.requires_onboarding, true);
  assert.equal(arrival.source_payload.account_access_emails.alumno.status, 'failed');
  assert.ok(!JSON.stringify(arrival.source_payload).includes('test-bootstrap-password#'));
  mailResult = { sent: true, id: 'mail-1' };
  const recoveredMail = await convert('robinjr', 'admin', { leadId: arrival.id });
  assert.equal(recoveredMail.result, 'exists');
  assert.equal(recoveredMail.emailSent, true);
  assert.equal(portal.tables.users.filter(user => user.lead_id === arrival.id).length, 1);
  assert.equal(junior.tables.users.length, 1);
  assert.equal(arrival.source_payload.account_access_emails.alumno.message_id, 'mail-1');
  assert.equal(sent.at(-1).idempotencyKey, sent.at(-2).idempotencyKey);
  assert.equal(sent.at(-1).clientType, 'llegada');
  const attempts = sent.length;
  await convert('', 'admin', { leadId: arrival.id });
  assert.equal(sent.length, attempts);
  arrivalAccount.password_hash = 'client-chosen-password-hash';
  delete arrival.source_payload.account_access_emails.alumno;
  const changedPassword = await convert('', 'admin', { leadId: arrival.id });
  assert.equal(changedPassword.emailReason, 'password_changed');
  assert.equal(changedPassword.emailSent, false);
  assert.equal(arrivalAccount.password_hash, 'client-chosen-password-hash');
  assert.equal(sent.length, attempts);
  if (previousPassword === undefined) delete process.env.CRM_BOOTSTRAP_PASSWORD;
  else process.env.CRM_BOOTSTRAP_PASSWORD = previousPassword;
});
