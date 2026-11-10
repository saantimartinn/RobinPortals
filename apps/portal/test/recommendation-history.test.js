const test=require('node:test');
const assert=require('node:assert/strict');
const {loadFeedbackHistory}=require('../../../packages/career-recommender/history.cjs');

test('combina historial anónimo, filtra otras áreas y excluye al alumno actual',async()=>{
 const rows=[
  {program_code:'tud-aerospace-engineering',decision:'approved',student:{id:'other',intereses:['ingenierias'],questionnaire:{signals:{asignaturas_fav:['Física']}},career_suggestions:null}},
  {program_code:'wur-tourism',decision:'approved',student:{id:'tourist',intereses:['business'],questionnaire:{signals:{}}}},
  {program_code:'tud-aerospace-engineering',decision:'rejected',student:{id:'current',intereses:['ingenierias'],questionnaire:{signals:{}}}},
 ];
 const sb={from:()=>({select(){return this;},neq(){return this;},order(){return this;},limit:async()=>({data:rows,error:null})})};
 const history=await loadFeedbackHistory(sb,{id:'current',intereses:['ingenierias']},{url:'https://rbmt.example',secret:'test-secret',fetch:async()=>({ok:true,json:async()=>[{program_code:'tud-aerospace-engineering',decision:'approved',matching_sessions:{selected_area:'ingenierias',questionnaire:{signals:{rasgos:['analitico']}}}}]})});
 assert.equal(history.length,2);
 assert.ok(history.some(item=>item.signals.asignaturas_fav?.includes('fisica')));
 assert.ok(history.some(item=>item.signals.rasgos?.includes('analitico')));
 assert.ok(history.every(item=>!item.student&&!item.user_id&&!item.email));
});
test('si el historial no está disponible la recomendación sigue sin él',async()=>{
 const sb={from:()=>({select(){return this;},neq(){return this;},order(){return this;},limit:async()=>({data:null,error:{message:'offline'}})})};
 const history=await loadFeedbackHistory(sb,{id:'current',intereses:['business']},{url:'https://rbmt.example',secret:'test-secret',fetch:async()=>{throw new Error('offline');}});
 assert.deepEqual(history,[]);
});
