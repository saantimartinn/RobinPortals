import { getLocale, t, useLocale } from "../../../../../../packages/i18n/react.jsx";
// Portal view or navigation module for invoice receipt; the application shell owns session state.
import React from "react";
import financialConfig from "../../../../shared/financial-config.cjs";
import { Btn } from "../../ui.jsx";
import { eur } from "./payment-utils.jsx";

const { FISCAL: ROBIN_FISCAL, invoiceBreakdown } = financialConfig;

export function Factura({ open, onClose, user, payment }) {
  useLocale();
  if (!open || !payment) return null;
  const storedTaxRate = payment.payment_data?.holded_tax_rate;
  const breakdown = invoiceBreakdown(payment.amount, user, storedTaxRate);
  const { base, tax: iva, taxRate } = breakdown;
  const fechaEmision = payment.paid_at ? new Date(payment.paid_at) : new Date();
  const fechaStr = new Intl.DateTimeFormat(getLocale(), { day: "2-digit", month: "long", year: "numeric" }).format(fechaEmision);

  function printDoc() { window.print(); }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "rgba(15,23,42,0.5)" }}>
      <div role="dialog" aria-modal="true" aria-label={t("Justificante de pago")} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl border border-slate-100">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-bold text-slate-900" style={{ fontFamily: "var(--robin-font-display)" }}>{t("Justificante de pago")}</div>
            <div className="text-xs text-slate-500">{payment.concept ? t("Pago adicional") : t("Cuota {0}", [payment.installment])} · {fechaStr}</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 text-sm text-slate-700 space-y-5">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1 break-words">
              <div className="text-[11px] text-slate-400 font-semibold">{t("Emisor")}</div>
              <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "var(--robin-font-display)" }}>{ROBIN_FISCAL.razon_social}</div>
              <div className="text-xs text-slate-500 mt-1">{t("CIF: ")}{ROBIN_FISCAL.cif}</div>
              <div className="text-xs text-slate-500">{ROBIN_FISCAL.direccion}</div>
            </div>
            <div className="text-right min-w-0 flex-1 break-words">
              <div className="text-[11px] text-slate-400 font-semibold">{t("Cliente")}</div>
              <div className="text-sm font-semibold text-slate-900">{`${user?.nombre || ""} ${user?.apellidos || ""}`.trim() || "—"}</div>
              <div className="text-xs text-slate-500 mt-1">{t("DNI: ")}{user?.dni_numero || "—"}</div>
              <div className="text-xs text-slate-500">{user?.direccion || "—"}</div>
              <div className="text-xs text-slate-500">{user?.email || ""}</div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <div className="grid grid-cols-[minmax(0,1fr)_72px_72px] sm:grid-cols-[1fr_120px_120px] bg-slate-50 px-4 py-2 text-[11px] font-semibold text-slate-500 ">
              <div>{t("Concepto")}</div>
              <div className="text-right">{t("Base")}</div>
              <div className="text-right">{taxRate === 0 ? t("Sin IVA (0%)") : t("IVA ({0}%)", [taxRate])}</div>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_72px_72px] sm:grid-cols-[1fr_120px_120px] px-4 py-3 border-t border-slate-100">
              <div>
                <div className="font-medium text-slate-900">{payment.concept || ROBIN_FISCAL.concepto}</div>
                <div className="text-xs text-slate-500">{payment.concept ? t("Pago adicional") : t("Cuota {0}", [payment.installment])}</div>
              </div>
              <div className="text-right tabular-nums">{eur(base)}</div>
              <div className="text-right tabular-nums">{eur(iva)}</div>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_72px_72px] sm:grid-cols-[1fr_120px_120px] bg-slate-50 px-4 py-3 border-t border-slate-100">
              <div className="text-right text-xs font-semibold text-slate-500 ">Total</div>
              <div></div>
              <div className="text-right font-bold text-slate-900 tabular-nums">{eur(payment.amount)}</div>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            <div><strong>{t("Fecha de emisión:")}</strong> {fechaStr}</div>
            {payment.payment_data?.last4 && <div><strong>{t("Método:")}</strong>{t(" Tarjeta ···· ")}{payment.payment_data.last4}</div>}
          </div>
        </div>
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <Btn variant="secondary" size="sm" onClick={onClose}>{t("Cerrar")}</Btn>
          <Btn size="sm" onClick={printDoc}>{t("Imprimir / PDF")}</Btn>
        </div>
      </div>
    </div>
  );
}

// =====================
//  PAGOS — CLIENTE (Sidebar)
// =====================
