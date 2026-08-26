async function lookupCode(sb, rawCode) {
  const code = String(rawCode || '').trim();
  if (!code) return null;
  const { data, error } = await sb
    .from('discount_codes')
    .select('code, percent_off, active, max_redemptions, times_redeemed, duration_months')
    .ilike('code', code)
    .limit(1);
  if (error) throw error;
  const row = data && data[0];
  if (!row) return null;
  if (!row.active) return null;
  if (row.max_redemptions != null && row.times_redeemed >= row.max_redemptions) return null;
  const dm = row.duration_months == null ? null : Number(row.duration_months);
  return {
    code: row.code,
    percent_off: Number(row.percent_off),
    duration_months: (dm != null && dm >= 1 && dm <= 12) ? Math.round(dm) : null,
  };
}

module.exports = { lookupCode };
