const { createMeetingRepository } = require('./repository.cjs');

function createMeetWebhookProcessor({ getSupabase, google, meetings }) {
  async function logMeetWebhook(sb, payload, result, message) {
    // Provider identifiers only; never put transcript text in logs.
    const { error } = await sb.from('webhook_log').insert({ source: 'meet', payload: {
      transcript_name: payload.transcript_name || null, conference_record: payload.conference_record || null,
    }, result, message });
    if (error) console.warn('[meet_log_failed]');
  }
  async function processMeetTranscript({ advisorEmail, transcriptName, conferenceRecord }) {
    const meta = await google.getTranscript(advisorEmail, transcriptName);
    const documentId = meta.docsDestination?.document;
    if (!documentId) throw new Error('transcript_document_not_ready');
    const doc = await google.driveGetTranscriptDoc(advisorEmail, documentId);
    let callStart = meta.startTime;
    if (!callStart && conferenceRecord) callStart = (await google.getConferenceRecord(advisorEmail, conferenceRecord)).startTime;
    if (callStart && Number.isNaN(new Date(callStart).getTime())) throw new Error('invalid_meeting_time');
    await createMeetingRepository(getSupabase()).enqueue({ external_id: `drive:${documentId}`, source: 'drive',
      advisor_email: advisorEmail, title: doc.name || 'Reunión Meet', meeting_at:callStart || doc.createdTime || new Date().toISOString(), meeting_at_source:callStart ? 'conference':'document' });
    await meetings.kick();
    return { statusCode: 200, payload: { ok: true, queued: true } };
  }
  return { logMeetWebhook, processMeetTranscript };
}
module.exports = { createMeetWebhookProcessor };
