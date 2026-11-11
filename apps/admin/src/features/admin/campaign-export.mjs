export const campaignStatusLabel = { ACTIVE: 'Activa', PAUSED: 'Pausada', ARCHIVED: 'Archivada', DELETED: 'Eliminada', CAMPAIGN_PAUSED: 'Pausada', ADSET_PAUSED: 'Pausada', IN_PROCESS: 'En revisión', WITH_ISSUES: 'Con incidencias' };

export function previousCalendarMonth(now = new Date(), timeZone = 'Europe/Madrid') {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit' }).formatToParts(now);
  const year = Number(parts.find(part => part.type === 'year').value);
  const month = Number(parts.find(part => part.type === 'month').value);
  return {
    from: new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 10),
    to: new Date(Date.UTC(year, month - 1, 0)).toISOString().slice(0, 10),
  };
}

export function campaignWorkbook(snapshot, range, periodLabel) {
  const text = value => ({ value: String(value ?? ''), type: String });
  const number = (value, format = '#,##0.00') => ({ value, type: Number, format });
  const currency = snapshot.account.currency || 'EUR';
  const headers = ['Campaña', 'ID', 'Estado', `Inversión (${currency})`, 'Leads', `CPL (${currency})`, 'ROAS'];
  return {
    fileName: `campanas_${range ? `${range.from}_${range.to}` : 'ultimos-30-dias'}.xlsx`,
    sheet: 'Campañas',
    columns: [42, 24, 20, 20, 14, 20, 14].map(width => ({ width })),
    stickyRowsCount: 5,
    data: [
      [{ ...text('Campañas Meta Ads'), fontWeight: 'bold', fontSize: 16 }],
      [text('Periodo'), text(periodLabel)],
      [text('Cuenta'), text(snapshot.account.name), text('Zona horaria'), text(snapshot.account.timezone)],
      [],
      headers.map(value => ({ ...text(value), fontWeight: 'bold', backgroundColor: '#3C486D', textColor: '#FFFFFF', height: 26 })),
      ...snapshot.campaigns.map(row => [text(row.name), text(row.id), text(campaignStatusLabel[row.status] || row.status), number(row.spend), number(row.leads, '#,##0'), number(row.cpl), number(row.roas, '0.00"×"')]),
    ],
  };
}

export async function downloadCampaignWorkbook(snapshot, range, periodLabel) {
  const { default: writeExcelFile } = await import('write-excel-file/universal');
  const { data, fileName, ...options } = campaignWorkbook(snapshot, range, periodLabel);
  const blob = await writeExcelFile(data, options).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
