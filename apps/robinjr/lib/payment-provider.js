// Server-side payment provider helpers used by request handlers; provider calls and domain rules stay behind this boundary.
const revolut = require('./revolut');

function name() {
  return 'revolut';
}

function isConfigured() {
  return revolut.isConfigured();
}

module.exports = { name, isConfigured };
