const { sendPush } = require('./apns.cjs');

async function rows(query) {
  const result = await query;
  if (result.error) throw result.error;
  return result.data;
}

async function pages(query) {
  const all = [];
  for (let offset = 0; ; offset += 1000) {
    const batch = await rows(query().range(offset, offset + 999));
    all.push(...batch);
    if (batch.length < 1000) return all;
  }
}

function chunks(items, size = 500) {
  const result = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

async function resolveIds(db, audience, table, isClient, strict = true) {
  const fields = table === 'subscribers' ? 'id,role,subscription_status' : 'id,role,email';
  if (audience.mode === 'selected') {
    const ids = [...new Set((audience.user_ids || []).filter(id => /^[a-f0-9-]{36}$/i.test(id)))];
    if (!ids.length || ids.length !== audience.user_ids.length) throw new Error('invalid_recipients');
    const users = [];
    for (const batch of chunks(ids)) users.push(...await pages(() => db.from(table).select(fields).in('id', batch)));
    if (strict && (users.length !== ids.length || users.some(user => !isClient(user)))) throw new Error('invalid_recipients');
    const eligible = new Set(users.filter(isClient).map(user => user.id));
    return ids.filter(id => eligible.has(id));
  }
  if (!['all', 'installed'].includes(audience.mode)) throw new Error('invalid_audience');
  const users = await pages(() => db.from(table).select(fields).order('id'));
  const ids = users.filter(isClient).map(user => user.id);
  if (audience.mode === 'all' || !ids.length) return ids;
  const devices = [];
  for (const batch of chunks(ids)) devices.push(...await pages(() => db.from('mobile_push_devices').select('user_id,token').eq('enabled', true).in('user_id', batch).order('token')));
  const installed = new Set(devices.map(device => device.user_id));
  return ids.filter(id => installed.has(id));
}

async function enqueue(db, { title, content, type = 'info', audience, scheduledAt, createdBy, notificationId = null }) {
  const at = new Date(scheduledAt || Date.now());
  if (!Number.isFinite(at.getTime())) throw new Error('invalid_schedule');
  if (!title?.trim() || !content?.trim() || !audience || !createdBy) throw new Error('invalid_notification');
  return rows(db.from('scheduled_notifications').insert({ title: title.trim(), content: content.trim(), type, audience, scheduled_at: at.toISOString(), created_by: createdBy, notification_id: notificationId, is_immediate: !!notificationId }).select('*').single());
}

async function preview(db, audience, table, isClient) {
  const ids = await resolveIds(db, audience, table, isClient);
  let devices = 0;
  for (const batch of chunks(ids)) devices += (await pages(() => db.from('mobile_push_devices').select('token').eq('enabled', true).in('user_id', batch).order('token'))).length;
  return { recipients: ids.length, devices };
}

async function deliver(db, product, notification, ids, push = sendPush) {
  if (!ids.length) return { accepted: 0, rejected: 0, review: 0 };
  const devices = [];
  for (const batch of chunks(ids)) devices.push(...await pages(() => db.from('mobile_push_devices').select('token,user_id').eq('enabled', true).in('user_id', batch).order('token')));
  const result = { accepted: 0, rejected: 0, review: 0 };
  let next = 0;
  async function worker() {
    while (next < devices.length) {
      const device = devices[next++];
      const claim = await db.from('mobile_push_deliveries').insert({ notification_id: notification.id, token: device.token, status: 'claimed' });
      if (claim.error?.code === '23505') continue;
      if (claim.error) throw claim.error;
      let status = 'review';
      let response = {};
      try {
        response = await push({ token: device.token, title: notification.title, body: notification.type === 'terms' ? 'Abre Robin para revisar un aviso importante.' : notification.content, product, notificationId: notification.id });
        status = response.accepted ? 'accepted' : 'rejected';
      } catch (_) { /* Delivery could be ambiguous; do not resend automatically. */ }
      await rows(db.from('mobile_push_deliveries').update({ status, apns_status: response.status || null, apns_reason: response.reason || null }).eq('notification_id', notification.id).eq('token', device.token));
      result[status] += 1;
      if (response.reason === 'BadDeviceToken' || response.reason === 'Unregistered') await rows(db.from('mobile_push_devices').update({ enabled: false }).eq('token', device.token));
    }
  }
  const workers = await Promise.allSettled(Array.from({ length: Math.min(20, devices.length) }, worker));
  const failure = workers.find(item => item.status === 'rejected');
  if (failure) throw failure.reason;
  return result;
}

async function runDue(db, { product, table, isClient, now = new Date(), push = sendPush }) {
  const staleAt = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
  await rows(db.from('scheduled_notifications').update({ status: 'pending', processing_started_at: null }).eq('status', 'processing').lt('processing_started_at', staleAt));
  const jobs = await rows(db.from('scheduled_notifications').update({ status: 'processing', processing_started_at: now.toISOString() }).eq('status', 'pending').lte('scheduled_at', now.toISOString()).select('*'));
  for (const job of jobs) {
    try {
      const ids = await resolveIds(db, job.audience, table, isClient, false);
      let notificationId = job.notification_id;
      if (!notificationId) {
        notificationId = job.id;
        const { data: prior, error: lookupError } = await db.from('notifications').select('id').eq('id', notificationId).maybeSingle();
        if (lookupError) throw lookupError;
        if (!prior) await rows(db.from('notifications').insert({ id: notificationId, title: job.title, content: job.content, type: job.type, created_by: job.created_by }));
        await rows(db.from('scheduled_notifications').update({ notification_id: notificationId }).eq('id', job.id));
      }
      if (!job.is_immediate && ids.length) {
        const prior = await pages(() => db.from('notification_recipients').select('user_id').eq('notification_id', notificationId).order('user_id'));
        const seen = new Set(prior.map(item => item.user_id));
        for (const batch of chunks(ids.filter(id => !seen.has(id)))) await rows(db.from('notification_recipients').insert(batch.map(user_id => ({ notification_id: notificationId, user_id, status: 'pending' }))));
      }
      const result = await deliver(db, product, { id: notificationId, title: job.title, content: job.content, type: job.type }, ids, push);
      await rows(db.from('scheduled_notifications').update({ status: 'sent', push_accepted: result.accepted, push_rejected: result.rejected, push_review: result.review }).eq('id', job.id));
    } catch (error) {
      await rows(db.from('scheduled_notifications').update({ status: 'failed' }).eq('id', job.id));
      console.error('mobile_push_job_failed', product, job.id, error.message);
    }
  }
  return { processed: jobs.length };
}

module.exports = { resolveIds, preview, enqueue, deliver, runDue };
