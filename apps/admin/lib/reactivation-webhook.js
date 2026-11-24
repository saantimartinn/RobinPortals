const { createHmac, timingSafeEqual } = require('node:crypto');

// Svix signs the original bytes, including whitespace. Built-in crypto provides
// HMAC-SHA256 and constant-time comparison; old deliveries cannot be replayed.
function verifyEmailEvent(event, secret = process.env.RESEND_WEBHOOK_SECRET, now = Date.now()) {
  if (!secret) throw new Error('webhook_not_configured');
  const headers = Object.fromEntries(Object.entries(event.headers || {}).map(([key, value]) => [key.toLowerCase(), value]));
  const id = headers['svix-id'];
  const timestamp = headers['svix-timestamp'];
  if (!id || !/^\d+$/.test(timestamp || '') || Math.abs(now / 1000 - Number(timestamp)) > 300) throw new Error('invalid_webhook_timestamp');
  const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : String(event.body || '');
  const signature = createHmac('sha256', Buffer.from(secret.replace(/^whsec_/, ''), 'base64')).update(`${id}.${timestamp}.${raw}`).digest();
  const valid = String(headers['svix-signature'] || '').split(' ').some(part => {
    const [version, value] = part.split(',');
    if (version !== 'v1' || !value) return false;
    const candidate = Buffer.from(value, 'base64');
    return candidate.length === signature.length && timingSafeEqual(signature, candidate);
  });
  if (!valid) throw new Error('invalid_webhook_signature');
  return JSON.parse(raw);
}

module.exports = { verifyEmailEvent };
