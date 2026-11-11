const { dateKey, dayStart, addCalendarDays } = require('../../../../packages/time/madrid.cjs');
const { v2List } = require('./holded');

function cents(value) {
  let text = String(value ?? '0').trim();
  if (text.includes(',')) {
    text = text.lastIndexOf(',') > text.lastIndexOf('.')
      ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
  }
  const number = Number(text);
  if (!Number.isFinite(number)) throw new Error('holded_invalid_ledger_amount');
  return Math.round(number * 100);
}

function ledgerDate(value) {
  const match = String(value || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const key = match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : dateKey(value);
  if (!key) throw new Error('holded_invalid_ledger_date');
  return key;
}

function accountingAdjustments(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (String(row.type || '').toLowerCase() !== 'entry') continue;
    const account = String(row.account?.number ?? row.account ?? row.account_number ?? '').trim();
    if (!/^70\d+$/.test(account) && !/^477\d+$/.test(account)) continue;
    const id = row.id || row.entry_number;
    if (id == null) throw new Error('holded_missing_ledger_identity');
    let group = groups.get(String(id));
    if (!group) {
      group = { id: String(id), number: row.entry_number, date: ledgerDate(row.date), base: 0, tax: 0, revenue: false };
      groups.set(String(id), group);
    }
    const signed = cents(row.credit) - cents(row.debit);
    if (/^70/.test(account)) { group.base += signed; group.revenue = true; }
    else group.tax += signed;
  }
  return [...groups.values()].filter((group) => group.revenue && (group.base || group.tax)).map((group) => ({
    id: `entry:${group.id}`,
    documentType: 'entry',
    docNumber: `Asiento ${group.number ?? group.id}`,
    contactName: 'Ajuste contable',
    date: dayStart(group.date).getTime() / 1000,
    subtotal: group.base / 100,
    tax: group.tax / 100,
    total: (group.base + group.tax) / 100,
    paymentsTotal: 0,
    paymentsPending: 0,
    status: 'adjustment',
    draft: false,
    currency: 'EUR',
  }));
}

const revenueCache = new Map();
async function loadRevenueAdjustments(start, end) {
  const from = dateKey(start);
  const to = addCalendarDays(dateKey(end), -1);
  const key = `${from}:${to}`;
  const cached = revenueCache.get(key);
  if (cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.promise;
  if (revenueCache.size >= 12) revenueCache.delete(revenueCache.keys().next().value);
  const promise = v2List('/ledger-entries', { start_date: from, end_date: to, limit: 200 }, 1000)
    .then(accountingAdjustments)
    .catch((error) => { revenueCache.delete(key); throw error; });
  revenueCache.set(key, { at: Date.now(), promise });
  return promise;
}

module.exports = { cents, ledgerDate, accountingAdjustments, loadRevenueAdjustments };
