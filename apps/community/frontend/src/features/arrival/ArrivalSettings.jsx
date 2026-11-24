import { t, useLocale } from "../../../../../../packages/i18n/react.jsx";
import React from 'react';
import { User } from 'lucide-react';
import { Card, CardContent, CardHeader, Row } from '../../shared/ui.jsx';
import { ChangePasswordCard, SubSettings } from '../profile/SubSettings.jsx';

export function ArrivalSettings({ user, onUserRefresh, onLogout }) {
  useLocale();
  return <div className="space-y-5">
    <div className="student-page-heading"><h1>{t("Ajustes")}</h1></div>
    <Card><CardHeader title={t("Datos personales")} icon={User} /><CardContent className="space-y-3">
      <Row label={t("Nombre")} value={user.nombre || '—'} /><Row label={t("Apellidos")} value={user.apellidos || '—'} /><Row label={t("Correo")} value={user.email || '—'} /><Row label={t("Teléfono")} value={user.telefono_alumno || user.profile_extra?.phone || '—'} />
      <p className="text-sm text-slate-500">{t('Para corregir tus datos personales o contractuales, contacta con el equipo desde Soporte.')}</p>
    </CardContent></Card>
    {user.arrival_pack ? <ChangePasswordCard /> : <SubSettings user={user} onUserRefresh={onUserRefresh} onLogout={onLogout} />}
  </div>;
}
