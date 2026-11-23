const test = require('node:test');
const assert = require('node:assert/strict');
const { cashRowRequests } = require('../../packages/cash-sheet/layout.cjs');

const paymentRow = { pago1: 850, estado1: 'No', pago2: 850, estado2: 'No', pago3: 0, estado3: 'No', totalPagado: 0 };
const prepared = ['Noel', 'lead', 'Client', 850, 'No', 850, 'No', 0, 'No', '=IF(E2="Si";D2;0) + IF(G2="Si";F2;0) + IF(I2="Si";H2;0)', '=L2-J2', 1700, '=L2/1,21'];

test('new blank rows inherit formatting without another client\'s values or overwriting existing validation', () => {
  const requests = cashRowRequests({ values: [['Asesor'], prepared, []], row: 3, sheetId: 7, fresh: true, paymentRow });
  const copies = requests.filter(r => r.copyPaste).map(r => r.copyPaste);
  assert.equal(copies.length, 1);
  assert.equal(copies[0].pasteType, 'PASTE_FORMAT');
  assert.deepEqual(copies[0].source, { sheetId: 7, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 14 });
  assert.equal(copies[0].destination.startRowIndex, 2);
  assert.deepEqual(requests.filter(r => r.updateCells).map(r => r.updateCells.rows[0].values[0].userEnteredValue.formulaValue), [
    '=IF(E3="Si";D3;0) + IF(G3="Si";F3;0) + IF(I3="Si";H3;0)', '=L3-J3', '=L3/1,21',
  ]);
});

test('prepared existing rows and their custom VAT formulas are preserved', () => {
  assert.deepEqual(cashRowRequests({ values: [['Asesor'], prepared], row: 2, sheetId: 7, paymentRow }), []);
  const exempt = [...prepared]; exempt[12] = '=L2';
  assert.deepEqual(cashRowRequests({ values: [['Asesor'], exempt], row: 2, sheetId: 7, paymentRow }), []);
});

test('missing formulas are restored without replacing existing ones', () => {
  const broken = [...prepared]; broken[12] = '';
  const requests = cashRowRequests({ values: [['Asesor'], broken], row: 2, sheetId: 7, paymentRow });
  const cells = requests.filter(r => r.updateCells);
  assert.equal(cells.length, 1);
  assert.equal(cells[0].updateCells.range.startColumnIndex, 12);
  assert.equal(cells[0].updateCells.rows[0].values[0].userEnteredValue.formulaValue, '=L2/1,21');
});

test('rows inserted before summaries preserve native date/dropdown rules and use complete-sheet formulas', () => {
  const complete = ['Noel', 'lead', 'Client']; complete[15] = '=paid'; complete[16] = '=remaining'; complete[18] = '=net';
  const requests = cashRowRequests({ values: [['Asesor'], complete, ['xx', '', 'TOTAL']], row: 3, sheetId: 8, complete: true, fresh: true, insert: true, taxExempt: true, paymentRow });
  assert.equal(requests[0].insertDimension.range.startIndex, 2);
  assert.ok(requests.some(r => r.copyPaste?.pasteType === 'PASTE_DATA_VALIDATION'));
  assert.deepEqual(requests.filter(r => r.updateCells).map(r => r.updateCells.rows[0].values[0].userEnteredValue.formulaValue), [
    '=IF(E3="Si";D3;0) + IF(I3="Si";H3;0) + IF(M3="Si";L3;0)', '=R3-P3', '=R3',
  ]);
});

test('paid extras update the calculated total and can be removed without stale fixed totals', () => {
  const extra = { ...paymentRow, estado1: 'Si', totalPagado: 925 };
  const requests = cashRowRequests({ values: [['Asesor'], prepared], row: 2, sheetId: 7, paymentRow: extra });
  const paid = requests[0].updateCells.rows[0].values[0].userEnteredValue.formulaValue;
  assert.equal(paid, prepared[9] + ' + 75');
  const previous = [...prepared]; previous[9] = paid;
  const rollback = cashRowRequests({ values: [['Asesor'], previous], row: 2, sheetId: 7, paymentRow: { ...extra, totalPagado: 850 } });
  assert.equal(rollback[0].updateCells.rows[0].values[0].userEnteredValue.formulaValue, prepared[9]);
});
