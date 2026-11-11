const test = require('node:test');
const assert = require('node:assert/strict');
const { createMeetArtifacts } = require('../../../packages/meeting-history/google-artifacts.cjs');

test('la búsqueda de transcripciones recorre todas las páginas de Drive', async () => {
  const urls = [];
  const api = createMeetArtifacts({ getAccessToken: async () => 'test-token', fetch: async url => {
    urls.push(new URL(url));
    return Response.json(urls.length === 1 ? { files: [{id:'first',name:'Ana García - Transcript'},{id:'notes',name:'Notas de orientación'}], nextPageToken:'next' } : { files:[{id:'last',name:'Sesión final - Transcripción'}] });
  } });
  assert.deepEqual((await api.driveListTranscriptDocs('advisor','2026-11-01T00:00:00Z')).map(doc => doc.id), ['first','last']);
  assert.equal(urls[1].searchParams.get('pageToken'), 'next');
});
test('solo cambia la transcripción automática y comprueba que Google la haya activado', async () => {
  let request;
  const api = createMeetArtifacts({ getAccessToken: async () => 'test-token', fetch: async (url, options) => {
    if (!options.method) return Response.json({name:'spaces/MeetingResource123'});
    request = { url: new URL(url), ...options };
    if (request.url.pathname !== '/v2/spaces/MeetingResource123') return Response.json({error:{}},{status:404});
    return Response.json({ config:{artifactConfig:{transcriptionConfig:{autoTranscriptionGeneration:'ON'}}} });
  } });
  const result = await api.enableAutomaticTranscription('advisor','abc-defg-hij');
  assert.equal(result.enabled,true);
  assert.equal(request.method,'PATCH');
  assert.equal(request.url.pathname,'/v2/spaces/MeetingResource123');
  assert.equal(request.url.searchParams.get('updateMask'),'config.artifactConfig.transcriptionConfig.autoTranscriptionGeneration');
  assert.deepEqual(JSON.parse(request.body), {config:{artifactConfig:{transcriptionConfig:{autoTranscriptionGeneration:'ON'}}}});
});
test('un permiso insuficiente se informa como fallo y no como transcripción activada', async () => {
  const api=createMeetArtifacts({getAccessToken:async()=>'test-token',fetch:async()=>Response.json({error:{status:'PERMISSION_DENIED'}},{status:403})});
  await assert.rejects(api.enableAutomaticTranscription('advisor','abc-defg-hij'), /meet_transcription_permission_denied/);
});
