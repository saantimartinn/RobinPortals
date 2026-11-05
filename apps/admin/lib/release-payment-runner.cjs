'use strict';

const { execFile } = require('node:child_process');
const { resolve } = require('node:path');

const ROOT = resolve(__dirname, '../../..');
const ACTIONS = new Set(['start', 'status', 'verify', 'cleanup']);

function runPaymentAction(action, adminId) {
  if (!ACTIONS.has(action)) throw new Error('Acción de pago de prueba no válida');
  if (process.env.ROBIN_LOCAL_TESTS !== 'true') {
    return require('./release-payment-production.cjs').runProductionPaymentAction(action, adminId);
  }
  return new Promise((resolveResult, reject) => {
    execFile(process.execPath, ['--env-file=.env', 'dev/release-payment-manual.cjs', action], {
      cwd: ROOT,
      timeout: 120000,
      maxBuffer: 1024 * 1024,
      env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, LANG: process.env.LANG, ROBIN_LOCAL_TESTS: 'true' },
    }, (error, stdout, stderr) => {
      const lines = String(stdout || '').trim().split(/\r?\n/).filter(Boolean);
      if (error) return reject(new Error(String(stderr || lines.at(-1) || error.message).slice(0, 500)));
      try {
        const result = JSON.parse(lines.at(-1) || '{}');
        if (!result.status) throw new Error('sin estado');
        resolveResult(result);
      } catch (_) { reject(new Error('La prueba de pago no devolvió un resultado válido')); }
    });
  });
}

module.exports = { runPaymentAction };
