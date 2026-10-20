// Maintenance utility for check platform scope; it is run explicitly by developers or CI.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ignoredDirectories = new Set(['.git', 'node_modules', 'dist', 'deploy']);
const textExtensions = new Set(['.cjs', '.js', '.jsx', '.md', '.mjs', '.toml']);
const failures = [];
const retiredPathParts = [
  'sub' + 'scriber',
  'sub' + 'scription',
  'sub' + '-admin',
  'robin' + '-plan',
  'zoo' + 'm',
  'run' + 'book',
];
const retiredContent = [
  'The ' + 'Robin' + ' Plan',
  'Robin' + ' Plan',
  "from('sub" + "scribers')",
  'role = sub' + 'scriber',
  'role === "sub' + 'scriber"',
  "role === 'sub" + "scriber'",
  '/api/sub' + 'scriber/',
  '/api/sub' + 'scription/',
  '/api/sub' + '-admin/',
  'SUB' + 'SCRIPTION_PLANS',
  'zoo' + 'm',
  'leg' + 'acy',
  'file_' + 'data_url',
  'template_' + 'data_url',
  'signature_' + 'data_url',
  'HOLDED_API_' + 'KEY_V2',
  '/api/meet/' + 'poll',
  'docs/' + 'runbook',
];
const allowedRetiredContent = new Map([
  ['infrastructure/cloudflare/README.md', new Set(['The ' + 'Robin' + ' Plan', 'Robin' + ' Plan'])],
  ['portal-source/src/app.jsx', new Set(['The ' + 'Robin' + ' Plan', 'Robin' + ' Plan'])],
  ['portal-source/src/application/CrossPortalNav.jsx', new Set(['The ' + 'Robin' + ' Plan', 'Robin' + ' Plan'])],
]);

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    const relative = path.relative(root, absolute).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      walk(absolute);
      continue;
    }
    const lowerPath = relative.toLowerCase();
    if (retiredPathParts.some((part) => lowerPath.includes(part))) {
      failures.push(`retired path remains: ${relative}`);
    }
    if (!textExtensions.has(path.extname(entry.name).toLowerCase())) continue;
    const source = fs.readFileSync(absolute, 'utf8');
    for (const token of retiredContent) {
      const allowed = allowedRetiredContent.get(relative);
      if (source.toLowerCase().includes(token.toLowerCase()) && !allowed?.has(token)) {
        failures.push(`retired surface remains in ${relative}: ${token}`);
      }
    }
  }
}

walk(root);

if (failures.length) {
  console.error(`Platform scope failed (${failures.length}):\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('Platform scope OK: only student and application-admin surfaces remain.');
}
