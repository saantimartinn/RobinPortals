import { useState } from 'react';
import { adminConvertMentoriaClient } from '../../api/admin-clients.js';

export function ConvertMentoria({ client, onConverted }) {
  const [open, setOpen] = useState(false);
  const [targetType, setTargetType] = useState('general');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (String(client.tipo || '').toLowerCase() !== 'mentoria') return null;

  async function convert() {
    setBusy(true); setError('');
    try {
      await adminConvertMentoriaClient(client.id, targetType);
      setOpen(false);
      await onConverted?.();
    } catch (cause) {
      setError(cause.data?.error === 'mentoria_payment_required'
        ? 'La Mentoría debe estar abonada antes de convertir al cliente.'
        : cause.data?.error === 'paid_mentoria_installment_missing'
          ? 'No se encuentra una cuota de Mentoría abonada por 666,33 €. Revisa el historial de pagos.'
        : cause.message || 'No se pudo convertir al cliente.');
    } finally { setBusy(false); }
  }

  return <>
    <button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      disabled={!client.pago_completed}
      title={!client.pago_completed ? 'Disponible tras abonar la Mentoría' : undefined}
      onClick={() => { setOpen(true); setTargetType('general'); setError(''); }}>
      Convertir a cliente
    </button>
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Convertir a cliente">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-slate-900">Convertir a cliente</h2>
        <p className="mt-2 text-sm text-slate-600">{client.nombre} {client.apellidos} tiene 666,33 € abonados de Mentoría. Se descontarán de la primera cuota del nuevo programa y deberá firmar el nuevo contrato.</p>
        <label className="mt-5 block text-sm font-semibold text-slate-700" htmlFor="convert-mentoria-type">Tipo de cliente</label>
        <select id="convert-mentoria-type" className="mt-2 w-full rounded-lg border border-slate-300 p-2" value={targetType} onChange={(event) => setTargetType(event.target.value)}>
          <option value="general">General</option><option value="delft">Delft</option><option value="llegada">Llegada</option>
        </select>
        {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="rounded-lg px-3 py-2 text-sm text-slate-600" onClick={() => setOpen(false)} disabled={busy}>Cancelar</button>
          <button type="button" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" onClick={convert} disabled={busy}>{busy ? 'Convirtiendo…' : 'Convertir a cliente'}</button>
        </div>
      </div>
    </div>}
  </>;
}
