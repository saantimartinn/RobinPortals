// Pack Llegada editorial copy. Sources and verification dates: docs/PARTNERS.md.
const DESCRIPTIONS = {
  translayte: 'Traducciones juradas y certificadas de documentos. Para presentar tus títulos y certificados en trámites oficiales en el extranjero.',
  revolut: 'Cuenta y app para gestionar pagos, tarjetas y transferencias. Consulta tus movimientos y organiza tus gastos cotidianos desde el móvil.',
  socialhub: 'Alojamiento para estudiantes con habitaciones amuebladas y zonas comunes. Combina espacios de estudio, actividades y vida en comunidad.',
  britishcouncil: 'Cursos de inglés, preparación de exámenes y certificaciones como IELTS. Recursos para mejorar tu nivel y preparar tu próxima etapa.',
  cjp: 'Descuentos culturales para jóvenes en Países Bajos. Descubre propuestas de cine, museos, teatro, conciertos y festivales.',
  linkmaas: 'Apoyo académico para universitarios en Maastricht. Clases y orientación para afrontar las asignaturas de la universidad.',
  circo: 'Fiestas y eventos de música en Países Bajos. Una propuesta para disfrutar del ocio y conocer gente durante tu estancia.',
  studentexperience: 'Residencias con estudios y zonas compartidas para estudiantes. Descubre Amsterdam NDSM y sus espacios de estudio y ocio.',
  scopemaastricht: 'Asociación de estudiantes de Economía y Empresa en Maastricht. Ofrece actividades académicas, profesionales y sociales.',
  hispaniagroningen: 'Asociación española de estudiantes en Groningen. Encuentros y actividades culturales para conocer a otros estudiantes.',
  swapfiets: 'Bicicletas por suscripción con reparación incluida. Una forma de moverte por la ciudad durante tus estudios en Países Bajos.',
};
const PRIORITY = ['translayte', 'revolut', 'socialhub', 'britishcouncil'];

function partnerKey(name) {
  const key = String(name || '').trim().toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]/g, '');
  return key === 'translyte' ? 'translayte' : key === 'tsh' ? 'socialhub' : key;
}

function partnersForArrival(partners) {
  const rank = partner => { const index = PRIORITY.indexOf(partnerKey(partner.name)); return index === -1 ? PRIORITY.length : index; };
  return partners.map(partner => {
    const key = partnerKey(partner.name);
    const entry = { ...partner };
    if (DESCRIPTIONS[key]) entry.arrival_description = DESCRIPTIONS[key];
    if (key === 'revolut' || key === 'socialhub') {
      entry.contact_url = null;
      entry.booking_url = null;
      entry.link_unavailable = true;
    }
    return entry;
  }).sort((a, b) => rank(a) - rank(b));
}

module.exports = { partnersForArrival };
