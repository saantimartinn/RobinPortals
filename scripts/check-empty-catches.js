// Maintenance utility for check empty catches; it is run explicitly by developers or CI.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ignored = new Set(['.git', 'node_modules', 'dist', 'deploy']);
const failures = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(?:js|jsx|cjs|mjs)$/.test(entry.name)) {
      const source = fs.readFileSync(file, 'utf8');
      const matches = [...source.matchAll(/catch\s*(?:\([^)]*\))?\s*\{\s*\}/g)];
      if (matches.length) failures.push(`${path.relative(root, file)} (${matches.length})`);
    }
  }
}

walk(root);
if (failures.length) {
  console.error('Empty catch blocks:', failures.join(', '));
  process.exitCode = 1;
} else {
  console.log('Error handling OK: no empty catch blocks.');
}
