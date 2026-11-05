'use strict';

const { randomUUID, randomBytes } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { runInApp } = require('../../../site/app-env.cjs');
const { LEAD_PREFIX, EMAIL_DOMAIN, isReleaseTestUser } = require('../../../packages/auth/release-test.cjs');

function appModules(app) {
  const root = app === 'portal' ? '../../portal' : '../../robinjr';
  return {
    auth: require(`${root}/lib/auth`),
    origin: require(`${root}/netlify/functions/onboarding-origin`).handler,
    dniSave: require(`${root}/netlify/functions/onboarding-dni-save`).handler,
    contract: require(`${root}/netlify/functions/onboarding-contract`).handler,
    profile: require(`${root}/netlify/functions/onboarding-profile`).handler,
    state: require(`${root}/netlify/functions/onboarding-state`).handler,
    login: app === 'portal' ? require('../../portal/netlify/functions/auth-login').handler : null,
  };
}

function db() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase no configurado');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function request(method, cookie, body) {
  return {
    httpMethod: method,
    headers: cookie ? { cookie } : {},
    body: body === undefined ? null : JSON.stringify(body),
  };
}

async function call(handler, method, cookie, body, label) {
  const response = await handler(request(method, cookie, body));
  const payload = JSON.parse(response.body || '{}');
  if (response.statusCode !== 200 || payload.error) {
    throw new Error(`${label}: HTTP ${response.statusCode} ${payload.error || payload.detail || ''}`.trim());
  }
  return { response, payload };
}

async function withFixture(app, run) {
  return runInApp(app, async () => {
    const sb = db();
    const modules = appModules(app);
    const token = randomUUID();
    const leadId = `${LEAD_PREFIX}${token}`;
    const email = `test-${token.replace(/-/g, '')}${EMAIL_DOMAIN}`;
    const password = `Test-${randomBytes(18).toString('base64url')}#`;
    const row = {
      lead_id: leadId,
      email,
      username: email,
      password_hash: modules.auth.hashPassword(password),
      nombre: 'TEST Robin',
      apellidos: 'Automático',
      tipo: 'general',
      requires_onboarding: true,
      dni_completed: false,
      profile_completed: false,
      contract_signed: false,
      pago_completed: false,
    };
    if (app === 'robinjr') {
      const { pricingVersionForNewUser } = require('../../robinjr/shared/financial-config.cjs');
      row.contract_data = { pricing_version: pricingVersionForNewUser('general') };
    }
    const { data: created, error: createError } = await sb.from('users').insert(row).select('id,lead_id,email,username,role').single();
    if (createError) throw new Error(`${app}: no se pudo crear la cuenta de prueba: ${createError.message}`);
    let failure;
    let result;
    try {
      if (!isReleaseTestUser(created) || created.lead_id !== leadId || created.email !== email) {
        throw new Error(`${app}: los marcadores de la cuenta de prueba no coinciden; id ${created.id}`);
      }
      result = await run({ sb, modules, created, email, password });
    } catch (error) {
      failure = error;
    }
    const { data: removed, error: deleteError } = await sb.from('users').delete()
      .eq('id', created.id).eq('lead_id', leadId).eq('email', email).select('id');
    if (deleteError || removed?.length !== 1) {
      throw new Error(`${app}: limpieza fallida para la cuenta de prueba ${created.id}: ${deleteError?.message || 'no se borró exactamente una fila'}${failure ? `; test: ${failure.message}` : ''}`);
    }
    if (failure) throw failure;
    return result;
  });
}

async function loginCredentials() {
  return withFixture('portal', async ({ modules, created, email, password }) => {
    const { response, payload } = await call(modules.login, 'POST', null, { username: email, password }, 'Login');
    if (payload.user?.id !== created.id) throw new Error('El login devolvió otra cuenta');
    const setCookie = response.multiValueHeaders?.['Set-Cookie']?.[0];
    if (!setCookie) throw new Error('El login no creó la cookie de sesión');
    const cookie = setCookie.split(';')[0];
    const session = modules.auth.readSessionFromEvent(request('GET', cookie));
    if (session?.uid !== created.id) throw new Error('La sesión no identifica a la cuenta de prueba');
    const state = await call(modules.state, 'GET', cookie, undefined, 'Estado de onboarding');
    if (state.payload.next_step !== 'origin') throw new Error('La sesión no puede consultar el estado de la cuenta');
    return 'Cuenta TEST creada, login real aceptado, sesión verificada y cuenta eliminada.';
  });
}

async function onboardingFor(app) {
  return withFixture(app, async ({ modules, created, email }) => {
    const sessionUser = app === 'robinjr' ? { ...created, auth_source: 'application_sso' } : created;
    const cookie = modules.auth.buildSessionCookie(modules.auth.signSession(sessionUser)).split(';')[0];
    if (modules.auth.readSessionFromEvent(request('GET', cookie))?.uid !== created.id) {
      throw new Error(`${app}: no se pudo crear una sesión para la cuenta TEST`);
    }
    const state = async (expected) => {
      const { payload } = await call(modules.state, 'GET', cookie, undefined, 'Estado de onboarding');
      if (payload.next_step !== expected) throw new Error(`${app}: se esperaba ${expected}, se obtuvo ${payload.next_step}`);
    };
    await state('origin');
    await call(modules.origin, 'POST', cookie, { origin: 'espana' }, 'Origen');
    await state('dni');
    await call(modules.dniSave, 'POST', cookie, {
      nombre: 'Alex',
      apellidos: 'Prueba Martin',
      direccion: 'Calle de Prueba 123, Madrid',
      fecha_nacimiento: '2008-03-12',
      dni_numero: '00000000T',
      telefono_alumno: '+34600000000',
    }, 'Guardado del DNI');
    await state('contract');
    await call(modules.contract, 'POST', cookie, {
      nombre_cliente: 'TEST Robin Responsable',
      dni_cliente: '00000000T',
      extras: [],
      signature_content: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+XWZkAAAAASUVORK5CYII=',
    }, 'Contrato');
    await state('profile');
    await call(modules.profile, 'POST', cookie, {
      email,
      intereses: ['tecnologia_y_programacion', 'ingenierias'],
      questionnaire: { version: 1, blocks: [{ title: 'Perfil TEST', items: [{ q: 'Intereses', a: 'Programación' }] }], signals: {} },
      academic_system: 'bachillerato_espanol',
      academic_subjects: [{ name: 'Matemáticas' }],
    }, 'Perfil');
    await state('payment');
    return `${app}: alta TEST, origen, guardado de DNI, contrato y perfil correctos; cuenta eliminada.`;
  });
}

async function onboardingEndToEnd() {
  const results = [];
  for (const app of ['portal', 'robinjr']) results.push(await onboardingFor(app));
  return results.join(' ');
}

module.exports = { loginCredentials, onboardingEndToEnd, withFixture };
