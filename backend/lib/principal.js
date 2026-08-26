// Este backend solo admite identidades del portal de suscripción.
function isSubscriberRole(role) {
  return role === 'subscriber' || role === 'subscriber_admin';
}
function principalTable(role) {
  if (!isSubscriberRole(role)) throw new Error('unsupported_role');
  return 'subscribers';
}
module.exports = { isSubscriberRole, principalTable };
