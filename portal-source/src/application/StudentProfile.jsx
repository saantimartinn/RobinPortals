import "./student-portal.css";
import { useState, useEffect, useRef } from "react";
import { UploadCloud, MapPin, Loader2 } from "lucide-react";
import { NAVY, NAVY_DARK } from "../theme.js";
import { Badge, Btn, Card, CardContent, CardHeader, Field } from "../ui.jsx";
import { formatTime } from "../client-utils.js";
import { livedAbroadSave } from "../api.js";

export function Perfil({ user, clientName, profilePhoto, onPhotoChange, photoBusy, photoError, intereses, onUserRefresh }) {
  const photoInputRef = useRef(null);
  return (
    <div className="space-y-5">
      <Card>
        <div className="relative h-24 rounded-t-2xl" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})` }}>
          <div className="absolute bottom-0 left-6 translate-y-1/2">
            <div className="h-16 w-16 rounded-2xl border-4 border-white overflow-hidden shadow-lg bg-white grid place-items-center">
              {profilePhoto
                ? <img src={profilePhoto} alt="" className="h-full w-full object-cover" />
                : <span className="text-2xl font-bold" style={{ color: NAVY }}>{(clientName || "R").charAt(0).toUpperCase()}</span>}
            </div>
          </div>
          <div className="absolute bottom-3 right-4">
            <input ref={photoInputRef} aria-label="Seleccionar foto de perfil" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={photoBusy} onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhotoChange(f); e.target.value = ""; }} />
            <button type="button" disabled={photoBusy} onClick={() => photoInputRef.current?.click()} className="text-xs text-white hover:text-white bg-white/10 rounded-lg px-3 py-2.5 transition cursor-pointer">
              {photoBusy ? <Loader2 className="h-3 w-3 inline mr-1 animate-spin" /> : <UploadCloud className="h-3 w-3 inline mr-1" />}
              {photoBusy ? "Guardando…" : "Cambiar foto"}
            </button>
          </div>
        </div>
        <div className="pt-12 px-6 pb-2">
          <div className="text-xl font-bold text-slate-900" style={{ fontFamily: "'Georgia', serif" }}>{clientName}</div>
          <div className="text-sm text-slate-500">{user.email || user.username}</div>
        </div>
        {photoError && <div className="mx-6 mb-3 text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{photoError}</div>}
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Nombre</div>
            <div className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-700">{user.nombre || "—"}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Apellidos</div>
            <div className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-700">{user.apellidos || "—"}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Email</div>
            <div className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-700">{user.email || "—"}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Usuario</div>
            <div className="rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-700">{user.username || "—"}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Áreas de interés</div>
            <div className="flex flex-wrap gap-2">
              {intereses.length === 0
                ? <span className="text-sm text-slate-400">Aún no has indicado intereses.</span>
                : intereses.map((it) => (
                    <span key={it} className="rounded-full px-3 py-1.5 text-xs font-medium border"
                      style={{ background: NAVY, color: "white", borderColor: NAVY }}>{it}</span>
                  ))}
            </div>
          </div>
          <div className="md:col-span-2 flex items-center justify-between">
            <span className="text-xs text-slate-400">Tus datos de DNI están confirmados</span>
            <Badge tone="green">✓ Identidad verificada</Badge>
          </div>
        </CardContent>
      </Card>

      <LivedAbroadCard
        value={user}
        editable={!user.lived_abroad_set}
        onSaved={() => onUserRefresh && onUserRefresh()}
      />
    </div>
  );
}

export function LivedAbroadCard({ value, editable, onSaved, userId }) {
  const COUNTRIES = ["UK", "US", "Francia", "otros"];
  const [lived, setLived] = useState(!!(value && value.lived_abroad));
  const [country, setCountry] = useState((value && value.lived_abroad_country) || "");
  const [other, setOther] = useState((value && value.lived_abroad_other) || "");
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setLived(!!(value && value.lived_abroad));
    setCountry((value && value.lived_abroad_country) || "");
    setOther((value && value.lived_abroad_other) || "");
  }, [value && value.lived_abroad, value && value.lived_abroad_country, value && value.lived_abroad_other, value && value.id]);

  const countryLabel = (c) => (c === "otros" ? "Otros" : c);

  async function save() {
    setError("");
    if (lived && !country) { setError("Indica el país."); return; }
    if (lived && country === "otros" && !other.trim()) { setError("Indica dónde."); return; }
    setBusy(true);
    try {
      const patch = {
        lived_abroad: lived,
        lived_abroad_country: lived ? country : null,
        lived_abroad_other: lived && country === "otros" ? other.trim() : null,
        lived_abroad_set: true,
      };
      const payload = { ...patch };
      if (userId) payload.user_id = userId;
      await livedAbroadSave(payload);
      setSavedAt(new Date());
      if (onSaved) await onSaved(patch);
    } catch (e) {
      setError(e.message || "No se pudo guardar.");
    } finally { setBusy(false); }
  }

  return (
    <Card>
      <CardHeader title="Experiencia internacional" icon={MapPin}
        subtitle="¿Ha vivido fuera de España en alguno de los 3 últimos años?"
        right={savedAt && <span className="text-xs text-emerald-600">Guardado · {formatTime(savedAt)}</span>} />
      <CardContent className="space-y-4">
        {editable ? (
          <>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={lived} onChange={(e) => setLived(e.target.checked)} className="h-4 w-4" />
              <span className="text-sm text-slate-700">Ha vivido fuera de España en alguno de los 3 últimos años</span>
            </label>
            {lived && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">País</div>
                  <select value={country} onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
                    <option value="">Selecciona…</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{countryLabel(c)}</option>)}
                  </select>
                </div>
                {country === "otros" && (
                  <Field label="¿Dónde?" value={other} onChange={setOther} />
                )}
              </div>
            )}
            {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</div>}
            <div className="flex justify-end">
              <Btn onClick={save} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Guardar</Btn>
            </div>
          </>
        ) : (
          <div className="text-sm text-slate-700">
            {value && value.lived_abroad
              ? <>Sí · {value.lived_abroad_country === "otros" ? (value.lived_abroad_other || "Otros") : (value.lived_abroad_country || "—")}</>
              : <>No ha vivido fuera de España en los últimos 3 años.</>}
            {value && value.lived_abroad_set && (
              <div className="text-xs text-slate-400 mt-2">Para modificarlo, contacta con tu asesor.</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
