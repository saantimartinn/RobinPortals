// Maintenance utility for generate file map; it is run explicitly by developers or CI.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const sourceExtensions = new Set(['.js', '.jsx', '.cjs', '.mjs', '.css', '.html']);
const excluded = new Set(['package-lock.json', 'portal-source/package-lock.json']);

function trackedAndUntrackedFiles() {
  const output = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: root, encoding: 'utf8' },
  );
  return [...new Set(output.split('\0').filter(Boolean))]
    .map((file) => file.replace(/\\/g, '/'))
    .filter((file) => fs.existsSync(path.join(root, file)))
    .filter((file) => !excluded.has(file) && !['docs/FILE_MAP.md', 'docs/FILE_INDEX.generated.md'].includes(file))
    .sort((a, b) => a.localeCompare(b));
}

function read(file) {
  const absolute = path.join(root, file);
  const extension = path.extname(file).toLowerCase();
  if (!sourceExtensions.has(extension) && extension !== '.json' && extension !== '.toml' && extension !== '.yml') return '';
  return fs.readFileSync(absolute, 'utf8');
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function matches(source, regex, group = 1) {
  return unique([...source.matchAll(regex)].map((match) => match[group]));
}

function responsibility(file) {
  const name = path.basename(file, path.extname(file)).replace(/[-_]/g, ' ');
  if (file === '.github/workflows/ci.yml') return 'Gate de calidad de GitHub Actions';
  if (file === 'netlify.toml') return 'Build, rutas, cabeceras y tareas programadas de Netlify';
  if (file === '.env.example') return 'Inventario sin valores de la configuración de entorno';
  if (file === '.gitignore') return 'Exclusiones de control de versiones';
  if (file === 'package.json') return 'Dependencias y metadatos del backend';
  if (file === 'portal-source/package.json') return 'Dependencias y scripts del frontend';
  if (file.startsWith('netlify/functions/')) return `Entrypoint HTTP o programado: ${name}`;
  if (file.startsWith('netlify/edge-functions/')) return `Regla Edge de protección: ${name}`;
  if (file.startsWith('lib/')) return `Servicio backend compartido: ${name}`;
  if (file.startsWith('shared/')) return `Regla de dominio compartida entre runtimes: ${name}`;
  if (file.startsWith('portal-source/src/application/')) return `Módulo frontend del portal de aplicación: ${name}`;
  if (file.startsWith('portal-source/src/')) return `Composición o utilidad frontend: ${name}`;
  if (file.startsWith('portal-source/public/')) return `Activo público del frontend: ${path.basename(file)}`;
  if (file.startsWith('test/')) return `Prueba automatizada: ${name}`;
  if (file.startsWith('scripts/')) return `Gate o generador local/CI: ${name}`;
  if (file.startsWith('docs/')) return `Documentación mantenida: ${name}`;
  if (file.endsWith('.md')) return `Documentación viva: ${name}`;
  if (/\.(png|pdf)$/i.test(file)) return `Activo estático: ${path.basename(file)}`;
  return `Configuración o recurso: ${path.basename(file)}`;
}

function localDependencies(source) {
  return unique([
    ...matches(source, /require\(['"](\.{1,2}\/[^'"]+)['"]\)/g),
    ...matches(source, /from\s+['"](\.{1,2}\/[^'"]+)['"]/g),
    ...matches(source, /import\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g),
  ]).sort().slice(0, 8);
}

function tables(source) {
  return matches(source, /\.from\(['"]([^'"]+)['"]\)/g).sort();
}

function functionsAndExports(source, file) {
  const names = new Set();
  for (const match of source.matchAll(/\b(?:export\s+(?:default\s+)?)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) names.add(match[1]);
  for (const match of source.matchAll(/\bexport\s+(?:const|let|var|class|type|interface)\s+([A-Za-z_$][\w$]*)/g)) names.add(match[1]);
  for (const match of source.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\s*\*?\s*|(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>)/g)) names.add(match[1]);
  for (const match of source.matchAll(/(?:module\.)?exports\.([A-Za-z_$][\w$]*)\s*=/g)) names.add(match[1]);
  const exportedObject = /module\.exports\s*=\s*\{([\s\S]*?)\n\s*\}/.exec(source)?.[1] || "";
  for (const match of exportedObject.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*(?:[:,(])/gm)) names.add(match[1]);
  if (file.startsWith('netlify/functions/') && /exports\.handler\s*=|module\.exports\s*=\s*\{[^}]*handler/.test(source)) names.add('handler (Netlify entrypoint)');
  return [...names].sort().join(', ');
}

function integrations(source, file) {
  if (file === 'scripts/generate-file-map.js') return [];
  const checks = [
    ['Supabase', /supabase|SUPABASE_/i],
    ['Revolut', /revolut/i],
    ['Anthropic', /anthropic/i],
    ['Google Calendar/Meet', /google-calendar|calendar\.events|MEET_/i],
    ['Google Drive', /google-drive|drive\.files|DRIVE_/i],
    ['Google Sheets', /google-sheets|spreadsheets/i],
    ['Resend', /resend/i],
    ['Holded', /holded/i],
    ['Notion', /notion/i],
    ['Netlify', /netlify/i],
  ];
  if (!source && !file.endsWith('.md')) return [];
  return checks.filter(([, regex]) => regex.test(source) || regex.test(file)).map(([name]) => name);
}

function state(file) {
  if (file === 'docs/API_INVENTORY.md' || file === 'docs/COMPONENT_MAP.md') return 'GENERATED';
  return 'ACTIVE';
}

function cell(value) {
  const text = Array.isArray(value) ? value.join('<br>') : String(value || '—');
  return (text || '—').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

const files = trackedAndUntrackedFiles();
const sources = new Map(files.map((file) => [file, read(file)]));

function resolveDependency(fromFile, request) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), request));
  const candidates = [base, `${base}.js`, `${base}.jsx`, `${base}.cjs`, `${base}.mjs`, `${base}/index.js`];
  return candidates.find((candidate) => files.includes(candidate));
}

const consumers = new Map(files.map((file) => [file, []]));
for (const file of files) {
  for (const request of localDependencies(sources.get(file))) {
    const dependency = resolveDependency(file, request);
    if (dependency) consumers.get(dependency).push(file);
  }
}

const rows = files.map((file) => {
  const source = sources.get(file);
  return [
    `\`${file}\``,
    responsibility(file),
    functionsAndExports(source, file),
    localDependencies(source),
    consumers.get(file).sort().slice(0, 8),
    tables(source),
    integrations(source, file),
    state(file),
  ];
});

const output = [
  '# File map',
  '',
  `Inventario generado de ${files.length} archivos mantenidos por el repositorio. Los lockfiles se`,
  'excluyen porque describen resoluciones de dependencias, no módulos de arquitectura. Las',
  'dependencias, tablas e integraciones son inferencias estáticas conservadoras.',
  '',
  '| Archivo | Responsabilidad | Funciones/exportaciones detectadas | Dependencias locales directas | Consumidores directos | Tablas directas | Integraciones detectadas | Estado |',
  '|---|---|---|---|---|---|---|---|',
  ...rows.map((row) => `| ${row.map(cell).join(' | ')} |`),
  '',
  '## Estados',
  '',
  '- `ACTIVE`: parte vigente del sistema o de su operación.',
  '- `GENERATED`: se regenera y se verifica en CI; no editar a mano.',
  '',
  '## Mantenimiento',
  '',
  '```bash',
  'node scripts/generate-file-map.js',
  '```',
  '',
  'Revisar manualmente el diff: los accesos indirectos mediante servicios aparecen en el módulo',
  'que los ejecuta, no necesariamente en todos sus consumidores.',
  '',
].join('\n');

fs.writeFileSync(path.join(root, 'docs', 'FILE_INDEX.generated.md'), output, 'utf8');
console.log(`File map generated: ${files.length} maintained files.`);
