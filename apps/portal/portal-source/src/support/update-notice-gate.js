// Keep the previous browser marker while moving the once-only decision to the account.
export function createUpdateNoticeGate() {
  const pending = new Map();
  const seen = new Set();
  return function claimNotice(userId, claim, storage) {
    if (!userId || seen.has(userId)) return Promise.resolve(false);
    if (pending.has(userId)) return pending.get(userId);
    const key = `robin_portal_update_notice_2026:${userId}`;
    let alreadySeen = false;
    try { alreadySeen = Boolean(storage?.getItem(key)); } catch (_) {}
    const request = Promise.resolve().then(() => claim({ already_seen: alreadySeen })).then((result) => {
      seen.add(userId);
      try { storage?.setItem(key, 'seen'); } catch (_) {}
      return !alreadySeen && result?.show === true;
    }).finally(() => pending.delete(userId));
    pending.set(userId, request);
    return request;
  };
}

export const claimUpdateNotice = createUpdateNoticeGate();
