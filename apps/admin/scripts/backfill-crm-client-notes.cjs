#!/usr/bin/env node
// Reconciles existing CRM clients with the admin-only notes table in each portal.
const { getAdminSupabase } = require('../lib/admin-supabase');
const { getSupabase } = require('../lib/supabase');
const { getJuniorSupabase } = require('../lib/junior-supabase');
const { getSubscriptionsSupabase } = require('../lib/subscriptions-supabase');
const { loadCrmClientNotes } = require('../lib/crm-client-notes');
const fs = require('node:fs');
const path = require('node:path');

const envFile = path.resolve(__dirname, '../.env');
if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(envFile);

const apply = process.argv.includes('--apply');

async function allRows(db, table, fields, configure = (query) => query) {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await configure(db.from(table).select(fields)).range(offset, offset + 499);
    if (error) throw error;
    rows.push(...(data || []));
    if ((data || []).length < 500) return rows;
  }
}

async function main() {
  const crm = getAdminSupabase();
  const leads = (await allRows(crm, 'crm_leads', 'id,notion_numeric_id,email,is_test,comment,body_text,source_created_at,source_payload,crm_stage'))
    .filter((lead) => !lead.is_test && lead.source_payload?.simulated !== true);
  const leadById = new Map(leads.map((lead) => [String(lead.notion_numeric_id || lead.id), lead]));
  const leadByEmail = new Map();
  for (const lead of leads) {
    const email = String(lead.email || '').trim().toLowerCase();
    if (!email) continue;
    leadByEmail.set(email, leadByEmail.has(email) ? null : lead);
  }
  const notesByLead = new Map();
  const targets = [
    ['alumno', getSupabase(), 'users'],
    ['robinjr', getJuniorSupabase(), 'users'],
    ['community', getSubscriptionsSupabase(), 'subscribers'],
  ];
  for (const [portal, db, table] of targets) {
    const users = await allRows(db, table, 'id,lead_id,email', (query) => query.not('lead_id', 'is', null));
    let matchedById = 0;
    let matchedByEmail = 0;
    for (const user of users) {
      const byId = leadById.get(String(user.lead_id));
      const lead = byId || leadByEmail.get(String(user.email || '').trim().toLowerCase());
      if (!lead) continue;
      if (byId) matchedById++;
      else matchedByEmail++;
      let notes = notesByLead.get(lead.id);
      if (!notes) {
        notes = await loadCrmClientNotes(crm, lead);
        notesByLead.set(lead.id, notes);
      }
      if (apply) {
        const { error } = await db.from('crm_client_notes').upsert({ user_id: user.id, lead_id: String(lead.notion_numeric_id || lead.id), notes, synced_at: new Date().toISOString() }, { onConflict: 'user_id' });
        if (error) throw error;
      }
    }
    console.log(`${portal}: ${matchedById} por lead_id, ${matchedByEmail} por correo único ${apply ? 'actualizadas' : 'encontradas'} de ${users.length} cuentas con lead_id`);
  }
  if (apply) {
    for (const lead of leads) {
      const notes = notesByLead.get(lead.id);
      if (!notes) continue;
      const { error } = await crm.from('crm_leads').update({ source_payload: { ...(lead.source_payload || {}), crm_notes: notes } }).eq('id', lead.id);
      if (error) throw error;
    }
  }
  if (!apply) console.log('Vista previa. Ejecuta con --apply para escribir las notas.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
