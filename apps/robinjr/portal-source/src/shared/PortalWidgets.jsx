// Shared portal widgets values or helpers used across this runtime.
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, CheckCircle2, FileText, Loader2, PartyPopper } from "lucide-react";
import { notificationAck, notificationsPending } from "../api.js";
import { reportClientError } from "../client-utils.js";
import { GOLD, NAVY, NAVY_DARK } from "../theme.js";
import { Btn } from "../ui.jsx";

export function KpiCard({ icon: Icon, label, value, sub, tone = "navy" }) {
  const bg = tone === "navy" ? NAVY :
             tone === "gold" ? GOLD :
             tone === "rose" ? "#B4424F" :
             "#4E5979";
  // Navy text on orange (cream on orange is unreadable); cream on every other tone.
  const fg = tone === "gold" ? NAVY : "#FEFBE5";
  return (
    <div className="rounded-2xl p-4" style={{ background: bg, color: fg }}>
      <div className="flex items-center gap-2 opacity-80 text-xs font-semibold">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </div>
      <div className="text-2xl font-bold mt-1.5" style={{ fontFamily: "var(--robin-font-display)" }}>{value}</div>
      {sub && <div className="opacity-80 text-xs mt-1 truncate">{sub}</div>}
    </div>
  );
}

export function Row({ label, value, tone = "slate" }) {
  const color = tone === "green" ? "text-emerald-700" :
                tone === "amber" ? "text-amber-700" :
                tone === "rose" ? "text-rose-700" : "text-slate-800";
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function BirthdayConfetti() {
  const colors = ["#ECB450", "#2D3A64", "#e85d75", "#2bb6a8", "#687088"];
  return (
    <div className="birthday-confetti" aria-hidden="true">
      {Array.from({ length: 48 }).map((_, index) => (
        <span key={index} className="birthday-confetti-piece" style={{
          left: `${(index * 37) % 100}%`,
          backgroundColor: colors[index % colors.length],
          "--birthday-delay": `${-((index * 0.19) % 4.8)}s`,
          "--birthday-duration": `${3.6 + ((index * 13) % 18) / 10}s`,
          "--birthday-drift": `${((index * 29) % 80) - 40}px`,
          "--birthday-rotation": `${360 + ((index * 47) % 540)}deg`,
        }} />
      ))}
    </div>
  );
}

export function NotificationPopup() {
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try { const result = await notificationsPending(); if (!cancel) setQueue(result.notifications || []); }
      catch (_) { if (!cancel) setQueue([]); }
      finally { if (!cancel) setLoaded(true); }
    })();
    return () => { cancel = true; };
  }, []);

  if (!loaded || idx >= queue.length) return null;
  const notification = queue[idx];
  const isTerms = notification.type === "terms";
  const isBirthday = notification.event_kind === "birthday";

  async function handle(action) {
    setBusy(true);
    try { await notificationAck(notification.id, action); }
    catch (error) { reportClientError("optional_operation", error); }
    setBusy(false);
    setIdx((current) => current + 1);
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4">
      {isBirthday && <BirthdayConfetti />}
      <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 flex items-center gap-3 flex-shrink-0" style={{ background: isBirthday ? GOLD : NAVY }}>
          <div className="h-9 w-9 rounded-xl grid place-items-center bg-white/10 flex-shrink-0">
            {isBirthday ? <PartyPopper className="h-5 w-5 text-white" /> : isTerms ? <FileText className="h-5 w-5 text-white" /> : <Bell className="h-5 w-5 text-white" />}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] text-white/70 font-semibold">{isBirthday ? "¡Es tu cumpleaños!" : isTerms ? "Cambio de términos" : "Notificación"}</div>
            <div className="text-white font-semibold truncate">{notification.title}</div>
          </div>
        </div>
        <div className="px-6 py-5 flex-1 overflow-y-auto">
          <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{notification.content}</div>
          {isTerms && (
            <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-[13px] text-amber-800">
              Este cambio modifica los términos y condiciones de tu contrato. Al aceptar, confirmas los nuevos términos sobre el contrato que firmaste originalmente y recibirás una confirmación por correo.
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="text-[11px] text-slate-400">{queue.length > 1 ? `${idx + 1} de ${queue.length}` : ""}</div>
          {isTerms ? (
            <Btn variant="primary" onClick={() => handle("accept")} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Acepto los nuevos términos
            </Btn>
          ) : (
            <Btn variant="primary" onClick={() => handle("seen")} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isBirthday ? <PartyPopper className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />} {isBirthday ? "¡Gracias!" : "Entendido"}
            </Btn>
          )}
        </div>
      </motion.div>
    </div>
  );
}
