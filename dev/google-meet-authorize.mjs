// Local-only OAuth consent helper. Tokens are never displayed or committed.
import { createServer } from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, chmodSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from '../site/apps.mjs';
import { netlifyApi, productionValue } from '../site/netlify-api.mjs';

export const MEET_SCOPES = [
  'openid', 'email',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/meetings.space.readonly',
  'https://www.googleapis.com/auth/meetings.space.settings',
];
const ADVISORS = ['noel','manuel','maria'].map(name => ({ name, email:`${name}@project-robin.com`, refreshEnv:`GOOGLE_REFRESH_TOKEN_${name.toUpperCase()}` }));
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const page = body => `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Conectar Google Meet · Robin</title><style>body{font:16px system-ui;background:#faf8ef;color:#2d3a64;max-width:700px;margin:60px auto;padding:24px}h1{font-size:30px}a{color:inherit}article{background:white;border:1px solid #e5e7eb;border-radius:16px;padding:20px;margin:15px 0}a.button{display:inline-block;background:#2d3a64;color:white;padding:12px 18px;border-radius:10px;text-decoration:none}code{overflow-wrap:anywhere}</style>${body}</html>`;

export async function startAuthorizationServer({ clientId, clientSecret, saveGrant, port = 9394, fetch: request = fetch, authorized = [] }) {
  const states = new Map();
  const completed = new Set(authorized);
  let origin;
  const server = createServer(async (req,res) => {
    const send = (status,body) => { res.writeHead(status,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});res.end(page(body)); };
    if (req.headers.host !== new URL(origin).host) return send(400,'<h1>Dirección no válida</h1>');
    const url = new URL(req.url, origin);
    if (req.method !== 'GET') return send(405,'<h1>Método no permitido</h1>');
    if (url.pathname === '/') {
      return send(200,`<h1>Conectar Google Meet</h1><p>Autoriza cada cuenta para que Robin pueda activar la transcripción de sus reuniones y leer el resultado. Se conservan los permisos de Calendar y Drive.</p>${ADVISORS.map(advisor => `<article><h2>${escape(advisor.email)}</h2><p>${completed.has(advisor.email)?'Autorización guardada':'Pendiente de autorización'}</p><a class="button" href="/authorize?advisor=${advisor.name}">Autorizar cuenta</a></article>`).join('')}<p>Si Google muestra <code>redirect_uri_mismatch</code>, añade esta URI al cliente OAuth en Google Cloud:</p><code>${origin}/callback</code><p>Los permisos se guardan localmente de forma privada. La aplicación a producción se realiza con el comando documentado.</p>`);
    }
    if (url.pathname === '/authorize') {
      const advisor = ADVISORS.find(item => item.name === url.searchParams.get('advisor'));
      if (!advisor) return send(400,'<h1>Asesor no válido</h1>');
      const state = randomBytes(32).toString('base64url');
      const verifier = randomBytes(48).toString('base64url');
      for (const [key,value] of states) if (value.expires < Date.now()) states.delete(key);
      states.set(state,{ advisor, verifier, expires:Date.now()+10*60000 });
      const consent = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      Object.entries({client_id:clientId,redirect_uri:origin+'/callback',response_type:'code',scope:MEET_SCOPES.join(' '),access_type:'offline',prompt:'consent',include_granted_scopes:'true',login_hint:advisor.email,state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).forEach(([key,value])=>consent.searchParams.set(key,value));
      res.writeHead(302,{Location:consent.toString(),'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end();return;
    }
    if (url.pathname !== '/callback') return send(404,'<h1>No encontrado</h1>');
    const state = url.searchParams.get('state');
    const pending = states.get(state);
    states.delete(state);
    if (!pending || pending.expires < Date.now()) return send(400,'<h1>Autorización caducada o no válida</h1><p>Vuelve al inicio e inténtalo de nuevo.</p><a href="/">Volver</a>');
    try {
      if (url.searchParams.has('error') || !url.searchParams.get('code')) throw new Error('consent_cancelled');
      const response = await request('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,code:url.searchParams.get('code'),grant_type:'authorization_code',redirect_uri:origin+'/callback',code_verifier:pending.verifier}),signal:AbortSignal.timeout(15000)});
      const token = await response.json();
      if (!response.ok || !token.refresh_token || !token.access_token) throw new Error('oauth_exchange_failed');
      const granted = new Set(String(token.scope || '').split(' '));
      if (!MEET_SCOPES.every(scope => granted.has(scope) || (scope === 'email' && granted.has('https://www.googleapis.com/auth/userinfo.email')))) throw new Error('missing_required_scopes');
      const identityResponse = await request('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${token.access_token}`},signal:AbortSignal.timeout(15000)});
      const identity = await identityResponse.json();
      if (!identityResponse.ok || identity.email_verified !== true || identity.email?.toLowerCase() !== pending.advisor.email) throw new Error('wrong_google_account');
      await saveGrant({advisor:pending.advisor,refreshToken:token.refresh_token,scopes:[...granted],authorizedAt:new Date().toISOString()});
      completed.add(pending.advisor.email);
      send(200,`<h1>Cuenta autorizada</h1><p>${escape(pending.advisor.email)} está preparada para activar la transcripción automática.</p><a class="button" href="/">Continuar con las otras cuentas</a>`);
    } catch (error) {
      const messages = {wrong_google_account:'La cuenta elegida no es la del asesor indicado. No se ha sustituido ninguna credencial.',missing_required_scopes:'Faltan permisos necesarios. Vuelve a autorizar concediendo los permisos indicados.',consent_cancelled:'Autorización cancelada.',oauth_exchange_failed:'Google no ha completado el intercambio. Revisa la URI de redirección e inténtalo de nuevo.'};
      send(400,`<h1>No se ha completado la autorización</h1><p>${messages[error.message] || 'No se pudo guardar la autorización. Inténtalo de nuevo.'}</p><a href="/">Volver</a>`);
    }
  });
  await new Promise((done,reject) => {server.once('error',reject);server.listen(port,'127.0.0.1',done);});
  origin = `http://127.0.0.1:${server.address().port}`;
  return {url:origin,close:()=>new Promise(done=>server.close(done))};
}

async function main() {
  const state=JSON.parse(readFileSync(resolve(ROOT,'.netlify/state.json'),'utf8'));
  const site=netlifyApi('getSite',{site_id:state.siteId});
  const variables=netlifyApi('getEnvVars',{account_id:site.account_id,site_id:site.id});
  const env=Object.fromEntries(variables.map(variable=>[variable.key,productionValue(variable)]));
  const clientId=env.PORTAL__GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID;
  const clientSecret=env.PORTAL__GOOGLE_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('Google OAuth is not configured');
  const file=resolve(ROOT,'.netlify/google-meet-grants.json');
  const grants=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{};
  if (process.argv.includes('--apply')) {
    const { applyGoogleGrants }=await import('./google-meet-production.mjs');
    await applyGoogleGrants({site,variables,grants,clientId,clientSecret});
    return;
  }
  const server=await startAuthorizationServer({clientId,clientSecret,authorized:Object.keys(grants),saveGrant:async grant=>{
    grants[grant.advisor.email]=grant;
    mkdirSync(resolve(ROOT,'.netlify'),{recursive:true});
    writeFileSync(file,JSON.stringify(grants,null,2),{mode:0o600});chmodSync(file,0o600);
    console.log(`Autorización guardada: ${grant.advisor.email}.`);
  }});
  console.log(`Abre ${server.url} para autorizar las tres cuentas.`);
  console.log(`URI de redirección: ${server.url}/callback`);
  console.log('Al terminar: node dev/google-meet-authorize.mjs --apply');
  process.on('SIGINT',async()=>{await server.close();process.exit(0);});
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(()=>{console.error('No se ha podido preparar/aplicar la autorización de Google Meet. No se muestran credenciales.');process.exitCode=1;});
}
