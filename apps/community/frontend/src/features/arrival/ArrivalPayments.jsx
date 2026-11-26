import { t, useLocale } from "../../../../../../packages/i18n/react.jsx";
import React, { useEffect, useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { Badge, Btn, Card, CardContent, CardHeader, Row } from '../../shared/ui.jsx';
import { formatDate, formatMoney } from '../../shared/utils.js';
import { Factura } from '../../../../../portal/portal-source/src/application/payments/InvoiceReceipt.jsx';
import { arrivalCheckout, arrivalPayments, paymentsVerify } from '../../api/arrival.js';

export function ArrivalPayments() {
  useLocale();
  const [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [busy, setBusy] = useState(null), [receipt, setReceipt] = useState(null);
  async function load() {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams(window.location.search);
      const attemptId = params.get('payment_attempt');
      if (attemptId) {
        const verified = await paymentsVerify({ attemptId });
        if (!verified.ok) setError('El proveedor todavía no ha confirmado el pago. Puedes actualizar el estado en unos instantes.');
        else { params.delete('payment_attempt'); window.history.replaceState({}, '', window.location.pathname + (params.size ? '?' + params : '')); }
      }
      setData(await arrivalPayments());
    } catch (_) { setError('No hemos podido consultar la facturación de tu Pack Llegada.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function pay(payment) {
    setBusy(payment.id); setError('');
    try { const result = await arrivalCheckout(payment.installment); if (!result.url) throw new Error('checkout_missing'); window.location.assign(result.url); }
    catch (_) { setError('No se ha podido abrir el pago. Actualiza el estado o contacta con soporte.'); setBusy(null); }
  }
  const installments = (data?.contract_plan || []).map(expected => ({ expected, payment: data.payments.find(row => row.installment === expected.installment) }));
  const extras = (data?.payments || []).filter(row => row.installment > 3).map(payment => ({ expected: payment, payment }));
  return <div className="space-y-5">
    <div className="student-page-heading"><h1>{t("Pagos · Pack Llegada")}</h1><p>{t("Importes y estados del contrato y de tu facturación.")}</p></div>
    {loading && <p role="status" className="flex gap-2 items-center"><Loader2 size={16} className="animate-spin" />{t("Consultando pagos…")}</p>}
    {error && <p role="alert" className="text-sm text-rose-700">{t(error)}</p>}
    {!loading && <Btn variant="secondary" onClick={load}>{t("Actualizar estado")}</Btn>}
    {!loading && data && [...installments, ...extras].map(({ expected, payment }) => {
      // Onboarding can confirm the first payment before its ledger row is created or synchronized.
      const paid = payment?.status === 'paid' || (expected.installment === 1 && data.user?.pago_completed && (!payment || ['locked', 'unlocked'].includes(payment.status)));
      const paidAt = paid ? payment?.paid_at || (expected.installment === 1 ? data.user?.pago_completed_at : null) : null;
      const overdue = !paid && payment?.status === 'unlocked' && payment.due_date && Date.parse(payment.due_date) < Date.now();
      const state = paid ? 'Pagado' : !payment ? 'Pendiente de registrar' : overdue ? 'Vencido' : payment.status === 'locked' ? 'Pendiente de desbloqueo' : payment.status === 'unlocked' ? 'Pendiente' : payment.status;
      return <Card key={expected.installment}><CardHeader title={payment?.concept || (expected.installment === 1 ? t('Primer pago') : expected.installment === 2 ? t('Segundo pago') : t('Pago adicional'))} icon={CreditCard} right={<Badge tone={paid ? 'green' : 'amber'}>{t(state)}</Badge>} /><CardContent className="space-y-3">
        <Row label={payment ? t('Importe') : t('Importe contractual')} value={formatMoney(payment ? Number(payment.amount) : expected.amount, payment?.currency || 'EUR')} />
        {expected.installment <= 2 && <p className="text-sm text-slate-500">{expected.installment === 1 ? t('Al aceptar el servicio. Es necesario para iniciar la prestación.') : t('Al firmar o confirmar el contrato de alojamiento. El saldo puede incluir los extras aceptados.')}</p>}
        {payment?.due_date && <Row label={t("Vencimiento")} value={formatDate(payment.due_date)} />}
        {payment?.unlocked_at && !payment.due_date && !paid && <p className="text-sm text-slate-500">{t("Plazo contractual: 7 días hábiles desde el desbloqueo del pago.")}</p>}
        {paidAt && <Row label={t("Fecha de pago")} value={formatDate(paidAt)} />}
        {!payment && !paid && <p className="text-sm text-slate-500">{t("Todavía no hay un registro de facturación para esta cuota. Consulta con tu asesor.")}</p>}
        {payment?.status === 'paid' && <Btn variant="secondary" onClick={() => setReceipt(payment)}>{t("Ver justificante")}</Btn>}
        {payment?.status === 'unlocked' && payment.installment >= 2 && <Btn disabled={busy !== null} onClick={() => pay(payment)}>{busy === payment.id ? t('Abriendo pago…') : t('Completar pago')}</Btn>}
        {expected.installment === 1 && !paid && <a className="inline-block font-semibold underline text-sm" href="/portal/">{t("Completar primer pago en el Portal del Alumno")}</a>}
      </CardContent></Card>;
    })}
    <Factura open={!!receipt} onClose={() => setReceipt(null)} user={data?.user} payment={receipt} />
  </div>;
}
