function focusedHistoryContext(clients, focusUserId) {
  if (!focusUserId) return null;
  const client = clients.find(item => item.id === focusUserId);
  if (!client) throw new Error('focus_not_assigned');
  return { id: client.id, historial: String(client.historial || ''),
    academic_system: client.academic_system || null, academic_subjects: client.academic_subjects || [],
    intereses: client.intereses || [], questionnaire: client.questionnaire || null };
}
module.exports = { focusedHistoryContext };
