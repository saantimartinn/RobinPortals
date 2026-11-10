const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {ENGINE_VERSION}=require('../lib/career-suggestions');

async function invoke(app,{current=false,origin='espana'}={}){
 const writes=[];
 const client={id:'11111111-1111-4111-8111-111111111111',origin,intereses:['ingenierias'],questionnaire:{blocks:[{title:'General',items:[{q:'Perfil',a:'Respuesta'}]}],signals:{}},career_suggestions:{...(current?{engine_version:ENGINE_VERSION}:{}),items:[{program_code:'legacy-cached'}]}};
 const actor={id:'admin',role:'admin',email:'advisor@example.com'};
 const sb={from(table){return {filters:{},select(){return this;},eq(key,value){this.filters[key]=value;return this;},neq(){this.history=true;return this;},order(){return this;},limit(){return this;},update(value){this.patch=value;return this;},async single(){return {data:this.filters.id==='admin'?actor:client,error:null};},then(resolve,reject){if(this.patch)writes.push(this.patch);return Promise.resolve({data:this.patch?null:this.history?[{program_code:'tud-aerospace-engineering',decision:'approved',student:{id:'previous',intereses:['ingenierias'],questionnaire:{signals:{rasgos:['analitico']}}}}]:[],error:null}).then(resolve,reject);}};}};
 const filename=require.resolve(`../../${app}/netlify/functions/admin-career-suggestions`);
 const mocks={'../../lib/supabase':{getSupabase:()=>sb},'../../lib/auth':{readSessionFromEvent:()=>({uid:'admin'})},'../../lib/session-user':{getSessionUser:async()=>({data:actor})}};
 if(app==='portal')delete mocks['../../lib/session-user'];
 const cache=new Map();for(const [name,exports] of Object.entries(mocks)){const key=require.resolve(name,{paths:[path.dirname(filename)]});cache.set(key,require.cache[key]);require.cache[key]={id:key,filename:key,loaded:true,exports};}
 const apiKey=process.env.ANTHROPIC_API_KEY,remoteUrl=process.env.RBMT_SUPABASE_URL;
 delete process.env.ANTHROPIC_API_KEY;delete process.env.RBMT_SUPABASE_URL;delete require.cache[filename];
 try{const response=await require(filename).handler({httpMethod:'GET',queryStringParameters:{user_id:client.id}});return {response,body:JSON.parse(response.body),writes};}
 finally{delete require.cache[filename];for(const [key,value]of cache)if(value)require.cache[key]=value;else delete require.cache[key];if(apiKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=apiKey;if(remoteUrl===undefined)delete process.env.RBMT_SUPABASE_URL;else process.env.RBMT_SUPABASE_URL=remoteUrl;}
}
for(const app of ['portal','robinjr']){
 test(`${app}: recalcula el cache antiguo con la metodología nueva`,async()=>{const {response,body,writes}=await invoke(app);assert.equal(response.statusCode,200);assert.equal(body.suggestions.engine_version,ENGINE_VERSION);assert.equal(body.suggestions.items.length,10);assert.equal(body.suggestions.history_count,1);assert.equal(writes.length,1);});
 test(`${app}: conserva un cache actual y las restricciones de origen`,async()=>{const cached=await invoke(app,{current:true});assert.equal(cached.writes.length,0);assert.equal(cached.body.suggestions.items[0].program_code,'legacy-cached');const disabled=await invoke(app,{origin:'otros'});assert.equal(disabled.body.ai_disabled,true);assert.equal(disabled.writes.length,0);});
}
