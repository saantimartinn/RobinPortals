// Subscription feature UI for sub faqs; the application shell selects this view.
import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";
import { faqsList } from "../../api/index.js";
import { Card, CardContent } from "../../shared/ui.jsx";

function SubFaqs() {
  const [faqs, setFaqs] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [query, setQuery] = useState('');
  useEffect(() => { faqsList().then(r => setFaqs(r.faqs || [])).catch(e => setError(e.message || 'No se pudieron cargar las FAQs.')).finally(() => setLoading(false)); }, []);
  const visible = useMemo(() => { const q = query.trim().toLowerCase(); return q ? faqs.filter(f => `${f.question} ${f.answer} ${f.category}`.toLowerCase().includes(q)) : faqs; }, [faqs, query]);
  return <div className="space-y-5">
    <div className="student-page-heading"><span className="student-eyebrow">Resuelve tus dudas</span><h1>Preguntas frecuentes</h1></div>
    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"><Search size={18} className="text-slate-400" /><input className="w-full bg-transparent text-sm outline-none" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar una pregunta…" /></label>
    {loading && <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" />Cargando preguntas…</p>}
    {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
    {!loading && !error && visible.length === 0 && <Card><CardContent><p className="text-sm text-slate-500">{faqs.length ? 'No hay resultados para esa búsqueda.' : 'Todavía no hay preguntas publicadas.'}</p></CardContent></Card>}
    <div className="space-y-3">{visible.map(f => <details key={f.id} className="group rounded-2xl border border-slate-100 bg-white"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-slate-900"><span><small className="mb-1 block text-[10px] text-amber-600">{f.category}</small>{f.question}</span><ChevronDown size={18} className="shrink-0 transition-transform group-open:rotate-180" /></summary><p className="whitespace-pre-wrap border-t border-slate-100 px-5 py-4 text-sm leading-7 text-slate-600">{f.answer}</p></details>)}</div>
  </div>;
}
export { SubFaqs };
