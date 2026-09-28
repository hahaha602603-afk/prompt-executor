import { createServerFn } from "@tanstack/react-start";

export interface EraExtension {
  client_id: string;
  client_name: string;
  extension: string;
  description: string;
  status: "online" | "offline";
}

const BASE = "https://oktelecom.oktelecom.info:4435";
const ORG_ID = "5c344b71-3531-4a38-b5c9-fc883753883f";
const ORG_NAME = "oktelecom.oktelecom.info";

// Tokens live 5 minutes; cache server-side and refresh shortly before expiry.
let cached: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 15_000) return cached.token;
  const res = await fetch(`${BASE}/api/v1/token/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ organization_id: ORG_ID }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    token?: string;
    expires_in?: number;
    data?: { token?: string; expires_in?: number };
  };
  const token = json.token ?? json.data?.token;
  if (!res.ok || !token) throw new Error(`token/generate ${res.status}`);
  const ttl = (json.expires_in ?? json.data?.expires_in ?? 300) * 1000;
  cached = { token, expiresAt: Date.now() + ttl };
  return token;
}

// Single call to ERA extensionsStatus; token stays server-side.
export const getEraExtensions = createServerFn({ method: "GET" }).handler(async () => {
  let token: string;
  try {
    token = await getToken();
  } catch (e) {
    console.error("ERA token generate failed", e);
    return { ok: false as const, error: "ERA auth failed", data: [] as EraExtension[] };
  }
  const url = new URL(`${BASE}/api/v1/register/extensionsStatus`);
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
