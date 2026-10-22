// Maintenance utility for lint; it is run explicitly by developers or CI.
const fs = require('fs');
const path = require('path');
const config = require('../lint.config.cjs');

const root = path.resolve(__dirname, '..');
const ignored = new Set(config.ignoredDirectories);
const extensions = new Set(config.extensions);
const rules = config.forbiddenPatterns.map((rule) => ({ ...rule, regex: new RegExp(rule.source, 'g') }));
const failures = [];
let checked = 0;

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
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
    if (!extensions.has(path.extname(entry.name))) continue;
    checked++;
    const source = fs.readFileSync(file, 'utf8');
    for (const rule of rules) {
      rule.regex.lastIndex = 0;
      for (const match of source.matchAll(rule.regex)) {
        failures.push(`${path.relative(root, file)}:${lineAt(source, match.index)} ${rule.name}`);
      }
    }
  }
}

for (const sourceRoot of config.roots) walk(path.join(root, sourceRoot));

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Lint OK: ${checked} source files, ${rules.length} safety rules.`);
}
