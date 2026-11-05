// Portal view or navigation module for document utils; the application shell owns session state.
export const APP_PHASE_LABELS = [
  { key: 1, label: 'Presentación de carreras', desc: 'Te presentamos las opciones que mejor encajan contigo' },
  { key: 2, label: 'Elección de carreras', desc: 'Elegís juntos las universidades y programas a solicitar' },
  { key: 3, label: 'Entrega de documentos', desc: 'Reúnes y subes toda la documentación necesaria' },
  { key: 4, label: 'Esperando resultados', desc: 'Las universidades estudian tu solicitud' },
  { key: 5, label: 'Selección del destino', desc: 'Eliges entre las admisiones recibidas tu universidad' },
  { key: 6, label: 'Buscando alojamiento', desc: 'Buscamos y aseguramos tu alojamiento en destino' },
  { key: 7, label: 'Entrega de EBAU + pago de matrícula', desc: 'Envías tus notas de EBAU y formalizas la matrícula' },
  { key: 8, label: 'Trámites finales', desc: 'Completamos los últimos trámites antes de tu salida' },
  { key: 9, label: 'Llegada al destino', desc: '¡Llegas a tu nuevo destino y comienza la aventura!' },
];

export const DEFAULT_REQUIRED_DOCS = [
  'Notas de 4º de la ESO',
  'Notas de 1º de bachillerato',
  'Notas de 2º de bachillerato',
  'CV',
];

export const DEFAULT_REQUIRED_DOCS_MASTER = [
  { name: 'CV', required: true },
  { name: 'Grado universitario', required: true },
  { name: 'Transcript del grado universitario', required: true },
  { name: 'Examen (si aplica)', required: false },
  { name: 'Carta de motivación', required: true },
];

export function buildDefaultDocs(level) {
  const list = level === 'maestria' ? DEFAULT_REQUIRED_DOCS_MASTER : DEFAULT_REQUIRED_DOCS;
  return list.map((entry) => {
    const document = typeof entry === 'string' ? { name: entry, required: true } : entry;
    return {
      id: '',
      type: 'document',
      name: document.name,
      deadline: '',
      required: document.required !== false,
      template_file: null,
      template_path: null,
      template_filename: null,
      template_mime: null,
    };
  });
}

export function statusLabel(status) {
  if (status === 'validated') return { tone: 'green', label: 'Validado' };
  if (status === 'pending_review') return { tone: 'amber', label: 'Pendiente revisión' };
  if (status === 'rejected') return { tone: 'rose', label: 'Rechazado' };
  return { tone: 'slate', label: 'Pendiente subir' };
}

export function countRequiredDocumentsToUpload(documents = []) {
  return documents.filter((document) => document.required === true
    && !document.has_file
    && ['required', 'rejected'].includes(document.status)).length;
}

function normalizeDocumentName(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es');
}

export function groupStudentDocumentsByCareer(documents = [], careers = []) {
  const groups = (careers || []).filter((career) => career?.id).map((career) => ({
    career,
    label: [career.name, career.university].filter(Boolean).join(' · '),
    requiredNames: new Set((career.required_docs || [])
      .filter((requirement) => requirement?.type !== 'event')
      .map((requirement) => normalizeDocumentName(requirement?.name))
      .filter(Boolean)),
    documents: [],
  }));
  const ungrouped = [];
  const statusOrder = { required: 0, rejected: 0, pending_review: 1, validated: 2 };

  for (const document of documents || []) {
    const name = normalizeDocumentName(document.name);
    const matchingGroups = groups.filter(({ career, requiredNames }) =>
      career.id === document.career_template_id || (name && requiredNames.has(name)));
    const entry = { document, careerNames: matchingGroups.map((group) => group.label) };
    if (!matchingGroups.length) ungrouped.push(entry);
    else matchingGroups.forEach((group) => group.documents.push(entry));
  }

  const byStatus = (a, b) => (statusOrder[a.document.status] ?? 3) - (statusOrder[b.document.status] ?? 3);
  return {
    groups: groups.filter((group) => group.documents.length).map(({ requiredNames, ...group }) => ({
      ...group,
      documents: group.documents.sort(byStatus),
    })),
    ungrouped: ungrouped.sort(byStatus),
  };
}

export function newCareerRequirement(type = 'document') {
  return {
    id: '',
    type,
    name: '',
    deadline: '',
    required: type === 'document',
    template_file: null,
    template_path: null,
    template_filename: null,
    template_mime: null,
  };
}

export function normalizeCareerRequirement(requirement = {}) {
  const type = requirement.type === 'event' ? 'event' : 'document';
  return {
    ...newCareerRequirement(type),
    ...requirement,
    type,
    deadline: requirement.deadline || '',
    required: type === 'document' ? requirement.required !== false : false,
  };
}
