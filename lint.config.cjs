// Shared lint config module.
module.exports = {
  roots: ['lib', 'netlify/functions', 'netlify/edge-functions', 'shared', 'scripts', 'test', 'portal-source/src'],
  extensions: ['.js', '.cjs', '.mjs', '.jsx'],
  ignoredDirectories: ['.git', 'node_modules', 'dist', 'deploy'],
  forbiddenPatterns: [
    { name: 'debugger statement', source: '\\bdebugger\\s*;?' },
    { name: 'eval call', source: '\\beval\\s*\\(' },
    { name: 'Function constructor', source: '\\bnew\\s+Function\\s*\\(' },
    { name: 'empty catch', source: 'catch\\s*(?:\\([^)]*\\))?\\s*\\{\\s*\\}' },
  ],
};
