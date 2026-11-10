export function moveSubject(subjects, from, to) {
  if (from < 0 || to < 0 || from >= subjects.length || to >= subjects.length || from === to) return subjects;
  const ordered = [...subjects];
  const [subject] = ordered.splice(from, 1);
  ordered.splice(to, 0, subject);
  return ordered;
}

export function toggleSubjectPreference(subjects, index, preference) {
  return subjects.map((subject, i) => i === index
    ? { ...subject, preference: subject.preference === preference ? null : preference } : subject);
}

export function formatSubjectRanking(subjects) {
  return (subjects || []).map((subject, i) => `${i + 1}. ${subject.name}${subject.preference === 'like' ? ' — Me gusta' : subject.preference === 'dislike' ? ' — No me gusta' : ''}`);
}

export function subjectRankingSignals(subjects = []) {
  return {
    asignaturas_ordenadas: subjects.map((subject, i) => ({ name: subject.name, rank: i + 1, preference: subject.preference || null })),
    asignaturas_fav: subjects.filter((subject) => subject.preference === 'like').map((subject) => subject.name),
    asignaturas_menos: subjects.filter((subject) => subject.preference === 'dislike').map((subject) => subject.name),
  };
}
