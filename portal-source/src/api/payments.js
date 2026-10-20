import { api } from "./core.js";

// ----- PAGOS -----
export async function paymentsList() {
  return api.get("/api/payments");
}
// Checkout alojado para una cuota desbloqueada (2-3 o extra). Devuelve { url }.
export async function paymentsCheckout(installment) {
  return api.post("/api/payments/checkout", { installment });
}
// Confirma el pago al volver de la pasarela (idempotente).
export async function paymentsVerify({ attemptId }) {
  return api.post("/api/payments/verify", { attempt_id: attemptId });
}
export async function adminPaymentsList(userId) {
  return api.get("/api/admin/payments?user_id=" + encodeURIComponent(userId));
}
export async function adminPaymentsAdd(userId, payload) {
  return api.post("/api/admin/payments/add", { user_id: userId, ...payload });
}
export async function adminPaymentsDelete(userId, paymentId) {
  return api.post("/api/admin/payments/delete", { user_id: userId, payment_id: paymentId });
}
export async function adminPaymentsUnlock(userId, installment) {
  return api.post("/api/admin/payments/unlock", { user_id: userId, installment });
}
export async function adminPaymentsSetAmount(userId, installment, amount) {
  return api.post("/api/admin/payments/set-amount", { user_id: userId, installment, amount });
}
export async function adminPaymentsSetCarreras(userId, num) {
  return api.post("/api/admin/payments/set-carreras", { user_id: userId, num_carreras: num });
}

