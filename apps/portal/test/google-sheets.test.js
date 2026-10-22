// Automated checks for google sheets test; external services should remain outside this test boundary.
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_SPREADSHEET_ID,
  DEFAULT_SHEET_GID,
  buildRow,
} = require('../lib/google-sheets');

test('usa por defecto el workbook CASH 2026/27 solicitado', () => {
  assert.equal(DEFAULT_SPREADSHEET_ID, '1fAzgWD-xmhbupFCKDx-wpBQG5wBJT9uv3MRScZ_EiRY');
  assert.equal(DEFAULT_SHEET_GID, 2041257143);
});

test('proyecta importes y estados de las tres cuotas en la fila operativa', () => {
  const row = buildRow(
    {
      lead_id: '2042',
      nombre: 'Ada',
      apellidos: 'Lovelace',
      assigned_to: 'manuel@project-robin.com',
      contract_signed: true,
    },
    [
      { installment: 1, amount: 666.33, status: 'paid' },
      { installment: 2, amount: 666.33, status: 'unlocked' },
      { installment: 3, amount: 666.34, status: 'locked' },
    ]
  );

  assert.deepEqual(
    {
      asesor: row.asesor,
      pr: row.pr,
      alumno: row.alumno,
      pago1: row.pago1,
      estado1: row.estado1,
      pago2: row.pago2,
      estado2: row.estado2,
      pago3: row.pago3,
      estado3: row.estado3,
      totalPagado: row.totalPagado,
      restante: row.restante,
      cobroInicial: row.cobroInicial,
      contrato: row.contrato,
    },
    {
      asesor: 'Manuel',
      pr: '2042',
      alumno: 'Ada Lovelace',
      pago1: 666.33,
      estado1: 'Si',
      pago2: 666.33,
      estado2: 'No',
      pago3: 666.34,
      estado3: 'No',
      totalPagado: 666.33,
      restante: 1332.67,
      cobroInicial: 1999,
      contrato: 'si',
    }
  );
});

test('incluye pagos extra en los totales sin desplazar las tres cuotas visibles', () => {
  const row = buildRow(
    { lead_id: '2043', nombre: 'Grace', apellidos: 'Hopper' },
    [
      { installment: 1, amount: 450, status: 'paid' },
      { installment: 4, amount: 100, status: 'paid' },
    ]
  );

  assert.equal(row.pago1, 450);
  assert.equal(row.pago2, 0);
  assert.equal(row.pago3, 0);
  assert.equal(row.totalPagado, 550);
  assert.equal(row.cobroInicial, 550);
  assert.equal(row.restante, 0);
});
