// Native row preparation shared by Admin, Portal and Robin Jr.
function cashRowRequests({ values, row, sheetId, complete = false, fresh = false, insert = false, taxExempt = false, paymentRow }) {
  const columns = complete ? [15, 16, 18] : [9, 10, 12];
  const cells = values[row - 1] || [];
  const missing = columns.some(column => cells[column] == null || cells[column] === '');
  const requests = [];
  const range = (r, start = 0, end = complete ? 27 : 14) => ({ sheetId, startRowIndex: r - 1, endRowIndex: r, startColumnIndex: start, endColumnIndex: end });
  if (insert) requests.push({ insertDimension: { range: { sheetId, dimension: 'ROWS', startIndex: row - 1, endIndex: row }, inheritFromBefore: true } });
  if (fresh || missing) {
    // Copy structure only. Never copy another client's values or links.
    let exemplar = -1;
    for (let index = 1; index < values.length; index++) {
      if (index === row - 1 || !values[index]?.[1]) continue;
      if (columns.every(column => String(values[index]?.[column] || '').startsWith('='))) {
        exemplar = index;
        if (index >= row - 1) break;
      }
    }
    if (exemplar !== -1) {
      const sourceRow = exemplar + 1 + (insert && exemplar >= row - 1 ? 1 : 0);
      requests.push({ copyPaste: { source: range(sourceRow), destination: range(row), pasteType: 'PASTE_FORMAT', pasteOrientation: 'NORMAL' } });
    }
    // Existing prepared blank rows keep their validation. Inserted rows inherit
    // the immediately preceding row's current dropdown/date rules.
    if (insert && row > 2) requests.push({ copyPaste: { source: range(row - 1), destination: range(row), pasteType: 'PASTE_DATA_VALIDATION', pasteOrientation: 'NORMAL' } });
  }
  const paid = complete
    ? `=IF(E${row}="Si";D${row};0) + IF(I${row}="Si";H${row};0) + IF(M${row}="Si";L${row};0)`
    : `=IF(E${row}="Si";D${row};0) + IF(G${row}="Si";F${row};0) + IF(I${row}="Si";H${row};0)`;
  const visiblePaid = [1, 2, 3].reduce((sum, i) => sum + (paymentRow[`estado${i}`] === 'Si' ? paymentRow[`pago${i}`] : 0), 0);
  const extraPaid = Math.round((paymentRow.totalPagado - visiblePaid) * 100) / 100;
  const formulas = [
    paid + (extraPaid ? ` + ${String(extraPaid).replace('.', ',')}` : ''),
    complete ? `=R${row}-P${row}` : `=L${row}-J${row}`,
    `=${complete ? 'R' : 'L'}${row}${taxExempt ? '' : '/1,21'}`,
  ];
  const compact = text => String(text || '').replace(/\s/g, '');
  for (let i = 0; i < columns.length; i++) {
    const current = cells[columns[i]];
    const suffix = compact(current).slice(compact(paid).length);
    const managedPaid = i === 0 && compact(current).startsWith(compact(paid)) && /^(?:\+-?\d+(?:[.,]\d+)?)?$/.test(suffix);
    if ((fresh || current == null || current === '' || managedPaid) && compact(current) !== compact(formulas[i])) {
      requests.push({ updateCells: { range: range(row, columns[i], columns[i] + 1), rows: [{ values: [{ userEnteredValue: { formulaValue: formulas[i] } }] }], fields: 'userEnteredValue' } });
    }
  }
  return requests;
}

async function prepareCashRow({ token, spreadsheetId, tab, ...options }) {
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  // Most updates only change amounts/statuses; no structural API call is needed.
  const preview = cashRowRequests({ ...options, sheetId: 0 });
  if (!preview.length) return;
  const headers = { Authorization: `Bearer ${token}` };
  const metadata = await fetch(`${base}?fields=sheets(properties)`, { headers });
  const data = await metadata.json();
  if (!metadata.ok) throw new Error('cash_template_metadata_failed');
  const properties = data.sheets?.find(sheet => sheet.properties.title === tab)?.properties;
  if (!properties) throw new Error('cash_template_tab_missing');
  const requests = cashRowRequests({ ...options, sheetId: properties.sheetId });
  if (options.insert && options.row > properties.gridProperties?.rowCount) {
    requests[0] = { appendDimension: { sheetId: properties.sheetId, dimension: 'ROWS', length: 1 } };
  }
  const response = await fetch(`${base}:batchUpdate`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ requests }) });
  if (!response.ok) throw new Error('cash_template_update_failed: ' + (await response.json()).error?.message);
}

module.exports = { cashRowRequests, prepareCashRow };
