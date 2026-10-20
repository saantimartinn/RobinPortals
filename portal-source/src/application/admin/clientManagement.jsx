import { useMemo, useState } from "react";
import { Search, Users, Plus, ChevronRight, Loader2 } from "lucide-react";
import { Badge, Btn, Card, CardContent, CardHeader } from "../../ui.jsx";
import { ClientAvatar } from "./ClientAvatar.jsx";
import { useDebounced } from "./useDebounced.js";

export function AdminClientesList({ clients, totalCount, searchQ, onSearch, onSelect, loading, loadError, onOpenAssign }) {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Tus clientes" subtitle={`${totalCount} cliente(s) asignado(s)`} icon={Users}
          right={
            <div className="flex items-center gap-2">
              <Badge tone="navy">{clients.length} mostrando</Badge>
              <Btn size="sm" variant="secondary" onClick={onOpenAssign}>
                <Plus className="h-3.5 w-3.5" /> Asignar cliente
              </Btn>
            </div>
          }
        />
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Buscar por nombre, email, username o Lead ID…"
              aria-label="Buscar en mis clientes"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:bg-white transition"
            />
          </div>

          {loading ? (
            <div className="text-sm text-slate-400 text-center py-10 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando tus clientes…
            </div>
          ) : loadError ? (
            <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-3 text-center">{loadError}</div>
          ) : clients.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-10">
              {totalCount === 0
                ? "Aún no tienes clientes asignados."
                : "Sin resultados para tu búsqueda."}
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map((c) => {
                const isOnb = c.requires_onboarding;
                return (
                  <button key={c.id} onClick={() => onSelect(c)}
                    className="admin-client-row w-full flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 hover:border-slate-300 hover:bg-slate-50 transition text-left">
                    <ClientAvatar nombre={c.nombre} apellidos={c.apellidos} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {c.nombre} {c.apellidos}
                      </div>
                      <div className="text-xs text-slate-400 truncate">
                        {c.email || c.username} · {c.lead_id}
                      </div>
                    </div>
                    <Badge tone={isOnb ? "amber" : "green"}>{isOnb ? "Registro pendiente" : `Paso ${c.application_phase || 1}`}</Badge>
                    <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function AssignClientModal({ adminEmail, list, loading, error, busyId, onAssign, onClose }) {
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 200);
  const visibles = useMemo(() => {
    const s = (dq || "").trim().toLowerCase();
    if (!s) return list;
    return list.filter((c) => `${c.nombre || ""} ${c.apellidos || ""} ${c.email || ""} ${c.username || ""} ${c.lead_id || ""} ${c.assigned_to || ""}`.toLowerCase().includes(s));
  }, [list, dq]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "rgba(15,23,42,0.5)" }}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <div className="text-base font-bold text-slate-900" style={{ fontFamily: "'Georgia', serif" }}>Asignar cliente</div>
            <div className="text-xs text-slate-500">Selecciona un cliente para asignártelo (assigned_to = {adminEmail})</div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
        </div>
        <div className="p-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, email, username, Lead ID o asignado…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:bg-white transition" />
          </div>
          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 rounded-xl px-3 py-2 mb-3">{error}</div>
          )}
          <div className="max-h-[60vh] overflow-auto space-y-2">
            {loading ? (
              <div className="text-sm text-slate-400 text-center py-10 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
              </div>
            ) : visibles.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-10">Sin resultados.</div>
            ) : visibles.map((c) => {
              const mine = (c.assigned_to || "").toLowerCase() === (adminEmail || "").toLowerCase();
              const other = !!c.assigned_to && !mine;
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2.5">
                  <ClientAvatar nombre={c.nombre} apellidos={c.apellidos} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {c.nombre || "—"} {c.apellidos || ""}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {c.email || c.username} · {c.lead_id}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {c.assigned_to ? `Asignado a: ${c.assigned_to}` : "Sin asignar"}
                    </div>
                  </div>
                  {mine ? (
                    <Badge tone="green">Tuyo</Badge>
                  ) : (
                    <Btn size="sm" variant={other ? "secondary" : "primary"}
                      onClick={() => onAssign(c.id)} disabled={busyId === c.id}>
                      {busyId === c.id ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> …</> : (other ? "Reasignar a mí" : "Asignar")}
                    </Btn>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
