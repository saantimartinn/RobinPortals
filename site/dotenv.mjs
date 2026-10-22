// Reads and writes .env files the way dotenv (used by `netlify dev` and Vite)
// reads them: 'single quotes' are literal, "double quotes" turn \n into a newline.
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*('(?:[^'])*'|"(?:\\"|[^"])*"|[^#\r\n]*)/gm;

export function parseEnv(text) {
  const values = {};
  for (const [, key, raw] of text.matchAll(LINE)) {
    let value = raw.trim();
    const quote = value[0];
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
      if (quote === '"') value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
    }
    values[key] = value;
  }
  return values;
}

export function readEnvFile(path) {
  return existsSync(path) ? parseEnv(readFileSync(path, 'utf8')) : {};
}

function formatValue(value) {
  if (/[\r\n]/.test(value) || !value.includes('"')) return `"${value.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}"`;
  if (!value.includes("'")) return `'${value}'`;
  throw new Error('Valor con comillas simples y dobles: no se puede escribir en un .env');
}

export function writeEnvFile(path, values, header) {
  const lines = [...header.map((line) => `# ${line}`), ...Object.keys(values).sort().map((key) => `${key}=${formatValue(values[key])}`), ''];
  writeFileSync(path, lines.join('\n'), { mode: 0o600 });
  chmodSync(path, 0o600);
}
