import { createServerFn } from "@tanstack/react-start";

export type StoreOfValue = {
  symbol: string;
  name: string;
  unit: string;
  price: number;
  changePct7d: number;
  spark: number[];
  updatedAt: number;
};

const SYMBOLS = [
  { yahoo: "GC=F", symbol: "XAU", name: "Gold", unit: "USD / oz" },
  { yahoo: "SI=F", symbol: "XAG", name: "Silver", unit: "USD / oz" },
  { yahoo: "CL=F", symbol: "WTI", name: "Crude Oil", unit: "USD / bbl" },
  { yahoo: "PL=F", symbol: "XPT", name: "Platinum", unit: "USD / oz" },
];

type YahooChart = {
  chart?: {
    result?: {
      meta?: { regularMarketPrice?: number };
      timestamp?: number[];
      indicators?: { quote?: { close?: (number | null)[] }[] };
    }[];
  };
};

async function fetchYahoo(symbol: string): Promise<StoreOfValue | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=7d&interval=1d`,
      {
        signal: ctrl.signal,
        headers: { "user-agent": "Mozilla/5.0 (compatible; antbit-desk/1.0)" },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as YahooChart;
    const result = data.chart?.result?.[0];
    const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter(
      (c): c is number => typeof c === "number" && Number.isFinite(c),
    );
    const price = result?.meta?.regularMarketPrice ?? closes.at(-1);
    if (!price || closes.length < 2) return null;
    const first = closes[0];
    return {
      symbol: "",
      name: "",
      unit: "",
      price,
      changePct7d: ((price - first) / first) * 100,
      spark: closes,
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Spot fallback for the metals when Yahoo is unreachable (free, no key).
async function fetchSpotFallback(symbol: "XAU" | "XAG" | "XPT"): Promise<number | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(`https://api.gold-api.com/price/${symbol}`, {
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { price?: number };
    return typeof data.price === "number" ? data.price : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

let cache: { at: number; rows: StoreOfValue[] } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000;

export const getStoresOfValue = createServerFn({ method: "GET" }).handler(
  async (): Promise<StoreOfValue[]> => {
    if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.rows;

    const rows = (
      await Promise.all(
        SYMBOLS.map(async (meta) => {
          const row = await fetchYahoo(meta.yahoo);
          if (row) return { ...row, symbol: meta.symbol, name: meta.name, unit: meta.unit };
          if (meta.symbol === "XAU" || meta.symbol === "XAG" || meta.symbol === "XPT") {
            const spot = await fetchSpotFallback(meta.symbol);
            if (spot)
              return {
                symbol: meta.symbol,
                name: meta.name,
                unit: meta.unit,
                price: spot,
                changePct7d: 0,
                spark: [] as number[],
                updatedAt: Date.now(),
              };
          }
          return null;
        }),
      )
    ).filter((r): r is StoreOfValue => r !== null);

    if (rows.length > 0) cache = { at: Date.now(), rows };
    // Only cache full Yahoo results; a fallback row means the upstream
    // hiccuped, so retry fresh on the next load instead of serving
    // chart-less rows for 10 minutes.
    if (rows.length > 0 && rows.every((r) => r.spark.length > 1)) {
      cache = { at: Date.now(), rows };
    }
    return rows;
  },
);
