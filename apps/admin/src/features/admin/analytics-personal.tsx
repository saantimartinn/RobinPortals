// Admin feature module for analytics personal; the feature registry connects it to the authenticated shell.
import { useEffect, useState, type FormEvent } from "react";
import { Download, Megaphone, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Contact, CrmStage } from "@/types/domain";
import { integrationClient } from "@/services/integrations";
import type { AnalyticsDateRange, MetaSnapshot } from "@/services/integrations";
import type { PortalSnapshot } from "@/services/portal";
import { DashboardLoader } from "@/components/dashboard-loader";
import { EmptyChartBar } from "@/components/empty-chart-bar";
import { Title } from './feature-shared';
import { SalesOverview } from "./analytics-sales";
import { campaignStatusLabel, downloadCampaignWorkbook, previousCalendarMonth } from "./campaign-export.mjs";

export function PersonalAnalytics({ path, currentUser, contacts, leadStages, snapshot, isDeveloperAdmin }: { path: string; currentUser: string; contacts: Contact[]; leadStages: Record<string, CrmStage>; snapshot: PortalSnapshot | null; isDeveloperAdmin: boolean }) {
  const key = path.split("/").filter(Boolean)[1] || "ventas";
  if (key === "ventas" || key === "finanzas" || key === "pagos") return <div className="page"><SalesOverview personalUser={currentUser} /></div>;
  const owned = contacts.filter((lead) => isDeveloperAdmin || lead.owner === currentUser);
  const metrics = [
    { label: "Alumnos del portal", value: String(snapshot?.clients.length || 0), detail: "Datos del portal" },
    { label: "Leads asignados", value: String(owned.length), detail: currentUser },
    { label: "Clientes cerrados", value: String(owned.filter((lead) => (leadStages[lead.id] || lead.stage) === "Cliente").length), detail: "CRM" },
    { label: "En onboarding", value: String(snapshot?.clients.filter((client) => client.requires_onboarding).length || 0), detail: "Requieren seguimiento" },
  ];
  return <div className="page"><Title name="Otras métricas" sub={`Carga operativa real · ${currentUser}`} eyebrow="Operaciones" /><ReadonlyMetricGrid metrics={metrics} /></div>;
}

export function ReadonlyMetricGrid({ metrics }: { metrics: { label: string; value: string; detail: string }[] }) {
  return <section className="ads-kpi-grid">{metrics.map((metric) => <article key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small></article>)}</section>;
}

export function Campaigns({ currentUser, notify }: { currentUser: string; notify: (message: string) => void }) {
  const [snapshot, setSnapshot] = useState<MetaSnapshot | null>(null);
  const [syncing, setSyncing] = useState(true);
  const [connection, setConnection] = useState("Conectando con Meta Marketing API…");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [campaignRange, setCampaignRange] = useState<AnalyticsDateRange | null>(null);
  const [campaignSnapshot, setCampaignSnapshot] = useState<MetaSnapshot | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignError, setCampaignError] = useState("");
  const [exporting, setExporting] = useState(false);
  async function syncMeta(force = false) {
    setSyncing(true);
    try {
      const data = await integrationClient.meta(force);
      setSnapshot(data);
      setConnection(`Sincronizado con ${data.account.name} · ${new Date(data.syncedAt).toLocaleString("es-ES")}`);
      if (force && campaignRange) {
        setCampaignSnapshot(await integrationClient.meta(true, campaignRange));
        setCampaignError("");
      }
    }
    catch (error) { setConnection(error instanceof Error ? error.message : "No se pudo conectar con Meta"); }
    finally { setSyncing(false); }
  }
  useEffect(() => { void syncMeta(false); }, []);
  useEffect(() => {
    if (!campaignRange) {
      setCampaignSnapshot(null);
      setCampaignLoading(false);
      setCampaignError("");
      return;
    }
    let active = true;
    setCampaignLoading(true);
    setCampaignSnapshot(null);
    setCampaignError("");
    integrationClient.meta(false, campaignRange)
      .then((data) => { if (active) setCampaignSnapshot(data); })
      .catch((error) => { if (active) setCampaignError(error instanceof Error ? error.message : "No se pudieron cargar las campañas"); })
      .finally(() => { if (active) setCampaignLoading(false); });
    return () => { active = false; };
  }, [campaignRange]);
  function applyCampaignRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!from || !to || from > to) {
      setCampaignError("Selecciona una fecha de inicio y fin válidas, en ese orden.");
      return;
    }
    setCampaignLoading(true);
    setCampaignRange({ from, to });
  }
  function selectPreviousMonth() {
    const range = previousCalendarMonth(new Date(), snapshot?.account.timezone || "Europe/Madrid");
    setFrom(range.from);
    setTo(range.to);
    setCampaignLoading(true);
    setCampaignRange(range);
  }
  async function exportCampaigns() {
    if (!campaignData || campaignLoading || syncing || exporting || campaignError) return;
    setExporting(true);
    try { await downloadCampaignWorkbook(campaignData, campaignRange, campaignPeriod); }
    catch (_) { notify("No se pudo descargar el Excel. Vuelve a intentarlo."); }
    finally { setExporting(false); }
  }
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const campaignData = campaignRange ? campaignSnapshot : snapshot;
  const campaignPeriod = campaignRange
    ? `${new Date(`${campaignRange.from}T12:00:00`).toLocaleDateString("es-ES")} – ${new Date(`${campaignRange.to}T12:00:00`).toLocaleDateString("es-ES")}`
    : "últimos 30 días";
  const euro = (value: number) => `${value.toLocaleString("es-ES", { maximumFractionDigits: 2 })} €`;
  const summary = snapshot?.summary;
  const statusLabel: Record<string, string> = campaignStatusLabel;
  if (syncing && !snapshot) return <div className="page"><DashboardLoader /></div>;
  return (
    <div className="page meta-page">
      <Title name="Meta Ads" sub={`Resultados reales de la cuenta publicitaria · acceso de ${currentUser}.`} eyebrow="Campañas"><Button variant="outline" onClick={() => void syncMeta(true)} disabled={syncing || campaignLoading}><Megaphone />{syncing ? "Sincronizando…" : "Actualizar datos"}</Button></Title>
      <div className="meta-banner"><ShieldCheck /><div><strong>{connection}</strong><p>Periodo: últimos 30 días · importes en {snapshot?.account.currency || "EUR"} · zona horaria {snapshot?.account.timezone || "de la cuenta"}</p></div><Badge variant="outline">Datos reales</Badge></div>
      <section className="ads-kpi-grid">{[
        ["Inversión", summary ? euro(summary.spend) : "—", "Gasto total"], ["Impresiones", summary ? summary.impressions.toLocaleString("es-ES") : "—", summary ? `${(summary.impressions / 1000).toFixed(1)}k` : "—"], ["Clics", summary ? summary.clicks.toLocaleString("es-ES") : "—", summary ? `${summary.ctr.toFixed(2)}% CTR` : "—"], ["CTR", summary ? `${summary.ctr.toFixed(2)}%` : "—", "Clics / impresiones"],
        ["CPC medio", summary ? euro(summary.cpc) : "—", "Coste por clic"], ["CPM", summary ? euro(summary.cpm) : "—", "Coste por mil"], ["Alcance", summary ? summary.reach.toLocaleString("es-ES") : "—", "Personas únicas"], ["Leads", summary ? summary.leads.toLocaleString("es-ES") : "—", "Conversiones atribuidas"],
        ["CPL real", summary ? euro(summary.cpl) : "—", "Inversión / leads"], ["Ventas", summary ? summary.purchases.toLocaleString("es-ES") : "—", "Compras atribuidas"], ["CAC", summary ? euro(summary.cac) : "—", "Inversión / ventas"], ["ROAS", summary ? `${summary.roas.toFixed(2)}×` : "—", summary ? euro(summary.revenue) : "—"],
      ].map(([label, value, detail]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}</section>
      <div className="sales-analysis-grid"><MetaDailyChart title="Inversión diaria" daily={snapshot?.daily || []} metric="spend" /><MetaDailyChart title="CPM diario" daily={snapshot?.daily || []} metric="cpm" /></div>
      <section className="panel campaign-panel"><div className="panel-heading"><div><h2>Campañas</h2><p>Datos reales · {campaignPeriod}</p></div><form className="meta-campaign-range" onSubmit={applyCampaignRange}><label>Desde<input type="date" required value={from} max={to || today} onChange={(event) => setFrom(event.target.value)} /></label><label>Hasta<input type="date" required value={to} min={from || undefined} max={today} onChange={(event) => setTo(event.target.value)} /></label><Button type="submit" variant="outline" disabled={campaignLoading || syncing}>{campaignLoading ? "Cargando…" : "Aplicar"}</Button><Button type="button" variant="outline" disabled={syncing} aria-pressed={!campaignRange} onClick={() => { setFrom(""); setTo(""); setCampaignRange(null); }}>Últimos 30 días</Button><Button type="button" variant="outline" disabled={syncing} onClick={selectPreviousMonth}>Mes anterior</Button><Button type="button" variant="outline" disabled={!campaignData || campaignLoading || syncing || exporting || Boolean(campaignError)} onClick={() => void exportCampaigns()}><Download />{exporting ? "Descargando…" : "Descargar Excel"}</Button></form></div>{campaignError && <p className="meta-campaign-error" role="alert">{campaignError}</p>}<div className="data-table"><table><thead><tr><th>Campaña</th><th>Estado</th><th>Inversión</th><th>Leads</th><th>CPL</th><th>ROAS</th></tr></thead><tbody aria-busy={campaignLoading}>{campaignLoading ? <tr><td colSpan={6}>Cargando campañas del periodo seleccionado…</td></tr> : campaignData?.campaigns.map((row) => <tr key={row.id}><td><b>{row.name}</b><small>ID: {row.id}</small></td><td><Badge variant="outline">{statusLabel[row.status] || row.status}</Badge></td><td>{euro(row.spend)}</td><td>{row.leads.toLocaleString("es-ES")}</td><td>{euro(row.cpl)}</td><td>{row.roas.toFixed(2)}×</td></tr>)}{!campaignLoading && campaignData && campaignData.campaigns.length === 0 && <tr><td colSpan={6}>No hay campañas con entrega en este periodo.</td></tr>}</tbody></table></div></section>
    </div>
  );
}

function MetaDailyChart({ title, daily, metric }: { title: string; daily: MetaSnapshot["daily"]; metric: "spend" | "cpm" }) {
  const maximum = Math.max(...daily.map((day) => day[metric]), 1);
  return <section className="panel clean-chart meta-daily-chart"><h2>{title}</h2>{daily.length ? <div className="meta-chart-scroll" tabIndex={0} role="region" aria-label={`${title}: datos diarios, desplazamiento horizontal`}><div className={`metric-bars meta-daily-bars${metric === "cpm" ? " gold-bars" : ""}`} style={{ gridTemplateColumns: `repeat(${daily.length}, minmax(1.25rem, 1fr))` }}>{daily.map((day) => <div key={day.date} title={`${day.date}: ${day[metric].toLocaleString("es-ES", { maximumFractionDigits: 2 })} €`}><div className="meta-bar-track"><span style={{ height: `${day[metric] > 0 ? Math.min(100, Math.max(2, day[metric] / maximum * 100)) : 0}%` }} /></div><small>{new Date(`${day.date}T12:00:00`).toLocaleDateString("es-ES", { day: "2-digit" })}</small></div>)}</div></div> : <EmptyChartBar />}</section>;
}
