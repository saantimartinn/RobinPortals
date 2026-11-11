const { createMeetingRepository } = require('./repository.cjs');
const { createTranscriptService, summarizeMeeting } = require('./service.cjs');

function createTranscriptHandlers({ appId, getSupabase, google, chatCompletion, advisors, http }) {
  const service = () => createTranscriptService({ repo: createMeetingRepository(getSupabase()), google,
    summarize: meeting => summarizeMeeting(meeting, chatCompletion) });
  async function kick() {
    const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
    const secret = process.env.MEET_WEBHOOK_SECRET;
    if (!base || !secret) throw new Error('transcript_worker_not_configured');
    const name = process.env.ROBIN_APP_ID ? `${appId}-meet-transcript-process-background` : 'meet-transcript-process-background';
    const response = await fetch(new URL(`/.netlify/functions/${name}`, base), {
      method: 'POST', headers: { 'x-meet-worker-secret': secret, 'Content-Type': 'application/json' },
      body: '{}', signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('transcript_worker_dispatch_failed');
  }
  async function poll(event) {
    if (event?.httpMethod) return http.json({ error: 'not_found' }, { statusCode: 404 });
    if (process.env.MEET_TRANSCRIPT_POLL_ENABLED !== 'true') return http.json({}, { statusCode: 204 });
    await kick();
    const result = { ok: true, dispatched: true, ran_at: new Date().toISOString() };
    console.log('meet-transcript-poll', JSON.stringify(result));
    return http.json(result);
  }
  async function worker(event) {
    if (event.httpMethod !== 'POST') return http.methodNotAllowed(['POST']);
    const headers = event.headers || {};
    const key = Object.keys(headers).find(name => name.toLowerCase() === 'x-meet-worker-secret');
    const auth = http.verifyConfiguredSecret(process.env.MEET_WEBHOOK_SECRET, key ? headers[key] : '');
    if (!auth.ok) return http.json({ error: auth.error }, { statusCode: auth.statusCode });
    const processor = service();
    const discovery = await processor.discover(advisors, Number(process.env.MEET_POLL_LOOKBACK_HOURS) || 168);
    const result = { discovery, ...await processor.processBatch(5) };
    console.log('meet-transcript-worker', JSON.stringify(result));
    return http.json(result);
  }
  return { service, kick, poll, worker };
}
module.exports = { createTranscriptHandlers };
