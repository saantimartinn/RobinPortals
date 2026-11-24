// Portal view or navigation module for admin navigation; the application shell owns session state.
import arrivalPack from '../../../shared/arrival-pack.cjs';

export const ADMIN_CLIENT_SECTIONS = ["estado", "perfil", "carreras", "documentos", "pagos", "chat", "reservas", "academico"];
const GLOBAL_SECTIONS = ["inicio", "clientes", "notificaciones", "faqs", "base-datos"];
export const INITIAL_ADMIN_NAVIGATION = { active: "inicio", selectedClientId: null };

export function adminClientSections(client) {
  return arrivalPack.isArrivalClient(client)
    ? ADMIN_CLIENT_SECTIONS.filter(section => !['carreras', 'academico', 'documentos', 'chat'].includes(section))
    : ADMIN_CLIENT_SECTIONS;
}

export function adminSectionForClient(client, section) {
  return ADMIN_CLIENT_SECTIONS.includes(section) && !adminClientSections(client).includes(section) ? 'estado' : section;
}

// A single transition changes both the visible section and its client context.
export function adminNavigation(state, event) {
  if (event.type === "navigate") {
    if (GLOBAL_SECTIONS.includes(event.section)) return { active: event.section, selectedClientId: null };
    if (ADMIN_CLIENT_SECTIONS.includes(event.section) && state.selectedClientId) return { ...state, active: adminSectionForClient(event.client, event.section) };
  }
  if (event.type === "open" && event.clientId) return { active: "estado", selectedClientId: event.clientId };
  if (event.type === "switch" && event.clientId && ADMIN_CLIENT_SECTIONS.includes(state.active)) {
    return { active: adminSectionForClient(event.client, state.active), selectedClientId: event.clientId };
  }
  return state;
}
