// Maintenance utility for check architecture; it is run explicitly by developers or CI.
const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() && e.name !== 'node_modules' ? walk(path.join(dir, e.name)) : e.isFile() ? [path.join(dir, e.name)] : []);
}
const errors = [];
const globals = new Set(('undefined NaN Infinity console window document navigator localStorage sessionStorage fetch URL URLSearchParams FormData File FileReader Blob Image Uint8Array ArrayBuffer atob btoa setTimeout clearTimeout setInterval clearInterval requestAnimationFrame cancelAnimationFrame Date Intl Math JSON Object Array String Number Boolean Promise Error TypeError Set Map RegExp parseInt parseFloat isNaN alert confirm encodeURIComponent decodeURIComponent').split(' '));
const config = fs.readFileSync('netlify.toml', 'utf8');
const routes = new Map([...config.matchAll(/from = "(\/api\/[^"\n]+)"\s+to = "\/\.netlify\/functions\/([^"\n]+)"/g)].map(m => [m[1], m[2]]));
// The Vite build writes this redirect into the published root dist directory.
const viteConfigPath = 'frontend/vite.config.js';
if (fs.existsSync(viteConfigPath)) {
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
  for (const match of viteConfig.matchAll(/(\/api\/[^\s"'`]+)\s+\/\.netlify\/functions\/([a-z0-9-]+)/g)) {
    routes.set(match[1], match[2]);
  }
}
for (const [route, handler] of routes) if (!fs.existsSync(`backend/functions/${handler}.js`)) errors.push(`Missing handler: ${route}`);
for (const file of walk('backend').filter(f => f.endsWith('.js'))) {
  const source = fs.readFileSync(file, 'utf8');
  try { parse(source, { sourceType: 'script' }); } catch (e) { errors.push(`${file}: ${e.message}`); }
  for (const m of source.matchAll(/require\(['"]([^'"]+)['"]\)/g)) {
    try { require.resolve(m[1], { paths: [path.resolve(path.dirname(file))] }); } catch { errors.push(`${file}: unresolved ${m[1]}`); }
    if (file.includes('functions') && m[1].startsWith('./')) errors.push(`${file}: handler imports another handler`);
  }
  // La única frontera autorizada con el portal es el adaptador servidor de
  // facturación. Usa credenciales independientes y nunca expone datos al browser.
  const isBillingBridge = file.endsWith(path.join('backend', 'lib', 'subscription-billing.js'));
  if (!isBillingBridge && /\.from\(['"](?:users|payments|careers|documents)['"]\)/.test(source)) errors.push(`${file}: application-portal table`);
}
const files = walk('frontend/src').filter(f => /\.jsx?$/.test(f));
const graph = new Map();
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  let ast;
  try { ast = parse(source, { sourceType: 'module', plugins: ['jsx'] }); } catch(e) { errors.push(`${file}: ${e.message}`); continue; }
  const deps = [];
  for (const n of ast.program.body.filter(n => n.type === 'ImportDeclaration')) {
    if (n.source.value.startsWith('.')) {
      const target = path.resolve(path.dirname(file), n.source.value);
      if (!fs.existsSync(target)) errors.push(`${file}: missing ${n.source.value}`);
      if (target.includes(`${path.sep}backend${path.sep}`)) errors.push(`${file}: imports backend`);
      if (/\.jsx?$/.test(target)) deps.push(target);
    }
  }
  graph.set(path.resolve(file), deps);
  traverse(ast, { ReferencedIdentifier(p) {
    const name = p.node.name;
    if (!p.scope.hasBinding(name) && !globals.has(name)) errors.push(`${file}:${p.node.loc.start.line}: unbound ${name}`);
  }});
  for (const m of source.matchAll(/["'`](\/api\/[^"'`?\s]+)["'`?]/g)) if (!routes.has(m[1])) errors.push(`${file}: unmapped API ${m[1]}`);
  if (/process\.env|SUPABASE_SERVICE_ROLE_KEY|STRIPE_SECRET_KEY/.test(source)) errors.push(`${file}: backend environment in browser code`);
}
const done = new Set();
function cycle(file, stack = []) {
  if (stack.includes(file)) { errors.push(`Circular import: ${[...stack,file].map(f=>path.relative('.',f)).join(' -> ')}`); return; }
  if (done.has(file)) return;
  for (const dep of graph.get(file) || []) cycle(dep, [...stack,file]);
  done.add(file);
}
for (const file of graph.keys()) cycle(file);
const reachable = new Set();
function markReachable(file) {
  if (reachable.has(file)) return;
  reachable.add(file);
  for (const dep of graph.get(file) || []) markReachable(dep);
}
markReachable(path.resolve('frontend/src/main.jsx'));
for (const file of graph.keys()) if (!reachable.has(file)) errors.push(`Unused frontend module: ${path.relative('.',file)}`);
const example = fs.readFileSync('.env.example', 'utf8');
const envNames = new Set([...example.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map(m=>m[1]));
for (const file of walk('backend')) for(const m of fs.readFileSync(file,'utf8').matchAll(/process\.env\.([A-Z0-9_]+)/g)) if(!envNames.has(m[1])) errors.push(`${file}: undocumented environment ${m[1]}`);
if (!/publish = "dist"/.test(config)) errors.push('Only dist/ may be published');
for (const legacy of ['portal','portal-source','lib','netlify/functions','migrations','_to_delete']) {
  if (fs.existsSync(legacy)) errors.push(`Legacy source directory: ${legacy}`);
}
const schema = fs.readFileSync('supabase/migrations/001_robin_plan_schema.sql','utf8');
if (/insert\s+into\s+public\.subscribers/i.test(schema) || /\$2[aby]\$\d\d\$/.test(schema)) errors.push('Schema must not seed accounts or password hashes');
if (errors.length) { console.error([...new Set(errors)].join('\n')); process.exitCode=1; }
else console.log(`Architecture OK: ${files.length} frontend modules, ${routes.size} API routes; imports, bindings, scope and environment checked.`);
