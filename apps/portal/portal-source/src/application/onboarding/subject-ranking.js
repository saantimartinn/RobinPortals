export function toggleSubjectPreference(subjects, index, preference) {
  return subjects.map((subject, i) => i === index
    ? { ...subject, preference: preference } : subject);
}

export function formatSubjectRanking(subjects) {
  return (subjects || []).map((subject) => `${subject.name}${subject.preference === 'like' ? ' — Me gusta' : subject.preference === 'dislike' ? ' — No me gusta' : ''}`);
}

export function subjectRankingSignals(subjects = []) {
  return {
    asignaturas: subjects.map((subject) => ({ name: subject.name, preference: subject.preference || null })),
    asignaturas_fav: subjects.filter((subject) => subject.preference === 'like').map((subject) => subject.name),
    asignaturas_menos: subjects.filter((subject) => subject.preference === 'dislike').map((subject) => subject.name),
  };
}
