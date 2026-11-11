// Webhook and scheduled discovery share the same durable, deduplicated intake.
module.exports = require('../../../packages/meeting-history/webhook.cjs').createMeetWebhookProcessor({
  getSupabase: require('./supabase').getSupabase,
  google: require('./google-calendar'),
  meetings: require('./meeting-history'),
});
