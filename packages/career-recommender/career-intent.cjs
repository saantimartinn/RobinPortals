// Strong career preference must be grounded in an explicit first-person statement.
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const TARGETS = [
 ['aerospace engineering', /\b(aeroespacial|aeronautic\w*|aerospace|aeronautical)\b/],
 ['mechanical engineering', /\b(ingenieria mecanica|mechanical engineering)\b/],
 ['electrical engineering', /\b(ingenieria electrica|electrical engineering)\b/],
 ['biomedical engineering', /\b(ingenieria biomedica|biomedical engineering)\b/],
 ['chemical engineering', /\b(ingenieria quimica|chemical engineering)\b/],
 ['industrial engineering', /\b(ingenieria industrial|industrial engineering)\b/],
 ['neuroscience', /\b(neurociencia|neuroscience)\b/],
 ['philosophy', /\b(filosofia|philosophy)\b/],
 ['history', /\b(historia|history)\b/],
 ['civil engineering', /\b(ingenieria civil|civil engineering)\b/],
 ['computer science', /\b(informatica|computer science|software engineering|ingenieria del software)\b/],
 ['artificial intelligence', /\b(inteligencia artificial|artificial intelligence)\b/],
 ['data science', /\b(ciencia de datos|data science)\b/],
 ['cybersecurity', /\b(ciberseguridad|cybersecurity)\b/],
 ['medicine', /\b(medicina|medicine|medic[oa]|doctor|surgeon)\b/],
 ['psychology', /\b(psicologia|psicolog[oa]|psychology|psychologist)\b/],
 ['biology', /\b(biologia|biology|biolog[oa])\b/],
 ['chemistry', /\b(quimica|chemistry|quimic[oa])\b/],
 ['physics', /\b(fisica|physics|fisic[oa])\b/],
 ['mathematics', /\b(matematicas|mathematics|matematic[oa])\b/],
 ['economics', /\b(economia|economics|economista)\b/],
 ['business', /\b(administracion de empresas|business administration|ade)\b/],
 ['marketing', /\b(marketing|publicidad|advertising)\b/],
 ['finance', /\b(finanzas|finance)\b/],
 ['law', /\b(derecho|abogad[oa]|law|lawyer)\b/],
 ['international relations', /\b(relaciones internacionales|international relations)\b/],
 ['political science', /\b(ciencias politicas|political science)\b/],
 ['communication', /\b(comunicacion|communication)\b/],
 ['journalism', /\b(periodismo|periodista|journalism|journalist)\b/],
 ['design', /\b(diseno|design|disenador\w*)\b/],
 ['architecture', /\b(arquitectura|arquitect[oa]|architecture|architect)\b/],
 ['education', /\b(magisterio|education|teacher|profesor\w*)\b/],
];
const INTENT = /\b(quiero (?:estudiar|ser|hacer|cursar|dedicarme)|he decidido|tengo (?:muy )?claro|mi (?:objetivo|vocacion|decision) es|estoy decidid[oa]|i want to (?:study|be|become)|i have decided|my goal is|quero (?:estudar|ser)|tenho decidido)\b/;
const NEGATIVE = /\b(no (?:quiero|me interesa|voy a)|not want|don t want|nao quero|descarto|rechazo)\b/;
const UNCERTAIN = /\b(no tengo claro|quizas|quiza|tal vez|puede que|podria|no lo se|no se|no estoy segur\w*|aun tengo dudas|todavia tengo dudas|maybe|might|not sure|talvez|nao sei)\b/;
function careerClauses(answer) {
 return String(answer || '').split(/[.;!?\n,]|\b(?:pero|but|aunque|although)\b|\b(?:y|and|e)\b/i).map(evidence => {
  const text = normalize(evidence);
  const bareRejection = /^(?:no|not|nao)\b(?!\s+(?:solo|only)\b)/.test(text) && !UNCERTAIN.test(text);
  return {evidence:evidence.trim(),text,negative:NEGATIVE.test(text)||bareRejection,uncertain:UNCERTAIN.test(text)};
 }).filter(claim=>claim.text);
}
function careerMentions(text) {
 const matches = TARGETS.flatMap(([term,pattern])=>{
  const match=pattern.exec(text);
  return match ? [{term,start:match.index,end:match.index+match[0].length}] : [];
 });
 return matches.filter(match=>!matches.some(other=>other!==match && other.start<=match.start && other.end>=match.end && other.end-other.start>match.end-match.start));
}
function determinedClaims(answer) {
 const claims = careerClauses(answer);
 return claims.map(claim=>{
  // Reasons and third-person background do not extend the student's chosen degree.
  const direct=claim.text.split(/\b(?:para|porque|because|mientras|while)\b/)[0].trim();
  return careerMentions(direct).length ? {...claim,text:direct} : claim;
 }).filter((claim,index) => {
  if (!INTENT.test(claim.text) || claim.negative || claim.uncertain) return false;
  // A later doubt about the career qualifies the decision; a doubt about location does not.
  return !claims.slice(index+1).some(next=>next.uncertain && !/\b(pais|ciudad|country|city|universidad|university)\b/.test(next.text));
 });
}
function detectCareerIntent(responses = {}) {
 const targets = [];
 for (const [field,item] of Object.entries(responses)) {
  for (const claim of determinedClaims(item?.answer)) {
   for (const {term} of careerMentions(claim.text)) if (!targets.some(t=>t.term===term)) {
    targets.push({term,source_field:field,evidence:claim.evidence.slice(0,400)});
   }
  }
 }
 return targets.slice(0,5);
}
function groundedCareerIntent(value, responses, fallback = []) {
 const targets = Array.isArray(value) ? [] : [...fallback];
 for (const item of Array.isArray(value) ? value : []) {
  const answer = String(responses?.[item?.source_field]?.answer || '');
  const evidence = String(item?.evidence || '').trim();
  const text = normalize(evidence);
  // AI may identify additional degree names, but cannot invent the student's commitment.
  if (!evidence || !normalize(answer).includes(text)) continue;
  const term = String(item.term || '').trim().toLowerCase().slice(0,100);
  const known = TARGETS.find(([name])=>name===term);
  const namesCareer = determinedClaims(answer).some(claim => {
   const named = known ? careerMentions(claim.text).some(mention=>mention.term===term) : (` ${claim.text} `).includes(` ${normalize(term)} `);
   return named && (text.includes(claim.text) || claim.text.includes(text));
  });
  if (term && namesCareer && !targets.some(target=>target.term===term)) targets.push({term,source_field:item.source_field,evidence:evidence.slice(0,400)});
 }
 return targets.slice(0,5);
}
function scoreCareerDetermination(career, analysis) {
 const blob = ` ${normalize([career.career_name,career.subarea].join(' '))} `;
 const matches = (analysis?.determined_careers || []).some(target => {
  const term = normalize(target.term);
  if (!term) return false;
  if (blob.includes(` ${term} `)) return true;
  const words = term.split(' ').filter(word=>word.length>=4);
  return words.length>=2 && words.every(word=>blob.includes(` ${word} `));
 });
 return matches ? 25 : 0;
}
module.exports = {detectCareerIntent,groundedCareerIntent,scoreCareerDetermination,careerClauses};
