// Robin introduces a section only at its first question.
export function sectionIntroduction(current, previous) {
  if (current?.kind === "academic") return "Por último, vamos a revisar tu sistema académico y tus asignaturas.";
  if (current?.kind !== "question" || current.block.key === previous?.block?.key) return "";
  const block = current.block;
  if (block.key === "general") return "Vamos a empezar con unas preguntas generales para conocerte mejor.";
  if (block.title.startsWith("Específicas · ")) return `Vamos ahora con unas preguntas específicas sobre ${block.title.split("·")[1].trim()}.`;
  if (block.key === "vocacional") return "Para terminar, vamos a hablar de tu futuro y de lo que buscas en tu experiencia universitaria.";
  if (block.key === "m_formacion") return "Empecemos por tu formación universitaria, para conocer de dónde partes.";
  if (block.key === "m_experiencia") return "Vamos ahora con unas preguntas sobre tu experiencia profesional y lo que has aprendido hasta aquí.";
  if (block.key === "m_objetivo") return "Ahora me gustaría conocer qué buscas en tu máster y cuáles son tus objetivos de futuro.";
  return `Vamos ahora con la sección ${block.title.replace(/^Bloque \d+ · /, "")}.`;
}
