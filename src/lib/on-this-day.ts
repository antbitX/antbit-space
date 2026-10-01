import { createServerFn } from "@tanstack/react-start";
import { BITCOIN_HISTORY, type HistoryEvent } from "@/data/bitcoin-history";

export type PriceRow = {
  year: number;
  price: number;
  /** Percent change from that year's price to the current price. */
  changePct: number;
};

export type OnThisDay = {
  month: number;
  day: number;
  monthName: string;
  currentPrice: number;
  prices: PriceRow[];
  event: (HistoryEvent & { exact: boolean; price: number | null }) | null;
  updatedAt: number;
};

type YahooChart = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      meta?: { regularMarketPrice?: number };
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
    error?: unknown;
  };
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Module-level cache keyed by month-day: price history barely changes intraday. */
let cache: { key: string; at: number; prices: Map<number, number>; current: number } | null =
  null;
const CACHE_TTL_MS = 6 * 3600_000;

function nyToday(): { year: number; month: number; day: number } {
  const ny = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
  );
  return {
    year: ny.getFullYear(),
    month: ny.getMonth() + 1,
    day: ny.getDate(),
  };
}

type BlockchainChart = {
  status?: string;
  values?: Array<{ x?: number; y?: number }>;
};

async function fetchJson<T>(url: string): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "user-agent": "Mozilla/5.0 (compatible; antbit-desk/1.0)" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Daily closes for a ~3-week window around month/day in a given year. */
async function fetchWindow(
  year: number,
  month: number,
  day: number,
): Promise<Map<string, number> | null> {
  const start = Math.floor(Date.UTC(year, month - 1, day - 10) / 1000);
  const end = Math.floor(Date.UTC(year, month - 1, day + 10) / 1000);
  const data = await fetchJson<YahooChart>(
    `https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?period1=${start}&period2=${end}&interval=1d`,
  );
  const result = data?.chart?.result?.[0];
  const stamps = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  if (stamps.length < 5) return null;
  const map = new Map<string, number>();
  for (let i = 0; i < stamps.length; i++) {
    const c = closes[i];
    if (typeof c !== "number" || !Number.isFinite(c)) continue;
    const d = new Date(stamps[i] * 1000);
    map.set(
      `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
      c,
    );
  }
  return map;
}

async function fetchCurrentPrice(): Promise<number | null> {
  const data = await fetchJson<YahooChart>(
    "https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?range=1d&interval=1d",
  );
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  return typeof price === "number" && Number.isFinite(price) ? price : null;
}

/** Deterministic daily PRNG (mulberry32) seeded from a string. */
function seededRandom(seed: string): () => number {
  let h = 2166130251;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Five distinct random past years, stable for the whole day, reshuffled daily.
 * Pool starts at 2011 — the first full year with reliable daily price data.
 */
function pickRandomYears(
  todayYear: number,
  month: number,
  day: number,
  count = 5,
): number[] {
  const pool: number[] = [];
  for (let y = 2011; y < todayYear; y++) pool.push(y);
  const rand = seededRandom(`${todayYear}-${month}-${day}`);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).sort((a, b) => b - a);
}

/** Historical prices never change: cache per date indefinitely. */
const historicalPriceCache = new Map<string, number | null>();

/**
 * BTC close on month/day of an arbitrary past year.
 * Yahoo covers Sep 2014 onward; blockchain.info's market-price chart covers earlier.
 */
async function fetchHistoricalPrice(
  year: number,
  month: number,
  day: number,
): Promise<number | null> {
  const key = `${year}-${pad(month)}-${pad(day)}`;
  if (historicalPriceCache.has(key)) return historicalPriceCache.get(key) ?? null;

  let price: number | null = null;
  const yahoo = await fetchWindow(year, month, day);
  if (yahoo) price = closeNear(yahoo, year, month, day);

  if (price == null) {
    const target = Date.UTC(year, month - 1, day);
    const fmtDay = (t: number) => {
      const d = new Date(t);
      return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    };
    const data = await fetchJson<BlockchainChart>(
      `https://api.blockchain.info/charts/market-price?start=${fmtDay(target - 4 * 86400_000)}&end=${fmtDay(target + 4 * 86400_000)}&format=json`,
    );
    let best: number | null = null;
    let bestDist = Infinity;
    for (const v of data?.values ?? []) {
      if (typeof v.x !== "number" || typeof v.y !== "number" || !Number.isFinite(v.y)) continue;
      const dist = Math.abs(v.x * 1000 - target);
      if (dist < bestDist) {
        bestDist = dist;
        best = v.y;
      }
    }
    price = best;
  }

  historicalPriceCache.set(key, price);
  return price;
}

/** BTC close on month/day for five random past years + current price. */
async function fetchPriceHistory(
  year: number,
  month: number,
  day: number,
): Promise<{ prices: Map<number, number>; current: number } | null> {
  const key = `${month}-${day}`;
  if (cache && cache.key === key && Date.now() - cache.at < CACHE_TTL_MS) {
    return { prices: cache.prices, current: cache.current };
  }
  const years = pickRandomYears(year, month, day);
  const [results, current] = await Promise.all([
    Promise.all(years.map((y) => fetchHistoricalPrice(y, month, day))),
    fetchCurrentPrice(),
  ]);
  if (current == null) return cache ? { prices: cache.prices, current: cache.current } : null;
  const prices = new Map<number, number>();
  years.forEach((y, i) => {
    if (results[i] != null) prices.set(y, results[i] as number);
  });
  if (prices.size < 2) return cache ? { prices: cache.prices, current: cache.current } : null;
  cache = { key, at: Date.now(), prices, current };
  return { prices, current };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Find the close for a date, tolerating a few missing days. */
function closeNear(
  closes: Map<string, number>,
  year: number,
  month: number,
  day: number,
): number | null {
  for (const off of [0, -1, 1, -2, 2, -3, 3, -4, 4]) {
    const d = new Date(Date.UTC(year, month - 1, day + off));
    const key = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
    const v = closes.get(key);
    if (v != null) return v;
  }
  return null;
}

function dayOfYear(month: number, day: number): number {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let n = day;
  for (let m = 1; m < month; m++) n += days[m - 1];
  return n;
}

function pickEvent(month: number, day: number): (HistoryEvent & { exact: boolean }) | null {
  if (BITCOIN_HISTORY.length === 0) return null;
  const exact = BITCOIN_HISTORY.filter((e) => e.month === month && e.day === day);
  if (exact.length > 0) {
    const chosen = [...exact].sort((a, b) => b.year - a.year)[0];
    return { ...chosen, exact: true };
  }
  // Fallback: nearest event on the calendar (wraps around year end).
  const target = dayOfYear(month, day);
  let best: HistoryEvent | null = null;
  let bestDist = Infinity;
  for (const e of BITCOIN_HISTORY) {
    const d = dayOfYear(e.month, e.day);
    const dist = Math.min(
      Math.abs(d - target),
      366 - Math.abs(d - target),
    );
    if (dist < bestDist) {
      bestDist = dist;
      best = e;
    }
  }
  return best ? { ...best, exact: false } : null;
}

/** BTC price on an event's exact date (shared cache with the year rows). */
async function fetchEventPrice(e: HistoryEvent): Promise<number | null> {
  return fetchHistoricalPrice(e.year, e.month, e.day);
}

export const getOnThisDay = createServerFn({ method: "GET" }).handler(
  async (): Promise<OnThisDay | null> => {
    const { year, month, day } = nyToday();
    const hist = await fetchPriceHistory(year, month, day);
    if (!hist) return null;
    const prices: PriceRow[] = [];
    for (const [y, price] of hist.prices) {
      prices.push({
        year: y,
        price,
        changePct: ((hist.current - price) / price) * 100,
      });
    }
    prices.sort((a, b) => b.year - a.year);
    if (prices.length < 2) return null;
    const picked = pickEvent(month, day);
    const event = picked ? { ...picked, price: await fetchEventPrice(picked) } : null;
    return {
      month,
      day,
      monthName: MONTHS[month - 1],
      currentPrice: hist.current,
      prices,
      event,
      updatedAt: Date.now(),
    };
  },
);
