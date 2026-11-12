const { sendYuselicoDigest, isMadridFridayNine } = require('../../lib/yuselico-digest');
const { json } = require('../../lib/http');

exports.alwaysRun = true;
exports.handler = async (event) => {
  let scheduled = false;
  try { scheduled = Boolean(JSON.parse(event?.body || '').next_run); } catch (_) {}
  if (!scheduled) return json({ error: 'not_found' }, { statusCode: 404 });
  const now = new Date();
  if (!isMadridFridayNine(now)) return json({ ok: true, skipped: 'outside_madrid_friday_nine' });
  try {
    const result = await sendYuselicoDigest({ to: 'yuselicostudio@gmail.com', now });
    console.log(JSON.stringify({ operation: 'yuselico.weekly_digest', ...result }));
    return json({ ok: true, newCount: result.newCount, historicalCount: result.historicalCount });
  } catch (error) {
    console.error('[yuselico.weekly_digest]', error?.message || error);
    return json({ ok: false }, { statusCode: 500 });
  }
};
