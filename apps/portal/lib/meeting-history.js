// Shared durable meeting intake and summaries, using this app's private services.
const { createTranscriptHandlers } = require('../../../packages/meeting-history/handlers.cjs');
module.exports = createTranscriptHandlers({
  appId: 'portal',
  getSupabase: require('./supabase').getSupabase,
  google: require('./google-calendar'),
  chatCompletion: require('./anthropic-chat').chatCompletion,
  advisors: require('./admins').ADVISORS,
  http: require('./http'),
});
