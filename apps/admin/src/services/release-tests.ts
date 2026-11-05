import { apiPath } from "@/lib/api-path";

export type ReleaseCheck = { id: string; group: string; title: string; description: string; runnable: boolean; coverage: "operation" | "structure"; unavailableReason?: string };
export type ReleaseResult = { id: string; status: "passed" | "failed" | "cancelled" | "action_required"; detail: string; duration_ms: number; ran_at: string; checkout_url?: string; amount_eur?: number; test_email?: string; test_holder?: string };

export type PaymentTestState = { status: "idle" | "action_required" | "ready_to_verify" | "pending" | "passed" | "cancelled"; checkout_url?: string; amount_eur?: number; test_email?: string; test_holder?: string; detail?: string };
export type ReleaseCatalog = { checks: ReleaseCheck[]; results: Record<string, ReleaseResult>; revision: string; scope: "local" | "production" };

export async function listReleaseChecks(): Promise<ReleaseCatalog> {
  const response = await fetch(apiPath("/api/admin/tests/run"), { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error(`No se pudo cargar el catálogo de tests (HTTP ${response.status})`);
  const data = await response.json();
  return { checks: data.checks || [], results: data.results || {}, revision: data.revision || "", scope: data.scope || "local" };
}

export async function runReleaseCheck(id: string): Promise<ReleaseResult> {
  const response = await fetch(apiPath("/api/admin/tests/run"), {
    method: "POST", credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `No se pudo ejecutar el test (HTTP ${response.status})`);
  return data as ReleaseResult;
}

export async function paymentTestAction(action: "status" | "verify" | "cleanup"): Promise<PaymentTestState> {
  const response = await fetch(apiPath("/api/admin/tests/payment"), {
    method: action === "status" ? "GET" : "POST",
    credentials: "same-origin", cache: "no-store",
    ...(action === "status" ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `No se pudo completar la prueba de pago (HTTP ${response.status})`);
  return data as PaymentTestState;
}
