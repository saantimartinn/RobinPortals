import { useEffect, useRef, useState } from "react";
import { CircleAlert, FlaskConical, Info, Loader2, Play, X } from "lucide-react";
import { listReleaseChecks, paymentTestAction, runReleaseCheck } from "@/services/release-tests";
import type { ReleaseCheck, ReleaseResult } from "@/services/release-tests";
import { releaseTestExplanations } from "@/features/admin/release-test-explanations";

export function ReleaseTests() {
  const [checks, setChecks] = useState<ReleaseCheck[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, ReleaseResult>>({});
  const [runningId, setRunningId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [infoOpen, setInfoOpen] = useState<string | null>(null);
  const infoCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    listReleaseChecks().then(async (catalog) => {
      if (!active) return;
      setChecks(catalog.checks);
      setResults(catalog.results);
      if (!catalog.checks.some((check) => check.id === "payment_sandbox" && check.runnable)) return;
      const payment = await paymentTestAction("status");
      if (active && payment.status !== "idle") setResults((current) => ({ ...current, payment_sandbox: {
        id: "payment_sandbox", status: "action_required",
        detail: payment.status === "ready_to_verify" ? "Revolut confirmó el pago. Pulsa Verificar pago." : "Completa el checkout con una tarjeta ficticia y pulsa Verificar pago.",
        checkout_url: payment.checkout_url, amount_eur: payment.amount_eur, test_email: payment.test_email, test_holder: payment.test_holder,
        duration_ms: 0, ran_at: new Date().toISOString(),
      } }));
    })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "No se pudieron cargar los tests"); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!infoOpen) return;
    infoCloseRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeInfo();
      if (event.key === "Tab") { event.preventDefault(); infoCloseRef.current?.focus(); }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [infoOpen]);

  const runnable = checks.filter((check) => check.runnable);
  const groups = [...new Set(checks.map((check) => check.group))];
  const activeInfo = checks.find((check) => check.id === infoOpen);
  const explanation = infoOpen ? releaseTestExplanations[infoOpen] : null;

  function closeInfo() {
    const previous = infoOpen;
    setInfoOpen(null);
    if (previous) requestAnimationFrame(() => document.getElementById(`release-info-trigger-${previous}`)?.focus());
  }

  function toggle(ids: string[]) {
    setSelected((current) => ids.every((id) => current.includes(id))
      ? current.filter((id) => !ids.includes(id))
      : [...new Set([...current, ...ids])]);
  }

  async function run(ids: string[]) {
    if (busy || !ids.length) return;
    setBusy(true); setError("");
    for (const id of ids) {
      setRunningId(id);
      try {
        const result = await runReleaseCheck(id);
        setResults((current) => ({ ...current, [id]: result }));
      } catch (cause) {
        setResults((current) => ({ ...current, [id]: {
          id, status: "failed", detail: cause instanceof Error ? cause.message : "Error desconocido",
          duration_ms: 0, ran_at: new Date().toISOString(),
        } }));
      }
    }
    setRunningId(null); setBusy(false);
  }

  async function finishPayment() {
    if (busy) return;
    setBusy(true); setRunningId("payment_sandbox"); setError("");
    try {
      const payment = await paymentTestAction("verify");
      if (payment.status === "passed") setResults((current) => ({ ...current, payment_sandbox: {
        id: "payment_sandbox", status: "passed", detail: payment.detail || "Pago sandbox verificado.",
        duration_ms: 0, ran_at: new Date().toISOString(),
      } }));
      else setError(`La orden sigue en estado ${payment.status}. Completa el checkout y vuelve a verificar.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo verificar el pago"); }
    setRunningId(null); setBusy(false);
  }

  async function cancelPayment() {
    if (busy) return;
    setBusy(true); setRunningId("payment_sandbox"); setError("");
    try {
      await paymentTestAction("cleanup");
      setResults((current) => { const next = { ...current }; delete next.payment_sandbox; return next; });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo cancelar la prueba"); }
    setRunningId(null); setBusy(false);
  }

  return <div className="release-tests">
    <div className="release-tests-toolbar">
      <div><strong>{selected.length} seleccionados</strong><span>Los tests de IA y OCR consultan Anthropic con datos ficticios.</span></div>
      <button type="button" className="ui-button outline" disabled={busy || runnable.length === 0} onClick={() => setSelected(selected.length === runnable.length ? [] : runnable.map((check) => check.id))}>{selected.length === runnable.length ? "Quitar selección" : "Seleccionar todos"}</button>
      <button type="button" className="ui-button outline" disabled={busy || selected.length === 0} onClick={() => void run(selected)}><Play aria-hidden="true" /> Ejecutar seleccionados</button>
      <button type="button" className="ui-button" disabled={busy || runnable.length === 0} onClick={() => void run(runnable.map((check) => check.id))}><FlaskConical aria-hidden="true" /> Ejecutar todos</button>
    </div>

    {error && <div className="release-tests-error" role="alert"><CircleAlert aria-hidden="true" />{error}</div>}
    {groups.map((group) => {
      const members = checks.filter((check) => check.group === group);
      const availableIds = members.filter((check) => check.runnable).map((check) => check.id);
      return <section className="release-tests-group" key={group} aria-label={group}>
        <header><div><span>{group}</span><small>{members.length} pruebas</small></div>
          {availableIds.length > 0 && <label><input type="checkbox" disabled={busy} checked={availableIds.every((id) => selected.includes(id))} onChange={() => toggle(availableIds)} /> Seleccionar grupo</label>}
        </header>
        <div className="release-tests-grid">{members.map((check) => {
          const result = results[check.id];
          const running = runningId === check.id;
          const state = running ? "running" : result?.status || (check.runnable ? "idle" : "blocked");
          const stateLabel = { running: "Ejecutando", passed: "OK", failed: "Error", cancelled: "Cancelada", action_required: "Completar pago", idle: "Sin ejecutar", blocked: "No disponible" }[state];
          return <article className={`panel release-test-card ${result?.status === "action_required" ? "payment-action" : ""}`} key={check.id}>
            <div className="release-test-card-top">
              <input type="checkbox" aria-label={`Seleccionar ${check.title}`} checked={selected.includes(check.id)} disabled={busy || !check.runnable} onChange={() => toggle([check.id])} />
              <div className="release-test-card-actions"><span className={`release-test-status ${state}`}>{running && <Loader2 aria-hidden="true" />}{stateLabel}</span>
                <button id={`release-info-trigger-${check.id}`} type="button" className="release-test-info-trigger" aria-label={`Información sobre ${check.title}`} aria-haspopup="dialog" aria-expanded={infoOpen === check.id} onClick={() => setInfoOpen(check.id)}><Info aria-hidden="true" /></button>
              </div>
            </div>
            <h3>{check.title}</h3><span className={`release-test-coverage ${check.coverage}`}>{check.coverage === "structure" ? "Estructura y configuración" : "Flujo, servicio o código"}</span><p>{check.description}</p>
            {result && <div className={`release-test-detail ${result.status}`}><strong>{result.detail}</strong><small>{new Date(result.ran_at).toLocaleString("es-ES")} · {(result.duration_ms / 1000).toFixed(1)} s</small></div>}
            {check.id === "payment_sandbox" && result?.status === "action_required" && <div className="release-test-payment-steps">
              <p>Importe simulado: <strong>{result.amount_eur?.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</strong>. Titular: <strong>{result.test_holder || "TEST Robin Pago Sandbox"}</strong>. Correo: <strong>{result.test_email}</strong>.</p>
              <p>Tarjeta VISA de prueba: <strong>4929 4205 7359 5709</strong> · Caducidad: <strong>12/30</strong> · CVV: <strong>123</strong>. No uses una tarjeta real.</p>
              <p>Al terminar, vuelve a esta pestaña y pulsa <strong>Verificar pago</strong>.</p>
              <div className="release-test-payment-actions">
                {result.checkout_url && <a className="ui-button outline" href={result.checkout_url} target="_blank" rel="noopener noreferrer">Abrir checkout sandbox</a>}
                <button type="button" disabled={busy} onClick={() => void finishPayment()}>Verificar pago</button>
                <button type="button" disabled={busy} onClick={() => void cancelPayment()}>Cancelar prueba</button>
              </div>
            </div>}
            {!check.runnable && <div className="release-test-detail blocked">{check.unavailableReason || "Necesita un entorno de pruebas aislado para ejecutar el recorrido real."}</div>}
            {check.runnable && result?.status !== "action_required" && <button type="button" disabled={busy} onClick={() => void run([check.id])}>{running ? "Ejecutando…" : check.id === "payment_sandbox" ? "Iniciar pago de prueba" : "Ejecutar test"}</button>}
          </article>;
        })}</div>
      </section>;
    })}
    {activeInfo && explanation && <div className="release-test-info-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeInfo(); }}>
      <section className="release-test-info-panel" role="dialog" aria-modal="true" aria-labelledby="release-test-info-title">
        <header><div><small>Información del test</small><h2 id="release-test-info-title">{activeInfo.title}</h2></div><button ref={infoCloseRef} type="button" aria-label="Cerrar información" onClick={closeInfo}><X aria-hidden="true" /></button></header>
        <dl>
          <div><dt>Qué comprueba</dt><dd>{explanation.checks}</dd></div>
          <div><dt>Cómo se ejecuta</dt><dd>{explanation.execution}</dd></div>
          <div><dt>Cuándo marca OK</dt><dd>{explanation.pass}</dd></div>
          <div><dt>Alcance actual</dt><dd>{explanation.limit}</dd></div>
        </dl>
      </section>
    </div>}
  </div>;
}
