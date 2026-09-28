import { createServerFn } from "@tanstack/react-start";

export interface EraExtension {
  client_id: string;
  client_name: string;
  extension: string;
  description: string;
  status: "online" | "offline";
}

// Single call to ERA extensionsStatus; token stays server-side.
export const getEraExtensions = createServerFn({ method: "GET" }).handler(async () => {
  const token = process.env["ERA_API_TOKEN"];
  if (!token) return { ok: false as const, error: "ERA_API_TOKEN not configured", data: [] as EraExtension[] };
  const url = new URL("https://oktelecom.oktelecom.info:4435/api/v1/register/extensionsStatus");
  url.searchParams.set("organization_id", "5c344b71-3531-4a38-b5c9-fc883753883f");
  url.searchParams.set("organization_name", "oktelecom.oktelecom.info");
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    if (!res.ok) {
      console.error("ERA API", res.status, await res.text().catch(() => ""));
      return { ok: false as const, error: `ERA API ${res.status}`, data: [] as EraExtension[] };
    }
    const json = (await res.json()) as { data?: Record<string, unknown>[] };
    const data: EraExtension[] = (json.data ?? []).map((r) => {
      const ctx = String(r["user_context"] ?? "") || "unknown";
      return {
        client_id: ctx,
        client_name: ctx,
        extension: String(r["extension"] ?? ""),
        description: String(r["description"] ?? ""),
        status: String(r["register"]).toLowerCase() === "true" ? "online" : "offline",
      };
    });
    return { ok: true as const, error: null, data };
  } catch (e) {
    console.error("ERA API fetch failed", e);
    return { ok: false as const, error: "ERA API unreachable", data: [] as EraExtension[] };
  }
});
