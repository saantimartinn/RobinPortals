function normalizeToken(token) {
  const value = String(token || '').toLowerCase();
  if (!/^[a-f0-9]{32,512}$/.test(value) || value.length % 2) throw new Error('invalid_device_token');
  return value;
}

async function registerDevice(db, userId, token) {
  if (!userId) throw new Error('missing_user');
  const row = { token: normalizeToken(token), user_id: userId, enabled: true, updated_at: new Date().toISOString() };
  const { error } = await db.from('mobile_push_devices').upsert(row, { onConflict: 'token' });
  if (error) throw error;
}

async function unregisterDevice(db, token) {
  const { error } = await db.from('mobile_push_devices').update({ enabled: false, updated_at: new Date().toISOString() }).eq('token', normalizeToken(token));
  if (error) throw error;
}

module.exports = { normalizeToken, registerDevice, unregisterDevice };
