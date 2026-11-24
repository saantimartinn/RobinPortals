import { t, useLocale } from "../../../../../../packages/i18n/react.jsx";
import React from 'react';
import { Reservas } from '../../../../../portal/portal-source/src/application/BookingsPortal.jsx';
import { Btn, Card, CardContent, CardHeader } from '../../shared/ui.jsx';
import { Calendar } from 'lucide-react';

export function ArrivalCalls({ user, onSupport }) {
  useLocale();
  if (!user.arrival_pack) return <div className="space-y-5">
    <div className="student-page-heading"><h1>{t('Llamadas')}</h1><p>{t('Tus reservas con el asesor asignado.')}</p></div>
    <Card><CardHeader title={t('Llamadas con asesor')} icon={Calendar} /><CardContent className="space-y-4">
      <p className="text-sm text-slate-500">{t('Las llamadas con asesor están incluidas en Pack Llegada. Tu suscripción no incluye este servicio.')}</p>
      <Btn variant="secondary" onClick={onSupport}>{t('Contactar con Soporte')}</Btn>
    </CardContent></Card>
  </div>;
  const pack = user.arrival_pack || {};
  const notice = pack.status === 'ended'
    ? 'El periodo de servicio de tu Pack Llegada ha finalizado. Contacta con soporte si tienes una prórroga acordada.'
    : !pack.first_payment_completed ? 'El contrato requiere completar el primer pago antes de iniciar las llamadas.' : '';
  return <div className="space-y-5">
    <div className="student-page-heading"><h1>{t("Llamadas")}</h1><p>{t("Tus reservas con el asesor asignado.")}</p></div>
    <Reservas reserveLabel={t("Reservar llamada con mi asesor")} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone} bookingNotice={t(notice)} />
  </div>;
}
