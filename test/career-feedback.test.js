// Automated checks for career feedback test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');

const { prepareCandidates, formatAdvisorFeedback } = require('../lib/career-suggestions');

test('las carreras descartadas quedan fuera de los candidatos futuros', () => {
  const base = prepareCandidates(['ingenierias'], {}, [], 10);
  const rejected = base[0];
  const next = prepareCandidates(['ingenierias'], {}, [{ program_code: rejected.program_code, decision: 'rejected' }], 10);
  assert.equal(next.some((career) => career.program_code === rejected.program_code), false);
});

test('una carrera aprobada se prioriza para el alumno aunque no esté entre las primeras', () => {
  const approvedCode = 'wur-tourism';
  const next = prepareCandidates(['ingenierias'], {}, [{ program_code: approvedCode, decision: 'approved' }], 10);
  assert.equal(next[0].program_code, approvedCode);
});

test('el historial explica a la IA qué aprobó y descartó el asesor', () => {
  const text = formatAdvisorFeedback([
    { program_code: 'wur-tourism', decision: 'approved' },
    { program_code: 'tud-aerospace-engineering', decision: 'rejected' },
  ]);
  assert.match(text, /APROBADA: Tourism/);
  assert.match(text, /DESCARTADA: Aerospace Engineering/);
});
