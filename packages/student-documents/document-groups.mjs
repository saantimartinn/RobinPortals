// Shared display grouping: document records and uploads remain unique.
function normalizeDocumentName(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es');
}

export function groupStudentDocumentsByCareer(documents = [], careers = [], { shareUnlinkedDocuments = false } = {}) {
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
      career.id === document.career_template_id || (name && requiredNames.has(name)) || (shareUnlinkedDocuments && !document.career_template_id));
    const entry = { document, deadline: document.deadline || null, careerNames: matchingGroups.map((group) => group.label) };
    if (!matchingGroups.length) ungrouped.push(entry);
    else matchingGroups.forEach((group) => {
      const requirement = (group.career.required_docs || []).find((item) =>
        item?.type !== 'event' && normalizeDocumentName(item?.name) === name);
      group.documents.push({ ...entry, deadline: requirement?.deadline || entry.deadline });
    });
  }

  const byStatus = (a, b) => (statusOrder[a.document.status] ?? 0) - (statusOrder[b.document.status] ?? 0);
  return {
    groups: groups.filter((group) => group.documents.length).map(({ requiredNames, ...group }) => ({
      ...group,
      documents: group.documents.sort(byStatus),
    })),
    ungrouped: ungrouped.sort(byStatus),
  };
}

export function studentDocumentProgress(entries = []) {
  return { approved: entries.filter(({ document }) => document.status === 'validated').length, total: entries.length };
}

export function formatDocumentDeadline(value) {
  const deadline = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null;
  const date = new Date(`${deadline}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== deadline) return null;
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date);
}
