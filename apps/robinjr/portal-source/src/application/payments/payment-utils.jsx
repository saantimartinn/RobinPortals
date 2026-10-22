// Portal view or navigation module for payment utils; the application shell owns session state.
import React from 'react';
import { Badge } from '../../ui.jsx';

export function eur(value) {
  return Number(value || 0).toLocaleString('es-ES', {
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
  if (status === 'paid') return <Badge tone="green">Pagado</Badge>;
  if (status === 'unlocked') return <Badge tone="amber">Disponible</Badge>;
  return <Badge tone="slate">Bloqueado</Badge>;
}

export function paymentTitle(payment, total) {
  if (payment && payment.concept) return payment.concept;
  const milestone = {
    1: 'Al inicio del programa',
    2: 'Después de las mentorías con exalumnos',
    3: 'Al llegar a Wrap up',
  };
  if (payment && milestone[payment.installment]) return `Cuota ${payment.installment} · ${milestone[payment.installment]}`;
  return `Cuota ${payment ? payment.installment : ''} de ${total || 3}`;
}
