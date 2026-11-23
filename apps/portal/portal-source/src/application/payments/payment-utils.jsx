import { getLocale, t, useLocale } from "../../../../../../packages/i18n/react.jsx";
// Portal view or navigation module for payment utils; the application shell owns session state.
import React from 'react';
import { Badge } from '../../ui.jsx';

export function eur(value) {
  return Number(value || 0).toLocaleString(getLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' €';
}

export function daysBetween(startIso, endIso) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return Math.floor((end - start) / 86400000);
}

export function PaymentStatusBadge({ status }) {
  useLocale();
  if (status === 'paid') return <Badge tone="green">{t("Pagado")}</Badge>;
  if (status === 'unlocked') return <Badge tone="amber">{t("Disponible")}</Badge>;
  return <Badge tone="slate">{t("Bloqueado")}</Badge>;
}

export function paymentTitle(payment, total) {
  if (payment && payment.concept) return payment.concept;
  return t("Cuota {0} de {1}", [payment ? payment.installment : '', total || 3]);
}
