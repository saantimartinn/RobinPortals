// Server-side sandbox mode helpers used by request handlers; provider calls and domain rules stay behind this boundary.
const REVOLUT_SANDBOX_BASE = 'https://sandbox-merchant.revolut.com';

function isIsolatedSandbox(env = process.env) {
  const provider = String(env.PAYMENT_PROVIDER || '').trim().toLowerCase();
  const apiBase = String(env.REVOLUT_API_BASE || '').trim().replace(/\/$/, '');
  const context = String(env.CONTEXT || '').trim().toLowerCase();
  return provider === 'revolut' &&
    apiBase === REVOLUT_SANDBOX_BASE &&
    context !== 'production';
}

module.exports = { REVOLUT_SANDBOX_BASE, isIsolatedSandbox };
