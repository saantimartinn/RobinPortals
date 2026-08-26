import { Badge, Btn, Card, CardContent, CardHeader } from "../../shared/ui.jsx";
import { CheckCircle2, Clock, Loader2, MessageCircle, Plus, Search, Trash2, Users, XCircle } from "lucide-react";
import { NAVY } from "../../shared/theme.js";
import React, { useEffect, useState } from "react";
import { SocialAvatar } from "./SocialAvatar.jsx";
import { SubIntro } from "../services/SubIntro.jsx";
import { SubMessageThread } from "./SubMessageThread.jsx";
import { messagesConversations, socialAction, socialData } from "../../api/index.js";

function SubSocial({ user, onActivity }) {
  const [tab, setTab] = useState("amigos");
  const [data, setData] = useState({ directory: [], friends: [], incoming: [], outgoing: [] });
  const [convs, setConvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [q, setQ] = useState("");
  const [chat, setChat] = useState(null);

  async function loadSocial() {
    try { const r = await socialData(); setData({ directory: r.directory || [], friends: r.friends || [], incoming: r.incoming || [], outgoing: r.outgoing || [] }); }
    catch (_) {}
  }
  async function loadConvs() {
    try { const r = await messagesConversations(); setConvs(r.conversations || []); if (onActivity) onActivity(r.unread_total || 0); }
    catch (_) {}
  }
  useEffect(() => { (async () => { await Promise.all([loadSocial(), loadConvs()]); setLoading(false); })(); }, []);

  async function act(id, action) {
    setBusyId(id);
    try { await socialAction(action, id); await loadSocial(); if (action === "accept") await loadConvs(); }
    catch (_) {}
    finally { setBusyId(null); }
  }

  const dirFiltered = data.directory.filter((u) => {
    if (u.status === "friends") return false;
    const t = q.trim().toLowerCase();
    return !t || `${u.name} ${u.ciudad || ""}`.toLowerCase().includes(t);
  });

  if (chat) return <SubMessageThread friend={chat} onBack={() => { setChat(null); loadConvs(); }} />;

  const tabs = [
    { key: "amigos", label: "Amigos", icon: Users, n: data.incoming.length },
    { key: "descubre", label: "Descubre", icon: Search, n: 0 },
    { key: "mensajes", label: "Mensajes", icon: MessageCircle, n: convs.reduce((a, c) => a + (c.unread || 0), 0) },
  ];

  return (
    <div className="space-y-5">
      <SubIntro title="Social" subtitle="Conecta con otros Robins, hazte amigo y chatea." />
      <Card>
        <CardContent>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {tabs.map(({ key, label, icon: Icon, n }) => (
              <button key={key} onClick={() => setTab(key)}
                className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition"
                style={tab === key ? { background: NAVY, color: "white" } : { background: "#f1f5f9", color: "#475569" }}>
                <Icon className="h-3.5 w-3.5" /> {label}
                {n > 0 && <span className="ml-0.5 rounded-full bg-rose-500 text-white text-[10px] px-1.5 py-0.5 leading-none">{n}</span>}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading && <div className="text-sm text-slate-400 px-2"><Loader2 className="h-4 w-4 animate-spin inline" /> Cargando…</div>}

      {!loading && tab === "amigos" && (
        <div className="space-y-5">
          {data.incoming.length > 0 && (
            <Card>
              <CardHeader title="Solicitudes recibidas" subtitle="Alguien quiere conectar contigo" icon={Users} />
              <CardContent className="space-y-2">
                {data.incoming.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="flex items-center gap-3 min-w-0"><SocialAvatar name={u.name} avatar_url={u.avatar_url} />
                      <div className="min-w-0"><div className="text-sm font-semibold text-slate-900 truncate">{u.name}</div><div className="text-xs text-slate-400 truncate">{u.ciudad || ""}</div></div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Btn size="sm" disabled={busyId === u.id} onClick={() => act(u.id, "accept")}><CheckCircle2 className="h-3.5 w-3.5" /> Aceptar</Btn>
                      <Btn size="sm" variant="ghost" disabled={busyId === u.id} onClick={() => act(u.id, "decline")}><XCircle className="h-3.5 w-3.5" /></Btn>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader title="Tus amigos" subtitle={`${data.friends.length} amigo(s)`} icon={Users} />
            <CardContent className="space-y-2">
              {data.friends.length === 0 && <div className="text-sm text-slate-400 px-1">Todavía no tienes amigos. Ve a «Descubre» para conectar.</div>}
              {data.friends.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center gap-3 min-w-0"><SocialAvatar name={u.name} avatar_url={u.avatar_url} />
                    <div className="min-w-0"><div className="text-sm font-semibold text-slate-900 truncate">{u.name}</div><div className="text-xs text-slate-400 truncate">{u.ciudad || ""}</div></div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Btn size="sm" variant="secondary" onClick={() => { setChat({ id: u.id, name: u.name }); }}><MessageCircle className="h-3.5 w-3.5" /> Mensaje</Btn>
                    <Btn size="sm" variant="ghost" disabled={busyId === u.id} onClick={() => act(u.id, "remove")}><Trash2 className="h-3.5 w-3.5" /></Btn>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          {data.outgoing.length > 0 && (
            <Card>
              <CardHeader title="Solicitudes enviadas" subtitle="Pendientes de aceptar" icon={Clock} />
              <CardContent className="space-y-2">
                {data.outgoing.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                    <div className="flex items-center gap-3 min-w-0"><SocialAvatar name={u.name} avatar_url={u.avatar_url} size={36} />
                      <div className="text-sm text-slate-700 truncate">{u.name}</div></div>
                    <div className="flex items-center gap-2 flex-shrink-0"><Badge tone="amber">Pendiente</Badge>
                      <Btn size="sm" variant="ghost" disabled={busyId === u.id} onClick={() => act(u.id, "cancel")}><XCircle className="h-3.5 w-3.5" /></Btn></div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!loading && tab === "descubre" && (
        <Card>
          <CardHeader title="Descubre Robins" subtitle="Encuentra y conecta con otros miembros" icon={Search} />
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o ciudad…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:bg-white transition" />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {dirFiltered.length === 0 && <div className="text-sm text-slate-400 px-1">No hay más Robins para mostrar.</div>}
              {dirFiltered.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center gap-3 min-w-0"><SocialAvatar name={u.name} avatar_url={u.avatar_url} />
                    <div className="min-w-0"><div className="text-sm font-semibold text-slate-900 truncate">{u.name}</div><div className="text-xs text-slate-400 truncate">{u.ciudad || ""}</div></div>
                  </div>
                  <div className="flex-shrink-0">
                    {u.status === "incoming" ? (
                      <Btn size="sm" disabled={busyId === u.id} onClick={() => act(u.id, "accept")}><CheckCircle2 className="h-3.5 w-3.5" /> Aceptar</Btn>
                    ) : u.status === "outgoing" ? (
                      <Badge tone="amber">Pendiente</Badge>
                    ) : (
                      <Btn size="sm" variant="secondary" disabled={busyId === u.id} onClick={() => act(u.id, "request")}><Plus className="h-3.5 w-3.5" /> Añadir</Btn>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && tab === "mensajes" && (
        <Card>
          <CardHeader title="Mensajes" subtitle="Tus conversaciones con amigos" icon={MessageCircle} />
          <CardContent className="space-y-2">
            {convs.length === 0 && <div className="text-sm text-slate-400 px-1">No tienes conversaciones. Hazte amigo de alguien para empezar a chatear.</div>}
            {convs.map((c) => (
              <button key={c.friend_id} onClick={() => setChat(c)} className="w-full text-left flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3 hover:shadow-sm transition">
                <div className="flex items-center gap-3 min-w-0"><SocialAvatar name={c.name} avatar_url={c.avatar_url} />
                  <div className="min-w-0"><div className="text-sm font-semibold text-slate-900 truncate">{c.name}</div>
                    <div className="text-xs text-slate-400 truncate">{c.last_body || "Sin mensajes todavía"}</div></div>
                </div>
                {c.unread > 0 && <span className="rounded-full bg-rose-500 text-white text-[10px] px-1.5 py-0.5 leading-none flex-shrink-0">{c.unread}</span>}
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export { SubSocial };
