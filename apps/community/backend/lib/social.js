/**
 * lib/social.js — helpers de amistad para The Robin Plan (portal de suscriptores).
 * Amistad mutua: existe una fila en `friendships` con status='accepted' en
 * cualquiera de las dos direcciones.
 */

// IDs de amigos aceptados de un usuario.
async function getFriendIds(sb, uid) {
  const { data, error } = await sb
    .from('friendships')
    .select('requester_id, addressee_id, status')
    .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)
    .eq('status', 'accepted');
  if (error) return [];
  const ids = new Set();
  (data || []).forEach((r) => {
    const other = r.requester_id === uid ? r.addressee_id : r.requester_id;
    if (other) ids.add(other);
  });
  return Array.from(ids);
}

// ¿Son amigos a y b?
async function areFriends(sb, a, b) {
  const { data, error } = await sb
    .from('friendships')
    .select('id')
    .eq('status', 'accepted')
    .or(`and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`)
    .limit(1);
  if (error) return false;
  return !!(data && data[0]);
}

module.exports = { getFriendIds, areFriends };
