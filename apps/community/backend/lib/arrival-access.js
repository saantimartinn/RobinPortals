// Verify the existing common session on every permitted Pack Llegada request.
const { readApplicationIdentity } = require('./application-permissions');

async function readArrivalIdentity(event, session) {
  if (session?.auth_source !== 'application_arrival') return null;
  const identity = await readApplicationIdentity(event);
  return identity?.id === session.uid && identity.arrival_pack?.contracted === true
    && !identity.is_application_admin && identity.auth_source !== 'external_client'
    ? identity : null;
}

function arrivalUser(identity) {
  return {
    ...identity, role: 'subscriber', is_subscriber: false,
    community_access: 'arrival', subscription_status: 'none', subscription_plan: null,
  };
}

module.exports = { readArrivalIdentity, arrivalUser };
