// Maintenance utility for generate component map; it is run explicitly by developers or CI.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceRoot = path.join(root, 'portal-source', 'src');
const includedHelpers = new Set([
  'client-utils.js',
  'application/documents/document-utils.js',
  'application/payments/payment-utils.jsx',
]);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return [absolute];
  });
}

function relative(filename) {
  return path.relative(sourceRoot, filename).replace(/\\/g, '/');
}

const files = walk(sourceRoot)
  .filter((filename) => filename.endsWith('.jsx') || includedHelpers.has(relative(filename)))
  .sort((a, b) => relative(a).localeCompare(relative(b)));

function importNames(source, modulePath) {
  const escaped = modulePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*["']${escaped}["']`).exec(source);
  return new Set(match ? match[1].split(',').map((value) => value.trim().split(/\s+as\s+/).pop()).filter(Boolean) : []);
}

function listMatches(snippet, regex, excluded = new Set(), max = 10) {
  return [...new Set([...snippet.matchAll(regex)].map((match) => match[1]).filter((value) => !excluded.has(value)))].slice(0, max);
}

function domain(name, file) {
  if (file.includes('/onboarding/')) return 'application/onboarding';
  if (file.includes('/payments/')) return 'application/payments';
  if (file.includes('/documents/')) return 'application/documents';
  if (file === 'application/ApplicationPortals.jsx') {
    if (/^Admin/.test(name)) return 'application/admin';
    if (/Reserva/.test(name)) return 'application/bookings';
    if (/Pago|Factura/.test(name)) return 'application/payments';
    if (/Carrera/.test(name)) return 'application/careers';
    if (/Documento/.test(name)) return 'application/documents';
    return 'application/client';
  }
  if (file === 'application/AdminPortal.jsx') {
    if (/Reserva/.test(name)) return 'application/bookings';
    if (/Pago|Factura/.test(name)) return 'application/payments';
    if (/Carrera/.test(name)) return 'application/careers';
    if (/Documento/.test(name)) return 'application/documents';
    return 'application/admin';
  }
  if (file === 'application/ClientSections.jsx') {
    if (/Pago/.test(name)) return 'application/payments';
    if (/Carrera/.test(name)) return 'application/careers';
    return 'application/documents';
  }
  if (file === 'app.jsx') return 'app/auth';
  return 'shared/application';
}

const rows = [];
for (const filename of files) {
  const file = relative(filename);
  const source = fs.readFileSync(filename, 'utf8');
  const apiNames = new Set();
  for (const apiPath of ['./api.js', '../api.js', '../../api.js']) {
    for (const name of importNames(source, apiPath)) apiNames.add(name);
  }
  const iconNames = importNames(source, 'lucide-react');
  const declaration = /^(?:export\s+(?:default\s+)?)?function\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/gm;
  const matches = [...source.matchAll(declaration)];
  matches.forEach((match, index) => {
    const start = match.index;
    const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
    const snippet = source.slice(start, end);
    const line = source.slice(0, start).split(/\r?\n/).length;
    const states = listMatches(snippet, /const\s*\[\s*([A-Za-z0-9_]+)/g);
    const apis = [...apiNames].filter((name) => new RegExp(`\\b${name}\\b`).test(snippet)).slice(0, 10);
    const children = listMatches(snippet, /<([A-Z][A-Za-z0-9_]*)\b/g, iconNames, 10)
      .filter((name) => name !== match[1] && name !== 'React');
    rows.push({
      name: match[1],
      file,
      domain: domain(match[1], file),
      props: match[2].trim() || 'none',
      state: states.join(', ') || 'none',
      apis: apis.join(', ') || 'none',
      children: children.join(', ') || 'none',
      line,
    });
  });
}

function responsibility(file) {
  if (file === 'app.jsx') return 'composition root and authentication screens';
  if (file === 'application/ApplicationPortals.jsx') return 'application client portal composition';
  if (file === 'application/AdminPortal.jsx') return 'advisor portal and application administration';
  if (file === 'application/ClientSections.jsx') return 'client payments, careers and documents';
  if (file.includes('/onboarding/')) return 'application onboarding flow';
  if (file === 'shared/PortalWidgets.jsx') return 'widgets shared by both authenticated portals';
  if (file.includes('CvAiPage')) return 'lazy-loaded CV AI flow';
  if (file.includes('levels')) return 'loyalty thresholds and benefit locks';
  if (file.includes('document-utils')) return 'document phases, defaults and status mapping';
  if (file.includes('payment-utils')) return 'payment formatting and status UI';
  if (file.includes('InvoiceReceipt')) return 'printable payment receipt';
  if (file === 'client-utils.js') return 'browser-safe formatting, logging and image helpers';
  return 'focused frontend component module';
}

function cell(value) {
  return String(value).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function normalizedUtf8Bytes(filename) {
  const source = fs.readFileSync(filename, 'utf8').replace(/\r\n?/g, '\n');
  return Buffer.byteLength(source, 'utf8');
}

const moduleRows = files.map((filename) => {
  const file = relative(filename);
  return [file, normalizedUtf8Bytes(filename), responsibility(file)];
});

const output = [
  '# Frontend component map',
  '',
  `Generated from ${files.length} focused frontend modules: ${rows.length} top-level functions/components.`,
  'Props, state, API calls and child components are static approximations and must be reviewed with behavioral changes.',
  'Module sizes are UTF-8 bytes after normalizing line endings to LF for cross-platform reproducibility.',
  '',
  '| Name | Module | Domain | Props/args | Local state | API calls | Child components | Line |',
  '|---|---|---|---|---|---|---|---:|',
  ...rows.map((row) => `| ${[row.name, row.file, row.domain, row.props, row.state, row.apis, row.children, row.line].map(cell).join(' | ')} |`),
  '',
  '## Modules',
  '',
  '| Module | Bytes | Responsibility |',
  '|---|---:|---|',
  ...moduleRows.map((row) => `| ${row.map(cell).join(' | ')} |`),
  '',
  'Regenerate with `node scripts/generate-component-map.js`.',
  '',
].join('\n');

fs.writeFileSync(path.join(root, 'docs', 'COMPONENT_MAP.md'), output, 'utf8');
console.log(`Component map generated: ${rows.length} definitions across ${files.length} modules.`);
