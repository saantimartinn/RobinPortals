const { chatCompletion } = require('./anthropic-chat');
const createAnalyzer = require('../../../packages/career-recommender/open-text-signals.cjs');
const createEngine = require('../../../packages/career-recommender/career-suggestions.cjs');
// Keep the recommender's model independent of OCR/chat settings.
const complete = (options) => chatCompletion({ ...options, model: process.env.RECOMMENDER_ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001' });
module.exports = createEngine({ chatCompletion: complete, ...createAnalyzer({ chatCompletion: complete }) });
