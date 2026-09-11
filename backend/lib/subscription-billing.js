const { createClient } = require('@supabase/supabase-js');

const HOLDED_BASE = 'https://api.holded.com/api/v2';
const EU_COUNTRIES = new Set([
  'alemania','germany','de','austria','at','belgica','belgium','be','bulgaria','bg',
  'chipre','cyprus','cy','croacia','croatia','hr','dinamarca','denmark','dk',
  'eslovaquia','slovakia','sk','eslovenia','slovenia','si','espana','spain','es',
  'estonia','ee','finlandia','finland','fi','francia','france','fr','grecia','greece','gr',
  'hungria','hungary','hu','irlanda','ireland','ie','italia','italy','it','letonia','latvia','lv',
  'lituania','lithuania','lt','luxemburgo','luxembourg','lu','malta','mt',
  'paises bajos','holanda','netherlands','nl','polonia','poland','pl','portugal','pt',
  'republica checa','chequia','czech republic','czechia','cz','rumania','romania','ro',
  'suecia','sweden','se',
]);
let portalClient;

function norm(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
}
function normEmail(value) { return norm(value); }
function normPhone(value) { return String(value || '').replace(/\D/g, '').replace(/^00/, ''); }
function normTaxId(value) { return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function fullName(value) { return norm([value && value.nombre, value && value.apellidos].filter(Boolean).join(' ')); }
function contractClient(user) { return (user && user.contract_data && user.contract_data.cliente) || {}; }

function getPortalSupabase() {
  if (portalClient) return portalClient;
  const url = process.env.PORTAL_SUPABASE_URL;
  const key = process.env.PORTAL_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  portalClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return portalClient;
}

function profileValues(subscriber) {
  const p = subscriber.profile_extra || {};
  return {
    emails: [subscriber.email, p.email_facturacion, p.billing_email, p.parent_email, p.tutor_email].map(normEmail).filter(Boolean),
    phones: [p.telefono, p.phone, p.billing_phone, p.parent_phone, p.tutor_phone].map(normPhone).filter(Boolean),
    taxIds: [p.dni, p.nif, p.tax_id, p.billing_tax_id].map(normTaxId).filter(Boolean),
    names: [fullName(subscriber), norm(p.billing_name), norm(p.parent_name), norm(p.tutor_name)].filter(Boolean),
  };
}

function candidateValues(user) {
  const c = contractClient(user);
  const serialized = user.contract_data || {};
  return {
    emails: [user.email, c.email, c.correo, serialized.email_cliente, serialized.correo_cliente].map(normEmail).filter(Boolean),
    phones: [user.telefono, user.phone, c.telefono, c.phone, serialized.telefono_cliente].map(normPhone).filter(Boolean),
    taxIds: [c.dni, c.nif, user.dni_numero].map(normTaxId).filter(Boolean),
    studentName: fullName(user),
    clientName: norm(c.nombre),
  };
}

function scoreCandidate(subscriber, user) {
  const s = profileValues(subscriber);
  const u = candidateValues(user);
  const reasons = [];
  const intersects = (a, b) => a.some((x) => x && b.includes(x));
  if (intersects(s.emails, u.emails)) reasons.push({ key: 'email', points: 100 });
  if (intersects(s.taxIds, u.taxIds)) reasons.push({ key: 'tax_id', points: 100 });
  if (intersects(s.phones, u.phones)) reasons.push({ key: 'phone', points: 65 });
  if (s.names.includes(u.studentName)) reasons.push({ key: 'student_name', points: 35 });
  if (s.names.includes(u.clientName)) reasons.push({ key: 'contract_client_name', points: 45 });
  return { score: reasons.reduce((n, r) => n + r.points, 0), reasons };
}

async function findPortalMatch(subscriber) {
  const portal = getPortalSupabase();
  if (!portal) return { ok: false, reason: 'portal_not_configured' };
  if (subscriber.portal_user_id) {
    const { data, error } = await portal.from('users').select('id,lead_id,email,nombre,apellidos,dni_numero,direccion,tipo,origin,pais,holded_contact_id,contract_data').eq('id', subscriber.portal_user_id).maybeSingle();
    if (!error && data) return { ok: true, user: data, method: 'saved_link', score: 1000 };
  }
  const { data, error } = await portal.from('users').select('id,lead_id,email,nombre,apellidos,dni_numero,direccion,tipo,origin,pais,holded_contact_id,contract_data').limit(5000);
  if (error) throw error;
  const ranked = (data || []).map((user) => ({ user, ...scoreCandidate(subscriber, user) })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  if (!ranked.length) return { ok: false, reason: 'no_candidates' };
  const best = ranked[0];
  const uniqueCompleteContractName = best.score === 45
    && best.reasons.some((r) => r.key === 'contract_client_name')
    && candidateValues(best.user).clientName.split(' ').length >= 2
    && candidateValues(best.user).clientName.length >= 8
    && (!ranked[1] || ranked[1].score < best.score);
  const safe = best.score >= 100 || (best.score >= 80 && (!ranked[1] || ranked[1].score < best.score)) || uniqueCompleteContractName;
  if (!safe || (ranked[1] && ranked[1].score === best.score)) {
    return { ok: false, reason: 'ambiguous', candidates: ranked.slice(0, 5).map((x) => ({ portal_user_id: x.user.id, score: x.score, reasons: x.reasons.map((r) => r.key) })) };
  }
  return { ok: true, user: best.user, method: best.reasons.map((r) => r.key).join('+'), score: best.score };
}

async function holdedFetch(path, body) {
  const token = String(process.env.HOLDED_API_PAT || '').trim();
  if (!token) throw new Error('holded_not_configured');
  const response = await fetch(HOLDED_BASE + path, { method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch (_) { data = { raw: text }; }
  if (!response.ok) { const error = new Error(`holded_http_${response.status}`); error.detail = data; throw error; }
  return data;
}

async function ensureHoldedContact(portal, subscriber) {
  if (portal.holded_contact_id) return portal.holded_contact_id;
  const client = contractClient(portal);
  const name = String(client.nombre || fullName(portal) || 'Cliente').trim();
  const code = normTaxId(client.dni || client.nif || portal.dni_numero);
  if (!code) throw new Error('billing_tax_id_missing');
  const result = await holdedFetch('/contacts', { name, code, email: portal.email || subscriber.email || '', type: 'client', is_person: true, bill_address: { address: portal.direccion || '', country: norm(portal.origin) === 'otros' && portal.pais ? portal.pais : 'España' } });
  const id = result && (result.id || (result.contact && result.contact.id));
  if (!id) throw new Error('holded_contact_no_id');
  return id;
}

async function createHoldedInvoice(portal, contactId, invoice) {
  const gross = Number(invoice.amount || 0);
  const outsideEU = norm(portal.origin) === 'otros' && portal.pais && !EU_COUNTRIES.has(norm(portal.pais));
  const rate = outsideEU ? 0 : 21;
  const net = Math.round((gross / (1 + rate / 100)) * 100) / 100;
  const date = new Date((invoice.paid_at || new Date().toISOString())).toISOString().slice(0, 10);
  const account = process.env.HOLDED_ACCOUNT_SUBSCRIPTIONS || process.env.HOLDED_ACCOUNT_GENERAL || '70500001';
  const result = await holdedFetch('/invoices', { contact_id: contactId, date, due_date: date, currency: String(invoice.currency || 'eur').toLowerCase(), notes: `The Robin Plan · Stripe ${invoice.stripe_invoice_id}`, items: [{ name: 'Suscripción The Robin Plan', desc: '', units: 1, price: net, taxes: rate ? [`s_iva_${rate}`] : [], account }] });
  const id = result && (result.id || result.invoice_id || (result.invoice && result.invoice.id));
  if (!id) throw new Error('holded_invoice_no_id');
  let number = null;
  try { const doc = await holdedFetch(`/invoices/${encodeURIComponent(id)}`); number = doc && (doc.document_number || doc.docNumber); } catch (_) {}
  return { id, number, taxRate: rate };
}

async function processStripeInvoice(sb, stripeInvoice) {
  const stripeId = stripeInvoice.id;
  if (!stripeId) return { ok: false, reason: 'invoice_id_missing' };
  const subscriptionId = typeof stripeInvoice.subscription === 'string' ? stripeInvoice.subscription : stripeInvoice.subscription && stripeInvoice.subscription.id;
  const customerId = typeof stripeInvoice.customer === 'string' ? stripeInvoice.customer : stripeInvoice.customer && stripeInvoice.customer.id;
  const metadataUserId = stripeInvoice.subscription_details && stripeInvoice.subscription_details.metadata && stripeInvoice.subscription_details.metadata.user_id;
  let query = sb.from('subscribers').select('id,email,nombre,apellidos,profile_extra,portal_user_id,holded_contact_id,billing_link_method,stripe_customer_id,stripe_subscription_id');
  query = metadataUserId ? query.eq('id', metadataUserId) : subscriptionId ? query.eq('stripe_subscription_id', subscriptionId) : query.eq('stripe_customer_id', customerId);
  const { data: subscribers, error: subscriberError } = await query.limit(2);
  if (subscriberError) throw subscriberError;
  const subscriber = subscribers && subscribers[0];
  const row = { subscriber_id: subscriber ? subscriber.id : null, stripe_invoice_id: stripeId, stripe_customer_id: customerId || null, stripe_subscription_id: subscriptionId || null, amount: Number(stripeInvoice.amount_paid || stripeInvoice.total || 0) / 100, currency: stripeInvoice.currency || 'eur', paid_at: stripeInvoice.status_transitions && stripeInvoice.status_transitions.paid_at ? new Date(stripeInvoice.status_transitions.paid_at * 1000).toISOString() : new Date().toISOString(), status: stripeInvoice.status || 'paid', updated_at: new Date().toISOString() };
  const { data: saved, error: upsertError } = await sb.from('subscription_invoices').upsert(row, { onConflict: 'stripe_invoice_id', ignoreDuplicates: false }).select('*').single();
  if (upsertError) throw upsertError;
  if (saved.holded_invoice_id) return { ok: true, already: true, invoice_id: saved.holded_invoice_id };
  const { data: claimed, error: claimError } = await sb.from('subscription_invoices')
    .update({ billing_status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', saved.id).in('billing_status', ['pending', 'unmatched', 'failed']).select('id');
  if (claimError) throw claimError;
  if (!claimed || !claimed.length) return { ok: true, already: true, processing: true };
  if (!subscriber) { await sb.from('subscription_invoices').update({ billing_status: 'unmatched', last_error: 'subscriber_not_found' }).eq('id', saved.id); return { ok: false, reason: 'subscriber_not_found' }; }
  const match = await findPortalMatch(subscriber);
  if (!match.ok) { await sb.from('subscription_invoices').update({ billing_status: 'unmatched', match_details: { reason: match.reason, candidates: match.candidates || [] }, last_error: match.reason }).eq('id', saved.id); return match; }
  try {
    const contactId = subscriber.holded_contact_id || await ensureHoldedContact(match.user, subscriber);
    const created = await createHoldedInvoice(match.user, contactId, saved);
    await sb.from('subscription_invoices').update({ billing_status: 'invoiced', portal_user_id: match.user.id, holded_contact_id: contactId, holded_invoice_id: created.id, holded_invoice_number: created.number, match_method: match.method, match_details: { score: match.score, tax_rate: created.taxRate }, last_error: null, updated_at: new Date().toISOString() }).eq('id', saved.id);
    await sb.from('subscribers').update({ portal_user_id: match.user.id, holded_contact_id: contactId, billing_link_method: match.method, billing_linked_at: new Date().toISOString() }).eq('id', subscriber.id);
    return { ok: true, invoice_id: created.id, match_method: match.method };
  } catch (error) {
    await sb.from('subscription_invoices').update({ billing_status: 'failed', portal_user_id: match.user.id, match_method: match.method, last_error: error.message, updated_at: new Date().toISOString() }).eq('id', saved.id);
    return { ok: false, reason: error.message };
  }
}

module.exports = { processStripeInvoice, findPortalMatch, scoreCandidate, normEmail, normPhone, normTaxId };
