import { Btn, Card, CardContent, CardHeader, Field, SelectField, TextareaField } from "../../shared/ui.jsx";
import { CheckCircle2, Loader2, UploadCloud, User } from "lucide-react";
import { NAVY, NAVY_DARK } from "../../shared/theme.js";
import { ROBIN_CITIES } from "../../shared/constants.js";
import React, { useState } from "react";
import { getRobinLevel, resizeImageFile, robinLevelDef } from "../../shared/utils.js";
import { subscriberProfileUpdate } from "../../api/index.js";

function SubProfile({ user, onUserRefresh, setActive }) {
  const rlevel = getRobinLevel(user);
  const rdef = robinLevelDef(rlevel.level);
  const rnext = rlevel.nextLevel ? robinLevelDef(rlevel.nextLevel) : null;
  const [nombre, setNombre] = useState(user.nombre || "");
  const [apellidos, setApellidos] = useState(user.apellidos || "");
  const [email, setEmail] = useState(user.email || "");
  const [ciudad, setCiudad] = useState(user.ciudad || "");
  const [avatar, setAvatar] = useState(user.avatar_url || "");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const px = user.profile_extra || {};
  const [extra, setExtra] = useState({
    phone: px.phone || "", birthdate: px.birthdate || "", nationality: px.nationality || "",
    languages: px.languages || "", university: px.university || "", studies: px.studies || "",
    instagram: px.instagram || "", linkedin: px.linkedin || "", bio: px.bio || "",
  });
  const [savingExtra, setSavingExtra] = useState(false);
  const [extraMsg, setExtraMsg] = useState("");
  const setEx = (k) => (v) => setExtra((prev) => ({ ...prev, [k]: v }));
  async function saveExtra() {
    setSavingExtra(true); setExtraMsg("");
    try {
      const res = await subscriberProfileUpdate({ profile_extra: extra });
      if (res && res.extra_saved === false) setExtraMsg("Guardado en pantalla, pero falta aplicar la migración profile_extra en la base de datos para que persista.");
      else setExtraMsg("Perfil actualizado.");
      await onUserRefresh();
    } catch (_) { setExtraMsg("No hemos podido guardar."); }
    finally { setSavingExtra(false); }
  }
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function onPickAvatar(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setError(""); setMsg(""); setAvatarBusy(true);
    try {
      const dataUrl = await resizeImageFile(file, 256);
      setAvatar(dataUrl);
      const res = await subscriberProfileUpdate({ avatar_url: dataUrl });
      if (res && res.avatar_saved === false) setError("Foto mostrada, pero falta aplicar la migración avatar_url en la base de datos para que persista.");
      else setMsg("Foto de perfil actualizada.");
      await onUserRefresh();
    } catch (_) {
      setError("No hemos podido actualizar la foto.");
    } finally { setAvatarBusy(false); }
  }
  async function removeAvatar() {
    setError(""); setMsg(""); setAvatarBusy(true);
    try {
      setAvatar("");
      await subscriberProfileUpdate({ avatar_url: "" });
      await onUserRefresh();
      setMsg("Foto eliminada.");
    } catch (_) {} finally { setAvatarBusy(false); }
  }

  async function save() {
    setSaving(true); setMsg(""); setError("");
    try {
      await subscriberProfileUpdate({ nombre, apellidos, email, ciudad });
      await onUserRefresh();
      setMsg("Cambios guardados.");
    } catch (e) {
      setError(e.data && e.data.error === "email_in_use" ? "Ese correo ya está en uso." : (e.message || "No hemos podido guardar los cambios."));
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Tu perfil" subtitle="Tus datos de suscriptor" icon={User}
          right={
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-700">{rdef.emoji} Nivel <span style={{ color: "#E08600" }}>{rdef.label}</span></div>
                <div className="text-[11px] text-slate-400">{rlevel.nextLevel ? `Faltan ${rlevel.daysRemaining} ${rlevel.daysRemaining === 1 ? "día" : "días"} para ${rnext.label}` : "Nivel máximo"}</div>
              </div>
              <Btn size="sm" variant="secondary" onClick={() => setActive && setActive("beneficios")}>Ver beneficios</Btn>
            </div>
          } />
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl overflow-hidden border border-slate-200 grid place-items-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${NAVY_DARK}, ${NAVY})` }}>
              {avatar ? <img src={avatar} alt="Foto de perfil" className="h-full w-full object-cover" /> : <span className="text-white font-bold text-lg">{(nombre || user.email || "R").charAt(0).toUpperCase()}</span>}
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-800">Foto de perfil</div>
              <div className="flex gap-2 items-center">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ background: NAVY }}>
                    {avatarBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />} {avatar ? "Cambiar foto" : "Subir foto"}
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={onPickAvatar} disabled={avatarBusy} />
                </label>
                {avatar && <Btn size="sm" variant="ghost" onClick={removeAvatar} disabled={avatarBusy}>Quitar</Btn>}
              </div>
              <div className="text-[11px] text-slate-400">JPG o PNG. Se recorta a un cuadrado.</div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Nombre" value={nombre} onChange={setNombre} />
            <Field label="Apellidos" value={apellidos} onChange={setApellidos} />
          </div>
          <Field label="Correo" value={email} onChange={setEmail} />
          <SelectField label="Tu ciudad" value={ciudad} onChange={setCiudad} options={ROBIN_CITIES} placeholder="Selecciona tu ciudad" />
          <div className="text-xs text-slate-400 -mt-1">Personalizamos tus eventos y grupos según tu ciudad.</div>
          {msg && <div className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">{msg}</div>}
          {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</div>}
          <Btn disabled={saving} onClick={save}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Guardar cambios</Btn>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Sobre ti" subtitle="Más adelante tu perfil formará parte de la comunidad Robin" icon={User} />
        <CardContent className="space-y-3">
          <TextareaField label="Sobre mí" value={extra.bio} onChange={setEx("bio")} rows={3} placeholder="Cuéntale a la comunidad quién eres, qué estudias o buscas..." />
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Teléfono" value={extra.phone} onChange={setEx("phone")} placeholder="+31 ..." />
            <Field label="Fecha de nacimiento" value={extra.birthdate} onChange={setEx("birthdate")} placeholder="DD/MM/AAAA" />
            <Field label="Nacionalidad" value={extra.nationality} onChange={setEx("nationality")} placeholder="Ej. Española" />
            <Field label="Idiomas" value={extra.languages} onChange={setEx("languages")} placeholder="Español, Inglés..." />
            <Field label="Universidad / centro" value={extra.university} onChange={setEx("university")} placeholder="Ej. Maastricht University" />
            <Field label="Estudios / grado" value={extra.studies} onChange={setEx("studies")} placeholder="Ej. International Business" />
            <Field label="Instagram" value={extra.instagram} onChange={setEx("instagram")} placeholder="@usuario" />
            <Field label="LinkedIn" value={extra.linkedin} onChange={setEx("linkedin")} placeholder="linkedin.com/in/..." />
          </div>
          {extraMsg && <div className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">{extraMsg}</div>}
          <Btn disabled={savingExtra} onClick={saveExtra}>{savingExtra ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Guardar perfil</Btn>
        </CardContent>
      </Card>

    </div>
  );
}

export { SubProfile };
