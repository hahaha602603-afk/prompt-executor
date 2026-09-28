import { createServerFn } from "@tanstack/react-start";

const BASE = "https://oktelecom.oktelecom.info:4435";
const ORG_ID = "5c344b71-3531-4a38-b5c9-fc883753883f";
const ORG_NAME = "oktelecom.oktelecom.info";

export type Stage = "A" | "B" | "C" | "D" | "E" | "OK";
export interface DiagStep {
  url: string;
  method: string;
  status: number | null;
  ms: number;
  kind: string;
  error: string | null;
  body: string | null;
}
export interface DiagResult {
  stage: Stage;
  message: string;
  steps: DiagStep[];
  extensions: number | null;
}

const mask = (s: string) =>
  s.replace(/("(?:token|access_token)"\s*:\s*")[^"]*"/gi, '$1***"').slice(0, 800);

function classifyError(e: unknown): { kind: string; stage: Stage } {
  const err = e as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  const txt = `${err?.name ?? ""} ${err?.message ?? ""} ${err?.cause?.code ?? ""} ${err?.cause?.message ?? ""}`;
  if (/ENOTFOUND|EAI_AGAIN|getaddrinfo|dns/i.test(txt)) return { kind: "erro de DNS", stage: "A" };
  if (/ECONNREFUSED|refused/i.test(txt)) return { kind: "conexão recusada pelo servidor remoto", stage: "B" };
  if (/Timeout|ETIMEDOUT|aborted|timed out/i.test(txt)) return { kind: "timeout", stage: "B" };
  if (/CERT|SSL|TLS|self.signed|certificate/i.test(txt)) return { kind: "erro de certificado TLS/SSL", stage: "B" };
  return { kind: `erro de conexão: ${txt.trim()}`, stage: "B" };
}

const httpKind = (s: number) =>
  ({ 400: "HTTP 400", 401: "HTTP 401", 403: "HTTP 403", 404: "HTTP 404", 429: "HTTP 429" } as Record<number, string>)[s] ??
  (s >= 500 ? `HTTP ${s} (erro do servidor)` : `HTTP ${s}`);

async function run(url: string, init: RequestInit): Promise<{ step: DiagStep; res?: Response; text?: string; stage?: Stage }> {
  const t0 = Date.now();
  const method = init.method ?? "GET";
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
    const text = await res.text().catch(() => "");
    const step: DiagStep = { url, method, status: res.status, ms: Date.now() - t0, kind: res.ok ? "OK" : httpKind(res.status), error: null, body: mask(text) };
    console.log("[ERA diag]", JSON.stringify(step));
    return { step, res, text };
  } catch (e) {
    const c = classifyError(e);
    const step: DiagStep = { url, method, status: null, ms: Date.now() - t0, kind: c.kind, error: String((e as Error)?.message ?? e), body: null };
    console.log("[ERA diag]", JSON.stringify(step));
    return { step, stage: c.stage };
  }
}

export const diagnoseEra = createServerFn({ method: "POST" }).handler(async (): Promise<DiagResult> => {
  const steps: DiagStep[] = [];
  const tokUrl = `${BASE}/api/v1/token/generate`;
  const t = await run(tokUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organization_id: ORG_ID }),
  });
  steps.push(t.step);
  if (!t.res) return { stage: t.stage!, message: `Falha na etapa ${t.stage}: ${t.step.kind} (${tokUrl})`, steps, extensions: null };
  if (!t.res.ok) return { stage: "C", message: `Falha na etapa C (geração do token): ${t.step.kind}`, steps, extensions: null };
  let token: string | undefined;
  try {
    const j = JSON.parse(t.text ?? "") as { token?: string; data?: { token?: string } };
    token = j.token ?? j.data?.token;
  } catch { /* handled below */ }
  if (!token) return { stage: "C", message: "Falha na etapa C: conexão realizada mas resposta inválida (sem token)", steps, extensions: null };

  const u = new URL(`${BASE}/api/v1/register/extensionsStatus`);
  u.searchParams.set("organization_id", ORG_ID);
  u.searchParams.set("organization_name", ORG_NAME);
  const x = await run(u.toString(), { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
  steps.push(x.step);
  if (!x.res) return { stage: "D", message: `Falha na etapa D (extensionsStatus): ${x.step.kind}`, steps, extensions: null };
  if (!x.res.ok) return { stage: "D", message: `Falha na etapa D (extensionsStatus): ${x.step.kind}`, steps, extensions: null };
  try {
    const j = JSON.parse(x.text ?? "") as { data?: unknown };
    if (!Array.isArray(j.data)) throw new Error("data não é array");
    return { stage: "OK", message: `Conexão OK: ${j.data.length} ramais recebidos`, steps, extensions: j.data.length };
  } catch (e) {
    return { stage: "E", message: `Falha na etapa E (processamento): resposta inválida — ${(e as Error).message}`, steps, extensions: null };
  }
});
