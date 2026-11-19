import React from 'react';
import { Reservas } from '../../../../../portal/portal-source/src/application/BookingsPortal.jsx';

export function ArrivalCalls({ user }) {
  const pack = user.arrival_pack || {};
  const notice = pack.status === 'ended'
    ? 'El periodo de servicio de tu Pack Llegada ha finalizado. Contacta con soporte si tienes una prórroga acordada.'
    : !pack.first_payment_completed ? 'El contrato requiere completar el primer pago antes de iniciar las llamadas.' : '';
  return <div className="space-y-5">
    <div className="student-page-heading"><h1>Llamadas</h1><p>Tus reservas con el asesor asignado.</p></div>
    <Reservas reserveLabel="Reservar llamada con mi asesor" timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone} bookingNotice={notice} />
  </div>;
}
