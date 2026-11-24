import { t, useLocale } from "../../../../../../packages/i18n/react.jsx";
// Profile feature UI for sub profile; the application shell selects this view.
import { Btn, Card, CardContent, CardHeader, Field, SelectField, TextareaField } from "../../shared/ui.jsx";
import { CheckCircle2, Loader2, UploadCloud, User } from "lucide-react";
import { NAVY, NAVY_DARK } from "../../shared/theme.js";
import { ROBIN_CITIES } from "../../shared/constants.js";
import React, { useState } from "react";
import { getRobinLevel, resizeImageFile, robinLevelDef } from "../../shared/utils.js";
import { subscriberAvatarDelete, subscriberAvatarUpload, subscriberProfileUpdate } from "../../api/index.js";

function SubProfile({ user, onUserRefresh, setActive }) {
  useLocale();
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
    const previousAvatar = avatar;
    let previewUrl = "";
    let uploadComplete = false;
    try {
      const resized = await resizeImageFile(file, 256, { asBlob: true });
      previewUrl = URL.createObjectURL(resized);
      setAvatar(previewUrl);
      const res = await subscriberAvatarUpload(resized);
      uploadComplete = true;
      setAvatar(res.avatar_url || "");
      setMsg("Foto de perfil actualizada.");
      URL.revokeObjectURL(previewUrl);
      previewUrl = "";
      await onUserRefresh();
    } catch (_) {
      if (!uploadComplete) setAvatar(previousAvatar);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setError("No hemos podido actualizar la foto.");
    } finally { setAvatarBusy(false); }
  }
  async function removeAvatar() {
    setError(""); setMsg(""); setAvatarBusy(true);
    try {
      await subscriberAvatarDelete();
      setAvatar("");
      await onUserRefresh();
      setMsg("Foto eliminada.");
    } catch (_) { setError("No hemos podido eliminar la foto."); } finally { setAvatarBusy(false); }
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
        <CardHeader title={t("Tu perfil")} subtitle={t("Tus datos de suscriptor")} icon={User}
          right={
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-semibold text-slate-700">{rdef.emoji}{t(" Nivel ")}<span style={{ color: "#ECB450" }}>{t(rdef.label)}</span></div>
                <div className="text-[11px] text-slate-400">{rlevel.nextLevel ? t("Faltan {0} {1} para {2}", [rlevel.daysRemaining, rlevel.daysRemaining === 1 ? "día" : "días", rnext.label]) : t("Nivel máximo")}</div>
              </div>
              <Btn size="sm" variant="secondary" onClick={() => setActive && setActive("beneficios")}>{t("Ver beneficios")}</Btn>
            </div>
          } />
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl overflow-hidden border border-slate-200 grid place-items-center flex-shrink-0" style={{ background: NAVY }}>
              {avatar ? <img src={avatar} alt={t("Foto de perfil")} className="h-full w-full object-cover" /> : <span className="text-white font-bold text-lg">{(nombre || user.email || "R").charAt(0).toUpperCase()}</span>}
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-800">{t("Foto de perfil")}</div>
              <div className="flex gap-2 items-center">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-white" style={{ background: NAVY }}>
                    {avatarBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />} {avatar ? t("Cambiar foto") : t("Subir foto")}
                  </span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPickAvatar} disabled={avatarBusy} />
                </label>
                {avatar && <Btn size="sm" variant="ghost" onClick={removeAvatar} disabled={avatarBusy}>{t("Quitar")}</Btn>}
              </div>
              <div className="text-[11px] text-slate-400">{t("JPG, PNG o WEBP. Se recorta a un cuadrado.")}</div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("Nombre")} value={nombre} onChange={setNombre} />
            <Field label={t("Apellidos")} value={apellidos} onChange={setApellidos} />
          </div>
          <Field label={t("Correo")} value={email} onChange={setEmail} />
          <SelectField label={t("Tu ciudad")} value={ciudad} onChange={setCiudad} options={ROBIN_CITIES} placeholder={t("Selecciona tu ciudad")} />
          <div className="text-xs text-slate-400 -mt-1">{t("Personalizamos tus eventos y grupos según tu ciudad.")}</div>
          {msg && <div className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">{t(msg)}</div>}
          {error && <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{t(error)}</div>}
          <Btn disabled={saving} onClick={save}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{t(" Guardar cambios")}</Btn>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title={t("Sobre ti")} subtitle={t("Más adelante tu perfil formará parte de la comunidad Robin")} icon={User} />
        <CardContent className="space-y-3">
          <TextareaField label={t("Sobre mí")} value={extra.bio} onChange={setEx("bio")} rows={3} placeholder={t("Cuéntale a la comunidad quién eres, qué estudias o buscas...")} />
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t("Teléfono")} value={extra.phone} onChange={setEx("phone")} placeholder="+31 ..." />
            <Field label={t("Fecha de nacimiento")} value={extra.birthdate} onChange={setEx("birthdate")} placeholder={t("DD/MM/AAAA")} />
            <Field label={t("Nacionalidad")} value={extra.nationality} onChange={setEx("nationality")} placeholder={t("Ej. Española")} />
            <Field label={t("Idiomas")} value={extra.languages} onChange={setEx("languages")} placeholder={t("Español, Inglés...")} />
            <Field label={t("Universidad / centro")} value={extra.university} onChange={setEx("university")} placeholder={t("Ej. Maastricht University")} />
            <Field label={t("Estudios / grado")} value={extra.studies} onChange={setEx("studies")} placeholder={t("Ej. International Business")} />
            <Field label="Instagram" value={extra.instagram} onChange={setEx("instagram")} placeholder={t("@usuario")} />
            <Field label="LinkedIn" value={extra.linkedin} onChange={setEx("linkedin")} placeholder="linkedin.com/in/..." />
          </div>
          {extraMsg && <div className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">{t(extraMsg)}</div>}
          <Btn disabled={savingExtra} onClick={saveExtra}>{savingExtra ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{t(" Guardar perfil")}</Btn>
        </CardContent>
      </Card>

    </div>
  );
}

export { SubProfile };
