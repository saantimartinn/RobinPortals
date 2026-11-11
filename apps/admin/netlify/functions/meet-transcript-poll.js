// Scheduled discovery only; long transcription/AI work runs in a background function.
exports.scheduleEnabledEnv = 'MEET_TRANSCRIPT_POLL_ENABLED';
exports.handler = require('../../lib/meeting-history').poll;
