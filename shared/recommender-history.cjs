const URL = 'https://rbmt.netlify.app/api/internal/recommender-sessions';

async function requestRecommenderHistory(email, secret, fetchImpl = fetch) {
  if (!secret) throw new Error('La conexión con el recomendador no está configurada');
  const response = await fetchImpl(`${URL}?email=${encodeURIComponent(email)}`, {
    headers: { 'x-robin-lead-secret': secret },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`El recomendador ha respondido con HTTP ${response.status}`);
  const data = await response.json();
  if (!Number.isSafeInteger(data.count) || data.count < 0 || !Array.isArray(data.sessions)) {
    throw new Error('El recomendador ha devuelto un historial inválido');
  }
  return { count: data.count, sessions: data.sessions.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    school: row.school || '',
    originCity: row.origin_city || '',
    originCountry: row.origin_country || '',
    selectedArea: row.selected_area || '',
    academicSystem: row.academic_system || '',
    academicSubjects: Array.isArray(row.academic_subjects) ? row.academic_subjects : [],
    course: row.questionnaire?.course || '',
    blocks: Array.isArray(row.questionnaire?.blocks) ? row.questionnaire.blocks : [],
    recommendations: Array.isArray(row.recommendations) ? row.recommendations : [],
  })) };
}

module.exports = { requestRecommenderHistory };
