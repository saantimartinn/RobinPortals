/**
 * Robin Jr usa dos cuotas de 500 € y una última de 499,99 €. Los pagos extra conservan su
 * concepto, importe y vencimiento propios.
 */

const {
  APPLICATION_TOTALS,
  applicationPlan: plan,
  applicationPlanForUser,
  isLatamClient,
  splitEqual,
} = require('../shared/financial-config.cjs');

function latamPlanWithPaidAmounts(planRows, existingRows) {
  const paidByInstallment = new Map(
    (existingRows || [])
      .filter((row) => row.installment <= 3 && row.status === 'paid')
      .map((row) => [row.installment, Number(row.amount || 0)])
  );
  if (!paidByInstallment.size) return planRows;

  const unpaid = planRows.filter((row) => !paidByInstallment.has(row.installment));
  if (!unpaid.length) return planRows.map((row) => ({
    ...row,
    amount: paidByInstallment.get(row.installment) ?? row.amount,
  }));

  const paidTotal = [...paidByInstallment.values()].reduce((sum, amount) => sum + amount, 0);
  const remaining = Math.round((APPLICATION_TOTALS.international - paidTotal) * 100) / 100;
  if (remaining < 0) return planRows;
  const remainingPlan = splitEqual(remaining, unpaid.length);
  let nextIndex = 0;
  return planRows.map((row) => {
    if (paidByInstallment.has(row.installment)) {
      return { ...row, amount: paidByInstallment.get(row.installment) };
    }
    return { ...row, amount: remainingPlan[nextIndex++].amount };
  });
}

/**
 * Garantiza que las filas de payments existan para un user (las crea si no).
 * Actualiza los amounts si el tipo o el num_carreras cambian, salvo que el
 * asesor haya fijado un importe personalizado (payment_data.amount_custom) o
 * la cuota ya esté pagada.
 */
async function ensurePayments(sb, user) {
  // Los datos internacionales pueden no venir en algunos read models. Se
  // completan aquí para aplicar de forma consistente precio y fiscalidad LATAM.
  let hasEuId = user.has_eu_id;
  let pais = user.pais;
  const internationalOrigin = ['otros', 'latam'].includes(String(user.origin || '').toLowerCase());
  if (internationalOrigin && (hasEuId === undefined || pais === undefined)) {
    try {
      const { data: internationalRow } = await sb.from('users').select('has_eu_id, pais').eq('id', user.id).single();
      hasEuId = internationalRow ? internationalRow.has_eu_id : null;
      pais = internationalRow ? internationalRow.pais : null;
    } catch (_) {
      hasEuId = hasEuId === undefined ? null : hasEuId;
      pais = pais === undefined ? null : pais;
    }
  }
  const pricedUser = { ...user, has_eu_id: hasEuId, pais };
  let computed = applicationPlanForUser(pricedUser);
  const { data: existing, error } = await sb
    .from('payments')
    .select('*')
    .eq('user_id', user.id)
    .order('installment', { ascending: true });
  if (error) throw error;

  const latam = false;

  const byInst = new Map((existing || []).map((p) => [p.installment, p]));
  const out = [];

  for (const c of computed) {
    const existing_row = byInst.get(c.installment);
    if (!existing_row) {
      // Crear nueva
      let status = 'locked', unlocked_at = null, paid_at = null, payment_data = null;
      if (c.installment === 1) {
        if (user.pago_completed) {
          status = 'paid';
          unlocked_at = user.pago_completed_at || new Date().toISOString();
          paid_at = user.pago_completed_at || new Date().toISOString();
          payment_data = user.pago_data || null;
        } else {
          status = 'unlocked';
          unlocked_at = new Date().toISOString();
        }
      }
      const { data: ins, error: e2 } = await sb
        .from('payments')
        .insert({
          user_id: user.id,
          installment: c.installment,
          amount: c.amount,
          currency: 'EUR',
          status, unlocked_at, paid_at, payment_data,
        })
        .select()
        .single();
      if (e2) throw e2;
      out.push(ins);
    } else {
      // Importe personalizado por el asesor: no se recalcula nunca.
      const isCustom = false; // Robin Jr has a fixed three-installment price.
      if (c.installment === 1 && !user.pago_completed && existing_row.status === 'locked') {
        const { data: unlocked, error: unlockError } = await sb.from('payments')
          .update({ status: 'unlocked', unlocked_at: existing_row.unlocked_at || new Date().toISOString() })
          .eq('id', existing_row.id).select().single();
        if (unlockError) throw unlockError;
        out.push(unlocked);
        continue;
      }
      // Si el amount ha cambiado, la cuota no está pagada y no es personalizado, lo actualizamos
      if (!isCustom && Number(existing_row.amount) !== c.amount && existing_row.status !== 'paid') {
        const paymentData = { ...(existing_row.payment_data || {}) };
        if (latam) {
          delete paymentData.amount_custom;
          delete paymentData.amount_custom_by;
          delete paymentData.amount_custom_at;
        }
        const { data: upd, error: e3 } = await sb
          .from('payments')
          .update({ amount: c.amount, ...(latam ? { payment_data: paymentData } : {}) })
          .eq('id', existing_row.id)
          .select()
          .single();
        if (e3) throw e3;
        out.push(upd);
      } else {
        out.push(existing_row);
      }
    }
  }
  // Sincronizar el primer pago con users.pago_completed si onboarding está completo y la fila aún figura como 'unlocked' o 'locked'
  if (user.pago_completed) {
    const first = out.find((p) => p.installment === 1);
    if (first && first.status !== 'paid') {
      const nowIso = new Date().toISOString();
      const { data: upd, error: e4 } = await sb
        .from('payments')
        .update({
          status: 'paid',
          paid_at: user.pago_completed_at || nowIso,
          unlocked_at: first.unlocked_at || user.pago_completed_at || nowIso,
          payment_data: first.payment_data || user.pago_data || null,
        })
        .eq('id', first.id)
        .select()
        .single();
      if (!e4 && upd) {
        const idx = out.findIndex((p) => p.id === first.id);
        out[idx] = upd;
      }
    }
  }
  // Pagos extra (installment > 3): se devuelven tal cual; ensurePayments no los gestiona.
  const extras = (existing || []).filter((p) => p.installment > 3);
  return [...out, ...extras].sort((a, b) => a.installment - b.installment);
}

/**
 * Genera un número de factura simple por cuota.
 */
function invoiceNumber(user, payment) {
  const yr = new Date(payment.paid_at || payment.created_at || new Date()).getFullYear();
  const lid = (user.lead_id || user.id || '').toString().replace(/[^a-z0-9]/gi, '').slice(-6).toUpperCase();
  return `PR-${yr}-${lid}-${String(payment.installment).padStart(2, '0')}`;
}

module.exports = { plan, splitEqual, ensurePayments, invoiceNumber, latamPlanWithPaidAmounts };
