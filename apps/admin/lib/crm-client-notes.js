// Snapshot of commercial comments copied when a CRM lead becomes a portal client.
async function loadCrmClientNotes(crm, lead) {
  const [eventsResult, callsResult] = await Promise.all([
    crm.from('crm_lead_events').select('id,metadata,created_at').eq('lead_id', lead.id).eq('event_type', 'team_note'),
    crm.from('crm_lead_calls').select('id,kind,notes,author_name,occurred_at').eq('lead_id', lead.id),
  ]);
  if (eventsResult.error) throw eventsResult.error;
  if (callsResult.error) throw callsResult.error;

  const notes = [];
  const comment = String(lead.comment || lead.body_text || '').trim();
  if (comment) notes.push({ id: `comment:${lead.id}`, kind: 'comment', body: comment, authorName: 'Comentario del lead', createdAt: lead.source_created_at || null });
  for (const event of eventsResult.data || []) {
    const body = String(event.metadata?.body || '').trim();
    if (body) notes.push({ id: `event:${event.id}`, kind: 'team_note', body, authorName: String(event.metadata?.author_name || 'Equipo Robin'), createdAt: event.created_at || null });
  }
  for (const call of callsResult.data || []) {
    const body = String(call.notes || '').trim();
    if (body) notes.push({ id: `contact:${call.id}`, kind: call.kind === 'message' ? 'message' : 'call', body, authorName: String(call.author_name || 'Equipo Robin'), createdAt: call.occurred_at || null });
  }
  return notes.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')) || a.id.localeCompare(b.id));
}

module.exports = { loadCrmClientNotes };
