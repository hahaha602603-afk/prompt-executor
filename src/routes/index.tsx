import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { diagnoseEra, type DiagResult } from "@/lib/era-diagnose.functions";
import {
  fetchStatus, fmt, formatDuration, groupByCustomer, isSimulated,
  type Customer, type ExtensionStatus, type Item, type Kind,
} from "@/lib/monitor";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lines & Extensions Monitor" },
      { name: "description", content: "Real-time monitor of customers, telephone lines and offline extensions." },
      { property: "og:title", content: "Lines & Extensions Monitor" },
      { property: "og:description", content: "See at a glance which customers have offline extensions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Monitor,
});

function EraDiagnostic() {
  const diag = useServerFn(diagnoseEra);
  const [r, setR] = useState<DiagResult | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async () => { setBusy(true); try { setR(await diag()); } finally { setBusy(false); } };
  return (
    <section className="rounded-md border border-border bg-surface p-3 font-mono text-xs">
      <div className="flex items-center gap-3">
        <button onClick={go} disabled={busy} className="rounded border border-input px-3 py-1.5 hover:border-ring">
          {busy ? "Testando…" : "Diagnóstico ERA"}
        </button>
        {r && <span className={r.stage === "OK" ? "text-online" : "text-offline"}>[{r.stage}] {r.message}</span>}
      </div>
      {r && (
        <ul className="mt-2 space-y-1 text-muted-foreground">
          {r.steps.map((s, i) => (
            <li key={i}>{s.method} {s.url} → {s.status ?? "sem resposta"} · {s.kind} · {s.ms} ms{s.error ? ` · ${s.error}` : ""}{s.body ? ` · ${s.body}` : ""}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

const POLL_MS = 10_000;
const PAGE_SIZE = 12;

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function useFeed(kind: Kind) {
  const [rows, setRows] = useState<ExtensionStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<Record<string, number>>({});
  const prev = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const data = await fetchStatus(kind);
        if (!alive) return;
        const next = new Map<string, string>();
        const fresh: string[] = [];
        for (const r of data) {
          const k = `${r.client_id}:${r.extension_id ?? r.extension}`;
          next.set(k, r.status);
          if (prev.current.size && r.status === "offline" && prev.current.get(k) !== "offline") fresh.push(r.client_id);
        }
        prev.current = next;
        if (fresh.length) {
          const t = Date.now();
          setAlerts((a) => ({ ...a, ...Object.fromEntries(fresh.map((id) => [id, t])) }));
        }
        setRows(data);
        setError(null);
        setUpdated(Date.now());
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Error");
      }
    };
    load();
    const t = setInterval(load, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, [kind]);

  return { rows, error, updated, alerts };
}

const LABEL: Record<Kind, { unit: string; units: string; Unit: string }> = {
  extensions: { unit: "extension", units: "extensions", Unit: "EXTENSIONS" },
  lines: { unit: "line", units: "lines", Unit: "LINES" },
};

function Monitor() {
  const [tab, setTab] = useState<Kind>("extensions");
  const [tv, setTv] = useState(false);

  const toggleTv = async () => {
    const on = !tv;
    setTv(on);
    try {
      if (on && !document.fullscreenElement) await document.documentElement.requestFullscreen();
      if (!on && document.fullscreenElement) await document.exitFullscreen();
    } catch { /* fullscreen not allowed (e.g. inside iframe) */ }
  };

  useEffect(() => {
    const h = () => { if (!document.fullscreenElement) setTv(false); };
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  return (
    <div className={`min-h-screen ${tv ? "tv" : ""}`}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
        <h1 className="font-mono text-sm font-bold tracking-[0.2em] text-muted-foreground">
          LINES <span className="text-foreground">&amp;</span> EXTENSIONS MONITOR
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border p-1 font-mono text-sm">
            {(["lines", "extensions"] as Kind[]).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`rounded px-4 py-1.5 font-bold tracking-widest transition-colors ${
                  tab === k ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                [ {LABEL[k].Unit} ]
              </button>
            ))}
          </div>
          <button
            onClick={toggleTv}
            className={`rounded-md border px-3 py-2 font-mono text-xs font-bold tracking-widest transition-colors ${
              tv ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            🖥️ TV MODE
          </button>
        </div>
      </header>
      <Dashboard key={tab} kind={tab} tv={tv} />
    </div>
  );
}

type LeftSort = "az" | "za" | "most" | "fewest";
type RightSort = "most" | "fewest" | "longest" | "shortest" | "az" | "za";

function Dashboard({ kind, tv }: { kind: Kind; tv: boolean }) {
  const { rows, error, updated, alerts } = useFeed(kind);
  const now = useNow();
  const L = LABEL[kind];
  const customers = useMemo(() => groupByCustomer(rows), [rows]);

  const [query, setQuery] = useState("");
  const [leftSort, setLeftSort] = useState<LeftSort>("az");
  const [rightSort, setRightSort] = useState<RightSort>("most");
  const [leftOpen, setLeftOpen] = useState<string | null>(null);
  const [rightOpen, setRightOpen] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const q = query.trim().toLowerCase();
  const matches = (c: Customer) =>
    !q || c.name.toLowerCase().includes(q) || [...c.online, ...c.offline].some((i) => i.number.toLowerCase().includes(q));
  const matchingItems = (c: Customer) =>
    q && !c.name.toLowerCase().includes(q)
      ? [...c.offline, ...c.online].filter((i) => i.number.toLowerCase().includes(q))
      : null;

  const byName = (a: Customer, b: Customer) => a.name.localeCompare(b.name);
  const left = useMemo(() => {
    const list = customers.filter(matches);
    const s: Record<LeftSort, (a: Customer, b: Customer) => number> = {
      az: byName, za: (a, b) => byName(b, a),
      most: (a, b) => b.online.length - a.online.length || byName(a, b),
      fewest: (a, b) => a.online.length - b.online.length || byName(a, b),
    };
    return list.sort(s[leftSort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, q, leftSort]);

  const right = useMemo(() => {
    const list = customers.filter((c) => c.offline.length > 0 && matches(c));
    const s: Record<RightSort, (a: Customer, b: Customer) => number> = {
      most: (a, b) => b.offline.length - a.offline.length || byName(a, b),
      fewest: (a, b) => a.offline.length - b.offline.length || byName(a, b),
      longest: (a, b) => b.longestOffline - a.longestOffline,
      shortest: (a, b) => a.longestOffline - b.longestOffline,
      az: byName, za: (a, b) => byName(b, a),
    };
    return list.sort(s[rightSort]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, q, rightSort]);

  const pages = Math.max(1, Math.ceil(left.length / PAGE_SIZE));
  const cur = Math.min(page, pages);
  const leftPage = tv ? left : left.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  const onlineTotal = customers.reduce((n, c) => n + c.online.length, 0);
  const offlineTotal = customers.reduce((n, c) => n + c.offline.length, 0);
  const withOffline = customers.filter((c) => c.offline.length).length;

  return (
    <main className="space-y-4 p-4 md:p-6">
      {/* Top summary */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label={`ONLINE ${L.Unit}`} value={onlineTotal} icon="🟢" tone="online" />
        <Stat label={`OFFLINE ${L.Unit}`} value={offlineTotal} icon="🔴" tone={offlineTotal ? "offline" : "neutral"} />
        <Stat label={`TOTAL ${L.Unit}`} value={onlineTotal + offlineTotal} icon="☎" tone="neutral" />
        <Stat label="CUSTOMERS" value={customers.length} icon="👥" tone="neutral" />
        <Stat label={`CUSTOMERS WITH OFFLINE ${L.Unit}`} value={withOffline} icon="⚠" tone={withOffline ? "warn" : "neutral"} />
      </section>

      {!tv && (
        <section className="flex flex-wrap items-center gap-3">
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder={`🔎 Search customer or ${L.unit}`}
            className="min-w-64 flex-1 rounded-md border border-input bg-surface px-4 py-2.5 text-sm outline-none focus:border-ring"
          />
          <span className="font-mono text-xs text-muted-foreground">
            {error ? <span className="text-offline">API error: {error}</span> : updated ? `Updated ${new Date(updated).toLocaleTimeString()}` : "Loading…"}
            {isSimulated(kind) && " · simulated data"}
            <span className="ml-2 inline-block h-2 w-2 animate-dot rounded-full bg-online align-middle" />
          </span>
        </section>
      )}
      {!tv && kind === "extensions" && <EraDiagnostic />}

      <section className="grid gap-4 md:grid-cols-2">
        {/* LEFT — customer browsing panel */}
        <Panel
          title={`🟢 CUSTOMERS`}
          tone="online"
          control={!tv && (
            <SortSelect value={leftSort} onChange={(v) => setLeftSort(v as LeftSort)} options={[
              ["az", "Customer name A-Z"], ["za", "Customer name Z-A"],
              ["most", `Most online ${L.units}`], ["fewest", `Fewest online ${L.units}`],
            ]} />
          )}
        >
          {leftPage.length === 0 && <Empty text={rows.length ? "No customers match your search." : "Loading customers…"} />}
          {leftPage.map((c) => (
            <Row
              key={c.id}
              open={leftOpen === c.id}
              onToggle={() => setLeftOpen(leftOpen === c.id ? null : c.id)}
              dot="online"
              name={c.name}
              badge={<span className="font-mono text-xs text-muted-foreground">{c.online.length} online</span>}
            >
              {matchingItems(c) ? (
                <ItemList title="SEARCH RESULTS" items={matchingItems(c)!} now={now} unit={L.unit} />
              ) : c.online.length ? (
                <ItemList title={`🟢 ONLINE ${L.Unit}`} items={c.online} now={now} unit={L.unit} footer={`Total online: ${c.online.length}`} />
              ) : (
                <p className="px-4 py-3 text-sm text-muted-foreground">No online {L.units}.</p>
              )}
            </Row>
          ))}
          {!tv && pages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 font-mono text-xs text-muted-foreground">
              <button disabled={cur <= 1} onClick={() => setPage(cur - 1)} className="rounded px-2 py-1 hover:text-foreground disabled:opacity-30">‹ Prev</button>
              <span>Page {cur} of {pages}</span>
              <button disabled={cur >= pages} onClick={() => setPage(cur + 1)} className="rounded px-2 py-1 hover:text-foreground disabled:opacity-30">Next ›</button>
            </div>
          )}
        </Panel>

        {/* RIGHT — alert panel */}
        <Panel
          title={`🔴 CUSTOMERS WITH OFFLINE ${L.Unit}`}
          tone="offline"
          control={!tv && (
            <SortSelect value={rightSort} onChange={(v) => setRightSort(v as RightSort)} options={[
              ["most", `Most offline ${L.units}`], ["fewest", `Fewest offline ${L.units}`],
              ["longest", "Longest offline duration"], ["shortest", "Shortest offline duration"],
              ["az", "Customer name A-Z"], ["za", "Customer name Z-A"],
            ]} />
          )}
        >
          {right.length === 0 && (
            <Empty text={rows.length ? `No customers currently have offline ${L.units}.` : "Loading…"} good={rows.length > 0} />
          )}
          {right.map((c) => {
            const fresh = alerts[c.id] !== undefined && now - alerts[c.id]! < 5000;
            return (
              <Row
                key={c.id}
                open={rightOpen === c.id}
                onToggle={() => setRightOpen(rightOpen === c.id ? null : c.id)}
                dot="offline"
                name={c.name}
                alert
                flash={!!fresh}
                badge={<span className="font-mono text-sm font-bold text-offline">{c.offline.length} OFFLINE</span>}
              >
                <ItemList title={`🔴 OFFLINE ${L.Unit}`} items={c.offline} now={now} unit={L.unit} footer={`Total offline: ${c.offline.length}`} />
              </Row>
            );
          })}
        </Panel>
      </section>
    </main>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: number; icon: string; tone: "online" | "offline" | "warn" | "neutral" }) {
  const color = { online: "text-online", offline: "text-offline", warn: "text-warn", neutral: "text-foreground" }[tone];
  return (
    <div className={`rounded-lg border bg-card px-4 py-3 ${tone === "offline" ? "border-offline/50" : "border-border"}`}>
      <div className="font-mono text-[0.65em] font-bold tracking-widest text-muted-foreground md:text-[0.7em]">{icon} {label}</div>
      <div className={`mt-1 font-mono text-[1.9em] font-bold leading-none tabular-nums ${color}`}>{fmt(value)}</div>
    </div>
  );
}

function Panel({ title, tone, control, children }: { title: string; tone: "online" | "offline"; control?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className={`overflow-hidden rounded-xl border bg-surface ${tone === "offline" ? "border-offline/40" : "border-border"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className={`font-mono text-[0.85em] font-bold tracking-widest ${tone === "offline" ? "text-offline" : "text-online"}`}>{title}</h2>
        {control}
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function SortSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      Sort by:
      <select value={value} onChange={(e) => onChange(e.target.value)} className="rounded-md border border-input bg-card px-2 py-1.5 text-xs text-foreground outline-none">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function Row({ open, onToggle, dot, name, badge, alert, flash, children }: {
  open: boolean; onToggle: () => void; dot: "online" | "offline"; name: string;
  badge?: React.ReactNode; alert?: boolean; flash?: boolean; children: React.ReactNode;
}) {
  return (
    <div className={alert ? "bg-offline-soft" : ""}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60 ${flash ? "animate-alert" : ""}`}
      >
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot === "online" ? "bg-online" : "bg-offline"} ${alert ? "animate-dot" : ""}`} />
        <span className="flex-1 truncate text-[1.05em] font-semibold uppercase tracking-wide">{name}</span>
        {badge}
        <span className="w-4 text-center text-muted-foreground">{open ? "▼" : "›"}</span>
      </button>
      <div className={`accordion-body ${open ? "accordion-open" : ""}`}>
        <div className="overflow-hidden">
          {open && <div className="mx-4 mb-3 rounded-lg border border-border bg-card">{children}</div>}
        </div>
      </div>
    </div>
  );
}

function ItemList({ title, items, now, unit, footer }: { title: string; items: Item[]; now: number; unit: string; footer?: string }) {
  return (
    <div>
      <div className="border-b border-border px-4 py-2 font-mono text-[0.7em] font-bold tracking-widest text-muted-foreground">
        {title} <span className="opacity-60">· {unit.toUpperCase()}</span>
      </div>
      <ul className="max-h-80 overflow-y-auto font-mono text-[0.9em]">
        {items.map((i) => (
          <li key={i.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-1.5">
            <span className="font-bold">{i.number}</span>
            <span className={`text-xs font-bold ${i.status === "online" ? "text-online" : "text-offline"}`}>
              {i.status === "online" ? "🟢 ONLINE" : "🔴 OFFLINE"}
            </span>
            <span className="tabular-nums text-muted-foreground">{formatDuration(now - i.changedAt)}</span>
          </li>
        ))}
      </ul>
      {footer && <div className="border-t border-border px-4 py-2 font-mono text-xs text-muted-foreground">{footer}</div>}
    </div>
  );
}

function Empty({ text, good }: { text: string; good?: boolean }) {
  return <p className={`px-4 py-8 text-center text-sm ${good ? "text-online" : "text-muted-foreground"}`}>{text}</p>;
}
