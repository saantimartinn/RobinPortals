// The signed Portal contract is the source of Pack Llegada entitlement.
const SERVICE_END = '2027-09-15T00:00:00+02:00';

function arrivalPackForUser(user, now = Date.now()) {
  if (!user || user.is_application_admin || user.auth_source === 'external_client'
    || (user.role && user.role !== 'client') || user.tipo !== 'llegada' || !user.contract_signed) return null;
  const contract = user.contract_data || {};
  if ((contract.variant || user.contract_variant) && (contract.variant || user.contract_variant) !== 'llegada') return null;
  // An explicitly agreed extension/reactivation can be recorded by an operator
  // in the existing signed-contract metadata. Never accept it from the browser.
  const extension = Date.parse(contract.arrival_service_end_at || '');
  const end = Number.isFinite(extension) ? extension : Date.parse(SERVICE_END);
  return {
    contracted: true,
    service_end_at: new Date(end).toISOString(),
    first_payment_completed: !!user.pago_completed,
    calls_enabled: !!user.pago_completed && now < end,
    status: now >= end ? 'ended' : user.pago_completed ? 'active' : 'awaiting_payment',
  };
}

module.exports = { arrivalPackForUser, SERVICE_END };
