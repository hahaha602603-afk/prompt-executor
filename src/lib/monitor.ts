// Data model, API access, simulation and grouping for the monitor.

export type Status = "online" | "offline";

export interface ExtensionStatus {
  client_id: string;
  client_name: string;
  extension_id?: string;
  extension: string;
  status: Status;
  status_changed_at: string;
}

export type Kind = "extensions" | "lines";

export interface Item {
  key: string; // client_id + extension (never extension alone)
  number: string;
  status: Status;
  changedAt: number;
}

export interface Customer {
  id: string;
  name: string;
  online: Item[];
  offline: Item[];
  longestOffline: number; // ms since oldest offline change
}

// Real API URLs configured later via env; when absent a simulated feed is used.
const API_URLS: Record<Kind, string | undefined> = {
  extensions: import.meta.env.VITE_EXTENSIONS_API_URL as string | undefined,
  lines: import.meta.env.VITE_LINES_API_URL as string | undefined,
};

// ---------- Simulation ----------
const NAMES = [
  "Avocado", "Pineapple", "Banana", "Orange", "Watermelon", "Mango", "Papaya", "Kiwi",
  "Lemon", "Cherry", "Grape", "Peach", "Plum", "Coconut", "Guava", "Apricot", "Fig",
  "Lime", "Melon", "Pear", "Apple", "Blueberry", "Raspberry", "Strawberry", "Passion Fruit",
  "Acerola", "Jabuticaba", "Pitaya", "Cashew", "Tangerine", "Starfruit", "Lychee",
];

const sims: Partial<Record<Kind, ExtensionStatus[]>> = {};

function seed(kind: Kind): ExtensionStatus[] {
  const now = Date.now();
  const out: ExtensionStatus[] = [];
  NAMES.forEach((name, i) => {
    const id = String(i + 1).padStart(3, "0");
    const count = kind === "extensions" ? 4 + ((i * 7) % 26) : 1 + ((i * 3) % 4);
    const allOffline = i === 9;
    const allOnline = i % 3 === 1;
    for (let n = 0; n < count; n++) {
      const number = kind === "extensions" ? String(2001 + n) : `+55 11 3${String(100 + i).padStart(3, "0")}-${String(1000 + n * 37)}`;
      const offline = allOffline || (!allOnline && Math.random() < 0.08);
      out.push({
        client_id: id,
        client_name: name,
        extension: number,
        status: offline ? "offline" : "online",
        status_changed_at: new Date(now - Math.floor(Math.random() * 6 * 3600_000)).toISOString(),
      });
    }
  });
  return out;
}

function simulate(kind: Kind): ExtensionStatus[] {
  if (!sims[kind]) sims[kind] = seed(kind);
  const data = sims[kind]!;
  const flips = Math.random() < 0.7 ? 1 + Math.floor(Math.random() * 2) : 0;
  for (let f = 0; f < flips; f++) {
    const r = data[Math.floor(Math.random() * data.length)];
    if (!r) continue;
    // bias towards recovering so the alert panel stays readable
    if (r.status === "online" && Math.random() < 0.4) {
      r.status = "offline";
      r.status_changed_at = new Date().toISOString();
    } else if (r.status === "offline" && Math.random() < 0.5) {
      r.status = "online";
      r.status_changed_at = new Date().toISOString();
    }
  }
  return data.map((d) => ({ ...d }));
}

export const isSimulated = (kind: Kind) => !API_URLS[kind];

export async function fetchStatus(kind: Kind): Promise<ExtensionStatus[]> {
  const url = API_URLS[kind];
  if (!url) return simulate(kind);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = await res.json();
  return (Array.isArray(json) ? json : json.data ?? []) as ExtensionStatus[];
}

// ---------- Grouping ----------
export function groupByCustomer(rows: ExtensionStatus[]): Customer[] {
  const now = Date.now();
  const map = new Map<string, Customer>();
  for (const r of rows) {
    let c = map.get(r.client_id);
    if (!c) {
      c = { id: r.client_id, name: r.client_name, online: [], offline: [], longestOffline: 0 };
      map.set(r.client_id, c);
    }
    const item: Item = {
      key: `${r.client_id}:${r.extension_id ?? r.extension}`,
      number: r.extension,
      status: r.status === "offline" ? "offline" : "online",
      changedAt: new Date(r.status_changed_at).getTime(),
    };
    (item.status === "offline" ? c.offline : c.online).push(item);
  }
  for (const c of map.values()) {
    const byNum = (a: Item, b: Item) => a.number.localeCompare(b.number, undefined, { numeric: true });
    c.online.sort(byNum);
    c.offline.sort((a, b) => a.changedAt - b.changedAt);
    c.longestOffline = c.offline.length ? now - c.offline[0]!.changedAt : 0;
  }
  return [...map.values()];
}

export function formatDuration(ms: number, withSeconds = true): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return withSeconds ? `${p(h)}h ${p(m)}min ${p(sec)}s` : `${p(h)}h ${p(m)}min`;
}

export const fmt = (n: number) => n.toLocaleString("en-US");
