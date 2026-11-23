import { t, useLocale } from "../../../../../../packages/i18n/react.jsx";
import React from 'react';
import { Reservas } from '../../../../../portal/portal-source/src/application/BookingsPortal.jsx';

export function ArrivalCalls({ user }) {
  useLocale();
  const pack = user.arrival_pack || {};
  const notice = pack.status === 'ended'
    ? 'El periodo de servicio de tu Pack Llegada ha finalizado. Contacta con soporte si tienes una prórroga acordada.'
    : !pack.first_payment_completed ? 'El contrato requiere completar el primer pago antes de iniciar las llamadas.' : '';
  return <div className="space-y-5">
    <div className="student-page-heading"><h1>{t("Llamadas")}</h1><p>{t("Tus reservas con el asesor asignado.")}</p></div>
    <Reservas reserveLabel={t("Reservar llamada con mi asesor")} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone} bookingNotice={t(notice)} />
  </div>;
}
