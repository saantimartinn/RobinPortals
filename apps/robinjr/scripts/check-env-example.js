// Maintenance utility for check env example; it is run explicitly by developers or CI.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'deploy']);
const runtimeProvided = new Set(['CONTEXT', 'URL', 'DEPLOY_PRIME_URL', 'DEPLOY_URL', 'ROBIN_APP_ID', 'ROBIN_SITE_URL']);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (entry.isFile() && /\.(?:js|cjs|mjs)$/.test(entry.name)) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const used = new Set();
const files = walk(root);
const visited = new Set(files);
const packagesRoot = path.resolve(root, '..', '..', 'packages') + path.sep;
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  // Shared modules own some app configuration after the monorepo extraction.
  for (const match of source.matchAll(/(?:from\s*|import\s*\(|require\s*\()\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
    const dependency = require.resolve(path.resolve(path.dirname(file), match[1]));
    if (dependency.startsWith(packagesRoot) && /\.(?:js|cjs|mjs)$/.test(dependency) && !visited.has(dependency)) {
      visited.add(dependency);
      files.push(dependency);
    }
  }
  for (const match of source.matchAll(/process\.env\.([A-Z0-9_]+)/g)) used.add(match[1]);
  for (const match of source.matchAll(/\benv\.([A-Z0-9_]+)/g)) used.add(match[1]);
  for (const match of source.matchAll(/(?:refreshEnv|envVar):\s*['"]([A-Z0-9_]+)['"]/g)) used.add(match[1]);
}
for (const name of runtimeProvided) used.delete(name);

const example = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
const documented = new Set([...example.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]));
const missing = [...used].filter((name) => !documented.has(name)).sort();
const unused = [...documented].filter((name) => !used.has(name)).sort();

if (missing.length || unused.length) {
  if (missing.length) console.error('Missing from .env.example:', missing.join(', '));
  if (unused.length) console.error('Unused in code:', unused.join(', '));
  process.exitCode = 1;
} else {
  console.log(`Environment inventory OK: ${used.size} application variables, ${runtimeProvided.size} Netlify/site-provided variables.`);
}
