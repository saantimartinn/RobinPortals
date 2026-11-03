const PROMO_EMAIL = 'manuelvillamuriel@gmail.com';

function hasOneEuroFirstPayment(email) {
  return String(email || '').trim().toLowerCase() === PROMO_EMAIL;
}

function applyFirstPaymentPromo(user, installments) {
  if (!hasOneEuroFirstPayment(user?.email)) return installments;
  return installments.map((row) => row.installment === 1 ? { ...row, amount: 1 } : row);
}

module.exports = { hasOneEuroFirstPayment, applyFirstPaymentPromo };
