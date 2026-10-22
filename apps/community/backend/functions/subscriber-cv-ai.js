/**
 * POST /api/subscriber/cv-ai  · Asistente de CV con IA para suscriptores.
 * Body:
 *   { mode: 'generate' | 'analyze',
 *     purpose: 'temporal' | 'professional',
 *     sector: string,
 *     inputs?: string,               // (generate) datos que aporta el usuario
 *     cv_text?: string,              // (analyze) texto pegado
 *     cv_file?: string (dataURL),    // (analyze) PDF/DOCX/TXT subido
 *     cv_mime?: string }
 * Respuesta:
 *   generate → { ok, mode:'generate', cv: {structured CV object} }
 *   analyze  → { ok, mode:'analyze', score, summary, strengths[], improvements[] }
 * Requiere ANTHROPIC_API_KEY. DOCX se lee con mammoth; PDF se envía a Claude como documento.
 */
const { readSessionFromEvent } = require('../lib/auth');
const { json, methodNotAllowed, parseJsonBody, serverError, verifyOrigin } = require('../lib/http');
const { chatCompletion } = require('../lib/anthropic-chat');

const PURPOSE_LABEL = {
  temporal: 'un trabajo temporal / a tiempo parcial mientras estudia',
  professional: 'un puesto profesional definitivo acorde a su formación',
};

function stripDataUrl(s) {
  const m = /^data:[^;]*;base64,(.*)$/s.exec(s || '');
  return m ? m[1] : (s || '');
}

async function docxToText(base64) {
  const mammoth = require('mammoth');
  const buffer = Buffer.from(base64, 'base64');
  const res = await mammoth.extractRawText({ buffer });
  return (res && res.value) || '';
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return methodNotAllowed(['POST']);
  if (!verifyOrigin(event)) return json({ error: 'bad_origin' }, { statusCode: 403 });
  const session = readSessionFromEvent(event);
  if (!session) return json({ error: 'unauthorized' }, { statusCode: 401 });

  const body = parseJsonBody(event);
  if (!body) return json({ error: 'invalid_json' }, { statusCode: 400 });

  const mode = body.mode === 'analyze' ? 'analyze' : 'generate';
  const purpose = PURPOSE_LABEL[body.purpose] ? body.purpose : 'professional';
  const sector = (body.sector || '').toString().trim();
  const purposeText = PURPOSE_LABEL[purpose];

  try {
    // ---------- GENERATE ----------
    if (mode === 'generate') {
      const inputs = (body.inputs || '').toString().trim();
      if (!inputs) return json({ error: 'missing_inputs' }, { statusCode: 400 });
      const system = `Eres un experto en recursos humanos y redacción de CVs para estudiantes y jóvenes profesionales internacionales en Países Bajos/Europa. Creas CVs que SIEMPRE caben en UNA sola página A4: concisos, con solo la información relevante para el objetivo y el sector. Devuelves SIEMPRE un único objeto JSON válido, en español (salvo que el usuario pida otro idioma), sin texto fuera del JSON.`;
      const user = `Crea un CV para una persona cuyo objetivo es conseguir ${purposeText}. Sector / estudios: ${sector || 'no especificado'}.

Datos aportados:
"""
${inputs}
"""

Reglas OBLIGATORIAS:
- El CV debe caber SIEMPRE en UNA sola página A4. Sé breve y directo.
- Filtra y DESCARTA la información no relevante, redundante o poco útil para el objetivo (${purposeText}) y el sector indicado; prioriza lo más relevante.
- Máximo 3-4 experiencias y 2-3 formaciones (las más relevantes), con 1-3 bullets cortos por experiencia (una línea cada uno).
- Resumen de máximo 2-3 líneas. Habilidades e idiomas en listas cortas.
- No inventes datos que la persona no haya aportado; usa marcadores entre corchetes si falta algo esencial.

Devuelve EXCLUSIVAMENTE este JSON (usa marcadores entre corchetes si falta info, p. ej. "[Añade tu teléfono]"):
{
  "name": "",
  "headline": "",
  "contact": { "email": "", "phone": "", "location": "", "links": "" },
  "summary": "",
  "experience": [ { "role": "", "company": "", "location": "", "dates": "", "bullets": ["",""] } ],
  "education": [ { "title": "", "institution": "", "dates": "", "details": "" } ],
  "skills": ["",""],
  "languages": ["",""],
  "extras": [ { "title": "", "detail": "" } ]
}`;
      const { text } = await chatCompletion({ system, messages: [{ role: 'user', content: user }], maxTokens: 2000 });
      let cv = null;
      try { const m = text.match(/\{[\s\S]*\}/); cv = JSON.parse(m ? m[0] : text); } catch (_) {}
      if (!cv) return json({ ok: true, mode: 'generate', cv: { name: '', summary: text, experience: [], education: [], skills: [], languages: [], extras: [] } });
      return json({ ok: true, mode: 'generate', cv });
    }

    // ---------- ANALYZE ----------
    const system = `Eres un evaluador experto de CVs para estudiantes y jóvenes profesionales. Evalúas con criterio profesional: claridad, estructura, impacto/resultados, relevancia para el objetivo y sector, ortografía y concreción. Respondes SIEMPRE en español y SOLO con un objeto JSON válido.`;
    const promptText = `Analiza el CV para alguien cuyo objetivo es conseguir ${purposeText}, en el sector "${sector || 'no especificado'}".
Devuelve EXCLUSIVAMENTE este JSON (sin texto fuera del JSON):
{ "score": <0-10>, "summary": "<1-2 frases>", "strengths": ["",""], "improvements": ["",""] }`;

    let messages;
    const mime = (body.cv_mime || '').toLowerCase();
    const fileB64 = body.cv_file ? stripDataUrl(body.cv_file) : '';

    if (fileB64 && mime.includes('pdf')) {
      messages = [{ role: 'user', content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileB64 } },
        { type: 'text', text: promptText },
      ] }];
    } else {
      let cvText = (body.cv_text || '').toString().trim();
      if (!cvText && fileB64) {
        if (mime.includes('word') || mime.includes('officedocument') || mime.includes('docx')) {
          try { cvText = await docxToText(fileB64); } catch (e) { return json({ error: 'docx_parse_failed' }, { statusCode: 422 }); }
        } else {
          try { cvText = Buffer.from(fileB64, 'base64').toString('utf8'); } catch (_) {}
        }
      }
      if (!cvText.trim()) return json({ error: 'missing_cv' }, { statusCode: 400 });
      messages = [{ role: 'user', content: `${promptText}\n\nCV:\n"""\n${cvText}\n"""` }];
    }

    const { text } = await chatCompletion({ system, messages, maxTokens: 1200 });
    let parsed = null;
    try { const m = text.match(/\{[\s\S]*\}/); parsed = JSON.parse(m ? m[0] : text); } catch (_) {}
    if (!parsed) return json({ ok: true, mode: 'analyze', score: null, summary: text.slice(0, 600), strengths: [], improvements: [] });
    let score = Number(parsed.score);
    if (!isFinite(score)) score = null; else score = Math.max(0, Math.min(10, Math.round(score * 10) / 10));
    return json({
      ok: true, mode: 'analyze', score,
      summary: parsed.summary || '',
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 8) : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 8) : [],
    });
  } catch (e) {
    console.error('subscriber-cv-ai error', e);
    if (String(e.message || '').includes('ANTHROPIC_API_KEY')) return json({ error: 'ai_unavailable' }, { statusCode: 503 });
    return serverError(e);
  }
};
