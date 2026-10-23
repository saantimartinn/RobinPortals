// Admin interface component for web analytics heatmaps; composed by the shell or a feature module.
import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, Gauge, Globe, Monitor, Smartphone } from "lucide-react";
import { webAnalyticsClient } from "@/services/web-analytics";
import type { HeatmapData } from "@/services/web-analytics";
import { Empty, int } from "./web-analytics-shared";

// ============================================================
// MAPAS DE CALOR (dentro del panel)
// ============================================================
const FRAME_WIDTH: Record<string, number> = { desktop: 1280, mobile: 390 };

export function HeatmapsTab({ from, to }: { from: string; to: string }) {
  const [pages, setPages] = useState<{ path: string; clicks: number; views: number }[]>([]);
  const [siteUrl, setSiteUrl] = useState("");
  const [path, setPath] = useState("/");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [mode, setMode] = useState<"clicks" | "scroll">("clicks");
  const [heat, setHeat] = useState<HeatmapData | null>(null);
  const [err, setErr] = useState("");
  const [boxW, setBoxW] = useState(900);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    webAnalyticsClient
      .heatmapPages(from, to)
      .then((r) => {
        const nextPages = Array.isArray(r.pages) ? r.pages : [];
        setPages(nextPages);
        setSiteUrl(r.siteUrl || "");
        if (nextPages[0] && !nextPages.find((p) => p.path === path)) setPath(nextPages[0].path);
      })
      .catch((e) => setErr(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  useEffect(() => {
    let cancelled = false;
    setErr("");
    setHeat(null);
    webAnalyticsClient
      .heatmap(path, device, from, to)
      .then((h) => {
        if (cancelled) return;
        setHeat(h);
        setSiteUrl(h.siteUrl || "");
      })
      .catch((e) => { if (!cancelled) setErr(e.message); });
    return () => { cancelled = true; };
  }, [path, device, from, to]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const baseWidth = FRAME_WIDTH[device];
  const typicalWidth = useMemo(() => {
    const widths = (heat?.clicks || []).flatMap((click) => Array(Math.min(20, Math.max(1, click.n || 1))).fill(Number(click.pw)))
      .filter((value) => Number.isFinite(value) && value >= 300 && value <= 2500).sort((a, b) => a - b);
    return widths.length ? widths[Math.floor(widths.length / 2)] : baseWidth;
  }, [heat, baseWidth]);
  const width = device === "desktop"
    ? Math.max(1024, Math.min(1920, typicalWidth))
    : Math.max(320, Math.min(480, typicalWidth));
  const scale = Math.min(1, (boxW - 2) / width);
  const height = Math.min(40000, Math.max(2000,
    (Number(heat?.page_height) || 0) * width / typicalWidth,
    ...(heat?.clicks || []).map((click) => (Number(click.y) || 0) * width / (Number(click.pw) || width) + 500)
  ));
  const pageUrl = siteUrl ? new URL(path, `${siteUrl}/`) : null;
  pageUrl?.searchParams.set("robin_heatmap", "1");
  const src = pageUrl?.toString() || "";
  const openPageUrl = siteUrl ? new URL(path, `${siteUrl}/`).toString() : "";

  return (
    <div className="wa-heat">
      <aside className="panel">
        <label>
          Página
          <select value={path} onChange={(e) => setPath(e.target.value)}>
            {!pages.find((p) => p.path === path) && <option value={path}>{path}</option>}
            {pages.map((p) => (
              <option key={p.path} value={p.path}>
                {p.path} · {p.clicks} clics
              </option>
            ))}
          </select>
        </label>
        <div className="analytics-tabs" role="tablist" aria-label="Dispositivo">
          <button type="button" className={device === "desktop" ? "active" : ""} onClick={() => setDevice("desktop")}>
            <Monitor /> Ordenador
          </button>
          <button type="button" className={device === "mobile" ? "active" : ""} onClick={() => setDevice("mobile")}>
            <Smartphone /> Móvil
          </button>
        </div>
        <div className="analytics-tabs" role="tablist" aria-label="Tipo de mapa">
          <button type="button" className={mode === "clicks" ? "active" : ""} onClick={() => setMode("clicks")}>
            <Flame /> Clics
          </button>
          <button type="button" className={mode === "scroll" ? "active" : ""} onClick={() => setMode("scroll")}>
            <Gauge /> Scroll
          </button>
        </div>
        <dl>
          <div>
            <dt>Vistas medidas</dt>
            <dd>{int(heat?.views)}</dd>
          </div>
          <div>
            <dt>Clics</dt>
            <dd>{int(heat?.total_clicks)}</dd>
          </div>
        </dl>
        <h3>Elementos más pulsados</h3>
        <ol className="wa-top">
          {(heat?.top_elements || []).map((t, i) => (
            <li key={i}>
              <span>{t.label}</span>
              <b>{int(t.clicks)}</b>
            </li>
          ))}
        </ol>
        {src && (
          <a className="wa-open" href={openPageUrl} target="_blank" rel="noreferrer">
            <Globe /> Abrir la página
          </a>
        )}
        <p className="wa-note">Solo se cuentan visitas que aceptaron las cookies de analítica. La posición de los clics es aproximada cuando cambia el diseño o el ancho de pantalla.</p>
        {err && <p className="wa-bad">{err}</p>}
      </aside>

      <div className="wa-heat-stage panel" ref={box}>
        {src ? (
          <div className="wa-heat-scaler" style={{ width: width * scale, height: height * scale }}>
            <iframe
              key={`${path}-${device}`}
              title="Mapa de calor"
              src={src}
              scrolling="no"
              style={{ width, height, transform: `scale(${scale})` }}
            />
            <div className="wa-heat-overlay" aria-hidden="true">
              {mode === "clicks" ? (heat?.clicks || []).filter((click) =>
                Number.isFinite(Number(click.x)) && Number.isFinite(Number(click.y)) && Number(click.pw) > 0
              ).map((click, index) => {
                const intensity = Math.min(1, 0.25 + Math.log2(1 + (click.n || 1)) / 5);
                return <span key={index} className="wa-heat-dot" style={{
                  left: `${Math.max(0, Math.min(width, Number(click.x) * width / Number(click.pw))) * scale}px`,
                  top: `${Math.max(0, Number(click.y) * width / Number(click.pw)) * scale}px`,
                  width: `${Math.max(24, 64 * scale)}px`, height: `${Math.max(24, 64 * scale)}px`,
                  opacity: intensity,
                }} />;
              }) : (heat?.scroll || []).map((section, index) => (
                <div key={section.depth} className="wa-heat-scroll" style={{
                  top: `${index * 10}%`, height: "10%",
                  background: `rgba(238, 66, 55, ${Math.max(0.04, Math.min(0.4, Number(section.pct || 0) / 250))})`,
                }}><span>{section.depth}% · {section.pct}% de visitas</span></div>
              ))}
            </div>
          </div>
        ) : (
          <Empty>Cargando página…</Empty>
        )}
      </div>
    </div>
  );
}
