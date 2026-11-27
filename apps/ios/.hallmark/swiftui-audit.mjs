#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, '../Robin');
const tokenFile = 'RobinDesign.swift';
const findings = [];

async function swiftFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return entry.name === 'RobinTests' ? [] : swiftFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.swift') ? [fullPath] : [];
  }));
  return nested.flat();
}

function add(level, code, file, line, message) {
  findings.push({ level, code, file: path.relative(path.resolve(scriptDir, '..'), file), line, message });
}

function scan(file, source) {
  const lines = source.split(/\r?\n/);
  lines.forEach((value, index) => {
    const line = index + 1;
    const isTokenFile = path.basename(file) === tokenFile;

    if (!isTokenFile && /\b(?:UI)?Color\s*\(/.test(value)) {
      add('FAIL', 'HSW-01', file, line, 'Color literal outside RobinStyle; add or reuse a named brand token.');
    }
    const uppercaseLabel = /Text\s*\(\s*"[A-ZÁÉÍÓÚÜÑ][A-ZÁÉÍÓÚÜÑ0-9 /:–-]{2,}"/.test(value);
    const forcedUppercase = !isTokenFile && /\.uppercased\s*\(\s*\)/.test(value);
    if (/\.tracking\s*\(/.test(value) || /\.textCase\(\s*\.uppercase\s*\)/.test(value) || uppercaseLabel || forcedUppercase) {
      add('FAIL', 'HSW-02', file, line, 'Tracked or forced uppercase UI label; use Robin body typography in sentence case.');
    }
    if (/["'][^"'\n]*\s·\s[^"'\n]*["']/.test(value)) {
      add('WARN', 'HSW-03', file, line, 'Middle dot in UI copy; check that it is not joining metadata.');
    }
    if (/Text\s*\(\s*"[^"\n]*(?:→|➜|⇒)[^"\n]*"/.test(value)) {
      add('FAIL', 'HSW-04', file, line, 'Arrow appended to button or link copy; keep the action label verbal.');
    }
    if (/\.transition\(\s*\.all\s*\)/.test(value)) {
      add('FAIL', 'HSW-05', file, line, 'Blanket transition; animate a specific visual property or state.');
    }
  });
}

const files = (await swiftFiles(appRoot)).sort();
for (const file of files) scan(file, await readFile(file, 'utf8'));

console.log(`Hallmark SwiftUI audit · Robin · ${files.length} source files`);
if (findings.length) {
  for (const finding of findings) {
    console.log(`${finding.level} ${finding.code} ${finding.file}:${finding.line} ${finding.message}`);
  }
} else {
  console.log('PASS Static Hallmark checks found no violations.');
}

console.log('MANUAL Review on device: 44 pt hit areas · VoiceOver labels and order · Dynamic Type clipping · contrast and hierarchy · loading, empty, error and full states.');
console.log('SCOPE Source-only SwiftUI checks; no visual render or embedded WebView analysis.');

if (findings.some((finding) => finding.level === 'FAIL')) process.exitCode = 1;
