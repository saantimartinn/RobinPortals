import React from 'react';
import { User } from 'lucide-react';
import { Card, CardContent, CardHeader, Row } from '../../shared/ui.jsx';
import { ChangePasswordCard } from '../profile/SubSettings.jsx';

export function ArrivalSettings({ user }) {
  return <div className="space-y-5">
    <div className="student-page-heading"><h1>Ajustes</h1></div>
    <Card><CardHeader title="Datos personales" icon={User} /><CardContent className="space-y-3">
      <Row label="Nombre" value={user.nombre || '—'} /><Row label="Apellidos" value={user.apellidos || '—'} /><Row label="Correo" value={user.email || '—'} /><Row label="Teléfono" value={user.telefono_alumno || '—'} />
      <p className="text-sm text-slate-500">Son los datos de tu cuenta del Portal del Alumno. Para corregir datos contractuales, contacta con tu asesor desde Soporte.</p>
    </CardContent></Card>
    <ChangePasswordCard />
  </div>;
}
