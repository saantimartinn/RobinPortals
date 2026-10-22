// Maintenance utility for check syntax; it is run explicitly by developers or CI.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const sourceRoots = ['lib', 'netlify/functions', 'netlify/edge-functions', 'shared', 'scripts'];
const ignored = new Set(['node_modules', 'dist', 'deploy']);
const failures = [];
let checked = 0;

function localDependencyExists(fromFile, request) {
  const base = path.resolve(path.dirname(fromFile), request);
  const candidates = [
    base,
    `${base}.js`,
    `${base}.cjs`,
    `${base}.mjs`,
    `${base}.json`,
    path.join(base, 'index.js'),
  ];
  return candidates.some((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignored.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(file);
      continue;
    }
    if (!/\.(?:js|cjs|mjs)$/.test(entry.name)) continue;
    checked++;
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) failures.push(`${path.relative(root, file)}\n${result.stderr || result.stdout}`);
    const source = fs.readFileSync(file, 'utf8');
    const requests = [
      ...source.matchAll(/require\(['"](\.{1,2}\/[^'"]+)['"]\)/g),
      ...source.matchAll(/(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g),
    ].map((match) => match[1]);
    for (const request of new Set(requests)) {
      if (!localDependencyExists(file, request)) {
        failures.push(`${path.relative(root, file)} unresolved local dependency: ${request}`);
      }
    }
  }
}

for (const sourceRoot of sourceRoots) walk(path.join(root, sourceRoot));

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Syntax OK: ${checked} backend/shared/script files.`);
}
