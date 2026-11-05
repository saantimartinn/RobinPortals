// A green check describes exactly the operation it ran. Mutating release checks
// create uniquely marked fixture accounts and delete only their own records.
const { createClient } = require('@supabase/supabase-js');
const { execFile } = require('node:child_process');
const { resolve } = require('node:path');
const { runInApp } = require('../../../site/app-env.cjs');
const fixture = require('./release-dni-fixture.cjs');
const portalOcr = require('../../portal/lib/ocr');
const jrOcr = require('../../robinjr/lib/ocr');
const portalAuth = require('../../portal/lib/auth');
const jrAuth = require('../../robinjr/lib/auth');
const communityAuth = require('../../community/backend/lib/auth');
const { handler: portalClientsHandler } = require('../../portal/netlify/functions/admin-clients-list');
const { handler: jrClientsHandler } = require('../../robinjr/netlify/functions/admin-clients-list');
const { handler: communityDataHandler } = require('../../community/backend/functions/sub-admin-data');
const { handler: adminChatHandler } = require('../../portal/netlify/functions/admin-chat');
const { handler: bookingAvailabilityHandler } = require('../../portal/netlify/functions/bookings-availability');
const portalSuggestions = require('../../portal/lib/career-suggestions');
const jrSuggestions = require('../../robinjr/lib/career-suggestions');
const portalFinancial = require('../../portal/shared/financial-config.cjs');
const jrFinancial = require('../../robinjr/shared/financial-config.cjs');
const liveFlow = require('./release-live-flow.cjs');
const sandbox = require('./release-payment-sandbox.cjs');
const { getGmailStatus } = require('./google-gmail');
const { holdedFetch } = require('./holded/client');
const { randomUUID } = require('node:crypto');
const { ingestCrmLead } = require('./crm-lead-ingest');
const { passwordPolicy } = require('../shared/password-policy.cjs');
const { signSession, COOKIE_NAME } = require('./auth');
const { handler: crmLeadCallsHandler } = require('../netlify/functions/admin-crm-lead-calls');
const { handler: crmLeadsHandler } = require('../netlify/functions/admin-crm-leads');
const { handler: crmFutureLeadsHandler } = require('../netlify/functions/admin-crm-future-leads');
const { handler: salesDashboardHandler } = require('../netlify/functions/admin-sales-dashboard');
const { handler: adminUsersHandler } = require('../netlify/functions/admin-users');
const { handler: adminDashboardHandler } = require('../netlify/functions/admin-dashboard');

const CHECKS = [
  { id: 'code_suite', group: 'Código', title: 'Pruebas automatizadas', description: 'En local ejecuta la suite; en producción verifica que el despliegue publicó una suite aprobada para ese commit.', runnable: true },
  { id: 'frontend_build', group: 'Código', title: 'Compilación de portales', description: 'En local compila las cuatro interfaces; en producción verifica el build aprobado y los archivos publicados.', runnable: true },
  { id: 'login_admin', group: 'Acceso y sesión', title: 'Sesión de admin', description: 'Valida la sesión actual contra la cuenta administrativa.', runnable: true },
  { id: 'login_credentials', group: 'Acceso y sesión', title: 'Login con credenciales', description: 'Crea una cuenta TEST en Alumno, inicia sesión y la elimina.', runnable: true },
  { id: 'onboarding_portal', group: 'Alta y onboarding', title: 'Preparación · Alumno', description: 'Comprueba los campos y el plan de cuotas del onboarding.', runnable: true },
  { id: 'onboarding_jr', group: 'Alta y onboarding', title: 'Preparación · Robin Jr', description: 'Comprueba los campos y el plan de cuotas del onboarding.', runnable: true },
  { id: 'dni_portal', group: 'Análisis del DNI', title: 'OCR · Alumno', description: 'Envía un DNI ficticio al OCR real del Portal del Alumno.', runnable: true },
  { id: 'dni_jr', group: 'Análisis del DNI', title: 'OCR · Robin Jr', description: 'Envía el mismo DNI ficticio al OCR real de Robin Jr.', runnable: true },
  { id: 'profile_classification', group: 'Perfil y clasificación', title: 'Datos de perfil', description: 'Valida los campos de clasificación en Alumno y Robin Jr.', runnable: true },
  { id: 'recommender_portal', group: 'Recomendación de carreras', title: 'Carreras · Alumno', description: 'Genera 10 carreras con la IA real para un perfil ficticio.', runnable: true },
  { id: 'recommender_jr', group: 'Recomendación de carreras', title: 'Carreras · Robin Jr', description: 'Genera 10 carreras con la IA real para un perfil ficticio.', runnable: true },
  { id: 'holded_demo_invoice', group: 'Facturas', title: 'Facturas · Holded demo', description: 'Comprueba facturas ficticias en las subcuentas de Alumno, Jr y Community.', runnable: true },
  { id: 'payment_portal', group: 'Pagos', title: 'Configuración · Alumno', description: 'Valida Revolut y la cuenta de ingresos de Holded.', runnable: true },
  { id: 'payment_jr', group: 'Pagos', title: 'Configuración · Robin Jr', description: 'Valida la clave compartida de Revolut y la cuenta de Holded.', runnable: true },
  { id: 'payment_community', group: 'Pagos', title: 'Configuración · Community', description: 'Valida la clave compartida de Revolut y la cuenta de Holded.', runnable: true },
  { id: 'payment_sandbox_order', group: 'Pagos', title: 'Orden · Revolut sandbox', description: 'Crea, consulta y cancela una orden de 1 € con la clave de pruebas.', runnable: true },
  { id: 'student_sync', group: 'Sincronización del alumno', title: 'Drive y sincronización', description: 'Valida las columnas y el registro de sincronización de Alumno y Robin Jr.', runnable: true },
  { id: 'lead_ingest', group: 'Entrada de leads', title: 'Captación web y Meta', description: 'Comprueba los campos de origen y deduplicación de leads.', runnable: true },
  { id: 'crm_management', group: 'Gestión CRM', title: 'Lead e historial CRM', description: 'Crea un lead TEST, registra un mensaje y comprueba que aparece en su historial.', runnable: true },
  { id: 'lost_future', group: 'Lost y próximos cursos', title: 'Lost y futuros', description: 'Marca un lead TEST como Lost y lo traslada a próximos cursos.', runnable: true },
  { id: 'lead_to_client', group: 'Lead to client', title: 'Preparación de conversión', description: 'Comprueba las bases, las notas comerciales y la contraseña inicial de los tres destinos.', runnable: true },
  { id: 'crm_email', group: 'Correos desde el CRM', title: 'Plantillas y Gmail', description: 'Valida plantillas, borradores y permiso de envío de Gmail sin enviar correos.', runnable: true },
  { id: 'admin_users', group: 'Usuarios administradores', title: 'Acceso de administradores', description: 'Comprueba el listado de admins y rechaza una sesión ausente.', runnable: true },
  { id: 'dashboard_reports', group: 'Dashboard e informes', title: 'Informe comercial', description: 'Genera el dashboard comercial real para una sesión de administrador.', runnable: true },
  { id: 'meta_data', group: 'Datos Meta', title: 'Campañas de Meta', description: 'Consulta la cuenta y el endpoint real de campañas de Meta en modo lectura.', runnable: true },
  { id: 'holded_data', group: 'Datos Holded', title: 'Conexión con Holded', description: 'Consulta el catálogo de impuestos de Holded en modo lectura.', runnable: true },
  { id: 'clients_portal', group: 'Datos Portal', title: 'Clientes · Alumno', description: 'Comprueba el listado real de clientes para un administrador de Alumno.', runnable: true },
  { id: 'clients_jr', group: 'Datos Portal', title: 'Clientes · Robin Jr', description: 'Comprueba el listado real de clientes para un administrador de Robin Jr.', runnable: true },
  { id: 'clients_community', group: 'Datos Portal', title: 'Clientes · Community', description: 'Comprueba el listado real de usuarios del panel Community.', runnable: true },
  { id: 'clients_crm', group: 'Datos Portal', title: 'Leads · CRM', description: 'Comprueba el listado real de leads del CRM.', runnable: true },
  { id: 'database_separation', group: 'Datos Portal', title: 'Bases separadas', description: 'Comprueba que los tres portales usan bases distintas.', runnable: true },
  { id: 'portal_data', group: 'Datos Portal', title: 'Datos del alumno', description: 'Genera el dashboard real de alumnos, pagos y reservas para un admin.', runnable: true },
  { id: 'web_analytics', group: 'Analítica web', title: 'Eventos y sesiones web', description: 'Consulta web_stats y exige sesiones recientes con consentimiento.', runnable: true },
  { id: 'ai_history', group: 'Historial IA', title: 'Conversaciones y estado', description: 'Guarda un mensaje TEST y comprueba que el asesor puede leerlo.', runnable: true },
  { id: 'call_booking', group: 'Reserva de llamadas', title: 'Disponibilidad de llamadas', description: 'Consulta Google Calendar para una cuenta TEST asignada a un asesor.', runnable: true },
  { id: 'onboarding_end_to_end', group: 'Recorrido completo', title: 'Onboarding previo al pago', description: 'Recorre origen, guardado del DNI, contrato y perfil con cuentas TEST de Alumno y Robin Jr.', runnable: true },
  { id: 'payment_sandbox', group: 'Recorrido completo', title: 'Pago sandbox completo', description: 'Checkout guiado, webhook firmado, cliente pagado y factura en Holded demo.', runnable: true },
];

const STRUCTURAL_CHECKS = new Set([
  'onboarding_portal', 'onboarding_jr', 'profile_classification', 'student_sync',
  'lead_to_client',
  'payment_portal', 'payment_jr', 'payment_community',
  'database_separation',
]);
for (const check of CHECKS) check.coverage = STRUCTURAL_CHECKS.has(check.id) ? 'structure' : 'operation';

function runLocalCommand(args, { isolatedTests = false } = {}) {
  if (process.env.ROBIN_LOCAL_TESTS !== 'true') throw new Error('Este test solo puede ejecutarse en el servidor local');
  const root = resolve(__dirname, '../../..');
  return new Promise((resolveResult, reject) => {
    const env = isolatedTests
      ? { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, LANG: process.env.LANG, ROBIN_SITE_URL: 'https://project-robin.com' }
      : { ...process.env, ROBIN_SITE_URL: 'https://project-robin.com', URL: 'https://project-robin.com' };
    execFile(process.execPath, args, {
      cwd: root, timeout: 120000, maxBuffer: 8 * 1024 * 1024,
      env,
    }, (error, stdout, stderr) => {
      if (error) {
        const output = String(stdout || stderr || error.message);
        const failures = output.split(/\r?\n/).filter((line) => /^\s*(?:✖|not ok\b)/.test(line)).slice(0, 5);
        return reject(new Error(failures.length ? failures.join(' · ') : output.slice(-700)));
      }
      resolveResult(stdout);
    });
  });
}

function publishedBuildProof() {
  let proof;
  try { proof = JSON.parse(process.env.ROBIN_RELEASE_BUILD_PROOF || 'null'); } catch (_) { /* invalid proof */ }
  const commit = String(process.env.ROBIN_RELEASE_COMMIT_REF || process.env.COMMIT_REF || '');
  if (!proof?.commit || proof.commit !== commit || !/^[a-f0-9]{64}$/.test(proof.config_sha256 || '')
    || !Array.isArray(proof.apps) || proof.apps.length !== 4) {
    throw new Error('Este despliegue no incluye una prueba de compilación y suite aprobada para su commit');
  }
  return proof;
}

async function checkPublishedFrontends() {
  const proof = publishedBuildProof();
  const origin = process.env.DEPLOY_URL || process.env.URL || 'https://project-robin.com';
  for (const path of proof.apps) {
    const pageUrl = new URL(`${path}/`, origin);
    const response = await fetch(pageUrl, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`${path}: la interfaz publicada respondió HTTP ${response.status}`);
    const html = await response.text();
    const script = html.match(/<script\b[^>]*\bsrc=["']([^"']+\.js(?:\?[^"']*)?)["']/i)?.[1];
    if (!script) throw new Error(`${path}: no se encontró el JavaScript de la interfaz publicada`);
    const asset = await fetch(new URL(script, response.url), { signal: AbortSignal.timeout(15000) });
    if (!asset.ok || !(asset.headers.get('content-type') || '').includes('javascript')) {
      throw new Error(`${path}: el JavaScript publicado no está disponible (HTTP ${asset.status})`);
    }
  }
  return `Build y configuración aprobados para ${proof.commit.slice(0, 8)}; las cuatro interfaces y sus archivos JavaScript responden desde el despliegue publicado.`;
}

function appDb(app, table) {
  return runInApp(app, () => {
    const url = app === 'admin' ? process.env.ADMIN_SUPABASE_URL : process.env.SUPABASE_URL;
    const key = app === 'admin' ? process.env.ADMIN_SUPABASE_SERVICE_ROLE_KEY : process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error(`${app}: base de datos no configurada`);
    return { client: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }), table, url };
  });
}

async function readCount(app, table, columns = 'id') {
  const { client, url } = appDb(app, table);
  const { count, error } = await client.from(table).select(columns, { count: 'exact', head: true });
  if (error) throw new Error(`${app}: ${error.message}`);
  return { count: count ?? 0, url };
}

async function checkClients(app) {
  const table = app === 'community' ? 'subscribers' : app === 'admin' ? 'crm_leads' : 'users';
  const { count } = await readCount(app, table);
  return `Base de datos accesible: ${count} registros.`;
}

async function checkClientList(app, admin) {
  await checkClients(app);
  if (app === 'admin') {
    const response = await crmLeadsHandler({
      httpMethod: 'GET', headers: { cookie: `${COOKIE_NAME}=${signSession(admin)}` },
    });
    const result = JSON.parse(response.body || '{}');
    if (response.statusCode !== 200 || !Array.isArray(result.leads)) throw new Error(`El CRM no pudo listar los leads (HTTP ${response.statusCode})`);
    return `La función real del CRM devolvió ${result.leads.length} leads visibles.`;
  }
  if (app === 'portal' || app === 'robinjr') {
    const auth = app === 'portal' ? portalAuth : jrAuth;
    const handler = app === 'portal' ? portalClientsHandler : jrClientsHandler;
    const token = runInApp(app, () => auth.signSession(app === 'robinjr' ? { ...admin, auth_source: 'application_admin' } : admin));
    const response = await runInApp(app, () => handler({
      httpMethod: 'GET', headers: { cookie: `${auth.COOKIE_NAME}=${token}` },
    }));
    const result = JSON.parse(response.body || '{}');
    if (response.statusCode !== 200 || !Array.isArray(result.clients)) throw new Error(`${app}: el panel no pudo listar clientes (HTTP ${response.statusCode})`);
    return `${app}: la función real devolvió ${result.clients.length} clientes visibles para un administrador.`;
  }
  const communityDb = appDb('community', 'subscribers').client;
  const { data: communityAdmin, error } = await communityDb.from('subscribers')
    .select('id,lead_id,username,role').eq('role', 'subscriber_admin').limit(1).single();
  if (error || !communityAdmin) throw new Error('Community no tiene una cuenta administrativa para probar el listado');
  const portalToken = runInApp('portal', () => portalAuth.signSession(admin));
  const communityToken = runInApp('community', () => communityAuth.signSession({ ...communityAdmin, auth_source: 'application_admin' }));
  const response = await runInApp('community', () => communityDataHandler({
    httpMethod: 'GET', headers: { cookie: `${portalAuth.COOKIE_NAME}=${portalToken}; ${communityAuth.COOKIE_NAME}=${communityToken}` },
  }));
  const result = JSON.parse(response.body || '{}');
  if (response.statusCode !== 200 || !Array.isArray(result.users)) throw new Error(`Community no pudo listar usuarios (HTTP ${response.statusCode})`);
  return `Community: la función real devolvió ${result.users.length} usuarios visibles para un administrador.`;
}

async function checkDatabaseSeparation() {
  const configs = ['portal', 'robinjr', 'community'].map((app) => appDb(app, app === 'community' ? 'subscribers' : 'users'));
  if (new Set(configs.map((config) => config.url)).size !== 3) throw new Error('Las tres plataformas no apuntan a bases de datos distintas');
  return 'Alumno, Robin Jr y Community usan tres bases de datos distintas.';
}

async function checkOnboardingRules(app) {
  const requiredColumns = 'id,requires_onboarding,dni_completed,profile_completed,contract_signed,pago_completed';
  await readCount(app, 'users', requiredColumns);
  const config = app === 'portal' ? portalFinancial : jrFinancial;
  const plan = config.applicationPlanForUser({ email: 'prueba@example.invalid', tipo: 'general', num_carreras: 1 });
  if (!Array.isArray(plan) || !plan.length || plan.some((row) => !Number.isFinite(row.amount) || row.amount <= 0)) {
    throw new Error(`${app}: plan de cuotas no válido`);
  }
  return `Campos del onboarding y ${plan.length} cuotas válidas.`;
}

function paymentSettings(app) {
  return runInApp(app, () => ({
    base: process.env.REVOLUT_API_BASE,
    key: process.env.REVOLUT_MERCHANT_SECRET_KEY,
    holdedKey: process.env.HOLDED_API_PAT,
    account: process.env[app === 'portal' ? 'HOLDED_ACCOUNT_GENERAL' : app === 'robinjr' ? 'HOLDED_ACCOUNT_ROBINJR' : 'HOLDED_ACCOUNT_SUBSCRIPTIONS'],
  }));
}

async function checkPaymentConfig(app) {
  const portal = paymentSettings('portal');
  const target = paymentSettings(app);
  if (!target.base || !target.key || !target.holdedKey || !target.account) throw new Error('Falta la configuración de Revolut o Holded');
  if (app !== 'portal' && (target.base !== portal.base || target.key !== portal.key)) throw new Error('Revolut no comparte la cuenta del Portal del Alumno');
  if (process.env.CONTEXT === 'production' && target.base.includes('sandbox')) throw new Error('Revolut apunta a sandbox en producción');
  return 'Credenciales y subcuenta contable configuradas. No se ha realizado ningún cobro.';
}

async function checkDni(app) {
  const ocr = app === 'portal' ? portalOcr : jrOcr;
  const fields = await runInApp(app, () => ocr.extractDniFields({
    anverso: { base64: fixture.front, mimetype: 'image/png' },
    reverso: { base64: fixture.back, mimetype: 'image/png' },
    docType: 'dni',
  }));
  const valid = fields.nombre.toUpperCase() === 'ALEX'
    && fields.apellidos.toUpperCase().includes('PRUEBA')
    && fields.fecha_nacimiento === '2008-03-12'
    && fields.dni_numero === '00000000T'
    && fields.direccion.toUpperCase().includes('CALLE DE PRUEBA');
  if (!valid) throw new Error('El OCR respondió, pero no extrajo todos los campos esperados del DNI ficticio');
  return 'OCR real: nombre, apellidos, fecha, DNI y dirección extraídos correctamente.';
}

async function checkRecommender(app) {
  const recommender = app === 'portal' ? portalSuggestions : jrSuggestions;
  const syntheticUser = {
    nombre: 'Alex', intereses: ['tecnologia_y_programacion', 'ingenierias'],
    questionnaire: {
      blocks: [{ title: 'Perfil de prueba', items: [{ q: 'Intereses', a: 'Programación, matemáticas e ingeniería' }] }],
      signals: { rasgos: ['analitico', 'curioso'], asignaturas_fav: ['matematicas', 'informatica'], estilo_aprendizaje: 7, valora: ['innovacion'] },
    },
  };
  const result = await runInApp(app, () => recommender.generateSuggestions(syntheticUser, []));
  const items = result.items || [];
  if (result.source !== 'ai' || items.length !== 10 || new Set(items.map((item) => item.program_code)).size !== 10) {
    throw new Error(`El recomendador no devolvió 10 carreras únicas desde la IA (origen: ${result.source || 'desconocido'})`);
  }
  return `IA real: 10 carreras únicas generadas${result.model ? ` con ${result.model}` : ''}.`;
}

async function checkSchemaSet(specs) {
  const counts = await Promise.all(specs.map(async ([app, table, columns]) => {
    const { count } = await readCount(app, table, columns);
    return `${app}.${table}: ${count}`;
  }));
  return `Estructura y lectura correctas: ${counts.join(' · ')}.`;
}

async function checkLeadToClient() {
  const schema = await checkSchemaSet(DOMAIN_SCHEMAS.lead_to_client);
  const password = process.env.CRM_BOOTSTRAP_PASSWORD || '';
  if (!passwordPolicy(password).ok) throw new Error('La contraseña inicial de las cuentas creadas desde CRM no cumple la política');
  return `${schema} Contraseña inicial válida para las tres cuentas de destino.`;
}

const DOMAIN_SCHEMAS = {
  profile_classification: [['portal', 'users', 'id,tipo,origin,has_eu_id,num_carreras,application_phase,questionnaire'], ['robinjr', 'users', 'id,tipo,origin,has_eu_id,num_carreras,application_phase,questionnaire']],
  student_sync: [['portal', 'users', 'id,lead_id,gdrive_folders'], ['robinjr', 'users', 'id,lead_id,gdrive_folders'], ['portal', 'webhook_log', 'id,source,result']],
  lead_ingest: [['admin', 'crm_leads', 'id,source_payload,source_created_at,email,phone'], ['admin', 'crm_future_leads', 'id,source,lead_snapshot']],
  crm_management: [['admin', 'crm_leads', 'id,crm_stage,owner_names'], ['admin', 'crm_lead_calls', 'id,lead_id,kind,duration_minutes'], ['admin', 'crm_lead_events', 'id,lead_id,event_type']],
  lost_future: [['admin', 'crm_leads', 'id,crm_stage,lost_at'], ['admin', 'crm_future_leads', 'id,academic_year,original_lead_id']],
  lead_to_client: [
    ['admin', 'crm_leads', 'id,crm_stage,source_payload'],
    ['portal', 'users', 'id,lead_id'], ['portal', 'crm_client_notes', 'user_id,lead_id,notes,synced_at'],
    ['robinjr', 'users', 'id,lead_id'], ['robinjr', 'crm_client_notes', 'user_id,lead_id,notes,synced_at'],
    ['community', 'subscribers', 'id,email,lead_id'], ['community', 'crm_client_notes', 'user_id,lead_id,notes,synced_at'],
  ],
  admin_users: [['portal', 'users', 'id,email,role'], ['admin', 'crm_users', 'id,role,active']],
  dashboard_reports: [['admin', 'crm_leads', 'id,crm_stage,source_created_at'], ['admin', 'crm_user_sessions', 'id,user_id,started_at'], ['portal', 'payments', 'id,amount,status']],
  portal_data: [['portal', 'users', 'id,role,requires_onboarding'], ['portal', 'payments', 'id,user_id,status,invoice_number'], ['portal', 'bookings', 'id,user_id']],
  ai_history: [['portal', 'ai_chat_messages', 'id,user_id,role,created_at'], ['portal', 'ai_chat_state', 'user_id,ai_paused'], ['portal', 'users', 'id,historial']],
  call_booking: [['portal', 'bookings', 'id,user_id'], ['robinjr', 'bookings', 'id,user_id'], ['portal', 'users', 'id,assigned_to']],
};

async function checkCrmEmail() {
  const schema = await checkSchemaSet([['admin', 'crm_email_drafts', 'owner_id,subject,body'], ['admin', 'crm_email_templates', 'id,owner_id,subject,body']]);
  const gmail = await runInApp('admin', getGmailStatus);
  if (!gmail.ready) throw new Error(`Gmail no está listo: ${gmail.reason}`);
  return `${schema} Gmail confirma el permiso de envío; no se ha enviado ningún correo.`;
}

async function checkLeadIngest() {
  await checkSchemaSet(DOMAIN_SCHEMAS.lead_ingest);
  const marker = randomUUID();
  const email = `test-${marker}@release-test.invalid`;
  const db = appDb('admin', 'crm_future_leads').client;
  try {
    const result = await runInApp('admin', () => ingestCrmLead({
      source: 'release_test', externalId: marker, name: 'TEST Robin Lead', email,
      course: '1º de Bachillerato', payload: { release_test: true },
    }));
    if (result.result !== 'routed_future' || !result.futureLead?.id || result.futureLead.academic_year !== '2028-29') {
      throw new Error('El lead TEST no llegó a próximos cursos');
    }
    return 'Lead ficticio de 1º Bachillerato recibido y clasificado en 2028-29; limpieza completada.';
  } finally {
    const { data, error } = await db.from('crm_future_leads').select('id').eq('email', email).eq('source', 'release_test');
    if (error) throw new Error(`No se pudo localizar el lead TEST para borrarlo: ${error.code || 'unknown'}`);
    if (data?.length) {
      const removed = await db.from('crm_future_leads').delete().in('id', data.map((row) => row.id)).select('id');
      if (removed.error || removed.data?.length !== data.length) throw new Error('No se pudo eliminar el lead TEST de próximos cursos');
    }
  }
}

async function checkCrmManagement(admin) {
  const marker = randomUUID();
  const email = `test-${marker}@release-test.invalid`;
  const crm = appDb('admin', 'crm_leads').client;
  const cookie = `${COOKIE_NAME}=${signSession(admin)}`;
  try {
    const created = await ingestCrmLead({
      source: 'release_test', externalId: marker, name: 'TEST Robin CRM', email,
      course: '2º de Bachillerato', payload: { release_test: true },
    });
    if (created.result !== 'created' || !created.lead?.id) throw new Error('El lead TEST no entró en el CRM');
    const leadId = created.lead.id;
    const post = await crmLeadCallsHandler({
      httpMethod: 'POST', headers: { cookie },
      body: JSON.stringify({ leadId, kind: 'message', notes: 'Mensaje TEST de validación' }),
    });
    const posted = JSON.parse(post.body || '{}');
    if (post.statusCode !== 201 || posted.call?.leadId !== leadId || posted.call?.kind !== 'message' || posted.call?.durationMinutes !== null) {
      throw new Error(`No se pudo registrar el mensaje TEST en el CRM (HTTP ${post.statusCode})`);
    }
    const get = await crmLeadCallsHandler({ httpMethod: 'GET', headers: { cookie }, queryStringParameters: { leadId } });
    const listed = JSON.parse(get.body || '{}');
    if (get.statusCode !== 200 || !listed.calls?.some((call) => call.id === posted.call.id && call.notes === 'Mensaje TEST de validación')) {
      throw new Error('El historial del CRM no devolvió el mensaje TEST');
    }
    return 'Lead TEST creado, mensaje registrado y leído por las funciones reales del CRM; limpieza completada.';
  } finally {
    const { data: leads, error } = await crm.from('crm_leads').select('id')
      .eq('email', email).contains('source_payload', { source: 'release_test', external_id: marker });
    if (error) throw new Error(`No se pudo localizar el lead TEST para borrarlo: ${error.code || 'unknown'}`);
    for (const lead of leads || []) {
      for (const table of ['crm_lead_calls', 'crm_lead_events']) {
        const removed = await crm.from(table).delete().eq('lead_id', lead.id);
        if (removed.error) throw new Error(`No se pudieron eliminar los registros TEST de ${table}`);
      }
      const removed = await crm.from('crm_leads').delete().eq('id', lead.id).eq('email', email).select('id');
      if (removed.error || removed.data?.length !== 1) throw new Error('No se pudo eliminar el lead TEST del CRM');
    }
  }
}

async function checkLostFuture(admin) {
  const marker = randomUUID();
  const email = `test-${marker}@release-test.invalid`;
  const crm = appDb('admin', 'crm_leads').client;
  const cookie = `${COOKIE_NAME}=${signSession(admin)}`;
  let leadId = null;
  try {
    const created = await ingestCrmLead({
      source: 'release_test', externalId: marker, name: 'TEST Robin Lost', email,
      course: '2º de Bachillerato', payload: { release_test: true },
    });
    if (created.result !== 'created' || !created.lead?.id) throw new Error('El lead TEST no entró en el CRM');
    leadId = created.lead.id;
    const lostAt = new Date().toISOString();
    const patch = await crmLeadsHandler({
      httpMethod: 'PATCH', headers: { cookie },
      body: JSON.stringify({ id: leadId, patch: { crm_stage: 'Lost', lost_at: lostAt, lost_reason: 'other', lost_reason_detail: 'Validación TEST' } }),
    });
    const patched = JSON.parse(patch.body || '{}');
    if (patch.statusCode !== 200 || patched.lead?.crm_stage !== 'Lost' || patched.lead?.source_payload?.lost_reason !== 'other') {
      throw new Error(`El CRM no guardó la fase Lost y su motivo (HTTP ${patch.statusCode})`);
    }
    const moved = await crmFutureLeadsHandler({
      httpMethod: 'POST', headers: { cookie },
      body: JSON.stringify({ leadId, academicYear: '2028-29' }),
    });
    const move = JSON.parse(moved.body || '{}');
    if (moved.statusCode !== 200 || !move.futureLeadId) throw new Error(`El CRM no trasladó el lead TEST a próximos cursos (HTTP ${moved.statusCode})`);
    const { data: future, error } = await crm.from('crm_future_leads')
      .select('id,academic_year,original_lead_id,lead_snapshot').eq('id', move.futureLeadId).single();
    if (error || future?.original_lead_id !== leadId || future.academic_year !== '2028-29'
      || future.lead_snapshot?.crm_stage !== 'Lost') throw new Error('El archivo futuro no conserva la fase Lost del lead TEST');
    return 'Lead TEST marcado como Lost, motivo guardado y traslado a 2028-29 comprobado; limpieza completada.';
  } finally {
    if (leadId) {
      const future = await crm.from('crm_future_leads').delete().eq('original_lead_id', leadId)
        .eq('email', email).select('id');
      if (future.error) throw new Error('No se pudo borrar el lead TEST de próximos cursos');
    }
    const { data: active, error } = await crm.from('crm_leads').select('id')
      .eq('email', email).contains('source_payload', { source: 'release_test', external_id: marker });
    if (error) throw new Error('No se pudo localizar el lead TEST activo para limpiarlo');
    for (const lead of active || []) {
      const removed = await crm.from('crm_leads').delete().eq('id', lead.id).eq('email', email).select('id');
      if (removed.error || removed.data?.length !== 1) throw new Error('No se pudo borrar el lead TEST activo');
    }
  }
}

async function checkDashboardReports(admin) {
  await checkSchemaSet(DOMAIN_SCHEMAS.dashboard_reports);
  const response = await salesDashboardHandler({
    httpMethod: 'GET', headers: { cookie: `${COOKIE_NAME}=${signSession(admin)}` },
    queryStringParameters: { period: '30d', scope: 'personal' },
  });
  const report = JSON.parse(response.body || '{}');
  if (response.statusCode !== 200 || report.period !== '30d' || !report.kpis
    || !Array.isArray(report.buckets) || report.sources?.portal !== true
    || report.sources?.adminCrm !== true || report.scope?.type !== 'personal') {
    throw new Error(`El dashboard comercial no generó un informe personal válido (HTTP ${response.statusCode})`);
  }
  return 'Dashboard comercial generado para los últimos 30 días con CRM y Portal; alcance personal y datos de salida comprobados.';
}

async function checkAiHistory(admin) {
  return liveFlow.withFixture('portal', async ({ sb, created }) => {
    const assigned = await sb.from('users').update({ assigned_to: admin.email }).eq('id', created.id);
    if (assigned.error) throw assigned.error;
    const content = `Mensaje TEST ${randomUUID()}`;
    try {
      const inserted = await sb.from('ai_chat_messages').insert({ user_id: created.id, role: 'user', content }).select('id').single();
      if (inserted.error) throw inserted.error;
      const token = portalAuth.signSession(admin);
      const response = await adminChatHandler({
        httpMethod: 'GET', headers: { cookie: `${portalAuth.COOKIE_NAME}=${token}` },
        queryStringParameters: { user_id: created.id },
      });
      const result = JSON.parse(response.body || '{}');
      if (response.statusCode !== 200 || result.client?.id !== created.id
        || !Array.isArray(result.messages) || !result.messages.some((message) => message.content === content)) {
        throw new Error(`El panel no recuperó el historial IA de la cuenta TEST (HTTP ${response.statusCode})`);
      }
      return 'Mensaje TEST guardado y recuperado desde la función real del historial IA; cuenta eliminada.';
    } finally {
      const removed = await sb.from('ai_chat_messages').delete().eq('user_id', created.id);
      if (removed.error) throw new Error('No se pudo eliminar el mensaje TEST del historial IA');
    }
  });
}

async function checkCallBooking(admin) {
  return liveFlow.withFixture('portal', async ({ sb, modules, created }) => {
    const assigned = await sb.from('users').update({ assigned_to: admin.email }).eq('id', created.id);
    if (assigned.error) throw assigned.error;
    const token = modules.auth.signSession(created);
    const response = await bookingAvailabilityHandler({
      httpMethod: 'GET', headers: { cookie: `${modules.auth.COOKIE_NAME}=${token}` },
      queryStringParameters: { days: '2' },
    });
    const result = JSON.parse(response.body || '{}');
    if (response.statusCode !== 200 || result.calendar_connected !== true
      || !Array.isArray(result.days) || result.days.length !== 2
      || !result.days.every((day) => Array.isArray(day.slots))) {
      throw new Error(`No se pudo consultar la disponibilidad real de Calendar (HTTP ${response.statusCode})`);
    }
    return 'Cuenta TEST asignada a un asesor; Calendar respondió y devolvió dos días de disponibilidad; cuenta eliminada.';
  });
}

async function checkAdminUsers(admin) {
  await checkSchemaSet(DOMAIN_SCHEMAS.admin_users);
  const denied = await adminUsersHandler({ httpMethod: 'GET', headers: {} });
  if (denied.statusCode !== 403) throw new Error('El listado de admins no rechazó una petición sin sesión');
  const response = await adminUsersHandler({
    httpMethod: 'GET', headers: { cookie: `${COOKIE_NAME}=${signSession(admin)}` },
  });
  const result = JSON.parse(response.body || '{}');
  if (response.statusCode !== 200 || !Array.isArray(result.users)
    || !result.users.some((user) => user.id === admin.id)
    || !result.users.every((user) => user.role === 'admin' || user.role === 'superadmin')) {
    throw new Error(`El listado de administradores no devolvió cuentas válidas (HTTP ${response.statusCode})`);
  }
  return 'La función real rechaza peticiones sin sesión y devuelve cuentas administrativas al admin autenticado.';
}

async function checkPortalData(admin) {
  await checkSchemaSet(DOMAIN_SCHEMAS.portal_data);
  const response = await adminDashboardHandler({
    httpMethod: 'GET', headers: { cookie: `${COOKIE_NAME}=${signSession(admin)}` },
  });
  const result = JSON.parse(response.body || '{}');
  if (response.statusCode !== 200 || result.admin?.id !== admin.id
    || !Array.isArray(result.clients) || !Array.isArray(result.payments)
    || !Array.isArray(result.bookings) || !Array.isArray(result.activity)) {
    throw new Error(`El dashboard del Portal no devolvió sus secciones principales (HTTP ${response.statusCode})`);
  }
  return 'Dashboard real del Portal generado con secciones de alumnos, pagos, reservas y actividad.';
}

async function checkMetaData() {
  return runInApp('admin', async () => {
    const token = process.env.META_ACCESS_TOKEN;
    if (!token) throw new Error('META_ACCESS_TOKEN no configurado');
    const version = process.env.META_API_VERSION || 'v26.0';
    const graph = async (path, params) => {
      const url = new URL(`https://graph.facebook.com/${version}/${path}`);
      for (const [key, value] of Object.entries({ ...params, access_token: token })) url.searchParams.set(key, String(value));
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.error) throw new Error(`Meta API: ${data.error?.code || response.status}`);
      return data;
    };
    const identity = await graph('me', { fields: 'id' });
    if (!identity.id) throw new Error('Meta no confirmó la identidad de la cuenta');
    const configured = String(process.env.META_AD_ACCOUNT_ID || '').trim();
    const accounts = configured ? null : await graph('me/adaccounts', { fields: 'id,account_status', limit: 100 });
    const accountId = configured ? (configured.startsWith('act_') ? configured : `act_${configured}`)
      : (accounts.data || []).find((account) => Number(account.account_status) === 1)?.id || accounts.data?.[0]?.id;
    if (!accountId) throw new Error('Meta no devolvió una cuenta publicitaria');
    const insights = await graph(`${accountId}/insights`, {
      fields: 'campaign_id,campaign_name,spend', level: 'campaign', date_preset: 'last_7d', limit: 1,
    });
    if (!Array.isArray(insights.data)) throw new Error('Meta no devolvió una lista válida de campañas');
    const { data: leadRows, error: leadsError } = await appDb('admin', 'crm_leads').client
      .from('crm_leads').select('source_payload').order('source_created_at', { ascending: false }).limit(1000);
    if (leadsError) throw leadsError;
    const adIds = [...new Set((leadRows || []).map((row) => row.source_payload?.ad_id).filter(Boolean).map(String))].slice(0, 10);
    if (adIds.length) {
      let resolved = false;
      for (const adId of adIds) {
        try {
          const ad = await graph(adId, { fields: 'campaign{id,name}' });
          if (ad.campaign?.name) { resolved = true; break; }
        } catch (_) { /* Anuncios antiguos pueden haber dejado de estar accesibles. */ }
      }
      if (!resolved) throw new Error('Meta no pudo resolver la campaña de ningún anuncio reciente del CRM');
    }
    return `Meta autenticó la cuenta, leyó campañas de los últimos 7 días${adIds.length ? ' y resolvió un anuncio del CRM' : ''}.`;
  });
}

async function checkHoldedData() {
  const taxes = await runInApp('admin', () => holdedFetch('/taxes'));
  if (!taxes || typeof taxes !== 'object') throw new Error('Holded no devolvió el catálogo de impuestos');
  return 'Holded respondió al catálogo de impuestos con la credencial activa. Consulta de solo lectura.';
}

async function checkWebAnalytics() {
  const { client } = appDb('admin', 'web_events');
  const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const [events, sessions, stats] = await Promise.all([
    client.from('web_events').select('id,event_at,type').order('event_at', { ascending: false }).limit(1),
    client.from('web_events').select('id', { count: 'exact', head: true }).not('session_id', 'is', null).gte('event_at', since),
    client.rpc('web_stats', { p_from: since, p_to: new Date().toISOString() }),
  ]);
  if (events.error || sessions.error || stats.error) throw new Error(`Analítica web no disponible: ${events.error?.message || sessions.error?.message || stats.error?.message}`);
  if (!events.data?.length || !sessions.count) throw new Error('No hay eventos de sesión en las últimas 72 horas');
  return `web_stats responde y existen ${sessions.count} eventos con sesión en las últimas 72 horas. Último evento: ${events.data[0].event_at}.`;
}

async function runCheck(id, admin) {
  if (id === 'code_suite') {
    if (process.env.ROBIN_LOCAL_TESTS !== 'true') {
      const proof = publishedBuildProof();
      return `La suite de los cuatro proyectos pasó durante el build del commit ${proof.commit.slice(0, 8)} (${proof.tested_at}).`;
    }
    await runLocalCommand(['site/test-all.mjs'], { isolatedTests: true });
    return 'La suite automatizada de los cuatro proyectos ha terminado sin errores.';
  }
  if (id === 'frontend_build') {
    if (process.env.ROBIN_LOCAL_TESTS !== 'true') return checkPublishedFrontends();
    await runLocalCommand(['dev/release-build.mjs']);
    return 'Las cuatro interfaces y la configuración de Netlify compilan correctamente.';
  }
  if (id === 'login_admin') {
    if (!admin?.id || !admin?.email) throw new Error('La sesión no corresponde a un administrador identificado');
    return 'Sesión administrativa autenticada y cuenta encontrada en la base de datos.';
  }
  if (id === 'login_credentials') return liveFlow.loginCredentials();
  if (id === 'clients_portal') return checkClientList('portal', admin);
  if (id === 'clients_jr') return checkClientList('robinjr', admin);
  if (id === 'clients_community') return checkClientList('community', admin);
  if (id === 'clients_crm') return checkClientList('admin', admin);
  if (id === 'database_separation') return checkDatabaseSeparation();
  if (id === 'onboarding_portal') return checkOnboardingRules('portal');
  if (id === 'onboarding_jr') return checkOnboardingRules('robinjr');
  if (id === 'dni_portal') return checkDni('portal');
  if (id === 'dni_jr') return checkDni('robinjr');
  if (id === 'recommender_portal') return checkRecommender('portal');
  if (id === 'recommender_jr') return checkRecommender('robinjr');
  if (id === 'payment_portal') return checkPaymentConfig('portal');
  if (id === 'payment_jr') return checkPaymentConfig('robinjr');
  if (id === 'payment_community') return checkPaymentConfig('community');
  if (id === 'payment_sandbox_order') return sandbox.sandboxOrder();
  if (id === 'holded_demo_invoice') return sandbox.demoInvoice();
  if (id === 'onboarding_end_to_end') return liveFlow.onboardingEndToEnd();
  if (id === 'lead_ingest') return checkLeadIngest();
  if (id === 'crm_management') return checkCrmManagement(admin);
  if (id === 'lost_future') return checkLostFuture(admin);
  if (id === 'dashboard_reports') return checkDashboardReports(admin);
  if (id === 'ai_history') return checkAiHistory(admin);
  if (id === 'call_booking') return checkCallBooking(admin);
  if (id === 'admin_users') return checkAdminUsers(admin);
  if (id === 'portal_data') return checkPortalData(admin);
  if (id === 'lead_to_client') return checkLeadToClient();
  if (DOMAIN_SCHEMAS[id]) return checkSchemaSet(DOMAIN_SCHEMAS[id]);
  if (id === 'crm_email') return checkCrmEmail();
  if (id === 'meta_data') return checkMetaData();
  if (id === 'holded_data') return checkHoldedData();
  if (id === 'web_analytics') return checkWebAnalytics();
  throw new Error('test_no_disponible');
}

module.exports = { CHECKS, runCheck };
