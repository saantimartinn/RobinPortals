import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const browserCjsNames = new Set([
  'application-roles.cjs',
  'financial-config.cjs',
  'academic-systems.cjs',
  'contract-content.cjs',
]);

/** Convert the legacy, server-shared Robin config modules into native browser
 * modules during both Vite dev and production builds. */
export function legacyCjsBrowser({ sharedDir }) {
  const financialConfig = require(resolve(sharedDir, 'financial-config.cjs'));
  return {
    name: 'robin-legacy-cjs-browser',
    enforce: 'pre',
    transform(code, id) {
      const filename = id.split('?')[0];
      const name = filename.slice(filename.lastIndexOf('/') + 1);
      if (!browserCjsNames.has(name) || !filename.includes('/shared/')) return null;

      let source = code;
      if (name === 'contract-content.cjs') {
        source = source.replace(
          /const\s*\{\s*([A-Z][A-Z0-9_]*)\s*\}\s*=\s*require\(['"]\.\/financial-config\.cjs['"]\);/g,
          (_, key) => {
            if (!Object.hasOwn(financialConfig, key)) throw new Error(`Unknown financial config export: ${key}`);
            return `const ${key} = ${JSON.stringify(financialConfig[key])};`;
          },
        );
      }
      if (/\brequire\s*\(/.test(source)) throw new Error(`Unsupported CommonJS require in browser module: ${filename}`);
      return {
        code: `const module = { exports: {} };\nconst exports = module.exports;\n(function (module, exports) {\n${source}\n})(module, exports);\nexport default module.exports;`,
        map: null,
      };
    },
  };
}
