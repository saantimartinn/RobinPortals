// Maintenance utility for check function boundaries; it is run explicitly by developers or CI.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const functionsDir = path.join(root, 'netlify', 'functions');
const defaultLimit = 220;

const failures = [];
const files = fs.readdirSync(functionsDir).filter((name) => name.endsWith('.js')).sort();
for (const file of files) {
  const source = fs.readFileSync(path.join(functionsDir, file), 'utf8');
  const lines = source.split(/\r?\n/).length;
  if (lines > defaultLimit) failures.push({ file, lines, limit: defaultLimit });
}

if (failures.length) {
  for (const failure of failures) {
    console.error(`${failure.file}: ${failure.lines} lines exceeds entrypoint limit ${failure.limit}`);
  }
  process.exit(1);
}

console.log(`Function boundaries OK: ${files.length} entrypoints, active limit ${defaultLimit} lines.`);
