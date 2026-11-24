import { Calendar, CheckCircle2, Clock, CreditCard, FileText } from 'lucide-react';
import { Badge, Btn, Card, CardContent, CardHeader } from '../../ui.jsx';
import { formatDate } from '../../client-utils.js';
import { ONBOARDING_STEPS, onboardingOrder } from '../../../../../../packages/onboarding/flow.mjs';
import arrivalPack from '../../../../shared/arrival-pack.cjs';
import { NAVY } from '../../theme.js';
import { AdminReservas } from './AdminReservas.jsx';

export function AdminArrivalSummary({ client, onNavigate }) {
  const pack = arrivalPack.arrivalPackForUser(client);
  const status = !client.contract_signed ? 'Contrato pendiente'
    : pack?.status === 'ended' ? 'Servicio finalizado'
    : pack?.status === 'active' ? 'Activo' : 'Primer pago pendiente';
  const completed = { origin: client.origin, dni: client.dni_completed, contract: client.contract_signed, payment: client.pago_completed };
  return <div className="space-y-5">
    <div className="rounded-2xl p-6" style={{ background: NAVY }}>
      <div className="flex items-center gap-3 flex-wrap"><h2 className="text-white text-2xl font-bold" style={{ fontFamily: 'var(--robin-font-display)' }}>Pack Llegada</h2><Badge tone={pack?.status === 'active' ? 'green' : 'amber'}>{status}</Badge></div>
      <p className="text-white/70 text-sm mt-2">Llamadas con el asesor y gestión del Pack Llegada.</p>
      {pack?.service_end_at && <p className="text-white/70 text-sm mt-2">Servicio hasta el {formatDate(pack.service_end_at)}.</p>}
      <div className="flex flex-wrap gap-3 mt-4"><Btn onClick={() => onNavigate('reservas')}><Calendar size={16} />Ver llamadas</Btn><Btn variant="secondary" onClick={() => onNavigate('pagos')}><CreditCard size={16} />Ver pagos</Btn></div>
    </div>
    <Card><CardHeader title="Registro del Pack Llegada" subtitle="Estado de las mismas etapas que completa el alumno." icon={FileText} /><CardContent className="space-y-3">
      {onboardingOrder(client).map(key => {
        const step = ONBOARDING_STEPS.find(step => step.key === key);
        const done = !!completed[key];
        return <div key={key} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 px-4 py-3"><div className="flex items-center gap-3">{done ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Clock size={18} className="text-slate-400" />}<span className="text-sm font-medium">{key === 'origin' ? 'Solicitud' : step.label}</span></div><Badge tone={done ? 'green' : 'amber'}>{done ? 'Completado' : 'Pendiente'}</Badge></div>;
      })}
      {client.contract_signed_at && <p className="text-sm text-slate-500">Contrato firmado el {formatDate(client.contract_signed_at)}.</p>}
    </CardContent></Card>
    <AdminReservas client={client} />
  </div>;
}
