'use strict';

const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const ROOT = resolve(__dirname, '../../..');
const LOCAL_ONLY = new Set();
const MAX_RESULT_AGE_MS = 24 * 60 * 60 * 1000;

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 });
}

function releaseRevision() {
  if (process.env.ROBIN_LOCAL_TESTS !== 'true') return String(process.env.ROBIN_RELEASE_COMMIT_REF || process.env.COMMIT_REF || process.env.DEPLOY_ID || 'unknown');
  const head = git(['rev-parse', 'HEAD']).toString().trim();
  const status = git(['status', '--porcelain', '--untracked-files=all']);
  if (!status.length) return head;
  const hash = createHash('sha256').update(head).update(git(['diff', '--binary', 'HEAD']));
  const untracked = git(['ls-files', '--others', '--exclude-standard', '-z']).toString().split('\0').filter(Boolean).sort();
  for (const name of untracked) hash.update(name).update(readFileSync(resolve(ROOT, name)));
  return `${head}:dirty:${hash.digest('hex').slice(0, 16)}`;
}

function releaseScope() {
  return process.env.ROBIN_LOCAL_TESTS === 'true' ? 'local' : 'production';
}

async function recordResult(sb, result) {
  const revision = releaseRevision();
  const { error } = await sb.from('webhook_log').insert({
    source: 'release_test',
    result: result.status,
    message: String(result.detail || '').slice(0, 1000),
    payload: {
      check_id: result.id,
      revision,
      scope: releaseScope(),
      detail: String(result.detail || ''),
      duration_ms: Number(result.duration_ms || 0),
      ran_at: result.ran_at || new Date().toISOString(),
    },
  });
  if (error) throw new Error(`No se pudo registrar el resultado del test: ${error.message}`);
  return revision;
}

async function listResults(sb, checks) {
  const revision = releaseRevision();
  const scope = releaseScope();
  const { data, error } = await sb.from('webhook_log')
    .select('result,payload,created_at').eq('source', 'release_test')
    .contains('payload', { revision })
    .gte('created_at', new Date(Date.now() - MAX_RESULT_AGE_MS).toISOString())
    .order('created_at', { ascending: false }).limit(500);
  if (error) throw new Error(`No se pudieron leer los resultados: ${error.message}`);
  const results = {};
  for (const row of data || []) {
    const id = row.payload?.check_id;
    if (!checks.some((check) => check.id === id) || results[id]) continue;
    const expectedScope = scope === 'production' && LOCAL_ONLY.has(id) ? 'local' : scope;
    if (row.payload?.scope !== expectedScope) continue;
    results[id] = {
      id,
      status: row.result,
      detail: row.payload.detail || row.result,
      duration_ms: Number(row.payload.duration_ms || 0),
      ran_at: row.payload.ran_at || row.created_at,
    };
  }
  return { revision, scope, results };
}

module.exports = { LOCAL_ONLY, releaseRevision, releaseScope, recordResult, listResults };
