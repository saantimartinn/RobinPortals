// Automated checks for academic systems test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  academicLevelLabel,
  academicSystemLabel,
  sanitizeAcademicProfile,
} = require('../shared/academic-systems.cjs');

test('normaliza un perfil IB y conserva el nivel de cada asignatura', () => {
  assert.deepEqual(
    sanitizeAcademicProfile('ib', [
      { name: '  Matemáticas  ', level: 'hl' },
      { name: 'Inglés', level: 'sl' },
      { name: '', level: '' },
    ]),
    {
      system: 'ib',
      subjects: [
        { name: 'Matemáticas', level: 'hl' },
        { name: 'Inglés', level: 'sl' },
      ],
    }
  );
});

test('rechaza sistemas desconocidos, perfiles vacíos y niveles no válidos', () => {
  assert.equal(sanitizeAcademicProfile('desconocido', [{ name: 'Historia' }]), null);
  assert.equal(sanitizeAcademicProfile('ib', []), null);
  assert.equal(sanitizeAcademicProfile('ib', [{ name: 'Historia', level: 'avanzado' }]), null);
});

test('elimina niveles en sistemas que no los utilizan y expone etiquetas legibles', () => {
  assert.deepEqual(
    sanitizeAcademicProfile('bachillerato_espanol', [{ name: 'Historia', level: 'hl' }]),
    { system: 'bachillerato_espanol', subjects: [{ name: 'Historia', level: null }] }
  );
  assert.equal(academicSystemLabel('ib'), 'Bachillerato Internacional (IB)');
  assert.equal(academicLevelLabel('ib', 'hl'), 'Nivel Superior (HL)');
});
