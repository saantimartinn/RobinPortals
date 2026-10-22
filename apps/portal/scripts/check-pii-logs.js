// Maintenance utility for check pii logs; it is run explicitly by developers or CI.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const roots = ['lib', 'netlify/functions', 'netlify/edge-functions'];
const failures = [];
const forbidden = [
  { name: 'transcript/notes preview', regex: /\b(?:notes_preview|transcript_preview)\s*:/g },
  { name: 'raw preview', regex: /\bpreview\s*:\s*(?:rawNotes|text)\b/g },
  { name: 'PII in literal persistent payload', regex: /payload\s*:\s*\{[^}\n]*\b(?:to|subject|email|metadata|detail|folders|uploads|text|transcript)\b[^}\n]*\}/g },
];

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(?:js|cjs|mjs)$/.test(entry.name)) {
      const source = fs.readFileSync(file, 'utf8');
      for (const rule of forbidden) {
        rule.regex.lastIndex = 0;
        for (const match of source.matchAll(rule.regex)) {
          failures.push(`${path.relative(root, file)}:${lineAt(source, match.index)} ${rule.name}`);
        }
      }
    }
  }
}

for (const sourceRoot of roots) walk(path.join(root, sourceRoot));

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Privacy log check OK: no known PII fields in persistent log payloads.');
}
