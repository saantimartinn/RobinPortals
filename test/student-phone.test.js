// Automated checks for student phone test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');

const { attachStudentPhones, fallbackPhone, missingPhoneColumn } = require('../lib/student-phone');

test('usa el teléfono canónico y conserva el fallback del onboarding', () => {
  assert.equal(fallbackPhone({ telefono_alumno: '+34 600 000 001', questionnaire: { telefono_alumno: '+34 600 000 002' } }), '+34 600 000 001');
  assert.equal(fallbackPhone({ questionnaire: { telefono_alumno: '+34 600 000 002' } }), '+34 600 000 002');
});

test('tolera que la migración del teléfono todavía no esté aplicada', async () => {
  const sb = { from: () => ({ select: () => ({ in: async () => ({ data: null, error: { code: 'PGRST204' } }) }) }) };
  const users = await attachStudentPhones(sb, [{ id: 'u1', questionnaire: { telefono_alumno: '+34 611 111 111' } }]);
  assert.equal(users[0].telefono_alumno, '+34 611 111 111');
  assert.equal(missingPhoneColumn({ code: '42703' }), true);
});
