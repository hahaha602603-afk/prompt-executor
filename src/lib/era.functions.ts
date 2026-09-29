import { createServerFn } from "@tanstack/react-start";
import { ERA_ORGS, eraBase, type EraOrg } from "./era-orgs";

export interface EraExtension {
  client_id: string;
  client_name: string;
  extension: string;
  description: string;
  status: "online" | "offline";
}

export interface EraOrgState {
  id: string;
  name: string;
  ok: boolean;
  error: string | null;
}

// Per-organization token cache (tokens live 5 min), server-side only.
const tokens = new Map<string, { token: string; expiresAt: number }>();
// Per-organization result cache to protect the API from excessive polling.
const results = new Map<string, { at: number; state: EraOrgState; data: EraExtension[] }>();
const CACHE_MS = 20_000;
const TIMEOUT_MS = 12_000;
const CONCURRENCY = 6;

async function getToken(o: EraOrg): Promise<string> {
  const c = tokens.get(o.id);
  if (c && c.expiresAt > Date.now() + 15_000) return c.token;
  const res = await fetch(`${eraBase(o)}/token/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ organization_id: o.organization_id }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => ({}))) as {
    token?: string; expires_in?: number; data?: { token?: string; expires_in?: number };
  };
  const token = json.token ?? json.data?.token;
  if (!res.ok || !token) throw new Error(`token/generate ${res.status}`);
  const ttl = (json.expires_in ?? json.data?.expires_in ?? 300) * 1000;
  tokens.set(o.id, { token, expiresAt: Date.now() + ttl });
  return token;
}

const errMsg = (s: number) =>
  s === 401 ? "ERA auth failed" : s === 400 ? "ERA API 400" : s === 429 ? "ERA API rate limited"
    : s >= 500 ? "API indisponível" : `ERA API ${s}`;

async function fetchOrg(o: EraOrg): Promise<{ state: EraOrgState; data: EraExtension[] }> {
  const fail = (error: string) => ({ state: { id: o.id, name: o.name, ok: false, error }, data: [] });
  let token: string;
  try { token = await getToken(o); } catch (e) {
    console.error("ERA token failed", o.domain, e);
    return fail("API indisponível");
  }
  const url = new URL(`${eraBase(o)}/register/extensionsStatus`);
  url.searchParams.set("organization_id", o.organization_id);
  url.searchParams.set("organization_name", o.domain);
  const call = (t: string) => fetch(url, {
    headers: { Authorization: `Bearer ${t}`, Accept: "application/json" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  try {
    let res = await call(token);
    if (res.status === 401) {
      tokens.delete(o.id);
      try { token = await getToken(o); } catch { return fail("ERA auth failed"); }
      res = await call(token);
    }
    if (!res.ok) return fail(errMsg(res.status));
    const json = (await res.json()) as { data?: Record<string, unknown>[] };
    const data: EraExtension[] = (json.data ?? []).map((r) => ({
      client_id: o.id,
      client_name: o.name,
      extension: String(r["extension"] ?? ""),
      description: String(r["description"] ?? ""),
      status: String(r["register"]).toLowerCase() === "true" ? "online" : "offline",
    }));
    return { state: { id: o.id, name: o.name, ok: true, error: null }, data };
  } catch (e) {
    console.error("ERA fetch failed", o.domain, e);
    return fail("API indisponível");
  }
}

async function cachedOrg(o: EraOrg) {
  const c = results.get(o.id);
  if (c && Date.now() - c.at < CACHE_MS) return c;
  const r = await fetchOrg(o);
  const entry = { at: Date.now(), ...r };
  results.set(o.id, entry);
  return entry;
}

// One extensionsStatus call per organization (never per extension); failures are isolated.
export const getEraExtensions = createServerFn({ method: "GET" }).handler(async () => {
  const orgs = ERA_ORGS.filter((o) => o.active);
  const out: { state: EraOrgState; data: EraExtension[] }[] = new Array(orgs.length);
  let i = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (i < orgs.length) {
      const idx = i++;
      out[idx] = await cachedOrg(orgs[idx]!);
    }
  }));
  const orgStates = out.map((r) => r.state);
  const data = out.flatMap((r) => r.data);
  const anyOk = orgStates.some((s) => s.ok);
  return { ok: anyOk, error: anyOk ? null : "API indisponível em todos os clientes", data, orgs: orgStates };
});
