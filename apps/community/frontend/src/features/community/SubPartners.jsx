// Community feature UI for sub partners; the application shell selects this view.
import { Badge, Btn, Card, CardContent, CardHeader } from "../../shared/ui.jsx";
import { CalendarCheck, ExternalLink, Handshake, ImageIcon, MapPin, Percent } from "lucide-react";
import { NAVY } from "../../shared/theme.js";
import { PARTNER_CATEGORY_LABELS } from "../../shared/constants.js";
import React, { useRef, useState } from "react";

function SubPartners({ partners, loading, websiteStyle = false }) {
  const [cat, setCat] = useState("all");
  const [discountPartner, setDiscountPartner] = useState(null);
  const [copyStatus, setCopyStatus] = useState('');
  const discountDialog = useRef(null);
  const cats = ["all", ...Object.keys(PARTNER_CATEGORY_LABELS).filter(key => !websiteStyle || partners.some(partner => partner.category === key))];
  const filtered = cat === "all" ? partners : partners.filter((p) => p.category === cat);
  function openPartner(event, partner) {
    if (!websiteStyle || partner.name.toLowerCase() !== 'swapfiets' || !partner.discount?.includes('ROBIN')) return;
    event.preventDefault(); setDiscountPartner(partner); setCopyStatus(''); discountDialog.current.showModal();
  }
  async function copyCode() {
    try { await navigator.clipboard.writeText('ROBIN'); setCopyStatus('Código copiado.'); }
    catch (_) { setCopyStatus('Selecciona el código ROBIN y cópialo.'); }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title={websiteStyle ? 'Nuestros partners' : 'Partners y descuentos'} subtitle={websiteStyle ? 'Descubre sus servicios y accede a sus webs.' : 'Beneficios exclusivos para suscriptores de The Robin Plan'} icon={Handshake} />
        {(!websiteStyle || cats.length > 2) && <CardContent>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {cats.map((c) => (
              <button key={c} onClick={() => setCat(c)}
                className="flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition"
                style={cat === c ? { background: NAVY, color: "#FEFBE5" } : { background: "#F6F3E0", color: "#4E5979" }}>
                {c === "all" ? "Todos" : PARTNER_CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </CardContent>}
      </Card>

      {loading && <div className="text-sm text-slate-400 px-2">Cargando partners…</div>}
      {!loading && filtered.length === 0 && <div className="text-sm text-slate-400 px-2">No hay partners en esta categoría todavía.</div>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => {
          const Logo = websiteStyle && p.contact_url ? 'a' : 'div';
          return (
          <Card key={p.id}>
            <CardContent className="space-y-2.5">
              <Logo {...(websiteStyle && p.contact_url ? { href: p.contact_url, target: '_blank', rel: 'noopener noreferrer', onClick: event => openPartner(event, p) } : {})} className="flex h-28 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-4">
                {p.logo_url ? <img src={p.logo_url} alt={`Logo de ${p.name}`} loading="lazy" className="h-full w-full object-contain" /> : <ImageIcon className="h-8 w-8 text-slate-300" aria-hidden="true" />}
              </Logo>
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-slate-900" style={{ fontFamily: "var(--robin-font-display)" }}>{p.name}</div>
                {(!websiteStyle || p.category !== 'other') && <Badge tone="slate">{PARTNER_CATEGORY_LABELS[p.category] || p.category}</Badge>}
              </div>
              {p.city && <div className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.city}</div>}
              {p.description && <div className="text-sm text-slate-600">{p.description}</div>}
              {p.benefits && <div className="text-xs text-slate-500"><span className="font-semibold">Beneficios: </span>{p.benefits}</div>}
              {p.discount && <div><Badge tone="gold"><Percent className="h-3 w-3 mr-1 inline" />{p.discount}</Badge></div>}
              {p.eligibility && <div className="text-[11px] text-slate-400">Elegibilidad: {p.eligibility}</div>}
              <div className="flex gap-2 pt-1">
                {p.contact_url && <a href={p.contact_url} target="_blank" rel="noopener noreferrer" onClick={event => openPartner(event, p)}><Btn size="sm" variant="secondary"><ExternalLink className="h-3.5 w-3.5" /> {websiteStyle ? 'Ver partner' : 'Contactar'}</Btn></a>}
                {p.booking_url && <a href={p.booking_url} target="_blank" rel="noreferrer"><Btn size="sm"><CalendarCheck className="h-3.5 w-3.5" /> Reservar</Btn></a>}
              </div>
            </CardContent>
          </Card>
        ); })}
      </div>
      <dialog ref={discountDialog} className="robin-info-dialog" aria-labelledby="partner-discount-title" onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
        <div className="px-6 py-5 space-y-4">
          <h2 id="partner-discount-title" className="text-2xl font-semibold" style={{ fontFamily: 'var(--robin-font-display)' }}>Tu descuento en Swapfiets</h2>
          <p className="text-sm leading-relaxed">{discountPartner?.discount}</p>
          <code className="inline-block rounded-lg bg-amber-100 px-4 py-2 font-semibold">ROBIN</code>
          {copyStatus && <p role="status" className="text-sm">{copyStatus}</p>}
          <div className="flex flex-wrap gap-3"><Btn onClick={copyCode}>Copiar código</Btn><a href={discountPartner?.contact_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium" onClick={() => discountDialog.current.close()}>Ir a Swapfiets</a><Btn variant="ghost" onClick={() => discountDialog.current.close()}>Cerrar</Btn></div>
        </div>
      </dialog>
    </div>
  );
}

export { SubPartners };
