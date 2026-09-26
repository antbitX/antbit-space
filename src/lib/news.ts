import { createServerFn } from "@tanstack/react-start";

export type Headline = {
  id: string;
  title: string;
  url: string;
  source: string;
  summary: string;
  publishedAt: number;
};

export type NewsSection = {
  category: string;
  blurb: string;
  headlines: Headline[];
};

const CATEGORY_FEEDS: { category: string; blurb: string; feeds: { source: string; url: string }[] }[] = [
  {
    category: "Bitcoin",
    blurb: "Bitcoin-only community desks. No CoinDesk. No ETF desks.",
    feeds: [
      { source: "Bitcoin Optech", url: "https://bitcoinops.org/feed.xml" },
      { source: "Stacker News", url: "https://stacker.news/~bitcoin/rss" },
      { source: "The Rage", url: "https://www.therage.co/rss/" },
      { source: "TFTC", url: "https://www.tftc.io/rss.xml" },
      { source: "The Bitcoin Manual", url: "https://thebitcoinmanual.com/feed/" },
      { source: "Jameson Lopp", url: "https://blog.lopp.net/rss/" },
      { source: "Delving Bitcoin", url: "https://delvingbitcoin.org/latest.rss" },
      { source: "Bitcoin Core", url: "https://bitcoincore.org/en/rss.xml" },
    ],
  },
  {
    category: "US Economics",
    blurb: "Policy and data from the Fed and the St. Louis Fed.",
    feeds: [
      { source: "Federal Reserve", url: "https://www.federalreserve.gov/feeds/press_all.xml" },
      { source: "FRED Blog", url: "https://fredblog.stlouisfed.org/feed/" },
    ],
  },
  {
    category: "Global Economics",
    blurb: "Central banks and development news beyond the US.",
    feeds: [
      { source: "Bank of England", url: "https://www.bankofengland.co.uk/rss/news" },
      { source: "UN News", url: "https://news.un.org/feed/subscribe/en/news/topic/economic-development/feed/rss.xml" },
    ],
  },
  {
    category: "AI related news",
    blurb: "Artificial intelligence, from lab to market.",
    feeds: [
      { source: "MIT Technology Review", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/" },
      { source: "The Decoder", url: "https://www.the-decoder.com/feed/" },
    ],
  },
];

const PER_CATEGORY = 8;
const CUTOFF_DAYS = 120;
// How many items each feed contributes to the ranking pool (more than we show,
// so the ranker has real choices).
const PER_FEED_POOL = 12;

// ---------------------------------------------------------------------------
// Relevance ranking: surface substantive, desk-relevant stories and push
// clickbait down. Scores are heuristic and documented here so the trade-offs
// stay visible: substance keywords and trusted primary sources rank up;
// listicle/curiosity-gap patterns, shouting, and hype punctuation rank down.
// Freshness still gets a nudge, and recency breaks ties.
// ---------------------------------------------------------------------------

const CLICKBAIT_PATTERNS: RegExp[] = [
  /\byou won'?t believe\b/i,
  /\bshocking\b/i,
  /\bmind[- ]blowing\b/i,
  /\bthis is why\b/i,
  /\bwhat happens next\b/i,
  /\bthe truth about\b/i,
  /\bnobody (is|was) talking about\b/i,
  /\beveryone is (wrong|missing)\b/i,
  /\b\d+\s+(reasons|ways|things|secrets|tricks|lessons)\b/i,
  /\bgone (wrong|viral)\b/i,
  /\bdo this (now|before)\b/i,
  /\blast chance\b/i,
];

const SUBSTANCE_KEYWORDS: Record<string, string[]> = {
  Bitcoin: [
    "etf", "hashrate", "halving", "lightning", "taproot", "mempool",
    "difficulty", "mining", "custody", "treasury", "adoption", "protocol",
    "upgrade", "ordinals", "ecash",
  ],
  "US Economics": [
    "fed", "fomc", "powell", "cpi", "inflation", "gdp", "unemployment",
    "rate cut", "rate hike", "payrolls", "pce", "deficit", "treasury",
  ],
  "Global Economics": [
    "ecb", "bank of england", "bank of japan", "imf", "world bank",
    "inflation", "gdp", "tariff", "trade", "central bank", "recession",
  ],
  "AI related news": [
    "model", "llm", "openai", "anthropic", "deepmind", "nvidia", "chip",
    "agent", "reasoning", "benchmark", "open source", "transformer",
  ],
};

// Primary/official sources: factual by construction, worth a small boost.
const TRUSTED_SOURCES = new Set([
  "Federal Reserve",
  "FRED Blog",
  "Bank of England",
  "Bitcoin Core",
  "Bitcoin Optech",
  "Delving Bitcoin",
  "MIT Technology Review",
]);

/** Exported for testing/tuning the ranking heuristics. */
export function scoreHeadline(item: Headline, category: string): number {
  const title = item.title;
  const text = `${title} ${item.summary}`.toLowerCase();
  let score = 0;

  // Substance: concrete topics the desk cares about (capped so one
  // keyword-stuffed headline can't run away with it).
  const keywords = SUBSTANCE_KEYWORDS[category] ?? [];
  let hits = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) {
      hits++;
      if (hits >= 5) break;
    }
  }
  score += hits * 2;

  if (TRUSTED_SOURCES.has(item.source)) score += 2;

  // Clickbait patterns get pushed down hard.
  for (const pattern of CLICKBAIT_PATTERNS) {
    if (pattern.test(title)) score -= 4;
  }

  // Shouting, hype punctuation, and question-bait headlines.
  const words = title.split(/\s+/).filter(Boolean);
  const shouty = words.filter((w) => w.length > 3 && w === w.toUpperCase()).length;
  if (words.length > 0 && shouty / words.length > 0.4) score -= 3;
  const bangs = (title.match(/!/g) ?? []).length;
  if (bangs > 1) score -= 2;
  if (title.trim().endsWith("?")) score -= 1;

  // Freshness nudge; recency breaks ties in the final sort.
  const ageHours = (Date.now() - item.publishedAt) / 3_600_000;
  if (ageHours < 24) score += 2;
  else if (ageHours < 72) score += 1;

  return score;
}

function rankHeadlines(category: string, headlines: Headline[]): Headline[] {
  const seen = new Set<string>();
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * CUTOFF_DAYS;
  const scored = headlines
    .filter((item) => item.publishedAt >= cutoff)
    .filter((item) => {
      const key = item.title.toLowerCase();
      if (seen.has(item.id) || seen.has(key)) return false;
      seen.add(item.id);
      seen.add(key);
      return true;
    })
    .map((item) => ({ item, score: scoreHeadline(item, category) }));
  scored.sort((a, b) => b.score - a.score || b.item.publishedAt - a.item.publishedAt);
  return scored.slice(0, PER_CATEGORY).map((s) => s.item);
}

function decode(value: string): string {
  let out = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  // Repeat until stable so double-encoded entities (e.g. &amp;apos;) fully decode.
  for (let pass = 0; pass < 3; pass++) {
    const next = out
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;|&#39;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
      .replace(/&amp;/g, "&");
    if (next === out) break;
    out = next;
  }
  return out
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string): string {
  return decode(block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"))?.[1] ?? "");
}

function attr(block: string, name: string, attrName: string): string {
  return (
    block.match(new RegExp(`<${name}[^>]+${attrName}="([^"]+)"`, "i"))?.[1] ??
    block.match(new RegExp(`<${name}[^>]+${attrName}='([^']+)'`, "i"))?.[1] ??
    ""
  );
}

function parseDate(value: string): number {
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? ts : 0;
}

function parseFeed(xml: string, source: string): Headline[] {
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  const headlines: Headline[] = [];
  for (const block of blocks.slice(0, PER_FEED_POOL)) {
    const title = tag(block, "title");
    const link =
      tag(block, "link") ||
      attr(block, "link", "href") ||
      tag(block, "id");
    const guid = tag(block, "guid") || tag(block, "id") || link;
    const summary = tag(block, "description") || tag(block, "summary") || tag(block, "content");
    const published =
      tag(block, "pubDate") ||
      tag(block, "published") ||
      tag(block, "updated") ||
      tag(block, "dc:date");
    if (!title || !link) continue;
    headlines.push({
      id: guid || `${source}:${title}`,
      title,
      url: link,
      source,
      summary: summary.slice(0, 220),
      publishedAt: parseDate(published) || Date.now(),
    });
  }
  return headlines;
}

async function fetchFeed(source: string, url: string): Promise<Headline[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "user-agent": "antbit-desk/1.0",
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) return [];
    return parseFeed(await res.text(), source);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export const getNewsSections = createServerFn({ method: "GET" }).handler(
  async (): Promise<NewsSection[]> => {
    const sections = await Promise.all(
      CATEGORY_FEEDS.map(async ({ category, blurb, feeds }) => {
        const lists = await Promise.all(feeds.map((feed) => fetchFeed(feed.source, feed.url)));
        return { category, blurb, headlines: rankHeadlines(category, lists.flat()) };
      }),
    );
    return sections;
  },
);
