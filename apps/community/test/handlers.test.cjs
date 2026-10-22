// Automated checks for handlers test; external services should remain outside this test boundary.
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

test('local login requires the shared Robin Platform identity',async()=>{
  let providerAccessed=false;
  const handler=loadHandler('auth-login',{
    '../lib/supabase':{getSupabase:()=>{providerAccessed=true;throw new Error('local login must not query Supabase');}},
  });
  const response=await handler({httpMethod:'POST',headers:{},body:JSON.stringify({username:'demo@example.test',password:'test-only'})});
  assert.equal(response.statusCode,403);
  assert.equal(JSON.parse(response.body).error,'application_login_required');
  assert.equal(providerAccessed,false);
});

test('local login rejects application admins and subscribers alike',async()=>{
  let providerAccessed=false;
  const handler=loadHandler('auth-login',{
    '../lib/supabase':{getSupabase:()=>{providerAccessed=true;throw new Error('local login must not query Supabase');}},
  });
  const response=await handler({httpMethod:'POST',headers:{},body:'{"username":"demo","password":"test-only"}'});
  assert.equal(response.statusCode,403);
  assert.equal(JSON.parse(response.body).error,'application_login_required');
  assert.equal(providerAccessed,false);
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

test('partner creation accepts no logo and can upload one through the established admin mutation route',async()=>{
  const inserted=[];
  const uploads=[];
  const sb={
    from(table){
      assert.equal(table,'partners');
      return {insert(data){inserted.push(data);return {select(){return {single:async()=>({data:{id:'p1',...data},error:null})};}};}};
    },
  };
  const handler=loadHandler('sub-admin-mutate',{
    '../lib/supabase':{getSupabase:()=>sb},
    '../lib/auth':{readSessionFromEvent:()=>({role:'subscriber_admin'})},
    '../lib/application-permissions':{readApplicationIdentity:async()=>({is_application_admin:true,is_pro_admin:true}),canUseRobinPlan:()=>true},
    '../lib/partner-logo':{
      parseImageDataUrl:value=>value==='data:image/png;base64,fixture'?{extension:'png'}:null,
      uploadPartnerLogo:async(_sb,image,partnerId)=>{uploads.push({image,partnerId});return {logoUrl:'https://assets.example.test/partner.png'};},
    },
  });
  const withoutLogo=await handler({httpMethod:'POST',headers:{},body:JSON.stringify({entity:'partner',action:'create',payload:{name:'Sin logo',category:'other',logo_url:null}})});
  assert.equal(withoutLogo.statusCode,200);
  assert.equal(inserted[0].logo_url,null);
  assert.equal(uploads.length,0);

  const withLogo=await handler({httpMethod:'POST',headers:{},body:JSON.stringify({entity:'partner',action:'create',payload:{name:'Con logo',category:'other',logo_data_url:'data:image/png;base64,fixture'}})});
  assert.equal(withLogo.statusCode,200);
  assert.equal(inserted[1].logo_url,'https://assets.example.test/partner.png');
  assert.equal(uploads.length,1);
});
