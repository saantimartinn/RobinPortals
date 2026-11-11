import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { subjectPreferenceError, subjectPreferencesMatch } from '../../../packages/onboarding/subject-preferences.mjs';

test('cada asignatura necesita un pulgar antes de continuar', () => {
  assert.match(subjectPreferenceError([]), /Añade/);
  assert.match(subjectPreferenceError([{name:'Física',preference:null}]), /pulgar/);
  assert.match(subjectPreferenceError([{name:'Física',preference:'like'},{name:'Arte',preference:null}]), /pulgar/);
  assert.equal(subjectPreferenceError([{name:'Física',preference:'like'},{name:'Arte',preference:'dislike'}]), '');
});
const require = createRequire(import.meta.url);
for (const app of ['portal','robinjr']) {
  test(`${app}: el endpoint no completa el onboarding si falta un pulgar`, async () => {
    const previous=process.env.JWT_SECRET;
    process.env.JWT_SECRET='subject-preference-test-only-secret';
    try {
      const {signSession,buildSessionCookie}=require(`../../${app}/lib/auth`);
      const {handler}=require(`../../${app}/netlify/functions/onboarding-profile`);
      const response=await handler({httpMethod:'POST',headers:{host:'portal.test',origin:'https://portal.test',cookie:buildSessionCookie(signSession({id:'test-student',role:'client',auth_source:app==='robinjr'?'application_sso':undefined}))},body:JSON.stringify({email:'student@example.com',intereses:['ciencias'],academic_system:'bachillerato_espanol',academic_subjects:[{name:'Física',level:''}],questionnaire:{version:1,blocks:[{title:'General',items:[]}],signals:{asignaturas:[{name:'Física',preference:null}]}}})});
      assert.equal(response.statusCode,400);
      assert.equal(JSON.parse(response.body).error,'missing_subject_preferences');
    } finally {if(previous===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=previous;}
  });
}
test('el recomendador utiliza los pulgares nuevos y la posición de las asignaturas no cambia la afinidad', () => {
  const {prepareStudent}=require('../../../packages/career-recommender/student-profile.cjs');
  const recommender=require('../lib/careers-recommender');
  const subjects=[{name:'Matemáticas',preference:'like'},{name:'Arte',preference:'dislike'}];
  const forward=prepareStudent({questionnaire:{signals:{asignaturas:subjects}}}).questionnaire.signals;
  const reverse=prepareStudent({questionnaire:{signals:{asignaturas:[...subjects].reverse()}}}).questionnaire.signals;
  assert.deepEqual(forward.asignaturas_fav,['matematicas']);
  assert.deepEqual(forward.asignaturas_menos,['arte']);
  const career=recommender.findCareer('tue-applied-mathematics');
  assert.equal(recommender.deterministicScore(career,forward,[career.area]),recommender.deterministicScore(career,reverse,[career.area]));
});
test('el perfil enviado a la IA elimina las instrucciones de ordenar y las posiciones históricas sin cambiar lo guardado', () => {
  const {prepareStudent}=require('../../../packages/career-recommender/student-profile.cjs');
  const recommender=require('../lib/careers-recommender');
  const original={questionnaire:{blocks:[{title:'General',items:[{q:'¿Qué asignaturas cursas? Ordénalas de la que más te gusta a la que menos.',a:['1. Arte — No me gusta','2. Matemáticas — Me gusta']}]}],signals:{asignaturas_ordenadas:[{name:'Arte',rank:1,preference:'dislike'},{name:'Matemáticas',rank:2,preference:'like'}]}}};
  const prepared=prepareStudent(original);
  const text=recommender.formatStudentProfile(prepared.questionnaire, []);
  assert.doesNotMatch(text,/ordénalas|1\. Arte|2\. Matemáticas/i);
  assert.match(text,/Arte.*No me gusta/);
  assert.equal(prepared.questionnaire.signals.asignaturas_ordenadas,undefined);
  assert.equal(original.questionnaire.signals.asignaturas_ordenadas[0].rank,1);
  assert.match(original.questionnaire.blocks[0].items[0].q,/Ordénalas/);
});
test('el servidor comprueba todos los pulgares contra las asignaturas reales, sin aceptar omitidas ni duplicadas', () => {
  const subjects=[{name:'Física'},{name:'Arte'}];
  assert.equal(subjectPreferencesMatch({asignaturas:[{name:'Física',preference:'like'}]}, subjects), false);
  assert.equal(subjectPreferencesMatch({asignaturas:[{name:'Física',preference:'like'},{name:'Arte',preference:null}]}, subjects), false);
  assert.equal(subjectPreferencesMatch({asignaturas:[{name:'Física',preference:'like'},{name:'Física',preference:'dislike'}]}, subjects), false);
  assert.equal(subjectPreferencesMatch({asignaturas:[{name:'Arte',preference:'dislike'},{name:'Física',preference:'like'}]}, subjects), true);
});
