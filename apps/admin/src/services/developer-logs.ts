import { apiPath } from "@/lib/api-path";

export type DeveloperLog = {
  id: string;
  portal: "portal" | "robinjr" | "community";
  source: string;
  result: string;
  message: string;
  created_at: string;
};

export type DeveloperLogFilters = { portal: string; source: string; result: string; search: string };
export type DeveloperLogPage = {
  entries: DeveloperLog[];
  next_cursor: string | null;
  as_of: string;
  errors: { portal: string; code: string }[];
};

export async function listDeveloperLogs(filters: DeveloperLogFilters, cursor?: string | null): Promise<DeveloperLogPage> {
  const query = new URLSearchParams({ ...filters });
  if (cursor) query.set("cursor", cursor);
  const response = await fetch(`${apiPath("/api/admin/developer-logs")}?${query}`, { credentials: "same-origin", cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `No se pudieron cargar los registros (HTTP ${response.status})`);
  return data as DeveloperLogPage;
}

export type PlatformLog = DeveloperLog & { name: string };
export type PlatformLogResponse = { status: "ok" | "loading" | "needs_token" | "unavailable"; reason?: string; entries: PlatformLog[]; errors?: { portal: string; code: string }[]; window?: string; projects?: Record<string, string | null> };

export async function listPlatformLogs(query: Record<string, string>): Promise<PlatformLogResponse> {
  const response = await fetch(`${apiPath("/api/admin/platform-logs")}?${new URLSearchParams(query)}`, { credentials: "same-origin", cache: "no-store" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `No se pudieron consultar los registros (HTTP ${response.status})`);
  return data as PlatformLogResponse;
}
