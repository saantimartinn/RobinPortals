// Automated checks for document drive test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const { driveFilename } = require('../lib/document-drive');

test('genera un nombre Drive seguro conservando la extensión subida', () => {
  assert.equal(driveFilename({ name: 'Notas / Bachillerato' }, 'original.pdf'), 'Notas - Bachillerato.pdf');
  assert.equal(driveFilename({ name: 'CV.docx' }, 'original.docx'), 'CV.docx');
  assert.equal(driveFilename({}, ''), 'documento');
});
