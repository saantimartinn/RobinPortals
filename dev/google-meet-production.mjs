import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from '../site/apps.mjs';
import { netlifyApi, productionValue } from '../site/netlify-api.mjs';

// Update production values individually: preview/dev variables stay untouched.
export function setProductionValues(site, variables, values) {
  const existing = new Set(variables.map(variable => variable.key));
  for (const [key,value] of Object.entries(values)) {
    if (existing.has(key)) netlifyApi('setEnvVarValue',{account_id:site.account_id,site_id:site.id,key,body:{context:'production',value}});
    else netlifyApi('createEnvVars',{account_id:site.account_id,site_id:site.id,body:[{key,values:[{context:'production',value}]}]});
  }
}

export async function applyGoogleGrants({ site, variables, grants, clientId, clientSecret }) {
  const configured=Object.fromEntries(variables.map(variable=>[variable.key,productionValue(variable)]));
  for (const app of ['portal','robinjr','admin']) {
    if ((configured[`${app.toUpperCase()}__GOOGLE_CLIENT_ID`] || configured.GOOGLE_CLIENT_ID) !== clientId) throw new Error('oauth_clients_do_not_match');
  }
  const values = {};
  for (const name of ['noel','manuel','maria']) {
    const email = `${name}@project-robin.com`;
    const grant = grants[email];
    if (!grant?.refreshToken) throw new Error('authorizations_incomplete');
    const response = await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,refresh_token:grant.refreshToken,grant_type:'refresh_token'}),signal:AbortSignal.timeout(15000)});
    const token = await response.json();
    if (!response.ok || !token.access_token) throw new Error('grant_validation_failed');
    let scope=token.scope;
    if (!scope) {
      const infoURL=new URL('https://oauth2.googleapis.com/tokeninfo');infoURL.searchParams.set('access_token',token.access_token);
      const infoResponse=await fetch(infoURL,{signal:AbortSignal.timeout(15000)});
      const info=await infoResponse.json();
      if (!infoResponse.ok) throw new Error('grant_validation_failed');
      scope=info.scope;
    }
    const scopes = new Set(String(scope || '').split(' '));
    if (!scopes.has('https://www.googleapis.com/auth/meetings.space.settings') || !scopes.has('https://www.googleapis.com/auth/meetings.space.readonly')) throw new Error('missing_meet_scopes');
    const identityResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${token.access_token}`},signal:AbortSignal.timeout(15000)});
    const identity=await identityResponse.json();
    if (!identityResponse.ok || identity.email_verified !== true || identity.email?.toLowerCase() !== email) throw new Error('wrong_google_account');
    for (const app of ['portal','robinjr','admin']) values[`${app.toUpperCase()}__GOOGLE_REFRESH_TOKEN_${name.toUpperCase()}`] = grant.refreshToken;
  }
  for (const app of ['portal','robinjr','admin']) values[`${app.toUpperCase()}__MEET_AUTO_TRANSCRIBE_ENABLED`] = 'true';
  setProductionValues(site,variables,values);
  for (const app of ['portal','robinjr','admin']) {
    const file=resolve(ROOT,'apps',app,'.env');
    if (!existsSync(file)) continue;
    let text=readFileSync(file,'utf8');
    for (const [scopedKey,value] of Object.entries(values)) {
      const prefix=`${app.toUpperCase()}__`;
      if (!scopedKey.startsWith(prefix)) continue;
      const key=scopedKey.slice(prefix.length);
      const line=`${key}=${JSON.stringify(value)}`;
      const pattern=new RegExp(`^${key}=.*$`,'m');
      text=pattern.test(text)?text.replace(pattern,()=>line):`${text.trimEnd()}\n${line}\n`;
    }
    writeFileSync(file,text,{mode:0o600});
  }
  console.log('Las tres cuentas se han verificado y sus credenciales se han aplicado a producción y al entorno local.');
  console.log('Es necesario un nuevo despliegue para que las funciones reciban los permisos actualizados.');
}
