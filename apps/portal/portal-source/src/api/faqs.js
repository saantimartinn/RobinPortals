// Browser API client for faqs; keeps endpoint and fetch details out of the screens.
import { api } from "./core.js";

// ----- FAQs -----
export async function faqsList() { return api.get("/api/faqs"); }
export async function adminFaqMutate(action, payload) { return api.post("/api/faqs", { action, payload }); }
