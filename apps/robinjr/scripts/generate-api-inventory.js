// Maintenance utility for generate api inventory; it is run explicitly by developers or CI.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const functionsDir = path.join(root, 'netlify', 'functions');
const netlifyToml = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function matches(source, regex, group = 1) {
  return unique([...source.matchAll(regex)].map((match) => match[group]));
}

function routesByFunction() {
  const result = new Map();
  const blocks = netlifyToml.split('[[redirects]]').slice(1);
  for (const block of blocks) {
    const from = /\bfrom\s*=\s*"([^"]+)"/.exec(block);
    const target = /\bto\s*=\s*"\/\.netlify\/functions\/([^"]+)"/.exec(block);
    if (!from || !target) continue;
    if (!result.has(target[1])) result.set(target[1], []);
    result.get(target[1]).push(from[1]);
  }
  return result;
}

function scheduleFor(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = new RegExp(`\\[functions\\."${escaped}"\\]([\\s\\S]*?)(?=\\n\\[|$)`).exec(netlifyToml);
  return block && /schedule\s*=\s*"([^"]+)"/.exec(block[1]);
}

function method(source, scheduled) {
  const methods = matches(source, /(?:httpMethod|\bmethod)\s*(?:===|!==)\s*['"](GET|POST|PUT|PATCH|DELETE)['"]/g);
  if (methods.length) return methods.sort().join('/');
  return scheduled ? 'SCHEDULE' : 'ANY';
}

function auth(source, name, scheduled) {
  if (scheduled && !source.includes('readSessionFromEvent')) return 'Netlify schedule';
  if (/WEBHOOK_SECRET|VERIFICATION_TOKEN|verifyConfiguredSecret|revolut-signature|verifyWebhookSignature|safeEqual\(/.test(source)) return 'Provider secret/signature';
  if (source.includes('readSessionFromEvent')) return 'Session cookie';
  if (name === 'auth-login') return 'Public';
  return 'Public/internal';
}

function role(source, name) {
  if (source.includes('isApplicationAdmin') || name.startsWith('admin-')) return 'application admin';
  if (source.includes('readSessionFromEvent')) return 'authenticated';
  if (/webhook|cleanup|integration-retry|transcript-poll/.test(name)) return 'provider/system';
  return 'none';
}

function input(source) {
  const parts = [];
  if (source.includes('parseJsonBody')) parts.push('JSON body');
  else if (/JSON\.parse\(event\.body|event\.body/.test(source)) parts.push('raw/JSON body');
  if (source.includes('queryStringParameters')) parts.push('query');
  return parts.length ? parts.join(' + ') : 'none';
}

function validation(source) {
  const checks = [];
  if (source.includes('verifyOrigin')) checks.push('origin');
  if (source.includes('parseJsonBody')) checks.push('JSON');
  if (/WEBHOOK_SECRET|verifyConfiguredSecret|revolut-signature|verifyWebhookSignature|safeEqual\(/.test(source)) checks.push('signature/secret');
  if (source.includes('ownsRecord')) checks.push('ownership');
  if (/missing_|invalid_|required/.test(source)) checks.push('field checks');
  return unique(checks).join(', ') || 'method/auth only';
}

function response(source) {
  if (source.includes("'Content-Type': 'application/pdf'")) return 'PDF';
  if (source.includes("'Content-Type': 'text/event-stream'")) return 'SSE';
  return source.includes('json(') || source.includes('JSON.stringify') ? 'JSON' : 'HTTP response';
}

function integrations(source) {
  const map = [
    ['Revolut', /lib\/revolut|require\(['"]\.\/revolut['"]\)|revolut/i],
    ['Google Drive', /google-drive/],
    ['Google Calendar/Meet', /google-calendar|googleapis|Meet/],
    ['Google Sheets', /google-sheets/],
    ['Holded', /holded/],
    ['Anthropic', /anthropic-chat|chatCompletion/],
    ['Resend/email', /lib\/email|sendEmail/],
    ['Notion', /notion/i],
  ];
  return map.filter(([, regex]) => regex.test(source)).map(([name]) => name).join(', ') || 'none';
}

function cell(value) {
  return String(value || '—').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function dependencyFile(fromFile, request) {
  const candidates = [
    path.resolve(path.dirname(fromFile), request),
    path.resolve(path.dirname(fromFile), request + '.js'),
    path.resolve(path.dirname(fromFile), request + '.cjs'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
}

function withFunctionDependencies(filename, visited = new Set()) {
  const absolute = path.resolve(filename);
  if (visited.has(absolute)) return '';
  visited.add(absolute);
  const source = fs.readFileSync(absolute, 'utf8');
  const dependencies = matches(source, /require\(['"](\.\/[^'"]+)['"]\)/g)
    .map((request) => dependencyFile(absolute, request))
    .filter((dependency) => dependency && path.dirname(dependency) === functionsDir)
    .map((dependency) => withFunctionDependencies(dependency, visited));
  return [source, ...dependencies].join('\n');
}

function withDirectServices(boundarySource) {
  const services = matches(boundarySource, /require\(['"]\.\.\/\.\.\/lib\/([^'"]+)['"]\)/g)
    .map((service) => dependencyFile(path.join(functionsDir, 'entrypoint.js'), `../../lib/${service}`))
    .filter(Boolean)
    .map((service) => fs.readFileSync(service, 'utf8'));
  return [boundarySource, ...services].join('\n');
}

const routeMap = routesByFunction();
const files = fs.readdirSync(functionsDir).filter((name) => name.endsWith('.js')).sort();
const rows = [];

for (const filename of files) {
  const name = filename.slice(0, -3);
  const functionFile = path.join(functionsDir, filename);
  const source = fs.readFileSync(functionFile, 'utf8');
  const boundarySource = withFunctionDependencies(functionFile);
  const analyzedSource = withDirectServices(boundarySource);
  const scheduleMatch = scheduleFor(name);
  const scheduled = scheduleMatch && scheduleMatch[1];
  const routes = routeMap.get(name) || [];
  if (scheduled) routes.push(`cron: ${scheduled}`);
  if (!routes.length) routes.push(`/.netlify/functions/${name}`);
  const tables = matches(analyzedSource, /\.from\(['"]([^'"]+)['"]\)/g).sort();
  rows.push([
    name,
    method(boundarySource, scheduled),
    routes.join('<br>'),
    auth(boundarySource, name, scheduled),
    role(boundarySource, name),
    input(boundarySource),
    validation(boundarySource),
    response(boundarySource),
    matches(boundarySource, /error:\s*['"]([a-zA-Z0-9_.:-]+)['"]/g).slice(0, 6).join(', ') || 'server_error/none explicit',
    tables.join(', ') || 'none detected',
    integrations(analyzedSource),
  ]);
}

const output = [
  '# API inventory',
  '',
  `Generated from \`netlify.toml\` and static analysis of ${files.length} Netlify Functions.`,
  'Scheduled/internal Functions without a redirect are listed with their direct function path. This is an',
  'engineering inventory, not a substitute for runtime or legal review.',
  '',
  '| Function | Method | Route | Auth | Role | Input | Validation | OK | Errors (static) | Tables (static) | Integrations |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
  '',
  '## Maintenance',
  '',
  'Regenerate after adding/removing a Function or redirect:',
  '',
  '```bash',
  'node scripts/generate-api-inventory.js',
  '```',
  '',
  'Review the diff manually: auth/role and free-form validation are conservative static inferences.',
  '',
].join('\n');

fs.writeFileSync(path.join(root, 'docs', 'API_INVENTORY.md'), output, 'utf8');
console.log(`API inventory generated: ${files.length} Functions.`);
