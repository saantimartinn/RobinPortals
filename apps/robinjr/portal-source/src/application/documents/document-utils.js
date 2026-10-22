// Portal view or navigation module for document utils; the application shell owns session state.
import { APP_STEPS } from "../../application-steps.js";

export const APP_PHASE_LABELS = APP_STEPS;

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
