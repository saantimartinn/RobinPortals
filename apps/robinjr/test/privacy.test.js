// Automated checks for privacy test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const { emailLogMetadata, minimizeLogPayload } = require('../lib/privacy');

test('el log persistente elimina PII, texto y secretos', () => {
  assert.deepEqual(minimizeLogPayload({
    event_id: 'evt_1',
    user_id: 'user-1',
    email: 'private@example.com',
    name: 'Private Name',
    notes_preview: 'private transcript',
    transcript: 'private transcript',
    token: 'secret',
    body: { private: true },
  }), { event_id: 'evt_1', user_id: 'user-1' });
});

test('conserva identificadores técnicos permitidos con nombres canónicos', () => {
  assert.deepEqual(minimizeLogPayload({
    transcript_name: 'conferenceRecords/1/transcripts/2',
    conference_record: 'conferenceRecords/1',
    ce_type: 'transcript.generated',
    has_transcript: true,
  }), {
    transcript_name: 'conferenceRecords/1/transcripts/2',
    conference_record: 'conferenceRecords/1',
    ce_type: 'transcript.generated',
    has_transcript: true,
  });
});

test('el fallback de email conserva métricas pero no destinatarios ni contenido', () => {
  assert.deepEqual(emailLogMetadata({
    to: ['one@example.com', 'two@example.com'],
    subject: 'Private subject',
    text: 'Private body',
    tag: 'welcome',
    attachments: [{ filename: 'dni.pdf' }],
  }), { tag: 'welcome', recipient_count: 2, has_attachments: true });
});
