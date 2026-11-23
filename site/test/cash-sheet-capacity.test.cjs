const test = require('node:test');
const assert = require('node:assert/strict');
const { ROBIN_JR_PRICE_VERSION } = require('../../apps/robinjr/shared/financial-config.cjs');

for (const [app, junior] of [['portal', false], ['admin', false], ['robinjr', true]]) {
  test(`${app}: 200 consecutive clients retain both sheets, formulas and payment states; retries reuse their rows`, async t => {
    const oldFetch = global.fetch;
    const keys = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_SHEETS_SPREADSHEET_ID'];
    const oldEnv = Object.fromEntries(keys.map(key => [key, process.env[key]]));
    for (const key of keys) process.env[key] = 'cash-capacity-test';
    t.after(() => {
      global.fetch = oldFetch;
      for (const [key, value] of Object.entries(oldEnv)) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
    });
    const sheets = [false, true].map(complete => {
      const header = Array(complete ? 27 : 14).fill(''); header[0] = 'Asesor';
      if (complete) { header[19] = 'Contrato'; header[22] = 'Canal de captación'; header[23] = 'Campaña'; header[24] = 'Mercado'; }
      else header[13] = 'Contrato';
      const original = ['Manuel', 'existing-client', 'Keep existing data'];
      for (const col of complete ? [15, 16, 18] : [9, 10, 12]) original[col] = '=1';
      const blanks = Array.from({ length: 200 }, (_, i) => {
        const row = []; const n = i + 3;
        for (const col of complete ? [15, 16, 18] : [9, 10, 12]) row[col] = `=IF(B${n}="";"";0)`;
        return row;
      });
      return { title: complete ? 'Complete' : 'Reduced', sheetId: complete ? 288896043 : 2041257143, complete, values: [header, original, ...blanks, ['xx', '', 'Pagado']] };
    });
    const originals = sheets.map(s => structuredClone(s.values[1]));
    const response = value => new Response(JSON.stringify(value), { status: 200 });
    const column = letters => [...letters].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
    let formatCopies = 0;
    global.fetch = async (url, options = {}) => {
      const address = decodeURIComponent(String(url));
      if (address.includes('oauth2.googleapis.com')) return response({ access_token: 'test', expires_in: 3600 });
      assert.ok(address.includes('/cash-capacity-test'), 'Never use a real spreadsheet');
      if (address.includes('?fields=sheets')) return response({ sheets: sheets.map(s => ({ properties: { title: s.title, sheetId: s.sheetId, gridProperties: { rowCount: 300 } } })) });
      if (address.includes('values:batchUpdate')) {
        for (const entry of JSON.parse(options.body).data) {
          const [, title, col, row] = entry.range.match(/^'([^']+)'!([A-Z]+)(\d+):/);
          const sheet = sheets.find(s => s.title === title);
          for (const [offset, value] of entry.values[0].entries()) sheet.values[Number(row) - 1][column(col) + offset] = value;
        }
        return response({});
      }
      if (address.endsWith(':batchUpdate')) {
        for (const request of JSON.parse(options.body).requests) {
          if (request.copyPaste) {
            assert.equal(request.copyPaste.pasteType, 'PASTE_FORMAT', 'Do not copy another client\'s values');
            formatCopies++;
          } else {
            assert.ok(request.updateCells, 'The 200 prepared slots need no insertion near summaries');
            const { range, rows, fields } = request.updateCells;
            const sheet = sheets.find(s => s.sheetId === range.sheetId);
            assert.equal(fields, 'userEnteredValue');
            assert.ok((sheet.complete ? [15, 16, 18] : [9, 10, 12]).includes(range.startColumnIndex));
            sheet.values[range.startRowIndex][range.startColumnIndex] = rows[0].values[0].userEnteredValue.formulaValue;
          }
        }
        return response({});
      }
      assert.ok(address.includes('valueRenderOption=FORMULA'));
      const sheet = sheets.find(s => address.includes(`'${s.title}'!`));
      assert.ok(sheet, address);
      return response({ values: sheet.values });
    };
    let currentUser;
    let payments;
    const db = { from(table) {
      assert.ok(['users', 'payments'].includes(table));
      return {
        select() { return this; }, eq() { return this; },
        single: async () => ({ data: currentUser, error: null }),
        order: async () => ({ data: payments, error: null }),
        insert() { assert.fail('Do not create payments'); }, update() { assert.fail('Do not alter payment states'); },
      };
    } };
    const service = require(`../../apps/${app}/lib/google-sheets`);
    const users = Array.from({ length: 200 }, (_, i) => ({
      id: `user-${i}`, lead_id: `lead-${i}`, nombre: `Test ${i}`, assigned_to: 'manuel@project-robin.com',
      tipo: ['llegada', 'general', 'delft'][i % 3], num_carreras: 1, contract_signed: false,
      contract_data: junior ? { pricing_version: ROBIN_JR_PRICE_VERSION } : {}, pago_completed: true,
    }));
    for (const [i, user] of users.entries()) {
      currentUser = user;
      payments = i % 17 === 0 ? [{ installment: 1, amount: 100, status: 'paid' }] : [];
      const result = await service.upsertClientRow(db, user.id, { attribution: { source: 'website' } });
      assert.equal(result.ok, true, result.reason);
      assert.equal(result.row, i + 3);
      const expected = junior ? [500, 500, 499] : [[850, 850, 0], [666.33, 666.33, 666.34], [999, 1000, 1000]][i % 3].slice();
      if (payments.length) expected[0] = 100;
      for (const sheet of sheets) {
        const row = sheet.values[i + 2];
        const amounts = sheet.complete ? [3, 7, 11] : [3, 5, 7];
        const states = sheet.complete ? [4, 8, 12] : [4, 6, 8];
        assert.deepEqual(amounts.map(c => row[c]), expected);
        assert.deepEqual(states.map(c => row[c]), [payments.length ? 'Si' : 'No', 'No', 'No']);
        assert.equal(row[sheet.complete ? 17 : 11], Math.round(expected.reduce((sum, amount) => sum + amount, 0) * 100) / 100);
        assert.equal(row[sheet.complete ? 16 : 10], sheet.complete ? `=R${i + 3}-P${i + 3}` : `=L${i + 3}-J${i + 3}`);
      }
    }
    assert.equal(formatCopies, 400);
    const beforeRetries = structuredClone(sheets.map(sheet => sheet.values));
    for (const user of [users[0], users[99], users[199], users[0]]) {
      currentUser = user;
      payments = Number(user.id.slice(5)) % 17 === 0 ? [{ installment: 1, amount: 100, status: 'paid' }] : [];
      assert.equal((await service.upsertClientRow(db, user.id, { attribution: { source: 'website' } })).action, 'updated');
    }
    for (const [i, sheet] of sheets.entries()) {
      assert.equal(sheet.values.length, 203);
      assert.deepEqual(sheet.values[1], originals[i]);
      assert.deepEqual(sheet.values.at(-1), ['xx', '', 'Pagado']);
      assert.equal(new Set(sheet.values.slice(2, -1).map(row => row[1])).size, 200);
      assert.deepEqual(sheet.values, beforeRetries[i]);
    }
  });
}
