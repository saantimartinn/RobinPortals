const test = require('node:test');
const assert = require('node:assert/strict');
const { matchStudent, summarizeMeeting, createTranscriptService } = require('../../../packages/meeting-history/service.cjs');

const users = [
  { id: 'ana', nombre: 'Ana', apellidos: 'García', lead_id: '123', assigned_to: 'advisor@example.com', role: 'client' },
  { id: 'other', nombre: 'Ana', apellidos: 'García', lead_id: '456', assigned_to: 'other@example.com', role: 'client' },
];
test('el identificador completo del alumno prevalece y no coincide como subcadena', () => {
  assert.equal(matchStudent('Sesión 123 · Transcript', users, 'advisor@example.com').id, 'ana');
  assert.equal(matchStudent('Sesión 91234 · Transcript', users, 'advisor@example.com'), null);
});
test('solo enlaza un nombre completo inequívoco de la cartera del asesor', () => {
  assert.equal(matchStudent('Ana García - Transcripción', users, 'advisor@example.com').id, 'ana');
  assert.equal(matchStudent('Ana - Transcript', users, 'advisor@example.com'), null);
  assert.equal(matchStudent('Ana García', [...users, { ...users[0], id: 'duplicate' }], 'advisor@example.com'), null);
  assert.equal(matchStudent('Llamada sin nombre', users, 'advisor@example.com'), null);
});
test('la IA resume solo la reunión nueva sin reescribir el historial anterior', async () => {
  let prompt;
  const summary = await summarizeMeeting({ text: 'Hablamos de un grado y acordamos revisar los requisitos.', title: 'Orientación', meetingAt: '2026-11-11T10:00:00Z' }, async input => {
    prompt = input;
    return { text: '- Decisión: revisar requisitos.', raw: { stop_reason: 'end_turn' } };
  });
  assert.equal(summary, '- Decisión: revisar requisitos.');
  assert.match(prompt.system, /No inventes/);
  assert.doesNotMatch(prompt.messages[0].content, /HISTORIAL PREVIO/);
  await assert.rejects(summarizeMeeting({ text: 'Hablamos de preparar la solicitud de admisión.', title: 'Prueba' }, async () => ({ text: 'parcial', raw: { stop_reason: 'max_tokens' } })), /summary_truncated/);
});

function fixture({ aiFails = false, match = true, nearbyBooking = null } = {}) {
  const rows = new Map();
  const completed = [];
  let summaries = 0;
  const repo = {
    async enqueue(row) { if (rows.has(row.external_id)) return null; const item = { ...row, id: row.external_id, status: 'queued' }; rows.set(row.external_id, item); return item; },
    async claim() { const items = [...rows.values()].filter(row => row.status === 'queued' || row.status === 'failed'); items.forEach(row => { row.status = 'processing'; row.lease_token = 'lease'; }); return items.map(row => ({ ...row })); },
    async candidates() { return match ? users : []; },
    async booking() { return nearbyBooking; },
    async saveRaw(item, text) { rows.get(item.external_id).raw_text = text; },
    async complete(item, result) { completed.push(result); rows.get(item.external_id).status = 'completed'; return 'Anterior intacto'; },
    async fail(item, code, status) { Object.assign(rows.get(item.external_id), { error_code: code, status }); },
  };
  const google = { driveListTranscriptDocs: async () => [{ id: 'doc', name: 'Ana García - Transcript', createdTime: '2026-11-11T10:00:00Z' }], driveExportText: async () => 'La alumna confirma que quiere explorar Psicología y preparar su solicitud.' };
  const service = createTranscriptService({ repo, google, summarize: async () => { summaries++; if (aiFails) throw new Error('provider_unavailable'); return '- Temas: Psicología.'; } });
  return { service, rows, completed, summaries: () => summaries };
}
test('descubrir y procesar varias veces conserva una única reunión', async () => {
  const { service, rows, completed, summaries } = fixture();
  await service.discover([{ email: 'advisor@example.com' }]);
  await service.discover([{ email: 'advisor@example.com' }]);
  await service.processBatch();
  await service.processBatch();
  assert.equal(rows.size, 1);
  assert.equal(completed.length, 1);
  assert.equal(completed[0].userId, 'ana');
  assert.equal(summaries(), 1);
});
test('un fallo de IA conserva el texto original y deja la reunión reintentable', async () => {
  const { service, rows, completed } = fixture({ aiFails: true });
  await service.discover([{ email: 'advisor@example.com' }]);
  const result = await service.processBatch();
  assert.equal(result.failed, 1);
  assert.match(rows.get('drive:doc').raw_text, /Psicología/);
  assert.equal(rows.get('drive:doc').status, 'failed');
  assert.equal(completed.length, 0);
});
test('sin identidad segura no atribuye la llamada a la reserva más cercana', async () => {
  const { service, rows, completed, summaries } = fixture({ match: false });
  await service.discover([{ email: 'advisor@example.com' }]);
  const result = await service.processBatch();
  assert.equal(result.unmatched, 1);
  assert.equal(rows.get('drive:doc').status, 'unmatched');
  assert.equal(completed.length, 0);
  assert.equal(summaries(), 0);
});
test('un documento compartido se importa desde su asesor propietario y no desde el primero que lo ve', async () => {
  const queued=[];
  const service=createTranscriptService({repo:{enqueue:async row=>{queued.push(row.advisor_email);return row;}},google:{driveListTranscriptDocs:async()=>[{id:'shared',name:'Ana García - Transcript',createdTime:'2026-11-11T10:00:00Z',owners:[{emailAddress:'manuel@example.com'}]}]},summarize:async()=>''});
  await service.discover([{email:'noel@example.com'},{email:'manuel@example.com'}]);
  assert.deepEqual(queued,['manuel@example.com']);
});
test('una transcripción retrasada no toma la fecha ni el título de una reserva posterior', async () => {
  const {service,completed}=fixture({nearbyBooking:{id:'later',topic:'Otra reunión',start_at:'2026-11-11T09:30:00Z'}});
  await service.discover([{email:'advisor@example.com'}]);
  await service.processBatch();
  assert.equal(completed[0].bookingId,null);
  assert.equal(completed[0].meetingAt,'2026-11-11T10:00:00Z');
  assert.equal(completed[0].title,'Ana García - Transcript');
});
test('las notas manuales breves siguen siendo válidas aunque una transcripción incompleta de Drive deba reintentarse', async () => {
  const {service,completed}=fixture();
  await service.recordManual({userId:'ana',advisorEmail:'advisor@example.com',text:'Todo bien.',title:'Seguimiento',meetingAt:'2026-11-11T12:00:00Z'});
  assert.equal(completed.length,1);
  assert.equal(completed[0].text,'Todo bien.');
});
