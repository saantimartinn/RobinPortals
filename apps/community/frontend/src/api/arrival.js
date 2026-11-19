// Pack Llegada uses the authenticated Portal APIs and their existing ownership rules.
import { paymentsList, paymentsCheckout } from '../../../../portal/portal-source/src/api/payments.js';
export { bookingsList } from '../../../../portal/portal-source/src/api/bookings.js';
export { paymentsVerify } from '../../../../portal/portal-source/src/api/payments.js';
export function arrivalPayments() { return paymentsList('llegada'); }
export function arrivalCheckout(installment) { return paymentsCheckout(installment, 'llegada'); }
