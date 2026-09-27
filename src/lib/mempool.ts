// Live block and mempool data from the public mempool.space API (no key needed).
// All calls are client-side; the API sends `access-control-allow-origin: *`.

export type RecentBlock = {
  hash: string;
  height: number;
  timestamp: number; // seconds since epoch
  txCount: number;
  size: number; // bytes
  weight: number;
};

export type BlockTx = {
  txid: string;
  fee: number; // sats
  vsize: number; // vbytes
  feeRate: number; // sats/vbyte
  isCoinbase: boolean;
};

export type CoinbaseInfo = {
  poolTag: string;
  poolName: string;
  rewardSats: number; // total coinbase output = subsidy + fees
};

export type ProjectedBlock = {
  blockVSize: number;
  nTx: number;
  totalFees: number; // sats
  feeRange: number[]; // sats/vbyte, ascending
};

export type MempoolStats = {
  count: number;
  vsize: number;
  totalFee: number; // sats
  feeHistogram: Array<[number, number]>; // [feeRate sats/vbyte, vsize]
};

export type RecentMempoolTx = {
  txid: string;
  fee: number;
  vsize: number;
  value: number;
};

const API = "https://mempool.space/api";
const SATS = 100_000_000;

async function fetchJson<T>(url: string, timeoutMs = 12_000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

type ApiBlock = {
  id: string;
  height: number;
  timestamp: number;
  tx_count: number;
  size: number;
  weight: number;
};

export async function fetchRecentBlocks(limit = 6): Promise<RecentBlock[]> {
  const blocks = await fetchJson<ApiBlock[]>(`${API}/blocks`);
  return blocks.slice(0, limit).map((b) => ({
    hash: b.id,
    height: b.height,
    timestamp: b.timestamp,
    txCount: b.tx_count,
    size: b.size,
    weight: b.weight,
  }));
}

type ApiTx = {
  txid: string;
  fee?: number;
  weight?: number;
  vsize?: number;
  vin: Array<{
    is_coinbase?: boolean;
    scriptsig?: string;
    coinbase?: string;
  }>;
  vout: Array<{ value?: number }>;
};

function toBlockTx(t: ApiTx): BlockTx {
  const vsize = t.vsize ?? Math.ceil((t.weight ?? 0) / 4);
  const fee = t.fee ?? 0;
  return {
    txid: t.txid,
    fee,
    vsize,
    feeRate: vsize > 0 ? fee / vsize : 0,
    isCoinbase: t.vin?.[0]?.is_coinbase === true,
  };
}

/**
 * Fetch up to maxTxs transactions for a block, in block order (highest fee
 * rate first). Returns the parsed transactions plus coinbase info (pool tag
 * and total reward), which the block endpoints no longer expose.
 */
export async function fetchBlockTxs(
  hash: string,
  maxTxs = 100,
): Promise<{ txs: BlockTx[]; coinbase: CoinbaseInfo | null }> {
  const PAGE = 25;
  const pages = Math.ceil(maxTxs / PAGE);
  const txs: BlockTx[] = [];
  let coinbase: CoinbaseInfo | null = null;

  for (let page = 0; page < pages; page++) {
    const batch = await fetchJson<ApiTx[]>(`${API}/block/${hash}/txs?start_index=${page * PAGE}`);
    if (page === 0 && batch.length > 0) {
      const cb = batch[0];
      if (cb?.vin?.[0]?.is_coinbase) {
        const hex = cb.vin[0].scriptsig || cb.vin[0].coinbase || "";
        const tag = decodePoolTag(hex);
        coinbase = {
          poolTag: tag,
          poolName: identifyPool(tag),
          rewardSats: cb.vout.reduce((sum, o) => sum + (o.value ?? 0), 0),
        };
      }
    }
    for (const t of batch) {
      if (txs.length >= maxTxs) break;
      txs.push(toBlockTx(t));
    }
    if (batch.length < PAGE) break;
  }
  return { txs, coinbase };
}

/** Decode printable ASCII runs from a coinbase scriptsig hex string. */
export function decodePoolTag(hex: string): string {
  if (!hex || hex.length % 2 !== 0) return "";
  try {
    const bytes = new Uint8Array(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
    const runs: string[] = [];
    let current = "";
    for (const byte of bytes) {
      if (byte >= 32 && byte < 127) {
        current += String.fromCharCode(byte);
      } else {
        if (current.length >= 3) runs.push(current);
        current = "";
      }
    }
    if (current.length >= 3) runs.push(current);
    return runs.join(" ").slice(0, 120);
  } catch {
    return "";
  }
}

const POOL_PATTERNS: Array<[RegExp, string]> = [
  [/foundry/i, "Foundry USA"],
  [/antpool/i, "AntPool"],
  [/f2pool/i, "F2Pool"],
  [/viabtc/i, "ViaBTC"],
  [/mara/i, "MARA Pool"],
  [/luxor/i, "Luxor"],
  [/spider\s?pool/i, "SpiderPool"],
  [/binance/i, "Binance Pool"],
  [/btc\.?com/i, "BTC.com"],
  [/poolin/i, "Poolin"],
  [/emcd/i, "EMCD"],
  [/sbi/i, "SBI Crypto"],
  [/ultimus/i, "UltimusPool"],
  [/titan/i, "Titan"],
  [/secpool/i, "SecPool"],
  [/braiins|slush/i, "Braiins"],
  [/\bocean\b/i, "Ocean"],
  [/kano/i, "KanoPool"],
  [/solo ck|ckpool/i, "Solo CK"],
  [/kucoin/i, "KuCoin Pool"],
  [/okex|\bokx\b/i, "OKX Pool"],
];

/** Map a raw coinbase tag to a human pool name; falls back to the raw tag. */
export function identifyPool(tag: string): string {
  for (const [pattern, name] of POOL_PATTERNS) {
    if (pattern.test(tag)) return name;
  }
  const cleaned = tag.replace(/[^\x20-\x7e]/g, "").trim();
  return cleaned || "Unknown";
}

/** Block subsidy in sats for a height (halvings every 210,000 blocks). */
export function blockSubsidySats(height: number): number {
  const halvings = Math.floor(height / 210_000);
  if (halvings >= 33) return 0;
  return Math.floor((50 * SATS) / 2 ** halvings);
}

export async function fetchProjectedBlocks(): Promise<ProjectedBlock[]> {
  const blocks = await fetchJson<ProjectedBlock[]>(`${API}/v1/fees/mempool-blocks`);
  return blocks;
}

export async function fetchMempoolStats(): Promise<MempoolStats> {
  // Note: this endpoint uses snake_case keys.
  const raw = await fetchJson<{
    count: number;
    vsize: number;
    total_fee: number;
    fee_histogram: Array<[number, number]>;
  }>(`${API}/mempool`);
  return {
    count: raw.count ?? 0,
    vsize: raw.vsize ?? 0,
    totalFee: raw.total_fee ?? 0,
    feeHistogram: raw.fee_histogram ?? [],
  };
}

export async function fetchRecentMempoolTxs(): Promise<RecentMempoolTx[]> {
  return fetchJson<RecentMempoolTx[]>(`${API}/mempool/recent`);
}

// ---------------------------------------------------------------------------
// Squarified treemap: turns transaction sizes into rectangles whose areas are
// proportional to each transaction's vsize — the "little blocks" mosaic.
// ---------------------------------------------------------------------------

export type TreemapRect = { x: number; y: number; w: number; h: number };

export function squarify(
  values: number[],
  x: number,
  y: number,
  w: number,
  h: number,
): TreemapRect[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0 || values.length === 0) return [];
  const scale = (w * h) / total;
  const items = values.map((v, i) => ({ v: Math.max(v * scale, 0.0001), i }));
  // Largest first packs more cleanly.
  items.sort((a, b) => b.v - a.v);

  const rects: TreemapRect[] = new Array(values.length);
  let row: typeof items = [];
  let rowX = x;
  let rowY = y;
  let rowW = w;
  let rowH = h;

  const worst = (r: typeof items, side: number) => {
    if (r.length === 0) return Infinity;
    const sum = r.reduce((a, b) => a + b.v, 0);
    const max = Math.max(...r.map((d) => d.v));
    const min = Math.min(...r.map((d) => d.v));
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
  };

  const layoutRow = () => {
    const sum = row.reduce((a, b) => a + b.v, 0);
    const horizontal = rowW >= rowH;
    if (horizontal) {
      const rowHNow = sum / rowW;
      let cx = rowX;
      for (const d of row) {
        const ww = d.v / rowHNow;
        rects[d.i] = { x: cx, y: rowY, w: ww, h: rowHNow };
        cx += ww;
      }
      rowY += rowHNow;
      rowH -= rowHNow;
    } else {
      const colWNow = sum / rowH;
      let cy = rowY;
      for (const d of row) {
        const hh = d.v / colWNow;
        rects[d.i] = { x: rowX, y: cy, w: colWNow, h: hh };
        cy += hh;
      }
      rowX += colWNow;
      rowW -= colWNow;
    }
    row = [];
  };

  for (const d of items) {
    const side = Math.min(rowW, rowH);
    const before = worst(row, side);
    const after = worst([...row, d], side);
    if (row.length > 0 && after > before) layoutRow();
    row.push(d);
  }
  if (row.length > 0) layoutRow();
  return rects;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatBtcFromSats(sats: number, digits = 4): string {
  return `${(sats / SATS).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} BTC`;
}

export function formatSizeMb(bytes: number): string {
  return `${(bytes / 1_000_000).toFixed(2)} MB`;
}

export function formatMinedAgo(timestampSec: number, nowMs = Date.now()): string {
  const mins = Math.max(0, Math.round((nowMs - timestampSec * 1000) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h ago`;
}

export function formatClock(timestampSec: number): string {
  return new Date(timestampSec * 1000).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
