const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');

function loadHandler(name, mocks) {
  const filename=path.resolve(`backend/functions/${name}.js`);
  const realRequire=createRequire(filename);
  const exports={};
  const module={exports};
  const quiet={error(){}};
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),{exports,module,require:id=>mocks[id]||realRequire(id),process,Buffer,console:quiet},{filename});
  return module.exports.handler;
}

test('every session-protected handler rejects unauthenticated requests before accessing providers',async()=>{
  for(const file of fs.readdirSync('backend/functions').filter(f=>f.endsWith('.js'))){
    const source=fs.readFileSync(`backend/functions/${file}`,'utf8');
    if(!source.includes('readSessionFromEvent'))continue;
    const handler=require(`../backend/functions/${file}`).handler;
    const methods=[...new Set([...source.matchAll(/httpMethod\s*[!=]==?\s*['"]([A-Z]+)['"]/g)].map(m=>m[1]))];
    for(const method of methods){
      const response=await handler({httpMethod:method,headers:{},body:'{}'});
      assert.equal(response.statusCode,401,`${file} ${method}`);
    }
  }
});

test('login queries only subscribers with equality filters and creates subscriber session',async()=>{
  const queried=[];
  const handler=loadHandler('auth-login',{
    '../lib/supabase':{getSupabase:()=>({from(table){queried.push(table);return {select:()=>({eq:(field,value)=>({limit:async()=>({data:[{id:'u1',role:'subscriber',username:value,password_hash:'hash'}]})})})};}})},
    '../lib/auth':{verifyPassword:()=>true,signSession:()=> 'signed-token',buildSessionCookie:()=> 'session-cookie'},
  });
  const response=await handler({httpMethod:'POST',headers:{},body:JSON.stringify({username:'demo@example.test',password:'test-only'})});
  assert.equal(response.statusCode,200);
  assert.equal(JSON.parse(response.body).user.role,'subscriber');
  assert.deepEqual(queried,['subscribers']);
});

test('login refuses application admin even when a row exists',async()=>{
  const handler=loadHandler('auth-login',{
    '../lib/supabase':{getSupabase:()=>({from:()=>({select:()=>({eq:()=>({limit:async()=>({data:[{id:'u1',role:'admin'}]})})})})})},
  });
  const response=await handler({httpMethod:'POST',headers:{},body:'{"username":"demo","password":"test-only"}'});
  assert.equal(response.statusCode,401);
});

test('password recovery uses the existing public password endpoint without a session',async()=>{
  const calls=[];
  const handler=loadHandler('auth-change-password',{
    '../lib/password-reset':{
      requestPasswordReset:async(_event,email)=>{calls.push(['request',email]);return {ok:true};},
      applyPasswordReset:async(token,password)=>{calls.push(['reset',token,password]);return {ok:true};},
    },
  });
  const request=await handler({httpMethod:'POST',headers:{},body:'{"action":"request_reset","email":"client@example.test"}'});
  const reset=await handler({httpMethod:'POST',headers:{},body:'{"action":"reset","token":"signed","password":"new-password"}'});
  assert.equal(request.statusCode,200);
  assert.equal(reset.statusCode,200);
  assert.deepEqual(calls,[['request','client@example.test'],['reset','signed','new-password']]);
});

test('Stripe webhook rejects invalid signatures and retries persistence failures',async()=>{
  const original=process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_WEBHOOK_SECRET='test-only';
  try {
    const invalid=loadHandler('stripe-webhook',{'../lib/stripe':{isConfigured:()=>true,getStripe:()=>({webhooks:{constructEvent(){throw new Error('invalid signature');}}})}});
    assert.equal((await invalid({httpMethod:'POST',headers:{},body:'{}'})).statusCode,400);
    const failing=loadHandler('stripe-webhook',{
      '../lib/stripe':{isConfigured:()=>true,getStripe:()=>({webhooks:{constructEvent:()=>({type:'checkout.session.completed',data:{object:{id:'cs_test'}}})}}),fulfillCheckout:async()=>{throw new Error('database unavailable');}},
      '../lib/supabase':{getSupabase:()=>({})},
    });
    assert.equal((await failing({httpMethod:'POST',headers:{},body:'{}'})).statusCode,500);
  } finally { if(original===undefined)delete process.env.STRIPE_WEBHOOK_SECRET;else process.env.STRIPE_WEBHOOK_SECRET=original; }
});

test('partner logo parser accepts real image signatures and rejects disguised content',()=>{
  const { parseImageDataUrl, safeSegment }=require('../backend/functions/partner-logo-upload')._test;
  const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.from('fixture')]);
  const parsed=parseImageDataUrl(`data:image/png;base64,${png.toString('base64')}`);
  assert.equal(parsed.contentType,'image/png');
  assert.equal(parsed.extension,'png');
  assert.equal(parseImageDataUrl(`data:image/png;base64,${Buffer.from('not an image').toString('base64')}`),null);
  assert.equal(safeSegment('../partner id!'),'partnerid');
});
