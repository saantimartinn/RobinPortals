import { api } from "./core.js";

export async function contractSave(payload) {
  return api.post("/api/onboarding/contract", payload);
}

// Checkout alojado para la primera cuota del onboarding. Devuelve { url }.
export async function onboardingCheckout() {
  return api.post("/api/onboarding/checkout", {});
}

