// Admin feature module for lead shared; the feature registry connects it to the authenticated shell.
import type { Contact } from "@/types/domain";

export type InboxView = "all" | "España" | "Portugal" | "recomendador" | "eventos" | "reservas" | "lost";
export type LostLeadSection = "future" | "definitive" | "overdue";
export type EventLeadSection = "lisboa" | "canarias" | "valencia" | "webinar-21-11";

export function unitourEvent(campaign?: string): EventLeadSection | undefined {
  return campaign?.trim().toLowerCase().match(/^unitour (lisboa|canarias|valencia)$/)?.[1] as EventLeadSection | undefined;
}

export function leadInboxSection(contact: Pick<Contact, "createdAt" | "stage" | "owner">, stage = contact.stage || "Por contactar", owner = contact.owner || "", now = Date.now()): "active" | "definitive" | "overdue" | null {
  if (stage === "Lost") return "definitive";
  if (stage !== "Por contactar" || owner.trim()) return null;
  const enteredAt = leadEntryTimestamp(contact.createdAt);
  return enteredAt > 0 && now - enteredAt > 30 * 86400000 ? "overdue" : "active";
}

export function matchesInboxView(contact: Pick<Contact, "source" | "campaign" | "formName" | "country">, view: InboxView, eventSection: EventLeadSection = "lisboa") {
  const event = unitourEvent(contact.campaign)
    || (contact.source === "Meta Ads" && contact.campaign?.trim().toLowerCase() === "webinar 21-11" ? "webinar-21-11" : undefined);
  if (view === "eventos") return event === eventSection;
  if (event) return false;
  if (view === "reservas") return contact.formName === "reserva";
  if (contact.formName === "reserva") return false;
  const isRecommender = [contact.campaign, contact.formName, contact.source]
    .some((value) => String(value || "").trim().toLowerCase() === "recomendador");
  if (view === "recomendador") return isRecommender;
  if (isRecommender) return false;
  return view === "all" || (contact.country || "Otros") === view;
}

export type LeadGroupRow = { name: string; email: string; phone: string; schoolName: string; area: string; leadType: string; lifecycle: string; taskStatus: string; heat: string; source: string; campaign: string; notes: string; owner: string };

export const emptyLeadGroupRow = (): LeadGroupRow => ({ name: "", email: "", phone: "", schoolName: "", area: "", leadType: "", lifecycle: "", taskStatus: "", heat: "50", source: "", campaign: "", notes: "", owner: "" });

export function leadEntryTimestamp(value?: string) {
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function leadDaysWithoutContact(contact: Contact, assigned = true, now = Date.now()) {
  const enteredAt = leadEntryTimestamp(contact.createdAt);
  if (!enteredAt) return null;
  const contactedAt = assigned ? leadEntryTimestamp(contact.contactAt) : 0;
  const end = contactedAt || now;
  return Math.max(0, Math.floor((end - enteredAt) / 86400000));
}

export function formatLeadEntry(value?: string) {
  const timestamp = leadEntryTimestamp(value);
  if (!timestamp) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Madrid",
  }).format(new Date(timestamp)).replace(",", " ·");
}

export function campaignOrOrigin(contact: Contact) {
  if (unitourEvent(contact.campaign)) return contact.campaign.trim();
  if (contact.campaign?.trim().toLowerCase() === "recomendador") return "Recomendador";
  if (contact.source === "Meta Ads") {
    return contact.campaign && contact.campaign !== "Pendiente de identificar" ? contact.campaign : "Campaña pendiente";
  }
  if (contact.source === "Página web") return webFormLabel(contact.formName);
  return contact.source || "—";
}

export function inboxCampaignLabel(contact: Contact) {
  if (unitourEvent(contact.campaign)) return contact.campaign.trim();
  if (contact.campaign?.trim().toLowerCase() === "recomendador") return "Recomendador";
  if (contact.source === "Meta Ads") {
    return contact.campaign && contact.campaign !== "Pendiente de identificar" ? contact.campaign : "Campaña pendiente";
  }
  if (contact.pageUrl !== undefined) {
    if (!contact.pageUrl) return "Página no registrada";
    try {
      const url = new URL(contact.pageUrl);
      if (url.protocol === "http:" || url.protocol === "https:") return `${url.hostname}${url.pathname}`;
    } catch (_error) {
      if (contact.pageUrl.startsWith("/")) return contact.pageUrl;
    }
    return "Página no registrada";
  }
  return "—";
}

export function webFormLabel(formName?: string) {
  const normalized = String(formName || "").trim().toLowerCase();
  const labels: Record<string, string> = {
    contacto: "Formulario de contacto",
    colegios: "Formulario de colegios",
    newsletter: "Newsletter",
    reserva: "Reserva de consulta",
  };
  if (labels[normalized]) return labels[normalized];
  if (!normalized) return "Formulario web";
  return normalized.replace(/[_-]+/g, " ").replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}
