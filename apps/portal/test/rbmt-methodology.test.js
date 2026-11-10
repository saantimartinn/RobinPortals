const test = require('node:test');
const assert = require('node:assert/strict');

// Exercise each public app entry point; sharing an engine must not bypass app wiring.
for (const app of ['portal', 'robinjr']) {
  const rec = require(`../../${app}/lib/careers-recommender`);
  const engine = require(`../../${app}/lib/career-suggestions`);
  test(`${app}: los pulgares con nombres reales puntúan como las asignaturas del motor`, () => {
    const career = rec.findCareer('tue-applied-mathematics');
    const areas = [career.area];
    assert.equal(rec.deterministicScore(career, {asignaturas_fav:['Matemáticas II', 'Mathematics: Analysis and Approaches HL']}, areas), rec.deterministicScore(career, {asignaturas_fav:['matematicas']}, areas));
    assert.equal(rec.deterministicScore(career, {asignaturas_menos:['Matemáticas II']}, areas), rec.deterministicScore(career, {asignaturas_menos:['matematicas']}, areas));
  });
  test(`${app}: una meta abierta concreta puede introducir candidatos de otra área`, () => {
    const candidates = engine.prepareCandidates(['business'], {open_text_analysis:{informativeness:0.95,positive_terms:['aerospace engineering','aircraft propulsion','research'],negative_terms:[]}}, [], [], 35);
    assert.ok(candidates.slice(0,10).some(item=>item.program_code==='tud-aerospace-engineering'));
    assert.ok(candidates.slice(0,10).some(item=>item.area==='Business & Economics'));
  });
  test(`${app}: la historia cambia la afinidad y se mantiene la exclusión del asesor`, () => {
    const signals = {asignaturas_fav:['matematicas'],rasgos:['analitico']};
    const history = [{program_code:'tud-aerospace-engineering',decision:'approved',signals}];
    const plain = engine.prepareCandidates(['ingenierias'], signals, [], [], 35);
    const informed = engine.prepareCandidates(['ingenierias'], signals, [], history, 35);
    assert.ok(informed.find(c=>c.program_code==='tud-aerospace-engineering')._det > plain.find(c=>c.program_code==='tud-aerospace-engineering')._det);
    assert.ok(!engine.prepareCandidates(['ingenierias'], signals, [{program_code:'tud-aerospace-engineering',decision:'rejected'}], history, 35).some(c=>c.program_code==='tud-aerospace-engineering'));
  });
}

const {prepareStudent} = require('../../../packages/career-recommender/student-profile.cjs');
test('los cuestionarios existentes aportan respuestas abiertas sin ciudad ni colegio', () => {
  const user = {questionnaire:{blocks:[{title:'General',items:[{q:'Nombre de tu colegio actual',a:'Colegio privado'},{q:'¿Qué idea tienes ahora mismo sobre tu futuro?',a:'Quiero estudiar Ingeniería Aeroespacial.'}]}],signals:{asignaturas_ordenadas:[{name:'Física',rank:1,preference:'like'}]}}};
  const next = prepareStudent(user);
  assert.deepEqual(Object.keys(next.questionnaire.signals.open_responses), ['g_futuro']);
  assert.deepEqual(next.questionnaire.signals.asignaturas_fav,['fisica']);
  assert.equal(user.questionnaire.signals.open_responses,undefined);
});
test('la determinación explícita pesa fuertemente y la curiosidad o negativa no reciben ese peso', async () => {
  const engine = require('../lib/career-suggestions');
  const analyzer = require('../../../packages/career-recommender/open-text-signals.cjs')({chatCompletion:async()=>{throw new Error('offline');}});
  const career = require('../lib/careers-recommender').findCareer('tud-aerospace-engineering');
  const inputs = [
    ['Tengo claro que quiero estudiar Ingeniería Aeroespacial.',true],
    ['Quiero ser ingeniero aeroespacial.',true],
    ['Me interesa la ingeniería aeroespacial, pero todavía no lo sé.',false],
    ['No quiero estudiar Ingeniería Aeroespacial.',false],
    ['Quizás quiero estudiar Ingeniería Aeroespacial, aún tengo dudas.',false],
  ];
  for (const [answer,decided] of inputs) {
    const analysis = await analyzer.analyzeOpenResponses({g_futuro:{question:'Futuro',answer}});
    const adjustment = analyzer.scoreCareerDetermination(career,analysis);
    assert.equal(adjustment===25,decided,answer);
    if(decided){const candidates=engine.prepareCandidates(['business'],{open_text_analysis:analysis},[],[],35);assert.ok(candidates.slice(0,10).some(c=>c.program_code===career.program_code));}
  }
});
test('sin análisis abierto el historial produce puntuaciones finitas', () => {
  const engine=require('../lib/career-suggestions');
  const candidates=engine.prepareCandidates(['business'],{},[],[],35);
  assert.ok(candidates.length>=10);
  assert.ok(candidates.every(c=>Number.isFinite(c._det)));
});

test('el ranking IA rechaza duplicados y carreras ajenas y completa diez resultados', async () => {
  const previousFetch=global.fetch;
  const key=process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY='test-key';
  const requests=[];
  global.fetch=async (_url,options)=>{
    const body=JSON.parse(options.body);requests.push(body);
    return {ok:true,json:async()=>({model:'test-model',content:[{type:'text',text:body.max_tokens===700?JSON.stringify({informativeness:0.9,positive_terms:['aerospace engineering'],negative_terms:[],source_fields:['g_futuro']}):JSON.stringify([{program_code:'tud-aerospace-engineering',compatibility:98},{program_code:'tud-aerospace-engineering',compatibility:99},{program_code:'invented',compatibility:100}])}]})};
  };
  try{
    const input={intereses:['business'],questionnaire:{blocks:[{title:'General',items:[{q:'¿Qué idea tienes ahora mismo sobre tu futuro?',a:'Tengo claro que quiero estudiar Ingeniería Aeroespacial.'}]}],signals:{}}};
    const result=await require('../lib/career-suggestions').generateSuggestions(input);
    assert.equal(result.items.length,10);
    assert.equal(new Set(result.items.map(item=>item.program_code)).size,10);
    assert.equal(result.items[0].program_code,'tud-aerospace-engineering');
    assert.ok(!result.items.some(item=>item.program_code==='invented'));
    assert.ok(requests[1].system.includes('determined_careers'));
    assert.ok(result.engine_version);
    assert.equal(result.profile_signals.open_responses,undefined);
    assert.equal(input.questionnaire.signals.open_text_analysis,undefined);
  }finally{global.fetch=previousFetch;if(key===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=key;}
});

test('sin IA la carrera decidida entra entre las primeras y las aprobadas tienen afinidad válida',async()=>{
 const apiKey=process.env.ANTHROPIC_API_KEY;delete process.env.ANTHROPIC_API_KEY;
 try{
  const result=await require('../lib/career-suggestions').generateSuggestions({intereses:['business'],questionnaire:{blocks:[{title:'General',items:[{q:'¿Qué idea tienes ahora mismo sobre tu futuro?',a:'Quiero estudiar Ingeniería Aeroespacial.'}]}],signals:{}}},[{program_code:'wur-tourism',decision:'approved'}]);
  assert.ok(result.items.slice(0,3).some(item=>item.program_code==='tud-aerospace-engineering'));
  assert.ok(result.items.every(item=>Number.isFinite(item.compatibility)));
 }finally{if(apiKey!==undefined)process.env.ANTHROPIC_API_KEY=apiKey;}
});
test('la IA no puede atribuir una carrera decidida que no aparece en la evidencia',()=>{
 const {groundedCareerIntent}=require('../../../packages/career-recommender/career-intent.cjs');
 const responses={g_futuro:{answer:'Quiero estudiar Ingeniería Aeroespacial.'}};
 assert.deepEqual(groundedCareerIntent([{term:'medicine',source_field:'g_futuro',evidence:responses.g_futuro.answer}],responses),[]);
});

test('la determinación separa carreras rechazadas y dudas sobre el país',()=>{
 const {detectCareerIntent}=require('../../../packages/career-recommender/career-intent.cjs');
 const targets=answer=>detectCareerIntent({g_futuro:{answer}}).map(item=>item.term);
 assert.deepEqual(targets('Quiero estudiar informática y no psicología.'),['computer science']);
 assert.deepEqual(targets('No sé en qué país, pero tengo claro que quiero estudiar Medicina.'),['medicine']);
 assert.deepEqual(targets('Quiero estudiar Psicología, pero todavía no lo sé.'),[]);
});
test('si falla el análisis IA, una carrera expresamente rechazada no se convierte en interés',()=>{
 const analyzer=require('../../../packages/career-recommender/open-text-signals.cjs')({chatCompletion:async()=>{throw new Error('offline');}});
 const analysis=analyzer.fallbackAnalysis({g_futuro:{answer:'No quiero estudiar Ingeniería Aeroespacial porque no me gustan los aviones ni trabajar diseñando sistemas de propulsión.'}});
 assert.ok(!analysis.positive_terms.includes('aerospace engineering'));
 assert.ok(analysis.negative_terms.includes('aerospace engineering'));
 const candidates=require('../lib/career-suggestions').prepareCandidates(['business'],{open_text_analysis:analysis},[],[],35);
 assert.ok(!candidates.some(item=>item.program_code==='tud-aerospace-engineering'));
});

test('dudar sobre una carrera no equivale a rechazarla',()=>{
 const analyzer=require('../../../packages/career-recommender/open-text-signals.cjs')({chatCompletion:async()=>{throw new Error('offline');}});
 const analysis=analyzer.fallbackAnalysis({g_futuro:{answer:'No sé si quiero estudiar Psicología.'}});
 assert.deepEqual(analysis.negative_terms,[]);
 assert.deepEqual(analysis.determined_careers,[]);
});

test('la prioridad se asocia a la carrera decidida y no a menciones cercanas',()=>{
 const {detectCareerIntent}=require('../../../packages/career-recommender/career-intent.cjs');
 const targets=answer=>detectCareerIntent({g_futuro:{answer}}).map(item=>item.term);
 assert.deepEqual(targets('Quiero estudiar informática y solo tengo curiosidad por psicología.'),['computer science']);
 assert.deepEqual(targets('Quiero estudiar derecho y mi hermana quiere estudiar medicina.'),['law']);
 assert.deepEqual(targets('Quiero estudiar informática porque mi hermana quiere medicina.'),['computer science']);
 assert.deepEqual(targets('Quiero estudiar Ingeniería Química.'),['chemical engineering']);
});
