// Maintenance utility for check codebase docs; it is run explicitly by developers or CI.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const treeRoot = path.join(root, 'docs', 'codebase');
const failures = [];
let readmes = 0;
let links = 0;

function normalize(value) {
  return value.replace(/\\/g, '/');
}

function maintainedFiles() {
  const output = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: root, encoding: 'utf8' },
  );
  return [...new Set(output.split('\0').filter(Boolean).map(normalize))]
    .filter((file) => !file.startsWith('docs/codebase/'))
    .filter((file) => fs.existsSync(path.join(root, file)));
}

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolute);
      continue;
    }
    if (entry.name !== 'README.md') continue;
    readmes++;
    const source = fs.readFileSync(absolute, 'utf8');
    for (const match of source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
      const target = match[1].trim();
      if (!target || target.startsWith('#') || /^[a-z]+:/i.test(target)) continue;
      links++;
      const withoutFragment = target.split('#')[0];
      const resolved = path.resolve(path.dirname(absolute), decodeURIComponent(withoutFragment));
      if (!fs.existsSync(resolved)) {
        const from = path.relative(root, absolute).replace(/\\/g, '/');
        failures.push(`${from}: broken link ${target}`);
      }
    }
  }
}

if (!fs.existsSync(treeRoot)) {
  failures.push('docs/codebase/README.md is missing');
} else {
  walk(treeRoot);
}

const coveredFiles = maintainedFiles();
for (const file of coveredFiles) {
  const directory = path.posix.dirname(file);
  const readme = directory === '.'
    ? path.join(treeRoot, 'README.md')
    : path.join(treeRoot, directory, 'README.md');
  if (!fs.existsSync(readme)) {
    failures.push(`missing folder README for ${file}`);
    continue;
  }
  let target = normalize(path.relative(path.dirname(readme), path.join(root, file)));
  if (!target.startsWith('.')) target = `./${target}`;
  if (!fs.readFileSync(readme, 'utf8').includes(`(${target})`)) {
    failures.push(`file is not documented: ${file}`);
  }
}

if (failures.length) {
  console.error(`Codebase documentation failed (${failures.length}):\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log(`Codebase documentation OK: ${coveredFiles.length} files, ${readmes} READMEs, ${links} navigable local links.`);
}
