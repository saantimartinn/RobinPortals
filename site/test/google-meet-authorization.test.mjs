import test from 'node:test';
import assert from 'node:assert/strict';
import { startAuthorizationServer, MEET_SCOPES } from '../../dev/google-meet-authorize.mjs';

test('el consentimiento usa PKCE y un state de un solo uso, y comprueba la cuenta antes de guardar', async () => {
  const saved = [];
  let wrongAccount = true;
  const server = await startAuthorizationServer({ clientId:'test-client',clientSecret:'test-secret',port:0,
    saveGrant:async grant => saved.push(grant),
    fetch:async url => String(url).includes('/token') ? Response.json({ access_token:'test-access',refresh_token:'test-refresh',scope:MEET_SCOPES.join(' ') })
      : Response.json({email:wrongAccount?'other@example.com':'noel@project-robin.com',email_verified:true}),
  });
  try {
    const start = await fetch(server.url+'/authorize?advisor=noel',{redirect:'manual'});
    const authorization = new URL(start.headers.get('location'));
    assert.equal(authorization.searchParams.get('code_challenge_method'),'S256');
    assert.match(authorization.searchParams.get('scope'),/meetings.space.settings/);
    const state = authorization.searchParams.get('state');
    assert.equal((await fetch(server.url+'/callback?state=invalid&code=one')).status,400);
    assert.equal((await fetch(server.url+`/callback?state=${state}&code=one`)).status,400);
    assert.equal(saved.length,0);
    assert.equal((await fetch(server.url+`/callback?state=${state}&code=one`)).status,400);
    wrongAccount=false;
    const next=await fetch(server.url+'/authorize?advisor=noel',{redirect:'manual'});
    const validState=new URL(next.headers.get('location')).searchParams.get('state');
    assert.equal((await fetch(server.url+`/callback?state=${validState}&code=two`)).status,200);
    assert.equal(saved.length,1);
    assert.equal(saved[0].advisor.email,'noel@project-robin.com');
    assert.equal(saved[0].refreshToken,'test-refresh');
  } finally { await server.close(); }
});

test('un callback sin todos los permisos requeridos no sustituye credenciales existentes', async () => {
  let saved=false;
  const server=await startAuthorizationServer({clientId:'test',clientSecret:'test',port:0,saveGrant:async()=>{saved=true;},fetch:async()=>Response.json({access_token:'test',refresh_token:'test',scope:'openid email'})});
  try{
    const r=await fetch(server.url+'/authorize?advisor=maria',{redirect:'manual'});
    const state=new URL(r.headers.get('location')).searchParams.get('state');
    assert.equal((await fetch(server.url+`/callback?state=${state}&code=x`)).status,400);
    assert.equal(saved,false);
  }finally{await server.close();}
});
