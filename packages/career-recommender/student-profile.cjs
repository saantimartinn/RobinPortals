// Bridge free-form subjects and legacy questionnaires to RBMT's stable signals.
const OPEN_QUESTIONS = require('./open-questions.json');
const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const SUBJECTS = [
  ['matematicas', /\b(matematicas?|mathematics|maths?|mathematiques|statistics|estadistica)\b/],
  ['fisica', /\b(fisica|physics|physique)\b/],
  ['quimica', /\b(quimica|chemistry|chimie)\b/],
  ['biologia', /\b(biologia|biology|biologie)\b/],
  ['informatica', /\b(informatica|computing|computer science|programacion|programming)\b/],
  ['economia', /\b(economia|economics|business|empresa|empresas|management)\b/],
  ['arte', /\b(arte|artes|arts?|design|diseno|creatividad|musica|music)\b/],
  ['lengua', /\b(lengua|language|literatura|literature|historia|history|filosofia|philosophy|espanol|english|ingles|frances|french|latin)\b/],
];
function subjectTokens(values) {
  return [...new Set((Array.isArray(values) ? values : []).flatMap(value => {
    const label = normalize(typeof value === 'object' ? value?.name : value);
    return SUBJECTS.filter(([, pattern]) => pattern.test(label)).map(([token]) => token);
  }))];
}
function normalizeSignals(signals = {}) {
  const out = { ...signals };
  const ranked = Array.isArray(signals.asignaturas_ordenadas) ? signals.asignaturas_ordenadas : [];
  const likes = ranked.length ? ranked.filter(s=>s.preference==='like').map(s=>s.name) : signals.asignaturas_fav;
  const dislikes = ranked.length ? ranked.filter(s=>s.preference==='dislike').map(s=>s.name) : signals.asignaturas_menos;
  out.asignaturas_fav = subjectTokens(likes);
  // Conflicting preferences for variants of one subject carry no deterministic weight.
  out.asignaturas_menos = subjectTokens(dislikes);
  const conflict = out.asignaturas_fav.filter(s=>out.asignaturas_menos.includes(s));
  out.asignaturas_fav = out.asignaturas_fav.filter(s=>!conflict.includes(s));
  out.asignaturas_menos = out.asignaturas_menos.filter(s=>!conflict.includes(s));
  return out;
}
function collectOpenResponses(questionnaire = {}) {
  const allowed = new Map(OPEN_QUESTIONS.map(def=>[normalize(def.q),def]));
  const responses = {};
  for (const block of questionnaire.blocks || []) for (const item of block.items || []) {
    const def = allowed.get(normalize(item.q));
    if (def && typeof item.a === 'string' && item.a.trim()) responses[def.id] = {question:def.q,answer:item.a.trim().slice(0,4000)};
  }
  // Also support RBMT-format profiles and older stored profiles with explicit field IDs.
  const ids = new Set(OPEN_QUESTIONS.map(def=>def.id));
  for (const [id,item] of Object.entries(questionnaire.signals?.open_responses || {})) {
    if (!responses[id] && ids.has(id) && typeof item?.answer === 'string') responses[id] = {question:String(item.question||'').slice(0,400),answer:item.answer.slice(0,4000)};
  }
  return responses;
}
function prepareStudent(user) {
  const questionnaire = user.questionnaire || {};
  return {...user,questionnaire:{...questionnaire,signals:{...normalizeSignals(questionnaire.signals),open_responses:collectOpenResponses(questionnaire)}}};
}
function historicalSignals(value = {}) {
  const signals = normalizeSignals(value);
  const result = {};
  for (const key of ['areas','asignaturas_fav','asignaturas_menos','rasgos','valora','paises','prioridad','nivel_ingles','estilo_aprendizaje']) {
    if (signals[key] != null) result[key] = signals[key];
  }
  const analysis = signals.open_text_analysis;
  if (analysis) result.open_text_analysis = {
    informativeness: analysis.informativeness,
    positive_terms: analysis.positive_terms || [], negative_terms: analysis.negative_terms || [],
    determined_careers: (analysis.determined_careers || []).map(({term})=>({term})),
  };
  return result;
}
module.exports = {subjectTokens,normalizeSignals,collectOpenResponses,prepareStudent,historicalSignals};
