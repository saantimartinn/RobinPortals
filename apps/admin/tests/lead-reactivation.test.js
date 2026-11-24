const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const { randomUUID } = require('node:crypto');
const { runReactivation } = require('../lib/lead-reactivation');
const { CAMPAIGN_ID } = require('../lib/lead-reactivation-content');

const migration = readFileSync(require.resolve('../supabase/admin-migrations/202611240001_create_lead_reactivation.sql'), 'utf8');
async function database() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create table crm_leads(id uuid primary key default gen_random_uuid(), name text, email text, source_payload jsonb default '{}', crm_stage text default 'Por contactar', owner_names text[] default '{}', contact_at timestamptz, inside_at timestamptz, lifecycle text, source_created_at timestamptz default now() - interval '60 days', created_at timestamptz default now(), is_test boolean default false, campaign_notion_urls text[] default '{}');
    create table crm_lead_calls(id uuid default gen_random_uuid(), lead_id uuid);
  `);
  await db.exec(migration);
  return db;
}

// Thin test adapter: production uses the existing Supabase service-role client.
function client(db) {
  return {
    rpc(name, args) {
      const values = Object.values(args);
      return db.query(`select * from public.${name}(${values.map((_, i) => '$' + (i + 1)).join(',')})`, values).then(result => ({ data: name === 'enroll_lead_reactivation' ? result.rows[0][name] : result.rows, error: null }));
    },
    from(table) {
      const where = []; const values = []; let columns = '*'; let updates; let order = ''; let limit = ''; let singular = false;
      const q = {
        select(value) { columns = value; return q; },
        eq(column, value) { values.push(value); where.push(`${column} = $${values.length}`); return q; },
        update(value) { updates = value; return q; },
        order(column) { order = ` order by ${column}`; return q; },
        range(start, end) { limit = ` limit ${end - start + 1} offset ${start}`; return q; },
        limit(value) { limit = ` limit ${value}`; return q; },
        single() { singular = true; return q; }, maybeSingle() { singular = true; return q; },
        async then(resolve, reject) {
          try {
            let sql;
            if (updates) {
              const sets = Object.entries(updates).map(([key, value]) => { values.push(value); return `${key} = $${values.length}`; });
              sql = `update ${table} set ${sets.join(',')} ${where.length ? 'where ' + where.join(' and ') : ''} returning *`;
            } else sql = `select ${columns} from ${table}${where.length ? ' where ' + where.join(' and ') : ''}${order}${limit}`;
            const result = await db.query(sql, values);
            resolve({ data: singular ? result.rows[0] || null : result.rows, error: null });
          } catch (error) { if (reject) reject(error); else throw error; }
        },
      };
      return q;
    },
  };
}

async function lead(db, suffix, extra = {}) {
  const id = randomUUID();
  await db.query(`insert into crm_leads(id,name,email,source_payload) values($1,$2,$3,$4)`, [id, 'María ' + suffix, `${suffix}@example.org`, { source: 'meta', campaign_name: 'Campaña continua Candela', ...extra }]);
  return id;
}
async function enable(db) { await db.exec(`update crm_reactivation_settings set enabled = true, activated_at = now()`); }
async function enroll(db, id, email) { return (await db.query(`select enroll_lead_reactivation($1,$2,current_date - 60) as id`, [id, email])).rows[0].id; }

test('SQL migration is repeatable, starts disabled, deduplicates lead/email and protects all tables and RPCs', async () => {
  const db = await database();
  try {
    await db.exec(migration);
    const id = await lead(db, 'one');
    assert.equal(await enroll(db, id, 'one@example.org'), null);
    await enable(db);
    const enrollment = await enroll(db, id, 'one@example.org'); assert.ok(enrollment);
    assert.equal(await enroll(db, id, 'ONE@example.org'), null);
    const duplicate = await lead(db, 'duplicate'); await db.query('update crm_leads set email=$1 where id=$2', ['one@example.org', duplicate]);
    assert.equal(await enroll(db, duplicate, 'one@example.org'), null);
    assert.equal((await db.query('select count(*)::int as n from crm_lead_reactivation_messages')).rows[0].n, 8);
    const pieces = (await db.query(`select message_number, to_char(scheduled_at at time zone 'Europe/Madrid','YYYY-MM-DD"T"HH24:MI:SS') as local from crm_lead_reactivation_messages order by message_number`)).rows;
    const dates = pieces.map(row => new Date(row.local + 'Z').getTime());
    assert.deepEqual(dates.map(date => (date - dates[0]) / 86400000), [0, 4, 9, 15, 22, 30, 39, 49]);
    for (const row of pieces) assert.match(String(row.local), /20:00:00/);
    await db.exec('set role authenticated');
    await assert.rejects(db.query('select * from crm_lead_reactivations'), /permission denied/);
    await assert.rejects(db.query('select stop_lead_reactivation($1,$2)', [enrollment, 'unsafe']), /permission denied/);
    await db.exec('reset role');
  } finally { await db.close(); }
});

test('durable claims permit only one worker, preserve the payload and stop uncertain retries before provider idempotency expires', async () => {
  const db = await database();
  try {
    await enable(db); const id = await lead(db, 'claims'); const enrollment = await enroll(db, id, 'claims@example.org');
    const messages = (await db.query('select * from crm_lead_reactivation_messages where enrollment_id=$1 order by message_number', [enrollment])).rows;
    const claim = payload => db.query('select * from claim_lead_reactivation_message($1,$2)', [messages[0].id, payload]);
    const results = await Promise.all([claim({ html: 'original' }), claim({ html: 'changed' })]);
    assert.equal(results.flatMap(result => result.rows).length, 1);
    assert.equal((await db.query('select * from claim_lead_reactivation_message($1,$2)', [messages[1].id, {}])).rows.length, 0, 'message 2 cannot precede message 1');
    await db.query(`update crm_lead_reactivation_messages set claimed_until=now()-interval '1 minute' where id=$1`, [messages[0].id]);
    const retried = await claim({ html: 'different' }); assert.deepEqual(retried.rows[0].payload, { html: 'original' });
    await db.query(`update crm_lead_reactivation_messages set claimed_until=null, first_attempt_at=now()-interval '24 hours' where id=$1`, [messages[0].id]);
    assert.equal((await claim({})).rows.length, 0);
    assert.equal((await db.query('select status from crm_lead_reactivation_messages where id=$1', [messages[0].id])).rows[0].status, 'review');
    await db.query(`update crm_lead_reactivation_messages set status='sent', sent_at=now() where id=$1`, [messages[0].id]);
    assert.equal((await db.query('select * from claim_lead_reactivation_message($1,$2)', [messages[1].id, {}])).rows.length, 0, 'downtime must not compress the four-day interval');
    await db.query(`update crm_lead_reactivation_messages set sent_at=now()-interval '5 days' where id=$1`, [messages[0].id]);
    assert.equal((await db.query('select * from claim_lead_reactivation_message($1,$2)', [messages[1].id, {}])).rows.length, 1);
  } finally { await db.close(); }
});

test('bookings move the same record, preserve acquisition and cancel future pieces; opted-out addresses cannot reenrol', async () => {
  const db = await database();
  try {
    await enable(db); const id = await lead(db, 'booking'); const enrollment = await enroll(db, id, 'booking@example.org');
    const original = (await db.query('select * from crm_leads where id=$1', [id])).rows[0];
    await db.query('select reactivate_lead_booking($1,$2)', [enrollment, { event_id: 'calendar-1', received_at: new Date().toISOString() }]);
    const updated = (await db.query('select * from crm_leads where id=$1', [id])).rows[0];
    assert.equal(updated.id, original.id); assert.equal(updated.source_created_at.getTime(), original.source_created_at.getTime());
    assert.equal(updated.source_payload.campaign_name, original.source_payload.campaign_name); assert.equal(updated.source_payload.source, 'meta');
    assert.equal(updated.source_payload.retargeting_reservation.event_id, 'calendar-1');
    assert.equal((await db.query('select count(*)::int as n from crm_leads')).rows[0].n, 1);
    assert.equal((await db.query(`select count(*)::int as n from crm_lead_reactivation_messages where status='cancelled'`)).rows[0].n, 8);
    await db.query('select suppress_reactivation_email($1,$2)', ['booking@example.org', 'unsubscribe']);
    await db.query('select suppress_reactivation_email($1,$2)', ['BOOKING@example.org', 'unsubscribe']);
    assert.equal((await db.query('select count(*)::int as n from crm_email_suppressions')).rows[0].n, 1);
    assert.equal(await enroll(db, id, 'booking@example.org'), null);
  } finally { await db.close(); }
});

test('delivery-before-API-response is recorded by message ID; a late delivered event cannot undo a bounce', async () => {
  const db = await database();
  try {
    await enable(db); const id = await lead(db, 'delivery'); const enrollment = await enroll(db, id, 'delivery@example.org');
    const message = (await db.query('select id from crm_lead_reactivation_messages where enrollment_id=$1 order by message_number limit 1', [enrollment])).rows[0];
    await db.query('select record_reactivation_email_event($1,$2,$3,$4)', [message.id, 'provider-id', 'delivered', 'other@example.org']);
    assert.equal((await db.query('select provider_message_id from crm_lead_reactivation_messages where id=$1', [message.id])).rows[0].provider_message_id, null);
    for (const status of ['delivered', 'bounced', 'delivered']) await db.query('select record_reactivation_email_event($1,$2,$3,$4)', [message.id, 'provider-id', status, 'delivery@example.org']);
    assert.equal((await db.query('select delivery_status from crm_lead_reactivation_messages where id=$1', [message.id])).rows[0].delivery_status, 'bounced');
    assert.equal((await db.query('select stop_reason from crm_lead_reactivations where id=$1', [enrollment])).rows[0].stop_reason, 'bounced');
  } finally { await db.close(); }
});

test('a calendar booking, reply or human contact stops the worker before mail; unavailable Gmail never allows any sends', async () => {
  const db = await database(); const previous = { key: process.env.RESEND_API_KEY, webhook: process.env.RESEND_WEBHOOK_SECRET, jwt: process.env.JWT_SECRET };
  Object.assign(process.env, { RESEND_API_KEY: 'fake-key', RESEND_WEBHOOK_SECRET: 'fake-signing-key', JWT_SECRET: 'test-secret' });
  try {
    await enable(db);
    const booked = await lead(db, 'booked'), answered = await lead(db, 'answered'), contacted = await lead(db, 'contacted'), waiting = await lead(db, 'waiting');
    for (const [id, email] of [[booked, 'booked'], [answered, 'answered'], [contacted, 'contacted'], [waiting, 'waiting']]) await enroll(db, id, email + '@example.org');
    await db.query('insert into crm_lead_calls(lead_id) values($1)', [contacted]);
    const dbClient = client(db);
    const calendar = async () => [{ eventId: 'actual-calendar-booking', start: new Date(Date.now() + 86400000).toISOString(), emails: ['BOOKED@example.org'] }];
    const none = async () => { throw new Error('mailer_must_not_run'); };
    const first = await runReactivation({ db: dbClient, calendar, readToken: async () => { const error = new Error('missing'); error.code = 'gmail_read_scope_missing'; throw error; }, mailer: none });
    assert.equal(first.sent, 0); assert.equal(first.booked, 1); assert.equal(first.blocked, 'gmail_read_scope_missing');
    const outsideTurn = new Date(Date.now() - 2 * 86400000); outsideTurn.setUTCHours(0, 5, 0, 0);
    const result = await runReactivation({ db: dbClient, now: outsideTurn, calendar, readToken: async () => 'fake', reply: async ({ email }) => email === 'answered@example.org', mailer: none });
    assert.equal(result.sent, 0);
    const statuses = (await db.query('select email,status,stop_reason from crm_lead_reactivations order by email')).rows;
    assert.equal(statuses.find(row => row.email === 'answered@example.org').stop_reason, 'email_contact');
    assert.equal(statuses.find(row => row.email === 'contacted@example.org').stop_reason, 'human_contact');
    assert.equal(statuses.find(row => row.email === 'waiting@example.org').status, 'active');
  } finally {
    for (const [key, value] of Object.entries({ RESEND_API_KEY: previous.key, RESEND_WEBHOOK_SECRET: previous.webhook, JWT_SECRET: previous.jwt })) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    await db.close();
  }
});

test('the complete worker sends at most one first piece per canonical email and never increases the CRM lead count', async () => {
  const db = await database(); const saved = { RESEND_API_KEY: process.env.RESEND_API_KEY, RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET, JWT_SECRET: process.env.JWT_SECRET };
  Object.assign(process.env, { RESEND_API_KEY: 'fake', RESEND_WEBHOOK_SECRET: 'fake', JWT_SECRET: 'test-secret' });
  try {
    await enable(db); await lead(db, 'eligible'); const approved = await lead(db, 'ambiguous', { campaign_name: 'Unconfirmed' });
    await db.query('update crm_reactivation_settings set confirmed_holanda_lead_ids=$1', [[approved]]);
    const duplicate = await lead(db, 'duplicate'); await db.query(`update crm_leads set email='eligible@example.org' where id=$1`, [duplicate]);
    const messages = [];
    // The database clock is real; choose a past Madrid 20:00 so SQL due checks
    // remain independent of the timezone/time at which CI runs this test.
    const day = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
    const now = new Date(day + 'T19:00:00Z');
    // Adapt the UTC offset for summer without changing the actual scheduler rule.
    const hour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hourCycle: 'h23' }).format(now);
    if (hour === '21') now.setUTCHours(18);
    const options = { now, db: client(db), calendar: async () => [], readToken: async () => 'fake', reply: async () => false, mailer: async payload => { messages.push(payload); return { sent: true, id: 'provider-1' }; } };
    const first = await runReactivation(options); const second = await runReactivation(options);
    assert.equal(first.sent, 2); assert.equal(second.sent, 0); assert.equal(messages.length, 2);
    assert.equal(messages[0].from, 'Project Robin <no-reply@project-robin.com>'); assert.equal(messages[0].reply_to, 'hello@project-robin.com');
    assert.match(messages[0].idempotencyKey, new RegExp(`^${CAMPAIGN_ID}/.+/1$`));
    assert.equal(messages[0].tags[0].value, CAMPAIGN_ID);
    assert.equal((await db.query('select count(*)::int as n from crm_leads')).rows[0].n, 3);
    assert.equal((await db.query(`select count(*)::int as n from crm_lead_reactivation_messages where sent_at is not null`)).rows[0].n, 2);
  } finally { for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } await db.close(); }
});
