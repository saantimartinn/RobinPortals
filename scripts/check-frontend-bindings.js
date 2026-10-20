// Maintenance utility for check frontend bindings; it is run explicitly by developers or CI.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const frontendRoot = path.join(root, 'portal-source');
const sourceRoot = path.join(frontendRoot, 'src');
const parser = require(require.resolve('@babel/parser', { paths: [frontendRoot] }));
const traverse = require(require.resolve('@babel/traverse', { paths: [frontendRoot] })).default;

const browserGlobals = new Set([
  'AbortController', 'Blob', 'CSS', 'Date', 'Error', 'File', 'FileReader', 'FormData',
  'Image', 'Intl', 'JSON', 'Map', 'Math', 'Number', 'Object', 'Promise', 'RegExp',
  'Set', 'String', 'URL', 'URLSearchParams', 'console', 'document', 'fetch', 'globalThis',
  'alert', 'confirm', 'localStorage', 'navigator', 'setInterval', 'setTimeout',
  'clearInterval', 'clearTimeout', 'window',
]);

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    return /\.(?:js|jsx)$/.test(entry.name) ? [absolute] : [];
  });
}

const failures = [];
for (const filename of sourceFiles(sourceRoot)) {
  const source = fs.readFileSync(filename, 'utf8');
  const ast = parser.parse(source, {
    sourceType: 'module',
    plugins: ['jsx', 'dynamicImport'],
  });
  const seen = new Set();
  function report(name, line) {
    const key = `${name}:${line}`;
    if (seen.has(key)) return;
    seen.add(key);
    failures.push({ filename, name, line });
  }
  traverse(ast, {
    ReferencedIdentifier(identifierPath) {
      const name = identifierPath.node.name;
      if (!browserGlobals.has(name) && !identifierPath.scope.hasBinding(name)) {
        report(name, identifierPath.node.loc && identifierPath.node.loc.start.line);
      }
    },
    JSXOpeningElement(elementPath) {
      const nameNode = elementPath.node.name;
      if (nameNode.type !== 'JSXIdentifier' || /^[a-z]/.test(nameNode.name)) return;
      if (!elementPath.scope.hasBinding(nameNode.name)) {
        report(nameNode.name, nameNode.loc && nameNode.loc.start.line);
      }
    },
  });
}

if (failures.length) {
  for (const failure of failures) {
    console.error(`${path.relative(root, failure.filename)}:${failure.line || '?'} unresolved binding: ${failure.name}`);
  }
  process.exit(1);
}

console.log(`Frontend bindings OK: ${sourceFiles(sourceRoot).length} modules.`);
