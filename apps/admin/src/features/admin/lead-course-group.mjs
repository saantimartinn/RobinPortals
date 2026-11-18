export const leadCourseGroups = ["1º de Bachillerato", "2º de Bachillerato", "Otros"];

export function leadCourseGroup(course) {
  const value = String(course || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[º°]/g, "o").replace(/[^a-z0-9]+/g, " ").trim();
  const first = /\b(?:1(?:o|er|st)?|primer(?:o)?|first|uno|dp\s*1|ib\s*1|y(?:ear)?\s*12|grade\s*11|11(?:th)?\s*grade|11\s*o?\s*ano|as(?:\s*level)?)\b/.test(value);
  const second = /\b(?:2(?:o|do|nd)?|segundo|second|dos|dp\s*2|ib\s*2|y(?:ear)?\s*13|grade\s*12|12(?:th)?\s*grade|12\s*o?\s*ano|a\s*2)\b/.test(value);
  if (first === second) return "Otros";
  return first ? leadCourseGroups[0] : leadCourseGroups[1];
}
