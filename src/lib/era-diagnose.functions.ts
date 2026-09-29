import { createServerFn } from "@tanstack/react-start";
import { ERA_ORGS, eraBase } from "./era-orgs";

export interface DiagResult {
  id: string;
  name: string;
  domain: string;
  dns: string;
  port: string;
  token: string;
  status: string;
  extensions: number | null;
  online: number | null;
  offline: number | null;
  error: string | null;
}

function classify(e: unknown): string {
  const err = e as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  const t = `${err?.name ?? ""} ${err?.message ?? ""} ${err?.cause?.code ?? ""} ${err?.cause?.message ?? ""}`;
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(t)) return "erro de DNS";
  if (/ECONNREFUSED|refused/i.test(t)) return "conexão recusada";
  if (/Timeout|ETIMEDOUT|aborted|timed out/i.test(t)) return "timeout";
  if (/CERT|SSL|TLS|certificate/i.test(t)) return "erro TLS/SSL";
  return `erro de conexão: ${t.trim()}`;
}

async function dns(domain: string): Promise<string> {
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A`, {
      headers: { Accept: "application/dns-json" }, signal: AbortSignal.timeout(5000),
    });
    const j = (await r.json()) as { Answer?: { type: number; data: string }[] };
    const ip = j.Answer?.find((a) => a.type === 1)?.data;
    return ip ? `OK (${ip})` : "FALHA (sem registro A)";
  } catch { return "FALHA"; }
}

export const diagnoseEra = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<DiagResult> => {
    const o = ERA_ORGS.find((x) => x.id === data.id);
    if (!o) throw new Error("Cliente não encontrado");
    const r: DiagResult = {
      id: o.id, name: o.name, domain: o.domain, dns: await dns(o.domain),
      port: "—", token: "—", status: "—", extensions: null, online: null, offline: null, error: null,
    };
    let res: Response;
    try {
      res = await fetch(`${eraBase(o)}/token/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ organization_id: o.organization_id }),
        signal: AbortSignal.timeout(12_000),
      });
    } catch (e) {
      r.port = `FALHA (${classify(e)})`;
      r.error = `Porta ${o.api_port}: ${classify(e)}`;
      return r;
    }
    r.port = "OK";
    const tj = (await res.json().catch(() => ({}))) as { token?: string; message?: string; data?: { token?: string } };
    const token = tj.token ?? tj.data?.token;
    if (!res.ok || !token) {
      r.token = `FALHA (HTTP ${res.status})`;
      r.error = tj.message ?? "Token não gerado";
      return r;
    }
    r.token = "OK";
    const u = new URL(`${eraBase(o)}/register/extensionsStatus`);
    u.searchParams.set("organization_id", o.organization_id);
    u.searchParams.set("organization_name", o.domain);
    try {
      const x = await fetch(u, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, signal: AbortSignal.timeout(12_000) });
      const j = (await x.json().catch(() => ({}))) as { message?: string; data?: Record<string, unknown>[] };
      if (!x.ok || !Array.isArray(j.data)) {
        r.status = `FALHA (HTTP ${x.status})`;
        r.error = j.message ?? "Resposta inválida";
        return r;
      }
      r.status = "OK";
      r.extensions = j.data.length;
      r.online = j.data.filter((e) => String(e["register"]).toLowerCase() === "true").length;
      r.offline = r.extensions - r.online;
    } catch (e) {
      r.status = `FALHA (${classify(e)})`;
      r.error = classify(e);
    }
    return r;
  });
