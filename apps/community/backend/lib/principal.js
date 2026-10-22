// Este backend solo admite identidades del portal de suscripción.
function isSubscriberRole(role) {
  return role === 'subscriber' || role === 'subscriber_admin';
}
function principalTable(role) {
  if (!isSubscriberRole(role)) throw new Error('unsupported_role');
  return 'subscribers';
}
function subscriberDisplayName(user) {
  return `${user.nombre || ''} ${user.apellidos || ''}`.trim() || user.email || user.username || 'Robin';
}
module.exports = { isSubscriberRole, principalTable, subscriberDisplayName };
