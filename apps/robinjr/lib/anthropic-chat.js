/**
 * lib/anthropic-chat.js
 * Helper compartido para llamar a Claude para chat / resumen / historial.
 */
async function chatCompletion({ system, messages, model, maxTokens = 2048 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY no configurada');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: model || process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: system || '',
      messages,
    }),
  });
  const resp = await response.json();
  if (!response.ok) throw new Error(`Anthropic ${response.status}: ${resp.error?.message || 'sin detalle'}`);
  const text = (resp.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  return { text, raw: resp };
}

module.exports = { chatCompletion };
