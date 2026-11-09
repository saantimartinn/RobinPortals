const test = require('node:test');
const assert = require('node:assert/strict');
const { upsertClientRow } = require('../lib/google-sheets');

test('escribe el contrato en N y T sin alterar las fórmulas de las dos hojas', async () => {
  const oldFetch = global.fetch;
  const oldEnv = Object.fromEntries(['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN', 'GOOGLE_SHEETS_SPREADSHEET_ID']
    .map((key) => [key, process.env[key]]));
  Object.assign(process.env, {
    GOOGLE_CLIENT_ID: 'test', GOOGLE_CLIENT_SECRET: 'test', GOOGLE_REFRESH_TOKEN: 'test',
    GOOGLE_SHEETS_SPREADSHEET_ID: 'test-sheet',
  });
  const user = {
    id: 'user-1', lead_id: 'lead-1', nombre: 'Ada', apellidos: 'Lovelace',
    assigned_to: 'manuel@project-robin.com', contract_signed: true,
    contract_signed_at: '2026-11-06T18:11:01.688Z', tipo: 'general',
    origin: 'otros', pais: 'México', has_eu_id: true,
  };
  const payments = [{
    installment: 1, amount: 900, status: 'paid', paid_at: '2026-11-06T18:51:44.587Z',
    invoice_number: 'PR-2026-1-01', payment_data: { holded_invoice_num: 'F260300' },
  }];
  const sb = { from(table) { return {
    select() { return this; }, eq() { return this; },
    single: async () => ({ data: table === 'users' ? user : null, error: null }),
    order: async () => ({ data: table === 'payments' ? payments : [], error: null }),
  }; } };
  const writes = [];
  const response = (value) => new Response(JSON.stringify(value), {
    status: 200, headers: { 'content-type': 'application/json' },
  });
  global.fetch = async (url, options = {}) => {
    if (String(url).includes('oauth2.googleapis.com')) return response({ access_token: 'test', expires_in: 3600 });
    if (String(url).includes('?fields=sheets')) return response({ sheets: [
      { properties: { sheetId: 2041257143, title: '26-27' } },
      { properties: { sheetId: 288896043, title: 'Cambios para Manu' } },
    ] });
    if (String(url).includes('values:batchUpdate')) {
      writes.push(...JSON.parse(options.body).data);
      return response({ totalUpdatedCells: 20 });
    }
    const range = decodeURIComponent(String(url));
    if (range.includes("'26-27'!A1:N")) {
      const header = Array(14).fill(''); header[0] = 'Asesor'; header[13] = 'Contrato';
      return response({ values: [header, ['Manuel', 'lead-1', 'Ada Lovelace']] });
    }
    if (range.includes("'Cambios para Manu'!A1:AB")) {
      const header = Array(29).fill('');
      header[0] = 'Asesor'; header[19] = 'Contrato'; header[22] = 'Canal de captación';
      header[23] = 'Campaña'; header[24] = 'Mercado';
      return response({ values: [header, ['Manuel', 'lead-1', 'Ada Lovelace']] });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const result = await upsertClientRow(sb, user.id, {
      attribution: { source: 'meta', campaign_name: 'Webinar 21-21' },
    });
    assert.equal(result.ok, true, result.reason);
    const cells = new Map(writes.map((entry) => [entry.range, entry.values[0][0]]));
    assert.equal(cells.get("'26-27'!N2:N2"), 'si');
    assert.equal(cells.get("'Cambios para Manu'!T2:T2"), 'si');
    assert.equal(cells.get("'Cambios para Manu'!V2:V2"), 'LATAM');
    assert.equal(cells.get("'Cambios para Manu'!W2:W2"), 'Meta');
    assert.equal(cells.get("'Cambios para Manu'!X2:X2"), 'Webinar 21-21');
    assert.equal(cells.get("'Cambios para Manu'!Y2:Y2"), 'México');
    assert.equal(cells.get("'Cambios para Manu'!U2:U2"), '06/11/2026');
    assert.equal(cells.get("'Cambios para Manu'!F2:F2"), '06/11/2026');
    assert.equal(cells.get("'Cambios para Manu'!G2:G2"), 'F260300');
    assert.ok(writes.every((entry) => !/^'26-27'![MOP]/.test(entry.range)));
    assert.ok(writes.every((entry) => !/^'Cambios para Manu'![PQS]/.test(entry.range)));
  } finally {
    global.fetch = oldFetch;
    for (const [key, value] of Object.entries(oldEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
