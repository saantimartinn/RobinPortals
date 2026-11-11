const key = name => String(name || '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
export function subjectPreferenceError(subjects) {
  if (!Array.isArray(subjects) || !subjects.length || subjects.some(subject => !key(subject?.name))) return 'Añade al menos una asignatura antes de continuar.';
  if (subjects.some(subject => !['like','dislike'].includes(subject.preference))) return 'Marca un pulgar arriba o abajo en todas las asignaturas antes de continuar.';
  return '';
}
export function subjectPreferencesMatch(signals, academicSubjects) {
  const subjects = signals?.asignaturas || signals?.asignaturas_ordenadas;
  if (subjectPreferenceError(subjects) || subjects.length !== academicSubjects.length) return false;
  const names = new Set(subjects.map(subject => key(subject.name)));
  return names.size === subjects.length && academicSubjects.every(subject => names.has(key(subject.name)));
}
