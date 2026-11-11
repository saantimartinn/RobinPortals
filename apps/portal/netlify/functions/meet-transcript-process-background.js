// Netlify background worker. Only the server-held Meet secret can dispatch work.
exports.handler = require('../../lib/meeting-history').worker;
